import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import production from '../config/playwright.config.mjs';
import development from '../config/playwright.dev.config.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = name => readFileSync(new URL(`../${name}`, import.meta.url));

test('agent entry points remain byte-identical to AGENTS.md', () => {
  const canonical = read('AGENTS.md');
  assert.deepEqual(read('CLAUDE.md'), canonical);
  assert.deepEqual(read('GEMINI.md'), canonical);
});

test('relocated browser configs resolve tests, server cwd and artifacts to the repository', () => {
  for (const config of [production, development]) {
    assert.equal(config.testDir, resolve(root, 'tests/browser'));
    assert.equal(resolve(config.webServer.cwd), resolve(root));
  }
  assert.equal(production.outputDir, resolve(root, 'test-results'));
  assert.equal(development.outputDir, resolve(root, 'test-results/dev'));
  assert.equal(production.reporter[1][1].outputFolder, resolve(root, 'playwright-report'));
  assert.equal(development.reporter[1][1].outputFolder, resolve(root, 'playwright-report/dev'));
  const scripts = JSON.parse(read('package.json')).scripts;
  assert.match(scripts['test:browser'], /--config=config\/playwright\.config\.mjs/);
  assert.match(scripts['test:dev'], /--config=config\/playwright\.dev\.config\.mjs/);
});

test('static source assets live under public while runtime asset paths remain unchanged', () => {
  for (const path of ['demo.csv', 'manifest.json', 'data/categories.json']) {
    assert(existsSync(resolve(root, 'public', path)), `Missing public asset: ${path}`);
    assert(!existsSync(resolve(root, path)), `Obsolete source path: ${path}`);
  }
});

test('CSV ignore rules exempt only the supplied public demo', t => {
  if (spawnSync('git', ['rev-parse', '--is-inside-work-tree'], { cwd: root }).status !== 0) return t.skip('Git checkout required to verify ignore rules.');
  const ignored = path => spawnSync('git', ['check-ignore', '--no-index', path], { cwd: root, encoding: 'utf8' });
  assert.equal(ignored('public/demo.csv').status, 1);
  for (const path of ['demo.csv', 'personal.csv', 'public/personal.csv', 'tests/private/demo.csv']) {
    const result = ignored(path);
    assert.equal(result.status, 0, `${path}: ${result.stderr}`);
  }
});

test('Pages deployment consumes the checked artifact only after its producing job succeeds', () => {
  const workflow=read('.github/workflows/tests.yml').toString();
  const [,producer,consumer]=workflow.match(/^  test:\n([\s\S]*?)^  deploy:\n([\s\S]*)$/m) || [];
  assert(producer && consumer, 'Checks and deployment must use separate jobs');
  const upload=producer.indexOf('uses: actions/upload-pages-artifact@');
  assert(upload>0);
  for (const script of ['npm run test:unit','npm run test:integration','npm run test:build','Repeat logic and integration checks in UTC']) {
    const check=producer.indexOf(script);
    assert(check>=0 && check<upload,`${script} must complete before uploading Pages`);
  }
  assert.match(producer,/name: Upload Pages artifact\n\s+if: github.event_name != 'pull_request' && github.ref == 'refs\/heads\/main'/);
  assert.match(producer,/uses: actions\/upload-pages-artifact@v5\n\s+with:\n\s+name: github-pages\n\s+path: dist/);
  assert.match(consumer,/needs: test/);
  assert.match(consumer,/if: github.event_name != 'pull_request' && github.ref == 'refs\/heads\/main'/);
  assert.match(consumer,/pages: write/);
  assert.match(consumer,/id-token: write/);
  assert.match(consumer,/name: github-pages/);
  assert.match(consumer,/uses: actions\/configure-pages@v6/);
  assert.match(consumer,/uses: actions\/deploy-pages@v5\n\s+with:\n\s+artifact_name: github-pages/);
  assert(!/npm (?:ci|run build)|upload-pages-artifact/.test(consumer),'Deployment must consume the existing artifact instead of rebuilding or uploading it');
});

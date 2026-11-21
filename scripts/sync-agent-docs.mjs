import { readFile, writeFile } from 'node:fs/promises';

// AGENTS.md is the source; keep tool-specific entry points byte-identical.
const content = await readFile(new URL('../AGENTS.md', import.meta.url));
await Promise.all(['CLAUDE.md', 'GEMINI.md'].map(name =>
  writeFile(new URL(`../${name}`, import.meta.url), content),
));

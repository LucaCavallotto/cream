import assert from 'node:assert/strict';
import test from 'node:test';
import Papa from 'papaparse';
import {
  readCSVSession,
  saveCSVSession,
  createCSVSession,
  pickCSVHandle,
  droppedCSVSource,
  downloadCSV,
} from '../../assets/js/fileSystem.js';
import { appReducer, createAppState } from '../../assets/js/appState.js';
import {
  parseTransactionsCSV,
  serializeTransactionsCSV,
} from '../../assets/js/csv.js';

const row = {
  DateTime: '2026-11-02T12:00:00+01:00',
  Amount: -10,
  Description: 'Original',
  Category: 'Bar',
  Subcategory: 'Coffee',
  Tags: '',
  Notes: 'Keep, "this"\nunchanged',
};
const text = serializeTransactionsCSV([row], Papa);
const source = (content = text, name = 'original.csv') =>
  new File([content], name, { type: 'text/csv' });
const native = { showSaveFilePicker() {} };
async function loaded() {
  return appReducer(createAppState(), {
    type: 'open',
    session: await readCSVSession(source()),
  });
}
const edit = (state) =>
  appReducer(state, {
    type: 'upsert',
    id: state.transactions[0].id,
    rows: [{ ...state.transactions[0], Amount: -12.5, Description: 'Edited' }],
  });

test('load → reducer edit → real CSV save → reopen preserves fields and creates fresh internal IDs', async () => {
  let state = edit(await loaded()),
    saved;
  const originalId = state.transactions[0].id;
  state.analyticsExclusions.categories.add('Investments');
  state.analyticsReturnContext = { searchQuery: 'previous' };
  const handle = {
    createWritable: async () => ({
      write: async (value) => {
        saved = value;
      },
      close: async () => {},
    }),
  };
  const result = await saveCSVSession({ ...state, fileHandle: handle }, native);
  assert.equal(result.method, 'native');
  if (result.saved)
    state = appReducer(state, {
      type: 'save',
      transactions: state.transactions,
    });
  assert.equal(state.hasUnsavedChanges, false);
  assert.equal(state.originalTransactions[0].Description, 'Edited');
  assert(state.analyticsExclusions.categories.has('Investments'));
  assert.equal(state.analyticsReturnContext.searchQuery, 'previous');
  assert.deepEqual(parseTransactionsCSV(saved, Papa).transactions, [
    { ...row, Amount: -12.5, Description: 'Edited' },
  ]);
  state = appReducer(state, {
    type: 'open',
    session: await readCSVSession(source(saved, 'reopened.csv')),
  });
  assert.notEqual(state.transactions[0].id, originalId);
  assert.equal(state.analyticsExclusions.categories.size, 0);
  assert.equal(state.analyticsReturnContext, null);
});

test('invalid CSV cannot produce a session or replace current data, baseline, filename, handle or exclusions', async () => {
  const state = await loaded();
  state.analyticsExclusions.categories.add('Bar');
  const snapshot = structuredClone(state);
  await assert.rejects(
    readCSVSession(source('wrong,header\n1,2', 'bad.csv')),
    /Incompatible CSV/,
  );
  assert.deepEqual(state, snapshot);
});

test('a native handle retains its filename and writable identity when read', async () => {
  const handle = {
    name: 'native.csv',
    getFile: async () => source(text, 'native.csv'),
  };
  const session = await readCSVSession(handle);
  assert.equal(session.fileHandle, handle);
  assert.equal(session.fileName, 'native.csv');
});

for (const phase of ['createWritable', 'write', 'close']) {
  test(`save failure during ${phase} retains dirty state and last saved baseline`, async () => {
    const state = edit(await loaded());
    const fail = async () => {
      throw new Error('Permission denied');
    };
    const handle = {
      createWritable:
        phase === 'createWritable'
          ? fail
          : async () => ({
              write: phase === 'write' ? fail : async () => {},
              close: phase === 'close' ? fail : async () => {},
            }),
    };
    await assert.rejects(
      saveCSVSession({ ...state, fileHandle: handle }, native),
      /Permission denied/,
    );
    assert.equal(state.hasUnsavedChanges, true);
    assert.equal(state.originalTransactions[0].Amount, -10);
  });
}

test('cancelled share keeps dirty state and does not trigger a download', async () => {
  const state = edit(await loaded());
  const result = await saveCSVSession(
    state,
    {
      navigator: {
        canShare: () => true,
        share: async () => {
          throw Object.assign(new Error('Cancelled'), { name: 'AbortError' });
        },
      },
    },
    () => assert.fail('Cancelled sharing must not download'),
  );
  assert.equal(result.saved, false);
  assert.equal(state.hasUnsavedChanges, true);
});

for (const sharing of [false, true]) {
  test(`download fallback serializes the actual session${sharing ? ' after unsupported sharing' : ''}`, async () => {
    const state = edit(await loaded());
    const environment = sharing
      ? {
          navigator: {
            canShare: () => true,
            share: async () => {
              throw new Error('Unsupported');
            },
          },
        }
      : {};
    let downloaded;
    const result = await saveCSVSession(state, environment, (content, name) => {
      downloaded = content;
      assert.equal(name, 'original.csv');
    });
    assert.equal(result.saved, false);
    assert.equal(state.hasUnsavedChanges, true);
    assert.equal(result.method, 'download');
    assert.equal(
      parseTransactionsCSV(downloaded, Papa).transactions[0].Amount,
      -12.5,
    );
  });
}

test('successful sharing passes a real CSV File and reports completion', async () => {
  let shared;
  const result = await saveCSVSession(await loaded(), {
    navigator: {
      canShare: () => true,
      share: async (payload) => {
        shared = payload;
      },
    },
  });
  assert.equal(result.method, 'share');
  assert.equal(result.saved, true);
  assert.equal(shared.files[0].name, 'original.csv');
  assert.deepEqual(
    parseTransactionsCSV(await shared.files[0].text(), Papa).transactions,
    [row],
  );
});

test('creation and picking support native APIs and cancellable filename fallback', async () => {
  const handle = { name: 'native.csv' };
  assert.equal(
    (await createCSVSession({ showSaveFilePicker: async () => handle }))
      .fileHandle,
    handle,
  );
  assert.equal(
    await pickCSVHandle({ showOpenFilePicker: async () => [handle] }),
    handle,
  );
  assert.equal(
    (await createCSVSession({ prompt: () => 'new' })).fileName,
    'new.csv',
  );
  assert.equal(await createCSVSession({ prompt: () => null }), null);
});

test('drop imports native handles when available and falls back to a File on permissions failure', async () => {
  const file = source(),
    handle = { kind: 'file' };
  assert.equal(
    await droppedCSVSource({
      items: [{ kind: 'file', getAsFileSystemHandle: async () => handle }],
    }),
    handle,
  );
  assert.equal(
    await droppedCSVSource({
      items: [
        {
          kind: 'file',
          getAsFileSystemHandle: async () => {
            throw new Error('Denied');
          },
          getAsFile: () => file,
        },
      ],
    }),
    file,
  );
  assert.equal(await droppedCSVSource({ files: [file] }), file);
});

test('download cleans up its anchor and releases the Blob URL after the browser consumes it', () => {
  const events = [],
    anchor = {
      click() {
        events.push('click');
      },
      remove() {
        events.push('remove');
      },
    };
  let release;
  downloadCSV(text, 'export.csv', {
    URL: {
      createObjectURL(blob) {
        assert(blob instanceof Blob);
        return 'blob:csv';
      },
      revokeObjectURL(url) {
        events.push(url);
      },
    },
    document: {
      createElement: () => anchor,
      body: {
        appendChild() {
          events.push('append');
        },
      },
    },
    setTimeout(callback) {
      release = callback;
    },
  });
  assert.equal(anchor.download, 'export.csv');
  assert.equal(anchor.target, '_blank');
  assert.equal(anchor.rel, 'noopener');
  assert.deepEqual(events, ['append', 'click', 'remove']);
  release();
  assert.equal(events.at(-1), 'blob:csv');
});

test('explicit demo sessions cannot save through any service path, while personal demo.csv files can', async () => {
  const demo = await readCSVSession(source(text, 'demo.csv'), { isDemo: true });
  let touched = false;
  const forbidden = () => { touched = true; throw new Error('Unexpected write'); };
  demo.fileHandle = { createWritable: forbidden };
  await assert.rejects(saveCSVSession(demo, { showSaveFilePicker: forbidden, navigator: { canShare: forbidden } }, forbidden), /Demo edits are temporary/);
  assert.equal(touched, false);
  const state = appReducer(createAppState(), { type: 'open', session: demo });
  assert.equal(appReducer(state, { type: 'save', transactions: [] }), state);
  const personal = await readCSVSession(source(text, 'demo.csv'));
  assert.equal(personal.isDemo, false);
  let downloaded = false;
  await saveCSVSession(personal, {}, () => { downloaded = true; });
  assert.equal(downloaded, true);
  assert.equal(appReducer(state, { type: 'close' }).isDemo, false);
});

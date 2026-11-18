import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import { appReducer, createAppState } from '../assets/js/appState.js';
import {
  createCSVSession,
  droppedCSVSource,
  pickCSVHandle,
  readCSVSession,
  saveCSVSession,
} from '../assets/js/fileSystem.js';
import Transactions from './components/Transactions.jsx';
import DatasetHealth from './components/DatasetHealth.jsx';
import ExpenseModal from './components/ExpenseModal.jsx';

const Analytics = lazy(() => import('./components/Analytics.jsx'));

function isIOS() {
  return (
    /^(iPad|iPhone|iPod)( Simulator)?$/.test(navigator.platform) ||
    (navigator.userAgent.includes('Mac') && 'ontouchend' in document)
  );
}
const tabs = [
  ['Transactions', 'list'],
  ['Analytics', 'analytics'],
  ['Dataset Health', 'cleanup'],
];

export default function App() {
  const [state, dispatch] = useReducer(appReducer, undefined, () =>
    createAppState(isIOS()),
  );
  const [modal, setModal] = useState(null),
    [notice, setNotice] = useState(''),
    [saving, setSaving] = useState(false),
    [saved, setSaved] = useState(false),
    [dragging, setDragging] = useState(false);
  const picker = useRef(null),
    dragDepth = useRef(0),
    saveTimer = useRef(null);
  const closeModal = useCallback(() => setModal(null), []);
  const tags = useMemo(
    () =>
      [
        ...new Set(
          state.transactions.flatMap((t) =>
            t.Tags.split(/\s+/).filter(Boolean),
          ),
        ),
      ].sort(),
    [state.transactions],
  );
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${import.meta.env.BASE_URL}data/categories.json`, {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error('Cannot load the category catalog.');
        return response.json();
      })
      .then((categories) => dispatch({ type: 'categories', categories }))
      .catch((error) => {
        if (error.name !== 'AbortError') alert(error.message);
      });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const update = (event) =>
      document.documentElement.setAttribute(
        'data-bs-theme',
        event.matches ? 'dark' : 'light',
      );
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    const beforeUnload = (event) => {
      if (state.fileName || state.hasUnsavedChanges) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [state.fileName, state.hasUnsavedChanges]);
  useEffect(() => () => clearTimeout(saveTimer.current), []);
  const canReplace = useCallback(
    () =>
      !state.hasUnsavedChanges ||
      confirm('You have unsaved changes. Discard them and open another file?'),
    [state.hasUnsavedChanges],
  );
  const open = useCallback(
    async (source) => {
      if (!source || !canReplace()) return;
      try {
        const session = await readCSVSession(source);
        dispatch({ type: 'open', session });
        setNotice('');
        closeModal();
      } catch (error) {
        if (error.name !== 'AbortError') alert(error.message);
      }
    },
    [canReplace, closeModal],
  );
  useEffect(() => {
    const enter = (event) => {
      if (event.dataTransfer?.types.includes('Files')) {
        event.preventDefault();
        dragDepth.current++;
        setDragging(true);
      }
    };
    const leave = (event) => {
      event.preventDefault();
      if (--dragDepth.current <= 0) {
        dragDepth.current = 0;
        setDragging(false);
      }
    };
    const over = (event) => {
      event.preventDefault();
    };
    const drop = async (event) => {
      event.preventDefault();
      dragDepth.current = 0;
      setDragging(false);
      try {
        await open(await droppedCSVSource(event.dataTransfer));
      } catch (error) {
        alert(error.message);
      }
    };
    window.addEventListener('dragenter', enter);
    window.addEventListener('dragleave', leave);
    window.addEventListener('dragover', over);
    window.addEventListener('drop', drop);
    return () => {
      window.removeEventListener('dragenter', enter);
      window.removeEventListener('dragleave', leave);
      window.removeEventListener('dragover', over);
      window.removeEventListener('drop', drop);
    };
  }, [open]);
  async function browse() {
    if (!window.showOpenFilePicker) return picker.current.click();
    try {
      await open(await pickCSVHandle());
    } catch (error) {
      if (error.name !== 'AbortError') alert(error.message);
    }
  }
  async function create() {
    if (!canReplace()) return;
    try {
      const session = await createCSVSession();
      if (session) {
        dispatch({ type: 'open', session });
        setNotice('');
      }
    } catch (error) {
      if (error.name !== 'AbortError') alert(error.message);
    }
  }
  async function save() {
    if (state.viewOnlyMode || saving) return;
    const snapshot = state;
    setSaving(true);
    try {
      const result = await saveCSVSession(snapshot);
      if (result.saved) {
        dispatch({
          type: 'save',
          transactions: snapshot.transactions,
          sessionId: snapshot.sessionId,
        });
        setSaved(true);
        clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => setSaved(false), 3000);
      }
    } catch (error) {
      alert(`Error saving file: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }
  function remove(ids) {
    if (
      state.viewOnlyMode ||
      !confirm(
        `Delete ${ids.length === 1 ? 'this transaction' : `${ids.length} transactions`}?`,
      )
    )
      return;
    dispatch({ type: 'delete', ids });
    closeModal();
  }
  function changeTab(tab) {
    const scrollY =
      tab === 'Analytics' ? state.analyticsReturnContext?.scrollY : null;
    dispatch({ type: 'tab', tab });
    if (scrollY != null)
      requestAnimationFrame(() => window.scrollTo(0, scrollY));
  }
  function commit(rows, id, warnings) {
    if (state.viewOnlyMode) return;
    dispatch({ type: 'upsert', rows, id });
    setNotice(warnings?.length ? warnings.join(' ') : '');
    closeModal();
  }
  const loaded = !!state.fileName;
  return (
    <>
      <input
        ref={picker}
        type="file"
        accept=".csv,text/csv"
        hidden
        onChange={(event) => {
          open(event.target.files[0]);
          event.target.value = '';
        }}
      />
      <div
        id="globalDropOverlay"
        className={`position-fixed top-0 start-0 w-100 h-100 bg-body bg-opacity-75 d-flex align-items-center justify-content-center ${dragging ? '' : 'd-none'}`}
        style={{ zIndex: 9999, border: '4px dashed var(--primary-accent)' }}
      >
        <div className="text-center">
          <i className="bi bi-file-earmark-arrow-up display-1 text-primary mb-3" />
          <h2 className="fw-bold">Drop CSV file to open</h2>
        </div>
      </div>
      <nav className="navbar navbar-expand-lg sticky-top bg-body-tertiary border-bottom">
        <div className="container-fluid px-4">
          <span className="navbar-brand text-primary fw-bold">
            Expense Tracker
          </span>
          <div className="d-flex align-items-center flex-grow-1 justify-content-center">
            <span id="currentFileName" className="text-muted fw-semibold">
              {state.fileName}
            </span>
          </div>
          <div
            id="navActions"
            className={`${loaded ? 'd-flex' : 'd-none'} align-items-center gap-1`}
          >
            <button
              id="btnToggleViewOnly"
              className="btn btn-outline-secondary btn-sm me-2 d-none d-md-inline-block"
              title="Toggle View Only Mode"
              onClick={() => dispatch({ type: 'viewOnly' })}
            >
              <i
                className={`bi bi-${state.viewOnlyMode ? 'lock-fill text-warning' : 'unlock-fill'}`}
              />
            </button>
            <span
              id="textViewOnly"
              className={`badge bg-warning-subtle text-warning border border-warning-subtle me-2 d-md-none ${state.viewOnlyMode ? '' : 'd-none'}`}
              title="View Only Mode Active"
            >
              <i className="bi bi-lock-fill" />
            </span>
            <button
              id="btnUndoChanges"
              className={`btn btn-outline-secondary btn-sm me-2 ${state.viewOnlyMode ? 'd-none' : ''}`}
              disabled={
                !state.hasUnsavedChanges || state.viewOnlyMode || saving
              }
              onClick={() => {
                if (confirm('Discard all unsaved changes?')) {
                  dispatch({ type: 'undo' });
                  setNotice('');
                }
              }}
            >
              Undo Changes
            </button>
            <button
              id="btnSaveChanges"
              className={`btn btn-outline-primary btn-sm me-2 ${state.viewOnlyMode ? 'd-none' : ''}`}
              disabled={
                !state.hasUnsavedChanges || state.viewOnlyMode || saving
              }
              onClick={save}
            >
              {saved && !state.hasUnsavedChanges
                ? 'Saved!'
                : saving
                  ? 'Saving...'
                  : 'Save Changes'}
            </button>
            <button
              id="btnCloseFile"
              className="btn btn-outline-danger btn-sm"
              disabled={saving}
              onClick={() => {
                if (
                  !state.hasUnsavedChanges ||
                  confirm('You have unsaved changes. Close without saving?')
                ) {
                  dispatch({ type: 'close' });
                  setNotice('');
                  setSaved(false);
                  closeModal();
                }
              }}
            >
              Close File
            </button>
          </div>
        </div>
      </nav>
      <main>
        <div
          id="landingView"
          className={`container mt-5 ${loaded ? 'd-none' : ''}`}
        >
          <div className="row justify-content-center">
            <div className="col-md-8 text-center">
              <h2 className="mb-4">Welcome to Personal Expense Tracker</h2>
              <p className="text-muted mb-5">
                Manage your personal finances efficiently directly in your
                browser. All data stays local.
              </p>
              <div className="d-grid gap-3 d-sm-flex justify-content-sm-center">
                <button
                  id="btnCreateNewFile"
                  className="btn btn-primary btn-lg px-4 gap-3"
                  disabled={!state.ready}
                  onClick={create}
                >
                  Create New File
                </button>
              </div>
              <div className="mt-5">
                <p className="text-muted mb-3">Or open an existing CSV file</p>
                <div
                  id="dropZone"
                  className="drop-zone p-5 mb-4 bg-body-tertiary rounded-3 border"
                >
                  <h5 className="mb-3">Drag &amp; Drop your CSV file here</h5>
                  <p className="text-muted mb-4">- or -</p>
                  <button
                    id="btnOpenFile"
                    className="btn btn-outline-primary"
                    disabled={!state.ready}
                    onClick={browse}
                  >
                    Browse Files
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div
          id="appView"
          className={`container-fluid mt-4 ${loaded ? '' : 'd-none'}`}
        >
          <div
            id="unsavedWarning"
            className={`alert alert-warning ${state.hasUnsavedChanges ? '' : 'd-none'}`}
            role="alert"
          >
            You have unsaved changes! Don't forget to click "Save Changes"
            before leaving.
          </div>
          <div
            id="inlineImportNotice"
            className={`alert alert-warning ${notice ? '' : 'd-none'}`}
            role="alert"
          >
            {notice}
          </div>
          <ul className="nav nav-tabs mb-4 px-3" id="appTabs" role="tablist">
            {tabs.map(([name, id]) => (
              <li key={id} className="nav-item" role="presentation">
                <button
                  className={`nav-link fw-semibold ${state.tab === name ? 'active' : ''}`}
                  id={`${id}-tab`}
                  type="button"
                  role="tab"
                  aria-controls={`${id}-tab-pane`}
                  aria-selected={state.tab === name}
                  onClick={() => changeTab(name)}
                >
                  {name}
                </button>
              </li>
            ))}
          </ul>
          {loaded && (
            <div
              className="tab-content px-3"
              id="appTabsContent"
              key={state.sessionId}
            >
              {tabs.map(([name, id]) => (
                <div
                  key={id}
                  className={`tab-pane fade ${state.tab === name ? 'show active' : ''}`}
                  id={`${id}-tab-pane`}
                  role="tabpanel"
                  aria-labelledby={`${id}-tab`}
                  tabIndex="0"
                >
                  {name === 'Transactions' ? (
                    <Transactions
                      state={state}
                      dispatch={dispatch}
                      tags={tags}
                      onEdit={(transaction, returnFocus) =>
                        setModal({ transaction, returnFocus })
                      }
                      onAdd={(event) =>
                        setModal({
                          transaction: null,
                          returnFocus: event.currentTarget,
                        })
                      }
                      onDelete={remove}
                      onTab={changeTab}
                    />
                  ) : name === 'Analytics' ? (
                    <Suspense
                      fallback={<p role="status">Loading analytics…</p>}
                    >
                      <Analytics
                        state={state}
                        dispatch={dispatch}
                        active={state.tab === name}
                        onDrilldown={(filter) => {
                          dispatch({
                            type: 'drilldown',
                            filter,
                            scrollY: window.scrollY,
                          });
                          requestAnimationFrame(() => window.scrollTo(0, 0));
                        }}
                      />
                    </Suspense>
                  ) : (
                    <DatasetHealth
                      transactions={state.transactions}
                      categories={state.categories}
                      viewOnly={state.viewOnlyMode}
                      onEdit={(transaction, returnFocus) =>
                        setModal({ transaction, returnFocus })
                      }
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      {modal && (
        <ExpenseModal
          transaction={modal.transaction}
          returnFocus={modal.returnFocus}
          categories={state.categories}
          tags={tags}
          viewOnly={state.viewOnlyMode}
          onClose={closeModal}
          onCommit={commit}
          onDelete={(id) => remove([id])}
        />
      )}
      <footer className="py-4 mt-5 border-top bg-body-tertiary">
        <div className="container text-center">
          <p className="text-muted mb-0 small" style={{ letterSpacing: 2 }}>
            &quot;Cash Rules Everything Around Me&quot;
          </p>
        </div>
      </footer>
    </>
  );
}

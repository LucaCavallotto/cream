import Star from './components/Star.jsx';
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
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
import Landing from './components/Landing.jsx';
import Overview from './components/Overview.jsx';
import Ticker from './components/Ticker.jsx';
import useMediaQuery from './hooks/useMediaQuery.js';
import { overviewModel } from '../assets/js/presentation.js';
import { analyzeDataset } from '../assets/js/datasetHealth.js';

const Analytics = lazy(() => import('./components/Analytics.jsx'));

function isIOS() {
  return (
    /^(iPad|iPhone|iPod)( Simulator)?$/.test(navigator.platform) ||
    (navigator.userAgent.includes('Mac') && 'ontouchend' in document)
  );
}
const tabs = [
  ['Overview', 'overview'],
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
    [dragging, setDragging] = useState(false),
    [demoLoading, setDemoLoading] = useState(false);
  const theme = useMediaQuery('(prefers-color-scheme: dark)')
    ? 'dark'
    : 'light';
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const mobileNavigation = useMediaQuery('(max-width: 767.98px)');
  const model = useMemo(
    () => overviewModel(state.transactions, state.analyticsExclusions),
    [state.transactions, state.analyticsExclusions],
  );
  const health = useMemo(
    () => analyzeDataset(state.transactions, state.categories),
    [state.transactions, state.categories],
  );
  const picker = useRef(null),
    dragDepth = useRef(0),
    saveTimer = useRef(null),
    pendingScroll = useRef(null),
    readOnlyInfo = useRef(null);
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
    document.documentElement.setAttribute('data-bs-theme', theme);
  }, [theme]);
  useEffect(() => {
    const beforeUnload = (event) => {
      if (state.hasUnsavedChanges) {
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
        pendingScroll.current = 0;
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
  useLayoutEffect(() => {
    if (pendingScroll.current !== null) {
      window.scrollTo(0, pendingScroll.current);
      pendingScroll.current = null;
    }
  }, [state]);

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
        pendingScroll.current = 0;
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
    pendingScroll.current = scrollY ?? 0;
    dispatch({ type: 'tab', tab });
  }
  function commit(rows, id, warnings) {
    if (state.viewOnlyMode) return;
    dispatch({ type: 'upsert', rows, id });
    setNotice(warnings?.length ? warnings.join(' ') : '');
    closeModal();
  }
  async function openDemo() {
    setDemoLoading(true);
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}demo.csv`);
      if (!response.ok) throw new Error('Cannot open the sample dataset.');
      await open(
        new File([await response.text()], 'demo.csv', { type: 'text/csv' }),
      );
    } catch (error) {
      alert(error.message);
    } finally {
      setDemoLoading(false);
    }
  }
  function closeFile() {
    if (
      !state.hasUnsavedChanges ||
      confirm('You have unsaved changes. Close without saving?')
    ) {
      pendingScroll.current = 0;
      dispatch({ type: 'close' });
      setNotice('');
      setSaved(false);
      closeModal();
    }
  }
  function openModal(transaction, returnFocus) {
    setModal({ transaction, returnFocus });
  }
  const loaded = !!state.fileName;
  return (
    <>
      <a className="skip-link" href={loaded ? '#appView' : '#landingView'}>
        Skip to content
      </a>
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
        className={`global-drop-overlay ${dragging ? '' : 'd-none'}`}
      >
        <div>
          <span className="drop-overlay-icon" aria-hidden="true">
            ↘
          </span>
          <h2>Drop it like it’s yours.</h2>
          <p>Drop CSV file to open</p>
        </div>
      </div>
      <div className="app-chrome">
        <header
          className={`cream-header ${loaded ? 'has-file' : ''} ${state.viewOnlyMode ? 'is-read-only' : ''}`}
        >
          <div className="brand-lockup">
            <button type="button" className="cream-wordmark" aria-label="cream home" disabled={saving} onClick={() => { if (loaded) closeFile(); else window.scrollTo(0, 0); }}>
              cream
              <span aria-hidden="true">
                <Star />
              </span>
            </button>
            {!loaded && (
              <span className="brand-descriptor">
                A clearer view of your money.
              </span>
            )}
          </div>
          {loaded ? (
            <div className="file-context">
              <i className="bi bi-file-earmark-text" aria-hidden="true" />
              <span id="currentFileName" title={state.fileName}>
                {state.fileName}
              </span>
              <span
                className={`file-status ${state.hasUnsavedChanges ? 'pending' : ''}`}
              >
                <span className="status-dot" />
                {state.hasUnsavedChanges ? 'Unsaved changes' : 'Up to date'}
              </span>
            </div>
          ) : (
            <span className="header-note">
              <i className="bi bi-lock" aria-hidden="true" /> NO ACCOUNTS. NO
              UPLOADS.
            </span>
          )}
          <div
            id="navActions"
            className={`file-actions ${loaded ? '' : 'd-none'}`}
          >
            <button
              id="btnToggleViewOnly"
              className="icon-button view-mode-toggle"
              title="Toggle View Only Mode"
              aria-label="Toggle View Only Mode"
              aria-pressed={state.viewOnlyMode}
              onClick={() => dispatch({ type: 'viewOnly' })}
            >
              <i
                className={`bi bi-${state.viewOnlyMode ? 'lock' : 'unlock'}`}
                aria-hidden="true"
              />
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.currentTarget.focus();
                readOnlyInfo.current.showModal();
              }}
              aria-haspopup="dialog"
              id="textViewOnly"
              className={`read-only-badge ${state.viewOnlyMode ? '' : 'd-none'}`}
            >
              Read only
            </button>
            <button
              id="btnUndoChanges"
              className={`icon-button ${state.viewOnlyMode ? 'd-none' : ''}`}
              aria-label="Undo Changes"
              title="Undo Changes"
              disabled={!state.hasUnsavedChanges || saving}
              onClick={() => {
                if (confirm('Discard all unsaved changes?')) {
                  dispatch({ type: 'undo' });
                  setNotice('');
                }
              }}
            >
              <i className="bi bi-arrow-counterclockwise" aria-hidden="true" />
            </button>
            <button
              id="btnSaveChanges"
              aria-label="Save Changes"
              className={`btn btn-outline-secondary save-file-button ${state.viewOnlyMode ? 'd-none' : ''}`}
              disabled={!state.hasUnsavedChanges || saving}
              onClick={save}
            >
              <i className="bi bi-check2" aria-hidden="true" />
              <span>
                {saved && !state.hasUnsavedChanges
                  ? 'Saved!'
                  : saving
                    ? 'Saving...'
                    : 'Save Changes'}
              </span>
            </button>
            {!state.viewOnlyMode && (
              <button
                id="btnAddExpense"
                className="btn btn-primary global-add"
                aria-label="Add transaction"
                onClick={(event) => openModal(null, event.currentTarget)}
              >
                <i className="bi bi-plus-lg" aria-hidden="true" />
                <span>Add transaction</span>
              </button>
            )}
            <button
              id="btnCloseFile"
              className="icon-button close-file-button"
              aria-label="Close File"
              title="Close File"
              disabled={saving}
              onClick={closeFile}
            >
              <i className="bi bi-x-lg" aria-hidden="true" />
            </button>
          </div>
        </header>
        <Ticker key={state.sessionId} model={model} loaded={loaded} />
      </div>
      {!loaded && (
        <Landing
          ready={state.ready}
          onCreate={create}
          onOpen={browse}
          onDemo={openDemo}
          demoLoading={demoLoading}
        />
      )}
      <div className={`workspace ${loaded ? '' : 'd-none'}`}>
        <aside className="workspace-sidebar" aria-label="Workspace navigation">
          <div className="sidebar-top">
            <p className="eyebrow sidebar-label">YOUR WORKSPACE</p>
            <nav
              id="appTabs"
              className="workspace-nav"
              role="tablist"
              aria-label="Workspace sections"
              aria-orientation={mobileNavigation ? 'horizontal' : 'vertical'}
            >
              {tabs.map(([name, id], index) => (
                <button
                  key={id}
                  id={`${id}-tab`}
                  className={`workspace-tab ${state.tab === name ? 'active' : ''}`}
                  type="button"
                  role="tab"
                  aria-controls={`${id}-tab-pane`}
                  aria-selected={state.tab === name}
                  aria-label={name}
                  title={name}
                  tabIndex={state.tab === name ? 0 : -1}
                  onClick={() => changeTab(name)}
                  onKeyDown={(event) => {
                    const step = ['ArrowRight', 'ArrowDown'].includes(event.key)
                      ? 1
                      : ['ArrowLeft', 'ArrowUp'].includes(event.key)
                        ? -1
                        : 0;
                    if (!step && !['Home', 'End'].includes(event.key)) return;
                    event.preventDefault();
                    const next =
                      event.key === 'Home'
                        ? 0
                        : event.key === 'End'
                          ? tabs.length - 1
                          : (index + step + tabs.length) % tabs.length;
                    changeTab(tabs[next][0]);
                    document.getElementById(`${tabs[next][1]}-tab`).focus();
                  }}
                >
                  <i
                    className={`bi ${['bi-grid-1x2', 'bi-list-ul', 'bi-graph-up', 'bi-shield-check'][index]}`}
                    aria-hidden="true"
                  />
                  <span>{name}</span>
                  {name === 'Dataset Health' && health.dirty.length > 0 && (
                    <span className="health-nav-count" aria-hidden="true">
                      {health.dirty.length}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </aside>
        <main id="appView" className="workspace-content" tabIndex={-1}>
          <div
            id="unsavedWarning"
            className={`save-notice ${state.hasUnsavedChanges ? '' : 'd-none'}`}
            role="status"
          >
            <span className="status-dot" />
            You have unsaved changes.
            <span>Save Changes to keep them in your CSV.</span>
          </div>
          <div
            id="inlineImportNotice"
            className={`alert alert-warning ${notice ? '' : 'd-none'}`}
            role="alert"
          >
            {notice}
          </div>
          {loaded && (
            <div
              className="tab-content"
              id="appTabsContent"
              key={state.sessionId}
            >
              {tabs.map(([name, id]) => (
                <div
                  key={id}
                  className={`tab-pane ${state.tab === name ? 'show active' : ''}`}
                  id={`${id}-tab-pane`}
                  role="tabpanel"
                  aria-labelledby={`${id}-tab`}
                  tabIndex="0"
                >
                  {name === 'Overview' ? (
                    <Overview
                      state={state}
                      model={model}
                      health={health}
                      onTab={changeTab}
                      onEdit={openModal}
                      onViewAll={() => {
                        dispatch({ type: 'search', value: '' });
                        changeTab('Transactions');
                      }}
                    />
                  ) : name === 'Transactions' ? (
                    <Transactions
                      state={state}
                      dispatch={dispatch}
                      tags={tags}
                      onEdit={openModal}
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
                        theme={theme}
                        reducedMotion={reducedMotion}
                        onDrilldown={(filter) => {
                          pendingScroll.current = 0;
                          dispatch({
                            type: 'drilldown',
                            filter,
                            scrollY: window.scrollY,
                          });
                        }}
                      />
                    </Suspense>
                  ) : (
                    <DatasetHealth
                      transactions={state.transactions}
                      categories={state.categories}
                      viewOnly={state.viewOnlyMode}
                      onEdit={openModal}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
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
      <dialog
        ref={readOnlyInfo}
        className="read-only-dialog"
        aria-labelledby="readOnlyTitle"
      >
        <h2 id="readOnlyTitle">Your money, on the go.</h2>
        <p>
          On iPhone and iPad, cream is read only. You can explore transactions,
          analytics and dataset health. To add, edit or save transactions, open
          your CSV in cream on a computer.
        </p>
        <form method="dialog">
          <button className="btn btn-primary">Got it</button>
        </form>
      </dialog>
      <footer className="cream-footer">
        <span className="footer-brand">cream.</span>
        <span>Cash Rules Everything Around Me.</span>
        <span className="footer-note">
          A little clarity goes a long way. <span aria-hidden="true">↗</span>
        </span>
      </footer>
    </>
  );
}

import Star from './Star.jsx';
export default function Landing({
  ready,
  readOnly,
  onCreate,
  onOpen,
  onDemo,
  demoLoading,
}) {
  return (
    <main id="landingView" className="landing-view" tabIndex={-1}>
      <section className="landing-hero">
        <div className="landing-story">
          <h1>Welcome</h1>
          <p className="landing-description">{readOnly ? 'Open a CSV to view transactions and analytics.' : 'Open a CSV or create a new file.'}</p>
          <div className="landing-secondary-actions">
            {!readOnly && <button
              id="btnCreateNewFile"
              className="btn btn-outline-secondary landing-create"
              disabled={!ready}
              onClick={onCreate}
            >
              Create New File{' '}
              <i className="bi bi-arrow-up-right" aria-hidden="true" />
            </button>}

          </div>
        </div>
        <div className="landing-file-area">
          <div id="dropZone" className="drop-zone">
            <div className="drop-zone-top">
              <span className="eyebrow">CSV FILES</span>
            </div>
            <div className="file-illustration" aria-hidden="true">
              <div className="illustration-orbit orbit-one" />
              <div className="illustration-orbit orbit-two" />
              <div className="file-sheet">
                <span className="sheet-fold" />
                <span className="sheet-line" />
                <span className="sheet-line short" />
                <span className="sheet-extension">.csv</span>
                <span className="sheet-star">
                  <Star />
                </span>
              </div>
              <span className="file-ready">
                <span className="status-dot" /> Local file
              </span>
            </div>
            <div>
              <h2>Open a CSV</h2>
              <p>{readOnly ? 'View your file here; edit it on a computer.' : 'Drop a file here or browse your computer.'}</p>
            </div>
            <button
              id="btnOpenFile"
              className="btn btn-primary"
              disabled={!ready}
              onClick={onOpen}
            >
              Browse Files{' '}
              <i className="bi bi-arrow-right" aria-hidden="true" />
            </button>
            <span className="drop-zone-note">
              <i className="bi bi-lock" aria-hidden="true" /> Your file stays on
              your device.
            </span>
          </div>

        </div>
      </section>
      <div className="landing-demo-area">
            <button
              className="text-action landing-demo"
              disabled={!ready || demoLoading}
              onClick={onDemo}
            >
              {demoLoading ? 'Opening demo…' : 'Take a look around'}{' '}
              <span aria-hidden="true">↗</span>
              <span className="demo-caption">with a sample dataset</span>
            </button>
      </div>
    </main>
  );
}

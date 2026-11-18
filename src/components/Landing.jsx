export default function Landing({
  ready,
  onCreate,
  onOpen,
  onDemo,
  demoLoading,
}) {
  return (
    <main id="landingView" className="landing-view" tabIndex={-1}>
      <section className="landing-hero">
        <div className="landing-story">
          <p className="eyebrow">
            <span className="status-dot" /> PERSONAL FINANCE. PERSONALLY YOURS.
          </p>
          <h1>
            Good with
            <br />
            money.
            <br />
            <span className="hero-soft">On your terms.</span>
          </h1>
          <p className="landing-description">
            A little less noise. A lot more clarity.
            <br />
            Bring your transactions together and see
            <br className="desktop-break" /> the bigger picture.
          </p>
          <button
            id="btnCreateNewFile"
            className="btn btn-primary landing-create"
            disabled={!ready}
            onClick={onCreate}
          >
            Create New File{' '}
            <i className="bi bi-arrow-up-right" aria-hidden="true" />
          </button>
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
        <div className="landing-file-area">
          <div id="dropZone" className="drop-zone">
            <div className="drop-zone-top">
              <span className="eyebrow">A FRESH START</span>
              <span className="file-corner" aria-hidden="true">
                ↗
              </span>
            </div>
            <div className="file-illustration" aria-hidden="true">
              <div className="illustration-orbit orbit-one" />
              <div className="illustration-orbit orbit-two" />
              <div className="file-sheet">
                <span className="sheet-fold" />
                <span className="sheet-line" />
                <span className="sheet-line short" />
                <span className="sheet-extension">.csv</span>
                <span className="sheet-star">✳</span>
              </div>
              <span className="file-ready">
                <span className="status-dot" /> Yours to open.
              </span>
            </div>
            <div>
              <h2>
                One file.
                <br />
                The whole picture.
              </h2>
              <p>Drop your CSV here, or pick it from your device.</p>
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
          <span className="landing-side-note">A CLEARER VIEW STARTS HERE.</span>
        </div>
      </section>
      <section className="landing-principles" aria-label="Why cream">
        {[
          [
            '01',
            'Keep it yours.',
            'Your data, your CSV. No accounts or uploads.',
          ],
          [
            '02',
            'See what adds up.',
            'Every transaction, category and little habit.',
          ],
          [
            '03',
            'Make room for clarity.',
            'Clean up the details. Focus on what matters.',
          ],
        ].map(([number, title, copy]) => (
          <div key={number}>
            <span className="principle-number">{number} /</span>
            <div>
              <h3>{title}</h3>
              <p>{copy}</p>
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}

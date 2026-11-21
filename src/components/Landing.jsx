import Star from './Star.jsx';

function FilePreview({ fresh = false }) {
  return (
    <div className="file-illustration" aria-hidden="true">
      <div className="illustration-orbit orbit-one" />
      <div className="illustration-orbit orbit-two" />
      <div className="file-sheet">
        <span className="sheet-fold" />
        {!fresh && <><span className="sheet-line" /><span className="sheet-line short" /></>}
        <span className="sheet-extension">.csv</span>
        <span className="sheet-star">{fresh ? <i className="bi bi-plus-lg" /> : <Star />}</span>
      </div>
      <span className="file-ready"><span className="status-dot" /> {fresh ? 'New file' : 'Your file'}</span>
    </div>
  );
}

export default function Landing({ ready, readOnly, onCreate, onOpen, onDemo, demoLoading }) {
  return (
    <main id="landingView" className="landing-view" tabIndex={-1}>
      <section className="landing-hero" aria-label="Choose how to get started">
      <header className="landing-welcome">
        <h1>Welcome to cream.</h1>
        <p className="landing-description">A clear view of your transactions, starting with a CSV. Create a new file or open one you already have.</p>
      </header>
        <section className="drop-zone landing-choice landing-new-file" aria-labelledby="newFileTitle">
          <div className="drop-zone-top"><span className="eyebrow">START FRESH</span></div>
          <FilePreview fresh />
          <div>
            <h2 id="newFileTitle">Create a new file</h2>
            <p>{readOnly ? 'Create your file on a computer, then open it here to explore your transactions.' : 'Start with an empty CSV, then add your transactions. We set up the file for you.'}</p>
          </div>
          {!readOnly && <button
            id="btnCreateNewFile"
            className="btn btn-outline-secondary landing-create"
            disabled={!ready}
            onClick={onCreate}
          >Create New File <i className="bi bi-plus-lg" aria-hidden="true" /></button>}
          <span className="drop-zone-note"><i className={`bi bi-${readOnly ? 'laptop' : 'file-earmark-plus'}`} aria-hidden="true" /> {readOnly ? 'File creation is available on a computer.' : 'No template or spreadsheet setup needed.'}</span>
        </section>
        <section id="dropZone" className="drop-zone landing-choice landing-file-area" aria-labelledby="existingFileTitle">
          <div className="drop-zone-top"><span className="eyebrow">CONTINUE WITH YOUR DATA</span></div>
          <FilePreview />
          <div>
            <h2 id="existingFileTitle">Open an existing file</h2>
            <p>{readOnly ? 'Choose your CSV to view transactions, analytics and dataset health.' : 'Drop your CSV here or browse your computer to pick up where you left off.'}</p>
          </div>
          <button id="btnOpenFile" className="btn btn-primary" disabled={!ready} onClick={onOpen}>
            Browse Files <i className="bi bi-arrow-right" aria-hidden="true" />
          </button>
          <span className="drop-zone-note"><i className="bi bi-lock" aria-hidden="true" /> Your file stays on your device.</span>
        </section>
      </section>
      <div className="landing-demo-area">
        <button className="text-action landing-demo" disabled={!ready || demoLoading} onClick={onDemo}>
          {demoLoading ? 'Opening demo…' : 'Take a look around'} <span aria-hidden="true">↗</span>
          <span className="demo-caption">with a sample dataset</span>
        </button>
      </div>
    </main>
  );
}

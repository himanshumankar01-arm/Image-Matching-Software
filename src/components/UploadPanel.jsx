import { useState } from 'react';
import { UploadIcon } from './Icons.jsx';
import { fmtSize } from '../utils.js';

export default function UploadPanel({ query, err, samples, onFile, onSample, inputRef }) {
  const [over, setOver] = useState(false);
  return (
    <section className="panel" aria-label="Upload latest image">
      <div className="phead"><h2>Upload latest image</h2><span className="muted small">From your drive</span></div>
      <div className="pbody">
        {query ? (
          <div className="preview">
            <img src={query.url} alt={'Uploaded image ' + query.name} />
            <div className="pmeta">
              <span className="fn">{query.name}</span>
              <span className="muted small mono">{query.w} × {query.h} px · {fmtSize(query.size)}</span>
              {query.sample && <span className="muted small">Sample upload</span>}
              <div><button type="button" className="btn sm" onClick={() => inputRef.current.click()}>Replace image</button></div>
            </div>
          </div>
        ) : (
          <div className={'drop' + (over ? ' over' : '')}
            onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
            onDrop={(e) => { e.preventDefault(); setOver(false); onFile(e.dataTransfer.files[0]); }}>
            <span className="muted"><UploadIcon /></span>
            <p>Drop the latest image here</p>
            <button type="button" className="btn primary" onClick={() => inputRef.current.click()}>Choose from drive</button>
          </div>
        )}
        {err && <p className="err" role="alert">{err}</p>}
        {samples.length > 0 && (
          <div>
            <p className="muted small" style={{ marginBottom: 6 }}>Or try a sample upload</p>
            <div className="chips">
              {samples.map((s) => <button key={s.id} type="button" className="chip" onClick={() => onSample(s)}>{s.label}</button>)}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

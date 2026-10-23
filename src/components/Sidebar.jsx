import { BANDS } from '../matching.js';
import { fmtScore } from '../utils.js';

export default function Sidebar({ rows, counts, total, best, filter, setFilter, onJump }) {
  return (
    <aside className="side" aria-label="Image matching analysis">
      <div>
        <h2>Image matching analysis</h2>
        <p className="muted small">
          {rows ? (filter === 'all' ? 'Select a level to list its images in the report.' : 'Filtered. Select the level again to clear.') : 'Upload an image to see results.'}
        </p>
      </div>
      <div className="bands">
        {BANDS.map((b) => {
          const n = rows ? counts[b.key] : 0;
          const inBand = rows ? rows.filter((r) => r.band === b.key) : [];
          return (
            <button key={b.key} type="button" className={'band b-' + b.key} aria-pressed={filter === b.key} disabled={!rows || n === 0}
              title={!rows ? 'Run a match first' : n === 0 ? 'No images at this level' : 'Show the ' + n + ' image' + (n === 1 ? '' : 's') + ' at this level'}
              onClick={() => { if (filter === b.key) setFilter('all'); else { setFilter(b.key); onJump(); } }}>
              <span className="lbl">{b.label}</span>
              <span className="cnt">{rows ? n : '–'}</span>
              <span className="nm">{b.name}</span>
              <span className="nm" style={{ textAlign: 'right' }}>{rows && total ? Math.round((n / total) * 100) + '% of images' : ''}</span>
              <span className="meter"><i style={{ width: rows && total ? (n / total) * 100 + '%' : '0%' }} /></span>
              {inBand.length > 0 && (
                <span className="strip">
                  {inBand.slice(0, 6).map((r) => <img key={r.item.id} src={r.item.url} alt={r.item.person} title={r.item.person + ' · ' + fmtScore(r.score)} />)}
                  {inBand.length > 6 && <span className="more">+{inBand.length - 6}</span>}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="stats">
        <div className="stat"><span className="muted small">Best score</span><b>{best ? fmtScore(best.score) : '–'}</b></div>
        <div className="stat"><span className="muted small">Compared</span><b>{rows ? total : '–'}</b></div>
      </div>
      <div className="legend">
        <span><b>100%</b> identical file, matched by checksum</span>
        <span><b>80%+</b> same picture, edited, cropped, mirrored or resized</span>
        <span><b>20%+</b> some shared shapes or colors</span>
        <span><b>No match</b> nothing in common</span>
      </div>
    </aside>
  );
}

export default function DatabasePanel({ items, scoped, source, scoreMap, best, filter, search, serverReady, onFolder, onFiles, onServer }) {
  return (
    <section className="panel" aria-label="Database images">
      <div className="phead">
        <div>
          <h2>Database images</h2>
          <span className="muted small">{source.label} · {scoped.length === items.length ? items.length : scoped.length + ' of ' + items.length} images</span>
        </div>
        <div className="chips">
          <button type="button" className="btn sm primary" onClick={onFolder}>Load folder</button>
          <button type="button" className="btn sm" onClick={onFiles}>Add files</button>
          {source.kind !== 'server' && serverReady && <button type="button" className="btn sm" onClick={onServer}>Server folder</button>}
        </div>
      </div>
      <div className="pbody">
        {scoped.length ? (
          <div className="grid">
            {scoped.map((it) => {
              const r = scoreMap.get(it.id);
              const isTop = best && r === best && best.score >= 20;
              const dim = filter !== 'all' && (!r || r.band !== filter);
              return (
                <div key={it.id} className={'tile' + (r ? ' b-' + r.band : '') + (isTop ? ' top' : '') + (dim ? ' dim' : '')} title={it.person + ' · ' + it.name}>
                  <img src={it.url} alt={it.person} loading="lazy" />
                  {r && <span className="sc">{Math.round(r.score)}%</span>}
                  <div className="cap">{it.person}</div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty">{items.length ? 'No database image matches “' + search + '”.' : 'The database is empty. Load a folder of images.'}</div>
        )}
      </div>
    </section>
  );
}

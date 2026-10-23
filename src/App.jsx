import { useEffect, useMemo, useRef, useState } from 'react';
import { bandOf, compare, getFeat, loadImage } from './matching.js';
import { isImage, personOf, pretty, enc, tick } from './utils.js';
import { SearchIcon, Arrow } from './components/Icons.jsx';
import Sidebar from './components/Sidebar.jsx';
import UploadPanel from './components/UploadPanel.jsx';
import DatabasePanel from './components/DatabasePanel.jsx';
import Report from './components/Report.jsx';

let uid = 0;
const EMPTY_SOURCE = { kind: 'none', label: 'No folder' };

export default function App() {
  const [items, setItems] = useState([]);
  const [source, setSource] = useState(EMPTY_SOURCE);
  const [serverItems, setServerItems] = useState(null);
  const [serverLabel, setServerLabel] = useState('');
  const [samples, setSamples] = useState([]);
  const [query, setQuery] = useState(null);
  const [search, setSearch] = useState('');
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(null);
  const [filter, setFilter] = useState('all');
  const [runKey, setRunKey] = useState(0);
  const [err, setErr] = useState('');
  const reportRef = useRef(null);
  const folderRef = useRef(null);
  const filesRef = useRef(null);
  const queryRef = useRef(null);
  const localUrls = useRef([]);

  /* Load the database folder and the sample uploads served by the dev server. */
  useEffect(() => {
    folderRef.current.setAttribute('webkitdirectory', '');
    folderRef.current.setAttribute('directory', '');
    fetch('/api/database').then((r) => r.json()).then((d) => {
      const list = d.files.map((f) => ({ id: 'd:' + f.path, name: f.name, person: f.folder ? pretty(f.folder + '.x') : pretty(f.name), url: '/database-files/' + enc(f.path) }));
      if (!list.length) return;
      setServerItems(list); setServerLabel(d.dir); setItems(list); setSource({ kind: 'server', label: 'Database folder “' + d.dir + '”' });
    }).catch(() => {});
    fetch('/api/samples').then((r) => r.json()).then((d) => {
      setSamples(d.files.map((f) => ({ id: 's:' + f.path, label: pretty(f.name), name: f.name, url: '/sample-files/' + enc(f.path) })));
    }).catch(() => {});
  }, []);

  const scoped = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? items.filter((it) => (it.person + ' ' + it.name).toLowerCase().includes(q)) : items;
  }, [items, search]);

  /* The matching run. It restarts when the uploaded image, the database or the person search changes. */
  useEffect(() => {
    if (!query || !scoped.length) { setRes(null); setBusy(null); return undefined; }
    let live = true;
    (async () => {
      const t0 = performance.now();
      setBusy({ done: 0, total: scoped.length + 1 });
      try {
        const qf = await getFeat(query);
        query.hash = qf.hash;
        const rows = [];
        for (let i = 0; i < scoped.length; i++) {
          let f = null;
          try { f = await getFeat(scoped[i]); } catch (e) { f = null; }
          if (!live) return;
          if (f) {
            const r = compare(qf, f);
            rows.push({ item: scoped[i], score: r.score, p: r.p, d: r.d, s: r.s, c: r.c, exact: r.exact, tf: r.tf, w: f.w, h: f.h, band: bandOf(r.score).key });
          }
          if (i % 3 === 2) { setBusy({ done: i + 2, total: scoped.length + 1 }); await tick(); }
        }
        rows.sort((a, b) => b.score - a.score);
        if (live) { setRes({ rows, ms: Math.round(performance.now() - t0), query, total: scoped.length, at: new Date() }); setBusy(null); }
      } catch (e) {
        if (live) { setErr('That image could not be read. Try a JPG, PNG or WEBP file.'); setBusy(null); }
      }
    })();
    return () => { live = false; };
  }, [query, scoped, runKey]);

  const loadList = (fileList, label) => {
    const files = Array.from(fileList).filter(isImage);
    if (!files.length) { setErr('No images were found in that selection.'); return; }
    localUrls.current.forEach((u) => URL.revokeObjectURL(u));
    const list = files.map((f) => ({ id: 'f' + (++uid), name: f.name, person: personOf(f), url: URL.createObjectURL(f), file: f }));
    localUrls.current = list.map((l) => l.url);
    const top = (files[0].webkitRelativePath || '').split('/')[0];
    setItems(list); setSource({ kind: 'folder', label: 'Folder “' + (top || label) + '”' }); setSearch(''); setErr(''); setFilter('all');
  };

  const setUploaded = (file) => {
    const url = URL.createObjectURL(file);
    return loadImage(url).then((im) => {
      if (query && !query.sample) URL.revokeObjectURL(query.url);
      setErr(''); setFilter('all');
      setQuery({ id: 'q' + (++uid), name: file.name, file, url, w: im.naturalWidth, h: im.naturalHeight, size: file.size, sample: file.sample });
    }).catch(() => { URL.revokeObjectURL(url); setErr('That file is not a readable image.'); });
  };
  const onQueryFile = (file) => {
    if (!file) return;
    if (!isImage(file)) { setErr('Choose an image file (JPG, PNG or WEBP).'); return; }
    setUploaded(file);
  };
  const onSample = (s) => {
    fetch(s.url).then((r) => r.blob()).then((b) => { const f = new File([b], s.name, { type: b.type }); f.sample = true; return setUploaded(f); }).catch(() => setErr('Could not load that sample.'));
  };
  const useServer = () => {
    localUrls.current.forEach((u) => URL.revokeObjectURL(u)); localUrls.current = [];
    setItems(serverItems); setSource({ kind: 'server', label: 'Database folder “' + serverLabel + '”' }); setSearch(''); setErr('');
  };

  const rows = res && res.query === query ? res.rows : null;
  const scoreMap = useMemo(() => { const m = new Map(); if (rows) rows.forEach((r) => m.set(r.item.id, r)); return m; }, [rows]);
  const counts = useMemo(() => { const c = { exact: 0, strong: 0, weak: 0, none: 0 }; (rows || []).forEach((r) => { c[r.band]++; }); return c; }, [rows]);
  const best = rows && rows[0];
  const total = rows ? rows.length : 0;
  const filterEff = filter !== 'all' && counts[filter] ? filter : 'all';
  const persons = useMemo(() => [...new Set(items.map((i) => i.person))], [items]);

  const status = busy ? 'Matching ' + Math.min(busy.done, busy.total - 1) + ' of ' + (busy.total - 1) + ' images'
    : rows ? 'Compared ' + res.total + ' images in ' + res.ms + ' ms' : query ? 'Ready' : 'Waiting for an uploaded image';
  const jump = () => setTimeout(() => reportRef.current && reportRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);

  return (
    <>
      <div className="shell">
        <Sidebar rows={rows} counts={counts} total={total} best={best} filter={filterEff} setFilter={setFilter} onJump={jump} />
        <main className="main">
          <header className="head">
            <h1>Image Matching Software</h1>
            <div className="searchrow">
              <label className="search" htmlFor="person-search">
                <SearchIcon />
                <input id="person-search" type="search" placeholder="Search person or image name" value={search} list="persons" autoComplete="off" onChange={(e) => setSearch(e.target.value)} />
              </label>
              <datalist id="persons">{persons.map((p) => <option key={p} value={p} />)}</datalist>
              {search.trim() && <span className="scope">Matching only {scoped.length} of {items.length} images</span>}
            </div>
          </header>

          <div className="bench">
            <UploadPanel query={query} err={err} samples={samples} onFile={onQueryFile} onSample={onSample} inputRef={queryRef} />
            <div className="arrows" aria-hidden="true"><Arrow /><Arrow back /></div>
            <DatabasePanel items={items} scoped={scoped} source={source} scoreMap={scoreMap} best={best} filter={filterEff} search={search}
              serverReady={!!serverItems} onFolder={() => folderRef.current.click()} onFiles={() => filesRef.current.click()} onServer={useServer} />
          </div>

          <section className="algo" aria-label="Matching algorithm">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
              <span className="name">Matching algo</span>
              <div className="parts">
                <span className="part">Perceptual hash 25%</span><span className="part">Difference hash 20%</span>
                <span className="part">Structure 45%</span><span className="part">Color 10%</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <span className="status" aria-live="polite">{status}</span>
              <button type="button" className="btn sm" disabled={!query || !scoped.length || !!busy} onClick={() => setRunKey((k) => k + 1)}>Run again</button>
            </div>
          </section>

          <div ref={reportRef} className="rwrap">
            <Report query={query} source={source} itemsCount={items.length} scopedCount={scoped.length} search={search} res={rows ? res : null} rows={rows}
              counts={counts} total={total} best={best} filter={filterEff} setFilter={setFilter} busy={busy} />
          </div>
        </main>
      </div>
      <input id="folder-input" ref={folderRef} type="file" multiple hidden onChange={(e) => { const fl = Array.from(e.target.files); e.target.value = ''; loadList(fl, 'Selected folder'); }} />
      <input id="files-input" ref={filesRef} type="file" accept="image/*" multiple hidden onChange={(e) => { const fl = Array.from(e.target.files); e.target.value = ''; loadList(fl, 'Selected files'); }} />
      <input id="query-input" ref={queryRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files[0]; e.target.value = ''; onQueryFile(f); }} />
    </>
  );
}

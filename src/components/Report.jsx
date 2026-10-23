import { useEffect, useState } from 'react';
import { BANDS, bandOf, describeTf } from '../matching.js';
import { fmtScore, fmtSize, pc, rid } from '../utils.js';

const Section = ({ title, children }) => (<div className="sect"><div className="sh">{title}</div>{children}</div>);
const KV = ({ k, v }) => (<div className="kv"><dt>{k}</dt><dd>{v}</dd></div>);

export default function Report({ query, source, itemsCount, scopedCount, search, res, rows, counts, total, best, filter, setFilter, busy }) {
  const [showAll, setShowAll] = useState(false);
  const [copyText, setCopyText] = useState('');
  const [copyMsg, setCopyMsg] = useState('');
  useEffect(() => { setShowAll(false); setCopyText(''); }, [res]);

  if (!query) return <section className="report"><div className="empty">Upload the latest image to start matching. The match report appears here.</div></section>;
  if (!scopedCount) return <section className="report"><div className="empty">Nothing to compare with. Clear the person search or load a folder.</div></section>;
  if (!rows) {
    return (
      <section className="report"><div className="rbody">
        <p className="muted">Matching in progress…</p>
        <div className="progress"><i style={{ width: busy ? (busy.done / busy.total) * 100 + '%' : '5%' }} /></div>
      </div></section>
    );
  }

  const bd = bandOf(best.score);
  const bi = best.item;
  const tfText = describeTf(best.tf, best.exact);
  const edited = best.exact ? '' : tfText === 'Same framing' ? 'resized, recompressed or lightly edited' : tfText.charAt(0).toLowerCase() + tfText.slice(1);
  const headline = best.exact ? 'The uploaded file is byte-for-byte identical to “' + bi.person + '” in the database.'
    : bd.key === 'strong' ? 'Same picture as “' + bi.person + '”: ' + edited + '.'
    : bd.key === 'weak' ? 'Some resemblance to “' + bi.person + '”, but not enough to call it the same picture.'
    : 'No match. Nothing in the database looks like the uploaded image.';
  const levelName = bd.name.replace(/ \(.*\)/, '');
  const metrics = [['Perceptual hash', best.p], ['Difference hash', best.d], ['Structure', best.s], ['Color', best.c]];
  const shown = rows.filter((r) => filter === 'all' || r.band === filter);
  const expanded = showAll || filter !== 'all';
  const visible = expanded ? shown : shown.slice(0, 20);
  const filterName = filter === 'all' ? 'All comparisons' : BANDS.find((b) => b.key === filter).name;

  const reportText = () => {
    const L = ['IMAGE MATCH REPORT', 'Report: ' + rid(res.at), 'Generated: ' + res.at.toLocaleString(), '',
      'Uploaded image: ' + query.name + ' (' + query.w + ' x ' + query.h + ' px, ' + fmtSize(query.size) + ')',
      'Database: ' + source.label + ', ' + total + ' of ' + itemsCount + ' images compared in ' + res.ms + ' ms'];
    if (search.trim()) L.push('Person filter: ' + search.trim());
    L.push('', 'Result: ' + levelName + ', ' + fmtScore(best.score), 'Closest image: ' + bi.person + ' (' + bi.name + ')', 'Change detected: ' + tfText,
      'Levels: 100% = ' + counts.exact + ' | 80%+ = ' + counts.strong + ' | 20%+ = ' + counts.weak + ' | No match = ' + counts.none, '');
    rows.slice(0, 10).forEach((r, i) => L.push((i + 1) + '. ' + r.item.person + ' - ' + fmtScore(r.score) + ' - ' + describeTf(r.tf, r.exact) + ' (hash ' + pc(r.p) + '%, diff ' + pc(r.d) + '%, structure ' + pc(r.s) + '%, color ' + pc(r.c) + '%)'));
    return L.join('\n');
  };
  const copyReport = () => {
    const t = reportText();
    const done = () => { setCopyMsg('Report copied'); setTimeout(() => setCopyMsg(''), 2000); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done).catch(() => setCopyText(t));
    else setCopyText(t);
  };

  return (
    <section className="report" aria-label="Match report">
      <div className="rhead">
        <div><h2>Image match report</h2><span className="muted small mono">{rid(res.at)} · {res.at.toLocaleString()}</span></div>
        <div className="chips" style={{ alignItems: 'center' }}>
          {copyMsg && <span className="muted small" role="status">{copyMsg}</span>}
          <button type="button" className="btn sm" onClick={copyReport}>Copy report</button>
        </div>
      </div>
      <div className="rbody">
        {copyText && <textarea className="copybox" id="report-text" readOnly value={copyText} aria-label="Report text" onFocus={(e) => e.target.select()} />}

        <Section title="Result">
          <div className={'verdict b-' + bd.key}>
            <div className="pair">
              <figure><img src={query.url} alt="Uploaded image" /><figcaption>Uploaded</figcaption></figure>
              <span className="eq">{bd.key === 'none' ? '≠' : '≈'}</span>
              <figure><img src={bi.url} alt="Closest database image" style={bd.key === 'none' ? { opacity: 0.55 } : null} /><figcaption>Closest: {bi.person}</figcaption></figure>
            </div>
            <div className="vtext">
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}><span className="big">{fmtScore(best.score)}</span><span className="pill">{levelName}</span></div>
              <p>{headline}</p>
              <div className="metrics">
                {metrics.map(([k, v]) => (
                  <div className="metric" key={k}><span>{k}</span><b>{pc(v)}%</b><div className="bar"><i style={{ width: pc(v) + '%' }} /></div></div>
                ))}
              </div>
            </div>
          </div>
        </Section>

        <Section title="Details">
          <div className="facts">
            <div className="fact"><div className="fh">Uploaded image</div>
              <div className="fbody"><img src={query.url} alt="" />
                <dl><KV k="File" v={query.name} /><KV k="Size" v={query.w + ' × ' + query.h + ' px, ' + fmtSize(query.size)} /><KV k="SHA-256" v={(query.hash || '').slice(0, 12) || 'n/a'} /></dl></div></div>
            <div className="fact"><div className="fh">Closest database image</div>
              <div className="fbody"><img src={bi.url} alt="" />
                <dl><KV k="Label" v={bi.person} /><KV k="File" v={bi.name} /><KV k="Size" v={best.w + ' × ' + best.h + ' px'} /><KV k="Change" v={tfText} /></dl></div></div>
            <div className="fact"><div className="fh">Search</div>
              <dl><KV k="Database" v={source.label} /><KV k="Compared" v={total + ' of ' + itemsCount + ' images'} /><KV k="Person filter" v={search.trim() ? '“' + search.trim() + '”' : 'None'} /><KV k="Time taken" v={res.ms + ' ms'} /></dl></div>
          </div>
        </Section>

        <Section title="Match levels">
          <div>
            <div className="stack" role="img" aria-label={BANDS.map((b) => b.label + ': ' + counts[b.key]).join(', ')}>
              {BANDS.map((b) => counts[b.key] ? <i key={b.key} className={'seg b-' + b.key} style={{ flexGrow: counts[b.key] }} /> : null)}
            </div>
            <div className="slegend">{BANDS.map((b) => <span key={b.key} className={'b-' + b.key}><i className="dot" />{b.label} · {counts[b.key]}</span>)}</div>
          </div>
        </Section>

        <Section title={filterName}>
          <div>
            {filter !== 'all' && (
              <p className="muted small" style={{ marginBottom: 8 }}>{shown.length} of {total} images <button type="button" className="btn sm" style={{ marginLeft: 6 }} onClick={() => setFilter('all')}>Show all</button></p>
            )}
            {shown.length ? (
              <div className="tablewrap">
                <table>
                  <thead><tr>{['#', 'Database image', 'Score', 'Level', 'Change detected', 'Hash', 'Diff', 'Structure', 'Color'].map((t) => <th key={t}>{t}</th>)}</tr></thead>
                  <tbody>
                    {visible.map((r, i) => (
                      <tr key={r.item.id} className={'b-' + r.band}>
                        <td className="num muted">{i + 1}</td>
                        <td><div className="who"><img src={r.item.url} alt="" /><div><div>{r.item.person}</div><div className="fn">{r.item.name}</div></div></div></td>
                        <td><div className="scorecell"><span className="mono" style={{ fontWeight: 600 }}>{fmtScore(r.score)}</span><div className="bar"><i style={{ width: r.score + '%' }} /></div></div></td>
                        <td><span className="pill">{r.exact ? '100% exact' : BANDS.find((b) => b.key === r.band).label}</span></td>
                        <td className="small muted">{r.band === 'none' ? '–' : describeTf(r.tf, r.exact)}</td>
                        <td className="num">{pc(r.p)}%</td><td className="num">{pc(r.d)}%</td><td className="num">{pc(r.s)}%</td><td className="num">{pc(r.c)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <div className="empty">No images at this level.</div>}
            {filter === 'all' && shown.length > 20 && (
              <div style={{ marginTop: 10 }}><button type="button" className="btn sm" onClick={() => setShowAll(!showAll)}>{showAll ? 'Show top 20' : 'Show all ' + shown.length}</button></div>
            )}
          </div>
        </Section>

        <Section title="How this was measured">
          <p className="method small muted">
            Each image is reduced to a 32 × 32 thumbnail and compared four ways: perceptual hash (25%), difference hash (20%), color-aware structure (45%) and color histogram (10%).
            Every database image is also tested as a center crop of up to 36%, mirrored, and rotated, and the best alignment is reported. Identical files are detected by SHA-256 and score 100%.
            Levels: 100% exact, 80% and above strong, 20% to 79% weak, below 20% no match. This compares pictures and does not identify people: a different photo of the same person will usually score low.
          </p>
        </Section>
      </div>
    </section>
  );
}

/* Image matching: perceptual hash + difference hash + color-aware structure + color histogram,
   tested against crops, mirrored and rotated versions. Runs fully in the browser. */
/* =====================  Matching algorithm  ===================== */
var BANDS = [
  { key: 'exact',  label: '100%',     name: 'Exact match',  min: 99.5 },
  { key: 'strong', label: '80%',      name: 'Strong match (80% and above)', min: 80 },
  { key: 'weak',   label: '20%',      name: 'Weak match (20% to 79%)', min: 20 },
  { key: 'none',   label: 'No match', name: 'Below 20%', min: -1 }
];
function bandOf(score) { for (var i = 0; i < BANDS.length; i++) if (score >= BANDS[i].min) return BANDS[i]; return BANDS[3]; }
var W = { p: 0.25, d: 0.20, s: 0.45, c: 0.10 };
var ZOOMS = [1, 0.94, 0.88, 0.82, 0.76, 0.70, 0.64];

var COS = (function () {
  var N = 32, t = [];
  for (var k = 0; k < 8; k++) { t.push([]); for (var n = 0; n < N; n++) t[k].push(Math.cos(Math.PI * (2 * n + 1) * k / (2 * N))); }
  return t;
})();

function mk(w, hh) { var c = document.createElement('canvas'); c.width = w; c.height = hh; return c; }
function shrinkTo(src, w, hh) {
  var cur = src, c, x, nw, nh;
  while (cur.width > w * 2 || cur.height > hh * 2) {
    nw = Math.max(w, Math.ceil(cur.width / 2)); nh = Math.max(hh, Math.ceil(cur.height / 2));
    c = mk(nw, nh); x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(cur, 0, 0, nw, nh); cur = c;
  }
  c = mk(w, hh); x = c.getContext('2d', { willReadFrequently: true }); x.imageSmoothingQuality = 'high'; x.drawImage(cur, 0, 0, w, hh);
  return c;
}
function makeMaster(img) {
  var iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height, sc = Math.min(1, 768 / Math.max(iw, ih));
  var w = Math.max(8, Math.round(iw * sc)), hh = Math.max(8, Math.round(ih * sc));
  var big = mk(iw, ih), bx = big.getContext('2d'); bx.fillStyle = '#fff'; bx.fillRect(0, 0, iw, ih); bx.drawImage(img, 0, 0);
  var m = shrinkTo(big, w, hh), mx = m.getContext('2d');
  return m;
}
function pixels(c) { return c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, c.width, c.height).data; }
function toGray(d, n) {
  var g = new Float32Array(n);
  for (var i = 0; i < n; i++) g[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
  return g;
}
function phash(g) {
  var N = 32, tmp = new Float32Array(N * 8), out = new Float32Array(64), y, x, u, v, s;
  for (y = 0; y < N; y++) for (u = 0; u < 8; u++) { s = 0; for (x = 0; x < N; x++) s += g[y * N + x] * COS[u][x]; tmp[y * 8 + u] = s; }
  for (u = 0; u < 8; u++) for (v = 0; v < 8; v++) { s = 0; for (y = 0; y < N; y++) s += tmp[y * 8 + u] * COS[v][y]; out[v * 8 + u] = s; }
  var vals = Array.prototype.slice.call(out, 1);
  var sorted = vals.slice().sort(function (a, b) { return a - b; });
  var med = sorted[Math.floor(sorted.length / 2)];
  var bits = new Uint8Array(vals.length);
  for (var i = 0; i < vals.length; i++) bits[i] = vals[i] > med ? 1 : 0;
  return bits;
}
function variantFeat(master, o) {
  var iw = master.width, ih = master.height, sw = iw * o.z, sh = ih * o.z, sx = (iw - sw) / 2, sy = (ih - sh) / 2;
  var base = mk(256, 256), x = base.getContext('2d');
  x.fillStyle = '#fff'; x.fillRect(0, 0, 256, 256); x.imageSmoothingQuality = 'high';
  x.save(); x.translate(128, 128); x.rotate(o.rot * Math.PI / 2); if (o.flip) x.scale(-1, 1);
  x.drawImage(master, sx, sy, sw, sh, -128, -128, 256, 256); x.restore();
  var c32 = shrinkTo(base, 32, 32), d32 = pixels(c32), g = toGray(d32, 1024), i, y, xx;
  var hist = new Float32Array(64);
  for (i = 0; i < 1024; i++) hist[((d32[i * 4] >> 6) << 4) | ((d32[i * 4 + 1] >> 6) << 2) | (d32[i * 4 + 2] >> 6)]++;
  for (i = 0; i < 64; i++) hist[i] /= 1024;
  var g9 = toGray(pixels(shrinkTo(c32, 9, 8)), 72), dbits = new Uint8Array(64);
  for (y = 0; y < 8; y++) for (xx = 0; xx < 8; xx++) dbits[y * 8 + xx] = g9[y * 9 + xx] > g9[y * 9 + xx + 1] ? 1 : 0;
  var gz = new Float32Array(3072), nn = 0, ch, m;
  for (ch = 0; ch < 3; ch++) {
    m = 0; for (i = 0; i < 1024; i++) m += d32[i * 4 + ch]; m /= 1024;
    for (i = 0; i < 1024; i++) { gz[ch * 1024 + i] = d32[i * 4 + ch] - m; nn += gz[ch * 1024 + i] * gz[ch * 1024 + i]; }
  }
  return { hist: hist, dbits: dbits, pbits: phash(g), gz: gz, norm: Math.sqrt(nn) };
}
function extract(img, hash) {
  var master = makeMaster(img), v = [];
  ZOOMS.forEach(function (z) { [0, 1].forEach(function (fl) { v.push({ z: z, flip: fl, rot: 0, f: variantFeat(master, { z: z, flip: fl, rot: 0 }) }); }); });
  [1, 2, 3].forEach(function (r) { v.push({ z: 1, flip: 0, rot: r, f: variantFeat(master, { z: 1, flip: 0, rot: r }) }); });
  return { hash: hash, v: v, w: img.naturalWidth || img.width, h: img.naturalHeight || img.height };
}
function hamSim(a, b) { var n = 0; for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) n++; return 1 - n / a.length; }
function rescale(v) { return Math.max(0, (v - 0.5) / 0.5); }
function scorePair(a, b) {
  var p = rescale(hamSim(a.pbits, b.pbits)), d = rescale(hamSim(a.dbits, b.dbits)), i;
  var dot = 0; for (i = 0; i < 3072; i++) dot += a.gz[i] * b.gz[i];
  var s = a.norm && b.norm ? Math.max(0, dot / (a.norm * b.norm)) : 0;
  var inter = 0; for (i = 0; i < 64; i++) inter += Math.min(a.hist[i], b.hist[i]);
  var c = Math.max(0, (inter - 0.3) / 0.7);
  return { score: 100 * (W.p * p + W.d * d + W.s * s + W.c * c), p: p, d: d, s: s, c: c };
}
function calibrate(raw) {
  /* Unrelated photos land below 35 raw, so squash that range under the 20% line. */
  return raw < 35 ? raw * 0.5 : 17.5 + (raw - 35) * (82.5 / 65);
}
function compare(qa, cb) {
  if (qa.hash && qa.hash === cb.hash) return { score: 100, p: 1, d: 1, s: 1, c: 1, exact: true, tf: { z: 1, flip: 0, rot: 0, side: 'db' } };
  var best = null, i, r, v;
  for (i = 0; i < cb.v.length; i++) {
    v = cb.v[i]; r = scorePair(qa.v[0].f, v.f);
    if (!best || r.score > best.score) { best = r; best.tf = { z: v.z, flip: v.flip, rot: v.rot, side: 'db' }; }
  }
  for (i = 0; i < qa.v.length; i++) {
    v = qa.v[i]; if (v.flip || v.rot || v.z === 1) continue;
    r = scorePair(v.f, cb.v[0].f);
    if (r.score > best.score) { best = r; best.tf = { z: v.z, flip: 0, rot: 0, side: 'q' }; }
  }
  best.score = Math.min(99.4, Math.round(calibrate(best.score) * 10) / 10); best.exact = false;
  return best;
}
function describeTf(tf, exact) {
  if (exact) return 'Identical file';
  var t = [];
  if (tf.rot) t.push('Rotated ' + tf.rot * 90 + '°');
  if (tf.flip) t.push('Mirrored');
  if (tf.z < 1) t.push(tf.side === 'db' ? 'Cropped about ' + Math.round((1 - tf.z) * 100) + '%' : 'Wider framing');
  return t.length ? t.join(', ') : 'Same framing';
}
function fileHash(file) {
  return file.arrayBuffer().then(function (buf) {
    if (window.crypto && crypto.subtle) {
      return crypto.subtle.digest('SHA-256', buf).then(function (dg) {
        return Array.prototype.map.call(new Uint8Array(dg), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
      });
    }
    var u = new Uint8Array(buf), x = 2166136261;
    for (var i = 0; i < u.length; i++) { x ^= u[i]; x = Math.imul(x, 16777619); }
    return 'f' + (x >>> 0).toString(16) + u.length;
  }).catch(function () { return ''; });
}
function loadImage(url) {
  return new Promise(function (res, rej) {
    var im = new Image(); im.onload = function () { res(im); }; im.onerror = function () { rej(new Error('load')); }; im.src = url;
  });
}
var featCache = new Map();
function getFile(o) { return o.file ? Promise.resolve(o.file) : fetch(o.url).then(function (r) { return r.blob(); }); }
function getFeat(o) {
  var f = featCache.get(o.id);
  if (f) return Promise.resolve(f);
  return Promise.all([loadImage(o.url), getFile(o).then(fileHash)]).then(function (r) {
    var feat = extract(r[0], r[1]); featCache.set(o.id, feat); return feat;
  });
}

export { BANDS, bandOf, compare, describeTf, getFeat, loadImage };

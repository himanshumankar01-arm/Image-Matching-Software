export const IMG_RE = /\.(png|jpe?g|webp|bmp|gif)$/i;
export const isImage = (f) => /^image\//.test(f.type) || IMG_RE.test(f.name);
const title = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase());
export const pretty = (s) => title(s.replace(/\.[^.]+$/, '').replace(/[_\-]+/g, ' ').replace(/\s+/g, ' ').trim());
/* The person is the sub-folder name when images are grouped in folders, otherwise the file name. */
export function personOf(file) {
  const parts = (file.webkitRelativePath || '').split('/');
  return parts.length > 2 ? pretty(parts[parts.length - 2] + '.x') : pretty(file.name);
}
export const fmtScore = (s) => s.toFixed(1) + '%';
export const fmtSize = (b) => (b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB');
export const pc = (v) => Math.round(v * 100);
const z = (n) => ('0' + n).slice(-2);
export const rid = (d) => 'IMR-' + d.getFullYear() + z(d.getMonth() + 1) + z(d.getDate()) + '-' + z(d.getHours()) + z(d.getMinutes()) + z(d.getSeconds());
export const tick = () => new Promise((r) => setTimeout(r, 0));
export const enc = (p) => p.split('/').map(encodeURIComponent).join('/');

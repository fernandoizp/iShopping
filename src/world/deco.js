// Decorados procedurales. Cada uno devuelve { img, ax, ay, hang, lights, anim }.
// ax/ay: punto de anclaje dentro de la imagen (base centrada, o arriba centrada si cuelga).
import { mk, crisp, outline, rng, mixHex, shade, hex, rgbStr, fbm } from '../core/gfx.js';

const OUT = '#0b0810';
function canvas(w, h, draw, opts = {}) {
  const [c, x] = mk(w, h);
  draw(x, w, h);
  crisp(c, opts.th ?? 90);
  if (opts.outline !== false) outline(c, opts.ol || OUT);
  return c;
}
const base = (img, extra = {}) => ({ img, ax: img.width / 2, ay: img.height, ...extra });
const hang = (img, extra = {}) => ({ img, ax: img.width / 2, ay: 0, hang: true, ...extra });

function grad(x, x0, y0, x1, y1, stops) { const g = x.createLinearGradient(x0, y0, x1, y1); stops.forEach((s, i) => g.addColorStop(i / (stops.length - 1), s)); return g; }

const FLAME = ['#fff6d0', '#ffd870', '#ff9a30', '#e2501c'];
export function drawFlame(ctx, x, y, t, s = 1) {
  for (let k = 0; k < 7; k++) {
    const ph = (t * 0.25 + k * 1.7) % 6, h = (ph / 6) * 9 * s;
    ctx.fillStyle = FLAME[Math.min(3, Math.floor(ph / 1.6))];
    ctx.fillRect(Math.round(x + Math.sin(t * 0.3 + k) * 1.5 * s - s), Math.round(y - h), Math.ceil(2 * s), Math.ceil(2 * s));
  }
  ctx.fillStyle = FLAME[0]; ctx.fillRect(Math.round(x - s), Math.round(y - 3 * s), Math.ceil(2 * s), Math.ceil(3 * s));
}

const BUILDERS = {
  // ───── Jardines ─────
  gate: (z) => base(canvas(120, 150, (x) => {
    x.fillStyle = grad(x, 0, 0, 120, 0, ['#cdb595', '#e8d6b4', '#a88f78']);
    x.fillRect(4, 30, 22, 120); x.fillRect(94, 30, 22, 120);
    x.fillRect(0, 22, 30, 10); x.fillRect(90, 22, 30, 10);
    x.fillStyle = '#c4623e'; x.beginPath(); x.moveTo(-2, 22); x.lineTo(15, 6); x.lineTo(32, 22); x.fill(); x.beginPath(); x.moveTo(88, 22); x.lineTo(105, 6); x.lineTo(122, 22); x.fill();
    x.strokeStyle = '#1d1a1e'; x.lineWidth = 2;
    for (let i = 30; i < 92; i += 7) { x.beginPath(); x.moveTo(i, 150); x.lineTo(i, 60 + Math.abs(i - 61) * 0.5); x.stroke(); }
    x.beginPath(); x.arc(60, 70, 32, Math.PI, 0); x.stroke(); x.beginPath(); x.moveTo(26, 96); x.lineTo(94, 96); x.stroke();
    x.fillStyle = '#d8a43a'; x.beginPath(); x.arc(60, 54, 8, 0, 7); x.fill(); x.fillStyle = '#1d1a1e'; x.font = 'bold 9px serif'; x.fillText('P', 57, 58);
    x.fillStyle = 'rgba(80,60,40,0.25)'; x.fillRect(20, 30, 6, 120); x.fillRect(110, 30, 6, 120);
  }), { light: [{ dx: 0, dy: -96, r: 40, col: '#ffd890' }] }),
  lamp: () => base(canvas(14, 64, (x) => {
    x.fillStyle = '#1d1a1e'; x.fillRect(6, 10, 2, 54); x.fillRect(3, 60, 8, 4);
    x.fillStyle = '#2a2630'; x.fillRect(2, 2, 10, 10); x.fillStyle = '#ffd870'; x.fillRect(4, 4, 6, 6); x.fillStyle = '#fff4c8'; x.fillRect(5, 5, 2, 2);
    x.fillStyle = '#1d1a1e'; x.fillRect(1, 0, 12, 2);
  }), { light: [{ dx: 0, dy: -57, r: 56, col: '#ffcf80', flicker: 0.05 }] }),
  cypress: (z) => base(canvas(26, 110, (x) => {
    x.fillStyle = grad(x, 0, 0, 26, 0, ['#2a4a30', '#3f6b3a', '#1c3424']);
    x.beginPath(); x.moveTo(13, 0); x.bezierCurveTo(26, 30, 26, 90, 17, 104); x.lineTo(9, 104); x.bezierCurveTo(0, 90, 0, 30, 13, 0); x.fill();
    for (let k = 0; k < 40; k++) { x.fillStyle = k % 2 ? 'rgba(160,200,110,0.4)' : 'rgba(10,30,20,0.4)'; x.fillRect(5 + Math.random() * 14, 8 + Math.random() * 90, 2, 1); }
    x.fillStyle = '#4a3020'; x.fillRect(11, 102, 4, 8);
  })),
  pot: () => base(canvas(18, 22, (x) => {
    x.fillStyle = grad(x, 0, 0, 18, 0, ['#d27854', '#b5583a', '#7a3424']); x.fillRect(3, 10, 12, 12); x.fillRect(1, 8, 16, 3);
    for (let k = 0; k < 16; k++) { x.fillStyle = Math.random() < 0.5 ? '#d2314a' : '#f28aa1'; x.fillRect(2 + Math.random() * 14, Math.random() * 8, 2, 2); x.fillStyle = '#3f7a39'; x.fillRect(3 + Math.random() * 12, 2 + Math.random() * 6, 1, 3); }
  })),
  bush: () => base(canvas(48, 22, (x) => {
    for (let k = 0; k < 14; k++) { x.fillStyle = ['#1c3424', '#2a4a30', '#3f6b3a'][k % 3]; x.beginPath(); x.arc(6 + k * 3, 14 - Math.sin(k) * 4, 7, 0, 7); x.fill(); }
    for (let k = 0; k < 8; k++) { x.fillStyle = '#d2475f'; x.fillRect(4 + Math.random() * 40, 4 + Math.random() * 12, 2, 2); }
  })),
  orange: () => base(canvas(64, 80, (x) => {
    x.fillStyle = '#4a3020'; x.fillRect(29, 40, 6, 40); x.fillRect(22, 46, 10, 3);
    for (let k = 0; k < 26; k++) { const a = k / 26 * Math.PI * 2, r = 16 + Math.sin(k * 3) * 6; x.fillStyle = ['#1c3a24', '#2f5a30', '#4a7c3a'][k % 3]; x.beginPath(); x.arc(32 + Math.cos(a) * r * 0.9, 28 + Math.sin(a) * r * 0.7, 10, 0, 7); x.fill(); }
    x.fillStyle = '#4a7c3a'; x.beginPath(); x.arc(32, 26, 16, 0, 7); x.fill();
    for (let k = 0; k < 14; k++) { x.fillStyle = '#ff9a2a'; const px = 12 + Math.random() * 40, py = 10 + Math.random() * 34; x.fillRect(px, py, 3, 3); x.fillStyle = '#ffd070'; x.fillRect(px, py, 1, 1); }
  })),
  fountain: () => base(canvas(70, 48, (x) => {
    x.fillStyle = grad(x, 0, 30, 0, 48, ['#d8d0c4', '#8a8478']); x.fillRect(2, 32, 66, 16);
    x.fillStyle = '#2f6aa0'; x.fillRect(6, 34, 58, 5); x.fillStyle = '#8fd0e6'; x.fillRect(6, 34, 58, 1);
    x.fillStyle = '#c4bcb0'; x.fillRect(31, 10, 8, 24); x.fillRect(20, 8, 30, 5); x.fillStyle = '#efe8dc'; x.fillRect(20, 8, 30, 1);
    for (let i = 4; i < 66; i += 8) { x.fillStyle = (i / 8) % 2 ? '#2f6aa0' : '#e8e2d2'; x.fillRect(i, 41, 8, 5); }
  }), { anim: water(35, 8, 26) }),
  lionfountain: () => base(canvas(112, 56, (x) => {
    x.fillStyle = grad(x, 0, 30, 0, 56, ['#e2d8cc', '#8a8478']); x.fillRect(4, 36, 104, 20);
    x.fillStyle = '#2f6aa0'; x.fillRect(8, 38, 96, 6); x.fillStyle = '#8fd0e6'; x.fillRect(8, 38, 96, 1);
    for (let i = 8; i < 104; i += 8) { x.fillStyle = (i / 8) % 2 ? '#2f6aa0' : '#e8e2d2'; x.fillRect(i, 47, 8, 6); }
    x.fillStyle = '#c4bcb0'; x.fillRect(50, 8, 12, 30); x.fillRect(36, 4, 40, 6); x.fillStyle = '#efe8dc'; x.fillRect(36, 4, 40, 1);
    for (const lx of [16, 80]) { x.fillStyle = '#b8ac98'; x.beginPath(); x.arc(lx + 8, 30, 9, 0, 7); x.fill(); x.fillRect(lx, 30, 16, 8); x.fillStyle = '#8a7e6a'; x.fillRect(lx + 12, 28, 3, 2); x.fillStyle = '#d6ccbc'; x.beginPath(); x.arc(lx + 6, 27, 4, 0, 7); x.fill(); }
  }), { anim: water(56, 4, 34) }),
  arcade: () => base(canvas(90, 120, (x) => {
    x.fillStyle = '#cdb595'; x.fillRect(0, 0, 90, 120);
    x.globalCompositeOperation = 'destination-out';
    for (const ax of [6, 48]) { x.beginPath(); x.moveTo(ax, 120); x.lineTo(ax, 40); x.arc(ax + 18, 42, 18, Math.PI, 0); x.lineTo(ax + 36, 120); x.fill(); }
    x.globalCompositeOperation = 'source-over';
    x.fillStyle = '#c4623e'; x.fillRect(0, 0, 90, 8); x.fillStyle = 'rgba(70,40,30,0.35)'; x.fillRect(0, 8, 90, 3);
    for (let i = 0; i < 90; i += 6) { x.fillStyle = (i / 6) % 2 ? '#2f6aa0' : '#e8e2d2'; x.fillRect(i, 14, 6, 6); }
  }, { th: 60 }), { dim: 0.55 }),
  lockdoor: () => ({ img: canvas(70, 30, (x) => {
    x.fillStyle = '#d8a43a'; x.beginPath(); x.arc(35, 30, 30, Math.PI, 0); x.fill();
    x.fillStyle = '#5a3a10'; x.beginPath(); x.arc(35, 30, 24, Math.PI, 0); x.fill();
    x.fillStyle = '#ffe08a'; x.beginPath(); x.arc(35, 18, 6, 0, 7); x.fill(); x.fillStyle = '#5a3a10'; x.fillRect(33, 16, 4, 6);
  }), ax: 35, ay: 30, light: [{ dx: 0, dy: -12, r: 30, col: '#ffd060' }] }),
  vines: () => hang(canvas(40, 90, (x) => {
    for (let s = 0; s < 6; s++) {
      const sx = 4 + s * 6, L = 30 + ((s * 37) % 55);
      for (let j = 0; j < L; j++) { const w = Math.sin(j * 0.18 + s) * 2; x.fillStyle = '#2e5a33'; x.fillRect(sx + w, j, 2, 1); if (j % 5 === 2) { x.fillStyle = j % 3 ? '#4c8a43' : '#d1357b'; x.fillRect(sx + w - 2, j, 3, 2); } }
    }
  }), { sway: true }),

  // ───── Meseta ─────
  windmill: () => base(canvas(70, 130, (x) => {
    x.fillStyle = grad(x, 14, 0, 56, 0, ['#f0e6d4', '#d8ccb6', '#a89c86']);
    x.beginPath(); x.moveTo(18, 130); x.lineTo(24, 40); x.lineTo(46, 40); x.lineTo(52, 130); x.fill();
    x.fillStyle = '#5a3a2a'; x.beginPath(); x.moveTo(18, 42); x.lineTo(35, 22); x.lineTo(52, 42); x.fill();
    x.fillStyle = '#3a2a22'; x.fillRect(31, 106, 9, 24); x.fillStyle = '#5a4a3a'; x.fillRect(30, 70, 6, 8); x.fillRect(38, 56, 5, 6);
  }), { anim: windmillSails(35, -92) }),
  hay: () => base(canvas(30, 20, (x) => {
    x.fillStyle = grad(x, 0, 0, 0, 20, ['#f0d070', '#c49a40', '#8a6a28']); x.fillRect(1, 2, 28, 18);
    x.fillStyle = '#8a6a28'; for (let i = 3; i < 28; i += 3) x.fillRect(i, 2, 1, 18); x.fillStyle = '#5a3a1a'; x.fillRect(8, 2, 2, 18); x.fillRect(20, 2, 2, 18);
  })),
  fence: () => base(canvas(48, 22, (x) => {
    x.fillStyle = '#6a4a30'; for (let i = 2; i < 48; i += 14) x.fillRect(i, 2, 4, 20);
    x.fillStyle = '#8a6a48'; x.fillRect(0, 6, 48, 3); x.fillRect(0, 14, 48, 3);
  })),
  drytree: () => base(canvas(50, 70, (x) => {
    x.strokeStyle = '#3a2618'; x.lineCap = 'round';
    const br = (x0, y0, a, l, w) => { if (l < 4) return; const x1 = x0 + Math.cos(a) * l, y1 = y0 + Math.sin(a) * l; x.lineWidth = w; x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y1); x.stroke(); br(x1, y1, a - 0.5, l * 0.68, w * 0.7); br(x1, y1, a + 0.45, l * 0.62, w * 0.7); };
    br(25, 70, -Math.PI / 2, 24, 5);
  })),
  rock: () => base(canvas(34, 18, (x) => { x.fillStyle = grad(x, 0, 0, 34, 18, ['#c79c66', '#77533a']); x.beginPath(); x.ellipse(17, 14, 16, 10, 0, Math.PI, 0); x.fill(); x.fillRect(1, 13, 32, 5); })),
  grassfg: () => base(canvas(60, 22, (x) => { for (let i = 0; i < 60; i += 2) { x.fillStyle = i % 4 ? '#5a4a1a' : '#7a6a2a'; const h = 8 + Math.sin(i * 1.7) * 6 + 6; x.fillRect(i, 22 - h, 1, h); } }, { outline: false })),
  millstone: () => base(canvas(40, 40, (x) => { x.fillStyle = grad(x, 0, 0, 40, 40, ['#a8a090', '#5a5448']); x.beginPath(); x.arc(20, 22, 18, 0, 7); x.fill(); x.fillStyle = '#2a2622'; x.beginPath(); x.arc(20, 22, 4, 0, 7); x.fill(); for (let k = 0; k < 8; k++) { x.strokeStyle = '#6a6458'; x.beginPath(); x.moveTo(20, 22); x.lineTo(20 + Math.cos(k * 0.8) * 16, 22 + Math.sin(k * 0.8) * 16); x.stroke(); } })),
  sacks: () => base(canvas(34, 24, (x) => { for (const [sx, sy] of [[2, 8], [16, 8], [9, 0]]) { x.fillStyle = grad(x, sx, 0, sx + 16, 0, ['#e0d0b0', '#a89070']); x.beginPath(); x.ellipse(sx + 8, sy + 9, 8, 8, 0, 0, 7); x.fill(); x.fillStyle = '#7a6040'; x.fillRect(sx + 6, sy, 4, 2); } })),
  beam: () => hang(canvas(140, 14, (x) => { x.fillStyle = grad(x, 0, 0, 0, 14, ['#8a6a48', '#4a3020']); x.fillRect(0, 0, 140, 12); for (let i = 6; i < 140; i += 22) { x.fillStyle = '#2a1a10'; x.fillRect(i, 4, 2, 2); } })),

  // ───── Cuevas ─────
  torch: () => base(canvas(10, 20, (x) => { x.fillStyle = '#3a2a20'; x.fillRect(3, 6, 4, 14); x.fillStyle = '#5a5048'; x.fillRect(1, 4, 8, 4); }), { anim: (ctx, X, Y, t) => drawFlame(ctx, X, Y - 20, t), light: [{ dx: 0, dy: -24, r: 70, col: '#ff9a40', flicker: 0.15 }] }),
  bones: () => base(canvas(30, 12, (x) => { x.fillStyle = '#d8ccb0'; x.fillRect(2, 8, 18, 2); x.fillRect(10, 5, 14, 2); x.beginPath(); x.arc(24, 8, 4, 0, 7); x.fill(); x.fillStyle = '#2a2020'; x.fillRect(22, 7, 2, 2); x.fillRect(25, 7, 1, 2); })),
  painting: () => ({ img: canvas(80, 40, (x) => {
    // arte rupestre: ciervos y cazadores en ocre
    x.fillStyle = '#b5562e';
    const deer = (dx, dy, s) => { x.fillRect(dx, dy, 10 * s, 3 * s); x.fillRect(dx + 1, dy + 3 * s, s, 5 * s); x.fillRect(dx + 8 * s, dy + 3 * s, s, 5 * s); x.fillRect(dx + 9 * s, dy - 4 * s, 2 * s, 4 * s); x.fillRect(dx + 8 * s, dy - 7 * s, s, 3 * s); x.fillRect(dx + 11 * s, dy - 7 * s, s, 3 * s); };
    deer(6, 18, 1); deer(30, 14, 1.4); deer(58, 22, 1);
    x.fillStyle = '#7a2a1a'; for (const hx2 of [20, 50, 70]) { x.fillRect(hx2, 26, 1, 8); x.fillRect(hx2 - 2, 29, 5, 1); x.fillRect(hx2 - 1, 34, 1, 3); x.fillRect(hx2 + 1, 34, 1, 3); x.fillRect(hx2, 24, 2, 2); x.fillRect(hx2 + 3, 25, 6, 1); }
    x.fillStyle = '#e8dcc0'; for (let k = 0; k < 6; k++) x.fillRect(4 + k * 13, 4, 3, 3);
  }, { outline: false }), ax: 40, ay: 40, dim: 0.7 }),
  roots: () => hang(canvas(40, 50, (x) => { x.strokeStyle = '#3a2618'; x.lineWidth = 2; for (let s = 0; s < 5; s++) { x.beginPath(); x.moveTo(6 + s * 7, 0); for (let j = 0; j < 40; j += 4) x.lineTo(6 + s * 7 + Math.sin(j * 0.2 + s) * 3, j + (s * 7) % 12); x.stroke(); } })),
  hut: () => base(canvas(70, 56, (x) => {
    x.fillStyle = grad(x, 0, 0, 70, 0, ['#a07a4c', '#7c5a3c', '#58402f']); x.beginPath(); x.ellipse(35, 56, 30, 34, 0, Math.PI, 0); x.fill();
    x.fillStyle = '#c49d64'; x.beginPath(); x.moveTo(0, 30); x.lineTo(35, 2); x.lineTo(70, 30); x.fill();
    for (let i = 4; i < 66; i += 3) { x.fillStyle = '#8a6a3a'; x.fillRect(i, 30 - Math.abs(35 - i) * 0.0, 1, 2); }
    x.fillStyle = '#1a1210'; x.fillRect(28, 38, 14, 18);
  })),
  pottery: () => base(canvas(16, 18, (x) => { x.fillStyle = grad(x, 0, 0, 16, 0, ['#c47a4a', '#8a4a2a']); x.beginPath(); x.ellipse(8, 11, 7, 7, 0, 0, 7); x.fill(); x.fillRect(5, 1, 6, 5); x.fillStyle = '#2a1a10'; x.fillRect(3, 10, 10, 1); })),
  goldpile: () => base(canvas(70, 26, (x) => {
    for (let j = 0; j < 24; j++) { const w = 34 * Math.sqrt(1 - j / 24); for (let i = -w; i < w; i++) { const v = Math.random(); x.fillStyle = v < 0.08 ? '#fff1a8' : v < 0.45 ? '#d8a43a' : v < 0.8 ? '#a5712a' : '#6d4520'; x.fillRect(35 + i, 25 - j, 1, 1); } }
    x.fillStyle = '#c84a4a'; x.fillRect(20, 12, 3, 3); x.fillStyle = '#4a8ac8'; x.fillRect(46, 15, 3, 3);
  }, { outline: false }), { light: [{ dx: 0, dy: -10, r: 40, col: '#ffcc50' }] }),
  stalactites: () => hang(canvas(60, 40, (x) => { for (let s = 0; s < 6; s++) { const sx = 4 + s * 10, L = 14 + ((s * 23) % 24); x.fillStyle = s % 2 ? '#2a1f2e' : '#3d2e3e'; x.beginPath(); x.moveTo(sx - 4, 0); x.lineTo(sx + 4, 0); x.lineTo(sx, L); x.fill(); } })),
  column: (z) => base(canvas(26, 140, (x) => {
    const c1 = z.material === 'marble' ? ['#f6f0ea', '#c4b8b6', '#8a7e7e'] : ['#9a8590', '#574456', '#2a1f2e'];
    x.fillStyle = grad(x, 3, 0, 23, 0, c1); x.fillRect(4, 10, 18, 120);
    x.fillStyle = 'rgba(0,0,0,0.18)'; for (let i = 7; i < 22; i += 4) x.fillRect(i, 12, 1, 116);
    x.fillStyle = c1[1]; x.fillRect(0, 2, 26, 9); x.fillRect(0, 128, 26, 12);
    if (z.material === 'marble') { x.fillStyle = '#d8a43a'; x.fillRect(0, 10, 26, 2); x.fillRect(0, 127, 26, 2); }
    else { x.fillStyle = '#0c080e'; x.fillRect(4, 40, 18, 3); x.beginPath(); x.moveTo(4, 40); x.lineTo(14, 52); x.lineTo(22, 43); x.fill(); }
  }), { dim: 0.85 }),

  // ───── Fiordo ─────
  pine: () => base(canvas(40, 90, (x) => {
    for (let k = 0; k < 6; k++) {
      const y0 = 4 + k * 13, w = 5 + k * 3.2;
      x.fillStyle = k % 2 ? '#1f3a34' : '#2a4a40'; x.beginPath(); x.moveTo(20, y0); x.lineTo(20 + w, y0 + 20); x.lineTo(20 - w, y0 + 20); x.fill();
      x.fillStyle = '#e4eef4'; x.beginPath(); x.moveTo(20, y0); x.lineTo(20 + w * 0.6, y0 + 9); x.lineTo(20 - w * 0.8, y0 + 11); x.fill();
    }
    x.fillStyle = '#3a2a20'; x.fillRect(18, 82, 4, 8);
  })),
  frozen: () => base(canvas(28, 46, (x) => {
    x.fillStyle = 'rgba(160,210,235,0.9)'; x.beginPath(); x.moveTo(2, 46); x.lineTo(4, 8); x.lineTo(14, 0); x.lineTo(25, 10); x.lineTo(26, 46); x.fill();
    x.fillStyle = '#4a5a6a'; x.fillRect(10, 10, 8, 8); x.fillRect(9, 18, 10, 16); x.fillRect(10, 34, 3, 10); x.fillRect(15, 34, 3, 10); x.fillStyle = '#9fe0ff'; x.fillRect(14, 13, 3, 1);
    x.fillStyle = 'rgba(255,255,255,0.6)'; x.fillRect(5, 8, 2, 30);
  }), { light: [{ dx: 0, dy: -30, r: 24, col: '#9fe0ff' }] }),
  icefall: () => hang(canvas(60, 140, (x) => { for (let s = 0; s < 7; s++) { x.fillStyle = s % 2 ? 'rgba(160,214,234,0.85)' : 'rgba(220,240,255,0.85)'; const L = 50 + ((s * 37) % 90); x.beginPath(); x.moveTo(4 + s * 8, 0); x.lineTo(12 + s * 8, 0); x.lineTo(8 + s * 8, L); x.fill(); } })),
  icicles: () => hang(canvas(50, 26, (x) => { for (let s = 0; s < 8; s++) { x.fillStyle = s % 2 ? '#9fd6ea' : '#e8f6ff'; const L = 8 + ((s * 13) % 18); x.beginPath(); x.moveTo(2 + s * 6, 0); x.lineTo(6 + s * 6, 0); x.lineTo(4 + s * 6, L); x.fill(); } })),
  cabin: () => base(canvas(80, 64, (x) => {
    x.fillStyle = grad(x, 0, 0, 0, 64, ['#7a4a30', '#4a2a1a']); x.fillRect(6, 24, 68, 40);
    for (let j = 26; j < 64; j += 6) { x.fillStyle = '#3a2014'; x.fillRect(6, j, 68, 1); }
    x.fillStyle = '#e4eef4'; x.beginPath(); x.moveTo(0, 26); x.lineTo(40, 2); x.lineTo(80, 26); x.fill(); x.fillStyle = '#2a1a14'; x.beginPath(); x.moveTo(4, 28); x.lineTo(40, 8); x.lineTo(76, 28); x.lineTo(76, 30); x.lineTo(4, 30); x.fill();
    x.fillStyle = '#ffcf6a'; x.fillRect(50, 36, 12, 10); x.fillStyle = '#2a1a14'; x.fillRect(55, 36, 2, 10); x.fillRect(16, 40, 14, 24);
  }), { light: [{ dx: 16, dy: -23, r: 46, col: '#ffcf6a', flicker: 0.06 }] }),
  banner: () => base(canvas(30, 70, (x) => {
    x.fillStyle = '#2a2a2a'; x.fillRect(14, 0, 2, 70);
    x.fillStyle = '#8a1f2a'; x.beginPath(); x.moveTo(16, 4); x.lineTo(30, 4); x.lineTo(30, 36); x.lineTo(23, 30); x.lineTo(16, 36); x.fill();
    x.fillStyle = '#d8a43a'; x.beginPath(); x.arc(23, 16, 4, 0, 7); x.fill(); x.fillStyle = '#8a1f2a'; x.fillRect(22, 14, 2, 4);
  })),
  snowfg: () => base(canvas(70, 18, (x) => { for (let i = 0; i < 70; i++) { const h = 6 + Math.sin(i * 0.15) * 5 + Math.sin(i * 0.7) * 2; x.fillStyle = '#e4eef4'; x.fillRect(i, 18 - h, 1, h); } }, { outline: false })),

  // ───── Tecnológico ─────
  tank: () => base(canvas(34, 70, (x) => {
    x.fillStyle = '#2e384c'; x.fillRect(2, 60, 30, 10); x.fillRect(2, 0, 30, 8);
    x.fillStyle = 'rgba(80,220,200,0.35)'; x.fillRect(5, 8, 24, 52);
    // un cuerpo androide en suspensión: lo que espera a recibir una mente
    x.fillStyle = '#6b717c'; x.beginPath(); x.ellipse(17, 20, 4, 5, 0, 0, 7); x.fill(); x.fillRect(14, 25, 6, 16); x.fillRect(12, 26, 2, 12); x.fillRect(20, 26, 2, 12); x.fillRect(14, 41, 2, 14); x.fillRect(18, 41, 2, 14);
    x.fillStyle = '#7fe8ff'; x.fillRect(17, 19, 3, 1);
    x.fillStyle = 'rgba(220,255,250,0.6)'; x.fillRect(7, 10, 2, 46);
    x.fillStyle = '#3ee8ff'; x.fillRect(4, 62, 4, 2); x.fillRect(26, 62, 4, 2);
  }, { th: 40 }), { light: [{ dx: 0, dy: -36, r: 40, col: '#50e0c8' }], anim: bubbles(0, -12, 20, 48) }),
  server: () => base(canvas(28, 60, (x) => {
    x.fillStyle = grad(x, 0, 0, 28, 0, ['#424e66', '#202838']); x.fillRect(1, 0, 26, 60);
    for (let j = 4; j < 56; j += 6) { x.fillStyle = '#0a0c12'; x.fillRect(4, j, 20, 4); }
  }), { anim: (ctx, X, Y, t) => { for (let j = 0; j < 9; j++) { const on = Math.sin(t * 0.2 + j * 1.7 + X) > 0.2; ctx.fillStyle = on ? (j % 3 ? '#3ee8ff' : '#ff3e9a') : '#203040'; ctx.fillRect(X - 9 + (j % 3) * 4, Y - 56 + j * 6 + 1, 2, 2); } }, light: [{ dx: 0, dy: -30, r: 26, col: '#3ee8ff' }] }),
  monitor: () => base(canvas(36, 30, (x) => { x.fillStyle = '#202838'; x.fillRect(0, 0, 36, 24); x.fillStyle = '#0a1620'; x.fillRect(3, 3, 30, 18); x.fillStyle = '#2e384c'; x.fillRect(15, 24, 6, 6); }), { anim: (ctx, X, Y, t) => {
    ctx.fillStyle = '#3ee8ff';
    for (let k = 0; k < 6; k++) { const w = 4 + ((t / 10 + k * 7) % 20); ctx.fillRect(X - 14, Y - 27 + k * 3, Math.min(26, w), 1); }
    if ((t >> 4) % 2) { ctx.fillStyle = '#ff3e9a'; ctx.fillRect(X + 8, Y - 26, 4, 4); }
  }, light: [{ dx: 0, dy: -18, r: 34, col: '#3ee8ff', flicker: 0.08 }] }),
  neonsign: () => ({ img: canvas(110, 26, (x) => { x.fillStyle = '#10141c'; x.fillRect(0, 0, 110, 26); x.strokeStyle = '#2a3242'; x.strokeRect(1, 1, 108, 24); }), ax: 55, ay: 13, anim: (ctx, X, Y, t) => {
    const on = !(t % 190 > 170 && (t >> 1) % 2);
    ctx.globalAlpha = on ? 1 : 0.3;
    ctx.font = 'bold 14px monospace'; ctx.fillStyle = '#ff3e9a'; ctx.textAlign = 'center'; ctx.fillText('PARADISE', Math.round(X), Math.round(Y + 5)); ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
  }, light: [{ dx: 0, dy: 0, r: 70, col: '#ff3e9a', flicker: 0.1 }] }),
  cables: () => hang(canvas(120, 40, (x) => { x.strokeStyle = '#0d1118'; x.lineWidth = 2; for (let s = 0; s < 4; s++) { x.beginPath(); x.moveTo(0, s * 3); x.quadraticCurveTo(60, 20 + s * 6, 120, s * 4); x.stroke(); } x.strokeStyle = '#8a2b2b'; x.lineWidth = 1; x.beginPath(); x.moveTo(0, 2); x.quadraticCurveTo(60, 34, 120, 6); x.stroke(); })),
  lablamp: () => hang(canvas(30, 12, (x) => { x.fillStyle = '#2e384c'; x.fillRect(14, 0, 2, 4); x.fillRect(2, 4, 26, 5); x.fillStyle = '#e8fbff'; x.fillRect(4, 8, 22, 2); }), { light: [{ dx: 0, dy: 12, r: 80, col: '#c8f4ff', flicker: 0.04 }] }),

  // ───── Palacio ─────
  portrait: () => ({ img: canvas(40, 52, (x) => {
    x.fillStyle = '#d8a43a'; x.fillRect(0, 0, 40, 52); x.fillStyle = '#8a5a10'; x.fillRect(3, 3, 34, 46);
    x.fillStyle = '#2a1a1a'; x.fillRect(5, 5, 30, 42);
    // el Patrón: bigote, sonrisa y medallas
    x.fillStyle = '#c8906a'; x.beginPath(); x.ellipse(20, 20, 8, 10, 0, 0, 7); x.fill();
    x.fillStyle = '#1a1010'; x.fillRect(13, 10, 14, 5); x.fillRect(15, 23, 10, 2); x.fillStyle = '#2a1a1a'; x.fillRect(17, 18, 2, 2); x.fillRect(22, 18, 2, 2);
    x.fillStyle = '#e8e0d0'; x.fillRect(16, 26, 8, 1);
    x.fillStyle = '#3a3a5a'; x.fillRect(8, 31, 24, 16); x.fillStyle = '#d8a43a'; x.fillRect(12, 34, 3, 3); x.fillRect(16, 34, 3, 3); x.fillStyle = '#8a1f2a'; x.fillRect(19, 31, 2, 16);
  }), ax: 20, ay: 52, light: [{ dx: 0, dy: -26, r: 30, col: '#ffd890' }] }),
  mirror: () => base(canvas(34, 70, (x) => {
    x.fillStyle = '#d8a43a'; x.beginPath(); x.ellipse(17, 30, 17, 30, 0, 0, 7); x.fill();
    x.fillStyle = grad(x, 0, 0, 34, 70, ['#c8d4e0', '#5a6a80', '#2a3040']); x.beginPath(); x.ellipse(17, 30, 13, 26, 0, 0, 7); x.fill();
    x.fillStyle = 'rgba(255,255,255,0.5)'; x.fillRect(9, 12, 2, 30);
    x.fillStyle = '#8a5a10'; x.fillRect(12, 58, 10, 12);
  }), { light: [{ dx: 0, dy: -40, r: 26, col: '#c8d4e0' }] }),
  chandelier: () => hang(canvas(64, 48, (x) => {
    x.fillStyle = '#5a3a10'; x.fillRect(31, 0, 2, 18);
    x.fillStyle = '#d8a43a'; x.beginPath(); x.ellipse(32, 26, 26, 6, 0, 0, Math.PI); x.fill(); x.fillRect(28, 18, 8, 8);
    for (let k = 0; k < 7; k++) { const cx = 8 + k * 8; x.fillStyle = '#f0e8d0'; x.fillRect(cx, 20 - (k % 2) * 2, 2, 6); }
    for (let k = 0; k < 10; k++) { x.fillStyle = '#e8f4ff'; x.fillRect(10 + k * 5, 32 + (k % 3) * 3, 1, 4); }
  }), { light: [{ dx: 0, dy: 24, r: 90, col: '#ffd890', flicker: 0.05 }], anim: (ctx, X, Y, t) => { for (let k = 0; k < 7; k++) { ctx.fillStyle = (t + k * 5) % 12 < 6 ? '#ffd870' : '#fff6d0'; ctx.fillRect(X - 24 + k * 8, Y + 16 - (k % 2) * 2, 2, 2); } } }),
  drapes: () => hang(canvas(36, 120, (x) => {
    for (let i = 0; i < 36; i++) { const fold = Math.sin(i * 0.6); x.fillStyle = fold > 0.3 ? '#a8303c' : fold > -0.3 ? '#8a1f2a' : '#5a1018'; x.fillRect(i, 0, 1, 112 - Math.abs(18 - i) * 0.6); }
    x.fillStyle = '#d8a43a'; x.fillRect(0, 0, 36, 4); for (let i = 0; i < 36; i += 4) x.fillRect(i, 106 - Math.abs(18 - i) * 0.6, 2, 6);
  })),
  throne: () => base(canvas(56, 80, (x) => {
    x.fillStyle = '#d8a43a'; x.fillRect(8, 0, 40, 60); x.beginPath(); x.arc(28, 6, 22, Math.PI, 0); x.fill();
    x.fillStyle = '#8a1f2a'; x.fillRect(14, 8, 28, 48);
    x.fillStyle = '#d8a43a'; x.fillRect(2, 44, 52, 8); x.fillRect(4, 52, 6, 28); x.fillRect(46, 52, 6, 28); x.fillRect(10, 56, 36, 6);
    x.fillStyle = '#fff1a8'; x.fillRect(8, 0, 2, 60); x.beginPath(); x.arc(28, -6, 5, 0, 7); x.fill();
    x.fillStyle = '#5a1018'; x.fillRect(16, 46, 24, 6);
  }), { light: [{ dx: 0, dy: -40, r: 60, col: '#ffcc60' }] }),
  statue: () => base(canvas(40, 110, (x) => {
    x.fillStyle = grad(x, 0, 0, 40, 0, ['#ffe08a', '#d8a43a', '#7a5214']);
    x.fillRect(4, 90, 32, 20); x.fillRect(12, 40, 16, 50); x.beginPath(); x.ellipse(20, 30, 7, 9, 0, 0, 7); x.fill();
    x.fillRect(4, 42, 8, 6); x.fillRect(0, 26, 6, 20); // brazo alzado
    x.fillRect(28, 44, 6, 26);
    x.fillStyle = '#5a3a10'; x.fillRect(15, 26, 10, 3); x.fillRect(16, 34, 8, 2);
  })),

  // ───── Sótanos ─────
  cell: () => base(canvas(70, 70, (x) => {
    x.fillStyle = '#121010'; x.fillRect(0, 0, 70, 70);
    x.fillStyle = '#3a3530'; for (let i = 3; i < 70; i += 8) x.fillRect(i, 0, 3, 70); x.fillRect(0, 0, 70, 4); x.fillRect(0, 34, 70, 3);
    x.fillStyle = '#5a5448'; for (let i = 3; i < 70; i += 8) x.fillRect(i, 0, 1, 70);
    x.fillStyle = '#2a2a30'; x.fillRect(30, 50, 10, 6); x.fillRect(32, 44, 6, 6); // un androide desmontado
  })),
  pipes: () => hang(canvas(120, 34, (x) => { for (const [y, c] of [[4, '#4e4840'], [14, '#3a3530'], [22, '#5a2a20']]) { x.fillStyle = c; x.fillRect(0, y, 120, 7); x.fillStyle = 'rgba(255,255,255,0.12)'; x.fillRect(0, y + 1, 120, 1); for (let i = 10; i < 120; i += 40) { x.fillStyle = '#2a2622'; x.fillRect(i, y - 1, 5, 9); } } })),
  alarm: () => hang(canvas(14, 12, (x) => { x.fillStyle = '#2a2622'; x.fillRect(5, 0, 4, 4); x.fillStyle = '#7a1a10'; x.beginPath(); x.arc(7, 8, 5, Math.PI, 0); x.fill(); x.fillRect(2, 8, 10, 3); }), { light: [{ dx: 0, dy: 8, r: 80, col: '#ff3020', pulse: true }] }),
};

function water(cx, top, spread) {
  return (ctx, X, Y, t, img) => {
    const x0 = X - img.width / 2 + cx, y0 = Y - img.height + top;
    for (let k = 0; k < 18; k++) {
      const ph = ((t * 0.04 + k * 0.37) % 1), dir = k % 2 ? 1 : -1, sp = 0.4 + (k % 5) * 0.12;
      ctx.fillStyle = k % 3 ? 'rgba(200,236,250,0.85)' : '#ffffff';
      ctx.fillRect(Math.round(x0 + dir * ph * spread * sp), Math.round(y0 - Math.sin(ph * Math.PI) * 10 + ph * 22), 1, 2);
    }
  };
}
function windmillSails(cx, cy) {
  return (ctx, X, Y, t) => {
    const ox = X, oy = Y + cy;
    ctx.save(); ctx.translate(ox, oy); ctx.rotate(t * 0.012);
    for (let k = 0; k < 4; k++) {
      ctx.rotate(Math.PI / 2);
      ctx.fillStyle = '#3a2a22'; ctx.fillRect(-1, -46, 3, 46);
      ctx.fillStyle = '#e8dcc4'; ctx.fillRect(2, -44, 9, 34);
      ctx.fillStyle = '#5a4a3a'; for (let j = -44; j < -10; j += 6) ctx.fillRect(2, j, 9, 1);
    }
    ctx.restore();
    ctx.fillStyle = '#2a1a14'; ctx.fillRect(ox - 3, oy - 3, 6, 6);
  };
}
function bubbles(dx, dy, w, h) {
  return (ctx, X, Y, t) => { for (let k = 0; k < 6; k++) { const ph = ((t * 0.01 + k * 0.17) % 1); ctx.fillStyle = 'rgba(220,255,250,0.7)'; ctx.fillRect(Math.round(X - w / 2 + ((k * 7) % w)), Math.round(Y + dy - ph * h), 1, 1); } };
}

const cache = new Map();
export function getDeco(kind, zone, zoneKey) {
  const key = kind + '|' + zoneKey;
  if (!cache.has(key)) {
    const f = BUILDERS[kind];
    if (!f) { console.warn('decorado desconocido', kind); cache.set(key, null); }
    else cache.set(key, f(zone));
  }
  return cache.get(key);
}

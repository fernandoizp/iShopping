// Utilidades gráficas: lienzos, ruido, rasterizado a píxel, contorno, cuantización y texto.
export const W = 480, H = 270, TILE = 16;

export function mk(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h));
  const x = c.getContext('2d', { willReadFrequently: true });
  x.imageSmoothingEnabled = false;
  return [c, x];
}

export function hex(h) {
  const n = parseInt(h.slice(1), 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
}
export function rgbStr(r, g, b, a = 1) { return a >= 1 ? `rgb(${r | 0},${g | 0},${b | 0})` : `rgba(${r | 0},${g | 0},${b | 0},${a})`; }
export function mixHex(a, b, t) {
  const A = hex(a), B = hex(b);
  return rgbStr(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
}
export function shade(h, k) {
  const [r, g, b] = hex(h);
  return k >= 0 ? rgbStr(r + (255 - r) * k, g + (255 - g) * k, b + (255 - b) * k) : rgbStr(r * (1 + k), g * (1 + k), b * (1 + k));
}

// Generador pseudoaleatorio determinista
export function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
export function hash2(x, y, s = 0) {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function smooth(t) { return t * t * (3 - 2 * t); }
export function vnoise(x, y, s = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const a = hash2(xi, yi, s), b = hash2(xi + 1, yi, s), c = hash2(xi, yi + 1, s), d = hash2(xi + 1, yi + 1, s);
  const u = smooth(xf), v = smooth(yf);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export function fbm(x, y, oct = 4, s = 0) {
  let v = 0, a = 0.5, f = 1, n = 0;
  for (let i = 0; i < oct; i++) { v += vnoise(x * f, y * f, s + i * 17) * a; n += a; a *= 0.5; f *= 2; }
  return v / n;
}

export const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export const bayer = (x, y) => BAYER[(y & 3) * 4 + (x & 3)] / 16;

// Endurece el alfa (sin antialias) para que las formas vectoriales parezcan pixel art.
export function crisp(c, th = 100) {
  const x = c.getContext('2d'), d = x.getImageData(0, 0, c.width, c.height), a = d.data;
  for (let i = 3; i < a.length; i += 4) a[i] = a[i] > th ? 255 : 0;
  x.putImageData(d, 0, 0);
  return c;
}

// Contorno de 1 px alrededor de lo opaco.
export function outline(c, col = '#0b0810', diag = false) {
  const x = c.getContext('2d'), w = c.width, h = c.height, d = x.getImageData(0, 0, w, h), a = d.data, o = new Uint8ClampedArray(a);
  const [r, g, b] = hex(col);
  const op = (i, j) => i >= 0 && j >= 0 && i < w && j < h && a[(j * w + i) * 4 + 3] > 0;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const k = (j * w + i) * 4;
    if (a[k + 3]) continue;
    let n = op(i - 1, j) || op(i + 1, j) || op(i, j - 1) || op(i, j + 1);
    if (!n && diag) n = op(i - 1, j - 1) || op(i + 1, j - 1) || op(i - 1, j + 1) || op(i + 1, j + 1);
    if (n) { o[k] = r; o[k + 1] = g; o[k + 2] = b; o[k + 3] = 255; }
  }
  d.data.set(o); x.putImageData(d, 0, 0);
  return c;
}

// Reduce a una paleta con tramado ordenado.
export function quantize(c, pal, dither = 16) {
  const P = pal.map(hex), x = c.getContext('2d'), w = c.width, d = x.getImageData(0, 0, w, c.height), a = d.data;
  for (let k = 0; k < a.length; k += 4) {
    if (!a[k + 3]) continue;
    const i = (k >> 2) % w, j = ((k >> 2) / w) | 0, off = (bayer(i, j) - 0.5) * dither;
    let best = 0, bd = 1e12;
    for (let p = 0; p < P.length; p++) {
      const dr = a[k] + off - P[p][0], dg = a[k + 1] + off - P[p][1], db = a[k + 2] + off - P[p][2];
      const dd = dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11;
      if (dd < bd) { bd = dd; best = p; }
    }
    a[k] = P[best][0]; a[k + 1] = P[best][1]; a[k + 2] = P[best][2];
  }
  x.putImageData(d, 0, 0);
  return c;
}

export function flipX(src) {
  const [c, x] = mk(src.width, src.height);
  x.translate(src.width, 0); x.scale(-1, 1); x.drawImage(src, 0, 0);
  return c;
}
export function tint(src, col) {
  const [c, x] = mk(src.width, src.height);
  x.drawImage(src, 0, 0);
  x.globalCompositeOperation = 'source-in'; x.fillStyle = col; x.fillRect(0, 0, c.width, c.height);
  return c;
}

// Sprite = { r, l, wr, wl } (derecha, izquierda y siluetas blancas para el destello de daño)
export function pair(c) {
  const l = flipX(c);
  return { r: c, l, wr: tint(c, '#ffffff'), wl: tint(l, '#ffffff'), w: c.width, h: c.height };
}

// Dibuja un sprite con ancla en los pies (cx, base).
export function drawSpr(ctx, spr, x, y, face, white = false) {
  const img = face < 0 ? (white ? spr.wl : spr.l) : (white ? spr.wr : spr.r);
  ctx.drawImage(img, Math.round(x - img.width / 2), Math.round(y - img.height));
}

export function tri(x, ax, ay, bx, by, cx2, cy2, col) {
  x.fillStyle = col;
  x.beginPath(); x.moveTo(ax, ay); x.lineTo(bx, by); x.lineTo(cx2, cy2); x.closePath(); x.fill();
}

// ---------- Texto ----------
// Fuentes de Google (si cargan) con alternativas del sistema. El texto se rasteriza sin antialias.
export const FONT_TITLE = "'Cinzel', 'Trajan Pro', Georgia, 'Times New Roman', serif";
export const FONT_UI = "'Pixelify Sans', 'Silkscreen', 'Courier New', monospace";
const [TXT, tx] = mk(960, 64);
const textCache = new Map();

export function textSprite(str, size, col, opts = {}) {
  const key = `${str}|${size}|${col}|${opts.font || ''}|${opts.weight || ''}|${opts.shadow || ''}`;
  let c = textCache.get(key);
  if (c) return c;
  const font = `${opts.weight || 'normal'} ${size}px ${opts.font || FONT_UI}`;
  tx.font = font;
  const w = Math.ceil(tx.measureText(str).width) + 6, h = Math.ceil(size * 1.5) + 4;
  const [cc, cx] = mk(w, h);
  cx.font = font; cx.textBaseline = 'middle'; cx.fillStyle = col;
  cx.fillText(str, 3, h / 2);
  crisp(cc, size <= 12 ? 55 : 110);
  outline(cc, opts.shadow || '#07050a');
  if (textCache.size > 600) textCache.clear();
  textCache.set(key, cc);
  return cc;
}

export function text(ctx, str, x, y, size = 8, col = '#e8e0d0', align = 'left', opts = {}) {
  const s = textSprite(String(str), size, col, opts);
  const ox = align === 'center' ? s.width / 2 : align === 'right' ? s.width - 3 : 3;
  ctx.drawImage(s, Math.round(x - ox), Math.round(y - s.height / 2));
  return s.width - 6;
}

// Ajusta un párrafo a un ancho máximo (en píxeles) para los diálogos.
export function wrap(str, size, maxW, opts = {}) {
  tx.font = `${opts.weight || 'normal'} ${size}px ${opts.font || FONT_UI}`;
  const out = [];
  for (const para of String(str).split('\n')) {
    let line = '';
    for (const word of para.split(' ')) {
      const t = line ? line + ' ' + word : word;
      if (tx.measureText(t).width > maxW && line) { out.push(line); line = word; } else line = t;
    }
    out.push(line);
  }
  return out;
}

// Brillo radial suave precalculado para la iluminación aditiva.
const glowCache = new Map();
export function glowSprite(r, col) {
  const key = r + col;
  if (glowCache.has(key)) return glowCache.get(key);
  const [c, x] = mk(r * 2, r * 2);
  const [R, G, B] = hex(col);
  const g = x.createRadialGradient(r, r, 0, r, r, r);
  g.addColorStop(0, rgbStr(R, G, B, 1)); g.addColorStop(0.35, rgbStr(R, G, B, 0.45)); g.addColorStop(1, rgbStr(R, G, B, 0));
  x.fillStyle = g; x.fillRect(0, 0, r * 2, r * 2);
  glowCache.set(key, c);
  return c;
}

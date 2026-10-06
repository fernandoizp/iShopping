// Gráficos base: paleta, construcción de sprites desde cuadrículas de texto y fuente pixel 3x5.

export const W = 240;
export const H = 160;
export const TILE = 16;

// Paleta maestra (inspirada en DB16, valores redondeados a 15 bits como la GBA).
export const PAL = {
  k: '#140c1c', K: '#2a1d3a',
  n: '#30346d', N: '#4e5aa0', b: '#7b9be0', c: '#6dc2ca', w: '#deeed6',
  g: '#8595a1', G: '#4e4a4e', h: '#c2c3c7',
  d: '#442434', R: '#8a2b3b', r: '#d04648', o: '#e8873a', y: '#f4d25e',
  e: '#854c30', E: '#d2aa99',
  v: '#346524', V: '#6daa2c', l: '#b6d53c',
  p: '#4b2a5e', P: '#7d4d9c', q: '#c48be0',
  s: '#2b4a6a', S: '#3f7a9c', t: '#9ee6f0',
};

// Convierte '#rrggbb' a 15 bits (5 bits por canal) para un aire GBA auténtico.
export function gba(hex) {
  const n = parseInt(hex.slice(1), 16);
  const q = (v) => Math.round((v >> 3) * 255 / 31);
  const r = q((n >> 16) & 255), g = q((n >> 8) & 255), b = q(n & 255);
  return `rgb(${r},${g},${b})`;
}

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d');
  x.imageSmoothingEnabled = false;
  return [c, x];
}

// Construye un canvas a partir de filas de texto. '.' y ' ' son transparentes.
export function sprite(rows, pal = PAL) {
  const h = rows.length, w = Math.max(...rows.map((r) => r.length));
  const [c, x] = makeCanvas(w, h);
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < rows[j].length; i++) {
      const ch = rows[j][i];
      if (ch === '.' || ch === ' ') continue;
      const col = pal[ch];
      if (!col) continue;
      x.fillStyle = gba(col);
      x.fillRect(i, j, 1, 1);
    }
  }
  return c;
}

export function flipX(src) {
  const [c, x] = makeCanvas(src.width, src.height);
  x.translate(src.width, 0); x.scale(-1, 1);
  x.drawImage(src, 0, 0);
  return c;
}

export function flipY(src) {
  const [c, x] = makeCanvas(src.width, src.height);
  x.translate(0, src.height); x.scale(1, -1);
  x.drawImage(src, 0, 0);
  return c;
}

// Versión blanca sólida del sprite, para el parpadeo al recibir daño.
export function silhouette(src, color = '#ffffff') {
  const [c, x] = makeCanvas(src.width, src.height);
  x.drawImage(src, 0, 0);
  x.globalCompositeOperation = 'source-in';
  x.fillStyle = color;
  x.fillRect(0, 0, c.width, c.height);
  return c;
}

// Par [derecha, izquierda] + siluetas.
export function sprPair(rows, pal) {
  const r = sprite(rows, pal);
  const l = flipX(r);
  return { r, l, wr: silhouette(r), wl: silhouette(l), w: r.width, h: r.height };
}

// Brillo con tramado ordenado (dithering 4x4) para luces estilo GBA.
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export function glow(radius, hex, strength = 1) {
  const s = radius * 2;
  const [c, x] = makeCanvas(s, s);
  x.fillStyle = gba(hex);
  for (let j = 0; j < s; j++) {
    for (let i = 0; i < s; i++) {
      const dx = i - radius + 0.5, dy = j - radius + 0.5;
      const d = Math.sqrt(dx * dx + dy * dy) / radius;
      if (d >= 1) continue;
      const v = (1 - d) * (1 - d) * strength * 16;
      if (v > BAYER[(j & 3) * 4 + (i & 3)]) x.fillRect(i, j, 1, 1);
    }
  }
  return c;
}

// ---------- Fuente 3x5 ----------
const GLYPHS = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110',
  E: '111100110100111', F: '111100110100100', G: '011100101101011', H: '101101111101101',
  I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111',
  M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100',
  Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
  U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101',
  Y: '101101010010010', Z: '111001010100111', 'Ñ': '111000110101101',
  0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110',
  4: '101101111001001', 5: '111100110001110', 6: '011100111101111', 7: '111001010010010',
  8: '111101111101111', 9: '111101111001110',
  '.': '000000000000010', ',': '000000000010100', '!': '010010010000010', '?': '110001010000010',
  '¡': '010000010010010', '¿': '010000010100011',
  ':': '000010000010000', '-': '000000111000000', "'": '010010000000000', '/': '001001010100100',
  '+': '000010111010000', '>': '100010001010100', '<': '001010100010001', '(': '010100100100010',
  ')': '010001001001010', '%': '101001010100101', '*': '000101010101000', '=': '000111000111000',
};
const ACCENTS = { 'Á': 'A', 'É': 'E', 'Í': 'I', 'Ó': 'O', 'Ú': 'U', 'Ü': 'U' };

export function textWidth(str) {
  return str.length * 4 - 1;
}

export function drawText(ctx, str, x, y, color = PAL.w, shadow = PAL.k) {
  str = String(str).toUpperCase();
  x = Math.round(x); y = Math.round(y);
  for (const pass of shadow ? [0, 1] : [1]) {
    ctx.fillStyle = gba(pass === 0 ? shadow : color);
    const o = pass === 0 ? 1 : 0;
    let cx = x;
    for (let ch of str) {
      ch = ACCENTS[ch] || ch;
      const g = GLYPHS[ch];
      if (g) {
        for (let k = 0; k < 15; k++) {
          if (g[k] === '1') ctx.fillRect(cx + (k % 3) + o, y + ((k / 3) | 0) + o, 1, 1);
        }
      }
      cx += 4;
    }
  }
}

export function drawTextC(ctx, str, cx, y, color, shadow) {
  drawText(ctx, str, cx - textWidth(String(str)) / 2, y, color, shadow);
}

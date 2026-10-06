// Tilesets por zona y fondos parallax generados con tramado estilo GBA.
import { makeCanvas, gba, TILE, W, H, PAL } from './gfx.js';

// Cada zona define una rampa de piedra (0 = más oscuro … 4 = más claro), un acento y el cielo.
export const AREAS = {
  garden: {
    name: 'JARDÍN HUNDIDO',
    stone: ['#140c1c', '#2a2440', '#433b5e', '#615a84', '#8a82ad'],
    accent: ['#1f3a22', '#346524', '#6daa2c', '#b6d53c'],
    sky: ['#0d1028', '#16193a', '#22264e', '#30346d', '#45467e', '#5f5b8e', '#7f6f9a'],
    far: '#1d1e44', mid: '#151634', midHi: '#2b2c58',
    mote: PAL.l, music: 0,
  },
  cavern: {
    name: 'CAVERNAS DE CRISTAL',
    stone: ['#0a0d1a', '#14203a', '#1f3557', '#2f5279', '#4c7aa1'],
    accent: ['#2b1e52', '#4b3a9c', '#6dc2ca', '#c9f4f6'],
    sky: ['#04060e', '#070b18', '#0b1224', '#101a32', '#152340', '#1b2d4e', '#22385d'],
    far: '#0c1428', mid: '#08101f', midHi: '#1a2f50',
    mote: PAL.t, music: 1,
  },
  keep: {
    name: 'FORTALEZA DE CENIZA',
    stone: ['#170b10', '#33161e', '#52252b', '#74393a', '#9c5a4e'],
    accent: ['#4a1a12', '#8a2b3b', '#e8873a', '#f4d25e'],
    sky: ['#12060c', '#200a12', '#331019', '#4a1720', '#652225', '#83332a', '#a5502f'],
    far: '#2a0e16', mid: '#1b080e', midHi: '#3d1720',
    mote: PAL.o, music: 2,
  },
};

// Patrón de sillares 16x16 (dígitos = índice de la rampa de piedra).
const STONE = [
  '4444443244444443',
  '4333332143333332',
  '4333332143333332',
  '3322221143333322',
  '2111111132222221',
  '1111111111111111',
  '4443244444432444',
  '3332143333321433',
  '3332143333321433',
  '3221132222211322',
  '1111111111111111',
  '4444444443244444',
  '3333333332143333',
  '3333333332143333',
  '2222222221132222',
  '1111111111111111',
];
const STONE_B = [
  '4444444443244444',
  '4333333332143333',
  '4333333322143333',
  '3222222221132222',
  '1111111111111111',
  '4432444444443244',
  '3321433333332143',
  '3321433333332143',
  '3321433333322143',
  '2211322222221132',
  '1111111111111111',
  '4444432444444443',
  '3333321433333332',
  '3333321433333332',
  '2222211322222221',
  '1111111111111111',
];
// Borde superior con vegetación / cristales (letras a-d = rampa de acento).
const TOP = [
  'cdcccdccdcccdccc',
  'bcbbcbbcbbcbbcbb',
  'abbaabbabbaabbab',
  '.a..a.ab..a..a.a',
  '....a..a.....a..',
];
const PLANK = [
  '0000000000000000',
  '3444344434443444',
  '2333233323332333',
  '1222122212221222',
  '0110.0110.0110.0',
  '..00..00..00..00',
];
const SPIKE = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '..4.....4.....4.',
  '..4....343...343',
  '.343...343...343',
  '.343..32321.3232',
  '32321.32321.3232',
  '32321322221322221',
  '2222122222122222',
  '1111111111111111',
  '0000000000000000',
];
const CRACK = [
  '4444443244444443',
  '4333332143330332',
  '4333332143303332',
  '3322221143033322',
  '2111111130222221',
  '1111110111111111',
  '4443203444432444',
  '3332033333321433',
  '3330343333321433',
  '3201132222211322',
  '1101111111111111',
  '4044444443244444',
  '3033333332143333',
  '3303333332143333',
  '2220222221132222',
  '1111111111111111',
];

function paint(x, rows, ramp, accent, ox = 0, oy = 0) {
  for (let j = 0; j < rows.length; j++) {
    for (let i = 0; i < rows[j].length && i < 16; i++) {
      const ch = rows[j][i];
      let col = null;
      if (ch >= '0' && ch <= '4') col = ramp[+ch];
      else if (ch >= 'a' && ch <= 'd') col = accent[ch.charCodeAt(0) - 97];
      if (!col) continue;
      x.fillStyle = gba(col);
      x.fillRect(ox + i, oy + j, 1, 1);
    }
  }
}

// Genera el atlas de tiles para una zona.
export function buildTileset(areaKey) {
  const a = AREAS[areaKey];
  const dark = [a.stone[0], a.stone[0], a.stone[1], a.stone[1], a.stone[2]];
  const mk = (rows, ramp = a.stone) => {
    const [c, x] = makeCanvas(TILE, TILE);
    paint(x, rows, ramp, a.accent);
    return c;
  };
  const top = (() => {
    const [c, x] = makeCanvas(TILE, 6);
    paint(x, TOP, a.stone, a.accent);
    return c;
  })();
  return {
    stoneA: mk(STONE), stoneB: mk(STONE_B),
    deepA: mk(STONE, dark), deepB: mk(STONE_B, dark),
    top, plank: mk(PLANK), spike: mk(SPIKE), crack: mk(CRACK),
    edge: gba(a.stone[0]), hi: gba(a.stone[4]),
  };
}

function hash(i, j) {
  let h = (i * 374761393 + j * 668265263) ^ 0x5bd1e995;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// Prerenderiza la capa sólida de una sala a un canvas (autotiling por vecinos).
export function renderRoomTiles(room, ts) {
  const [c, x] = makeCanvas(room.w * TILE, room.h * TILE);
  const solid = (i, j) => {
    if (i < 0 || j < 0 || i >= room.w || j >= room.h) return true;
    const t = room.tiles[j][i];
    return t === '#';
  };
  for (let j = 0; j < room.h; j++) {
    for (let i = 0; i < room.w; i++) {
      const t = room.tiles[j][i];
      const px = i * TILE, py = j * TILE;
      if (t === '#') {
        let deep = true;
        for (let dj = -2; dj <= 2 && deep; dj++)
          for (let di = -2; di <= 2; di++)
            if (!solid(i + di, j + dj)) { deep = false; break; }
        const v = hash(i, j) < 0.5;
        x.drawImage(deep ? (v ? ts.deepA : ts.deepB) : (v ? ts.stoneA : ts.stoneB), px, py);
        x.fillStyle = ts.edge;
        if (!solid(i - 1, j)) x.fillRect(px, py, 1, TILE);
        if (!solid(i + 1, j)) x.fillRect(px + 15, py, 1, TILE);
        if (!solid(i, j + 1)) x.fillRect(px, py + 15, TILE, 1);
        if (!solid(i, j - 1)) {
          x.fillRect(px, py, TILE, 1);
          x.fillStyle = ts.hi;
          x.fillRect(px + (solid(i - 1, j) ? 0 : 1), py + 1, TILE - (solid(i - 1, j) ? 0 : 1) - (solid(i + 1, j) ? 0 : 1), 1);
        }
      } else if (t === '=') {
        x.drawImage(ts.plank, px, py);
      } else if (t === '^') {
        x.drawImage(ts.spike, px, py);
      }
    }
  }
  // Segunda pasada: vegetación sobre los bordes superiores (sobresale por arriba).
  for (let j = 1; j < room.h; j++) {
    for (let i = 0; i < room.w; i++) {
      if (room.tiles[j][i] === '#' && !solid(i, j - 1) && room.tiles[j - 1][i] !== '^') {
        x.drawImage(ts.top, i * TILE, j * TILE - 1);
      }
    }
  }
  return c;
}

// ---------------- Fondos ----------------
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

function ditherGradient(x, w, h, colors) {
  const n = colors.length - 1;
  for (let j = 0; j < h; j++) {
    const t = (j / h) * n;
    const k = Math.min(n - 1, Math.floor(t));
    const f = t - k;
    for (let i = 0; i < w; i++) {
      const pick = f * 16 > BAYER[(j & 3) * 4 + (i & 3)] ? k + 1 : k;
      x.fillStyle = gba(colors[pick]);
      x.fillRect(i, j, 1, 1);
    }
  }
}

function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

export function buildBackground(areaKey) {
  const a = AREAS[areaKey];
  const [sky, sx] = makeCanvas(W, H);
  ditherGradient(sx, W, H, a.sky);
  const r = rng(areaKey.length * 9973);

  // Estrellas / cristales lejanos
  for (let k = 0; k < 40; k++) {
    sx.fillStyle = gba(k % 5 === 0 ? PAL.w : a.sky[a.sky.length - 1]);
    sx.fillRect((r() * W) | 0, (r() * H * 0.6) | 0, 1, 1);
  }
  if (areaKey === 'garden') {
    // Luna grande con tramado
    const mx = 170, my = 34, mr = 18;
    for (let j = -mr; j <= mr; j++)
      for (let i = -mr; i <= mr; i++) {
        const d = Math.sqrt(i * i + j * j);
        if (d > mr) continue;
        const shade = (i + j) / (mr * 2) + 0.5;
        sx.fillStyle = gba(shade * 16 > BAYER[((j + 64) & 3) * 4 + ((i + 64) & 3)] + 4 ? '#9a8fb8' : '#d6d0e8');
        sx.fillRect(mx + i, my + j, 1, 1);
      }
  }

  // Capa lejana (512px de ancho, se repite)
  const FW = 512;
  const LH = H + 48; // capas más altas que la pantalla para salas de varias pantallas
  const [far, fx] = makeCanvas(FW, LH);
  fx.fillStyle = gba(a.far);
  if (areaKey === 'garden') {
    // Torres y agujas en ruinas
    let x0 = 0;
    while (x0 < FW) {
      const w = 14 + ((r() * 26) | 0), h = 40 + ((r() * 60) | 0);
      fx.fillRect(x0, H - h, w, h);
      for (let k = 0; k < w / 2; k++) fx.fillRect(x0 + k, H - h - k, w - k * 2, 1);
      fx.fillStyle = gba(a.sky[2]);
      for (let wy = H - h + 10; wy < H - 20; wy += 14) fx.fillRect(x0 + (w >> 1) - 1, wy, 2, 5);
      fx.fillStyle = gba(a.far);
      x0 += w + 6 + ((r() * 30) | 0);
    }
    fx.fillRect(0, H - 30, FW, 30 + 48);
  } else if (areaKey === 'cavern') {
    // Estalactitas y estalagmitas
    for (let x0 = 0; x0 < FW; x0 += 6 + ((r() * 14) | 0)) {
      const h = 20 + r() * 50, w = 6 + r() * 12;
      for (let k = 0; k < h; k++) fx.fillRect(x0 + (k / h) * w / 2, k, w * (1 - k / h), 1);
      const h2 = 15 + r() * 45;
      for (let k = 0; k < h2; k++) fx.fillRect(x0 + 4 + (k / h2) * w / 2, H - k, w * (1 - k / h2), 1);
    }
  } else {
    // Murallas con almenas y ventanas encendidas
    let x0 = 0;
    while (x0 < FW) {
      const w = 40 + ((r() * 50) | 0), h = 60 + ((r() * 50) | 0);
      fx.fillStyle = gba(a.far);
      fx.fillRect(x0, H - h, w, h);
      for (let k = 0; k < w; k += 8) fx.fillRect(x0 + k, H - h - 5, 5, 5);
      for (let wy = H - h + 12; wy < H - 10; wy += 16)
        for (let wx = x0 + 6; wx < x0 + w - 6; wx += 12) {
          fx.fillStyle = gba(r() < 0.35 ? PAL.o : a.sky[1]);
          fx.fillRect(wx, wy, 3, 6);
        }
      x0 += w + ((r() * 20) | 0);
    }
  }

  fx.fillStyle = gba(a.far);
  fx.fillRect(0, H - 1, FW, LH - H + 1);

  // Capa media: arcos / columnas
  const [mid, mx] = makeCanvas(FW, LH);
  const midCol = gba(a.mid), midHi = gba(a.midHi);
  for (let x0 = 0; x0 < FW; x0 += 128) {
    if (areaKey === 'cavern') {
      // Cristales gigantes
      for (let k = 0; k < 3; k++) {
        const cx = x0 + 20 + k * 38 + ((r() * 10) | 0), ch = 40 + r() * 50, cw = 10 + r() * 8;
        for (let y = 0; y < ch; y++) {
          const ww = y < cw ? y : cw;
          mx.fillStyle = midCol; mx.fillRect(cx - ww / 2, H - ch + y, ww, 1);
          mx.fillStyle = midHi; mx.fillRect(cx - ww / 2, H - ch + y, 1, 1);
        }
      }
    } else {
      // Arco de piedra
      mx.fillStyle = midCol;
      mx.fillRect(x0 + 10, 40, 14, LH - 40);
      mx.fillRect(x0 + 90, 40, 14, LH - 40);
      mx.fillRect(x0 + 6, 36, 102, 8);
      for (let k = 0; k < 40; k++) {
        const y = 44 + Math.sqrt(k / 40) * 30;
        mx.fillRect(x0 + 24 + k, 44, 1, 30 - (y - 44) + 4);
        mx.fillRect(x0 + 89 - k, 44, 1, 30 - (y - 44) + 4);
      }
      mx.fillStyle = midHi;
      mx.fillRect(x0 + 10, 40, 1, LH - 40);
      mx.fillRect(x0 + 90, 40, 1, LH - 40);
      mx.fillRect(x0 + 6, 36, 102, 1);
      if (areaKey === 'garden') {
        // Enredaderas colgantes
        mx.fillStyle = gba(a.accent[0]);
        for (let k = 0; k < 8; k++) {
          const vx = x0 + 14 + k * 12, vl = 10 + ((r() * 30) | 0);
          for (let y = 0; y < vl; y++) mx.fillRect(vx + (Math.sin(y / 4) > 0.5 ? 1 : 0), 44 + y, 1, 1);
        }
      }
    }
  }
  mx.fillStyle = midCol;
  mx.fillRect(0, H - 1, FW, LH - H + 1);
  return { sky, far, mid };
}

export function drawBackground(ctx, bg, camX, camY, t) {
  ctx.drawImage(bg.sky, 0, 0);
  const fw = bg.far.width;
  const fx = -Math.floor(camX * 0.15) % fw;
  const fy = Math.floor(-camY * 0.05);
  ctx.drawImage(bg.far, fx, fy); ctx.drawImage(bg.far, fx + fw, fy);
  const mxo = -Math.floor(camX * 0.35) % fw;
  const my = Math.floor(-camY * 0.15) + 10;
  ctx.drawImage(bg.mid, mxo, my); ctx.drawImage(bg.mid, mxo + fw, my);
}

// Render de salas: material continuo píxel a píxel con biselado por campo de distancias,
// remates superiores (hierba, nieve, alfombra...), adornos del techo, plataformas, pinchos y pared de fondo.
import { mk, hex, rgbStr, fbm, vnoise, hash2, bayer, crisp } from '../core/gfx.js';

const T = 16;
const isSolid = (c) => c === '#' || c === 'X';

// ---------- Materiales: devuelven brillo base (0..1) y opcionalmente acento ----------
const MATERIALS = {
  plaster(x, y) {
    const row = Math.floor(y / 16), off = (row & 1) * 16, col = Math.floor((x + off) / 32);
    const lx = (x + off) % 32, ly = y % 16;
    if (lx === 0 || ly === 0) return { v: 0.3 };
    let v = 0.62 + (hash2(col, row, 3) - 0.5) * 0.16 + (vnoise(x * 0.5, y * 0.5) - 0.5) * 0.08;
    if (ly === 1 || lx === 1) v += 0.08;
    if (ly === 15 || lx === 31) v -= 0.08;
    const cr = fbm(x / 20, y / 20, 3, 9);
    if (Math.abs(cr - 0.5) < 0.012) v -= 0.25;
    return { v };
  },
  sandstone(x, y) {
    const n = fbm(x / 40, y / 14, 3, 4);
    let v = 0.55 + 0.13 * Math.sin(y * 0.32 + n * 7) + (vnoise(x * 0.7, y * 0.7) - 0.5) * 0.1;
    if (Math.abs(fbm(x / 9, y / 30, 2, 8) - 0.5) < 0.01) v -= 0.3;
    return { v };
  },
  cave(x, y) {
    const n = fbm(x / 22, y / 22, 4, 2);
    let v = 0.25 + n * 0.6;
    const r = fbm(x / 8, y / 8, 2, 5);
    if (r < 0.32) v -= 0.18;
    if (fbm(x / 30, y / 50, 3, 12) > 0.7) return { v: v + 0.1, accent: 0.35 };
    return { v };
  },
  slate(x, y) {
    const n = fbm(x / 30, y / 30, 3, 6);
    let v = 0.5 + 0.16 * Math.sin((x * 0.6 + y) * 0.22 + n * 5) + (vnoise(x, y) - 0.5) * 0.08;
    if (Math.abs(Math.sin((x * 0.6 + y) * 0.22 + n * 5)) > 0.985) v -= 0.25;
    return { v };
  },
  metal(x, y) {
    const lx = x % 32, ly = y % 32, px = Math.floor(x / 32), py = Math.floor(y / 32);
    if (lx === 0 || ly === 0) return { v: 0.18 };
    if (lx === 1 || ly === 1) return { v: 0.72 };
    let v = 0.48 + (hash2(px, py, 7) - 0.5) * 0.12 + (vnoise(x * 0.15, y * 3) - 0.5) * 0.08;
    if ((lx === 4 || lx === 27) && (ly === 4 || ly === 27)) return { v: 0.9 };
    if ((lx === 5 || lx === 28) && (ly === 5 || ly === 28)) return { v: 0.2 };
    if (hash2(px, py, 1) > 0.75 && ly > 10 && ly < 22 && lx > 8 && lx < 24 && ly % 3 === 0) v -= 0.25;
    if (hash2(px, py, 2) > 0.85 && ly === 16 && lx > 4 && lx < 28) return { v: 0.9, accent: 1 };
    return { v };
  },
  marble(x, y) {
    const row = Math.floor(y / 24), off = (row & 1) * 24, lx = (x + off) % 48, ly = y % 24;
    if (lx === 0 || ly === 0) return { v: 0.45 };
    const n = fbm(x / 26, y / 26, 4, 3);
    let v = 0.7 + (n - 0.5) * 0.2;
    if (Math.abs(Math.sin(x * 0.04 + y * 0.02 + n * 9)) < 0.06) v -= 0.3;
    if (ly === 1) v += 0.1;
    return { v };
  },
  concrete(x, y) {
    let v = 0.5 + (vnoise(x * 0.8, y * 0.8) - 0.5) * 0.1 + (fbm(x / 40, y / 40, 3, 3) - 0.5) * 0.3;
    if (y % 64 === 0) v -= 0.2;
    if (fbm(x / 6, y / 40, 2, 7) > 0.72 && fbm(x / 60, y / 60, 2, 2) > 0.55) return { v: v - 0.05, accent: 0.5 };
    return { v };
  },
};

function rampColor(ramp, v, x, y) {
  v = Math.max(0, Math.min(0.9999, v));
  const f = v * (ramp.length - 1), i = Math.floor(f), t = f - i;
  return ramp[Math.min(ramp.length - 1, i + (t > bayer(x, y) ? 1 : 0))];
}

// ---------- Campo de distancias desde el aire ----------
function distanceField(room) {
  const W = room.W * T, H = room.H * T, N = W * H;
  const solid = new Uint8Array(N);
  for (let j = 0; j < room.H; j++) for (let i = 0; i < room.W; i++) {
    if (!isSolid(room.tiles[j][i])) continue;
    for (let y = 0; y < T; y++) solid.fill(1, (j * T + y) * W + i * T, (j * T + y) * W + i * T + T);
  }
  const dist = new Uint8Array(N).fill(255), sx = new Int16Array(N), sy = new Int16Array(N);
  const q = new Int32Array(N); let qh = 0, qt = 0;
  const CAP = 40;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const k = y * W + x;
    if (!solid[k]) continue;
    let ax = -1, ay = -1;
    if (x > 0 && !solid[k - 1]) { ax = x - 1; ay = y; }
    else if (x < W - 1 && !solid[k + 1]) { ax = x + 1; ay = y; }
    else if (y > 0 && !solid[k - W]) { ax = x; ay = y - 1; }
    else if (y < H - 1 && !solid[k + W]) { ax = x; ay = y + 1; }
    if (ax >= 0) { dist[k] = 1; sx[k] = ax; sy[k] = ay; q[qt++] = k; }
  }
  while (qh < qt) {
    const k = q[qh++], x = k % W, y = (k / W) | 0, d = dist[k];
    if (d >= CAP) continue;
    const nb = [k - 1, k + 1, k - W, k + W];
    for (let n = 0; n < 4; n++) {
      const m = nb[n];
      if (m < 0 || m >= N || !solid[m] || dist[m] !== 255) continue;
      if ((n === 0 && x === 0) || (n === 1 && x === W - 1)) continue;
      const mx = m % W, my = (m / W) | 0, dx = mx - sx[k], dy = my - sy[k];
      dist[m] = Math.min(254, Math.round(Math.sqrt(dx * dx + dy * dy)));
      sx[m] = sx[k]; sy[m] = sy[k]; q[qt++] = m;
    }
  }
  return { W, H, solid, dist, sx, sy };
}

// ---------- Render principal ----------
export function renderRoom(room, zone) {
  const df = distanceField(room);
  const { W, H, solid, dist, sx, sy } = df;
  const [c, x] = mk(W, H);
  const img = x.createImageData(W, H), a = img.data;
  const ramp = zone.ramp.map(hex), accent = hex(zone.accent);
  const mat = MATERIALS[zone.material];
  const LX = -0.55, LY = -0.83;
  const ox = room.px, oy = room.py;
  for (let y = 0; y < H; y++) for (let px = 0; px < W; px++) {
    const k = y * W + px;
    if (!solid[k]) continue;
    const d = dist[k] === 255 ? 60 : dist[k];
    let col;
    if (d <= 1) col = ramp[0];
    else {
      const m = mat(px + ox, y + oy);
      let v = m.v;
      if (d < 7) {
        let nx = sx[k] - px, ny = sy[k] - y; const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
        const lam = nx * LX + ny * LY;
        v += lam * 0.32 * (1 - (d - 2) / 5);
        if (d === 2 && lam > 0.2) v += 0.15;
      }
      v -= Math.max(0, Math.min(1, (d - 8) / 34)) * 0.42;
      if (m.accent && d > 3) {
        const t = m.accent * (0.6 + 0.4 * vnoise(px * 0.3, y * 0.3));
        const b = rampColor(zone.ramp, v, px, y), bb = hex(b);
        col = bb.map((cc, i) => cc + (accent[i] - cc) * t * Math.max(0, Math.min(1, v + 0.2)));
      } else col = hex(rampColor(zone.ramp, v, px, y));
    }
    const ti = Math.floor(px / T), tj = Math.floor(y / T);
    if (room.tiles[tj][ti] === 'X') {
      // grietas del muro rompible
      const cx2 = px % T, cy2 = y % T;
      if (Math.abs(cx2 - cy2) < 1 || Math.abs(cx2 + cy2 - 15) < 1 || (cx2 === 8 && cy2 > 3)) col = ramp[0];
      else col = col.map((cc) => cc * 0.85);
    }
    a[k * 4] = col[0]; a[k * 4 + 1] = col[1]; a[k * 4 + 2] = col[2]; a[k * 4 + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  drawTops(x, room, zone, df);
  drawCeilings(x, room, zone, df);
  drawSpecialTiles(x, room, zone);
  return c;
}

// Remates de las superficies superiores
function drawTops(x, room, zone, df) {
  const { W, H, solid } = df, R = (i, j, s) => hash2(i, j, s);
  const [t1, t2, t3] = [zone.top1, zone.top2, zone.top3];
  for (let y = 1; y < H; y++) for (let px = 0; px < W; px++) {
    const k = y * W + px;
    if (!solid[k] || solid[k - W]) continue;
    const r = R(px, y, 1);
    const p = (cx, cy, col) => { x.fillStyle = col; x.fillRect(cx, cy, 1, 1); };
    switch (zone.top) {
      case 'grass': {
        p(px, y, t1); p(px, y + 1, t1); p(px, y + 2, r > 0.5 ? t1 : zone.ramp[1]);
        const h = 1 + Math.floor(R(px, y, 2) * 4);
        for (let k2 = 1; k2 <= h; k2++) p(px, y - k2, k2 === h ? t2 : t1);
        if (r > 0.94) { p(px, y - h - 1, t3); p(px - 1, y - h, t3); p(px + 1, y - h, t3); p(px, y - h, '#fff0a0'); }
        break;
      }
      case 'drygrass': {
        p(px, y, t1); p(px, y + 1, zone.ramp[3]);
        if (r > 0.35) { const h = 1 + Math.floor(R(px, y, 2) * 5); for (let k2 = 1; k2 <= h; k2++) p(px + (k2 > 3 && r > 0.7 ? 1 : 0), y - k2, k2 > h - 2 ? t3 : t2); }
        break;
      }
      case 'moss': {
        p(px, y, t2); p(px, y + 1, t1);
        if (r > 0.6) p(px, y - 1, t3);
        if (r > 0.9) for (let k2 = 2; k2 < 2 + Math.floor(R(px, y, 3) * 6); k2++) p(px, y + k2, t1);
        break;
      }
      case 'gold': {
        p(px, y, zone.ramp[3]);
        if (r > 0.55) { p(px, y - 1, r > 0.85 ? t3 : t2); if (r > 0.8) p(px, y - 2, t1); }
        break;
      }
      case 'snow': {
        const h = 2 + Math.floor(fbm(px / 6, y, 2, 1) * 5);
        for (let k2 = -h + 1; k2 <= 2; k2++) p(px, y + k2, k2 < -h + 2 ? t3 : k2 > 0 ? t1 : t2);
        if (r > 0.92) for (let k2 = 3; k2 < 3 + Math.floor(R(px, y, 3) * 5); k2++) p(px, y + k2, t1);
        break;
      }
      case 'neon': {
        p(px, y, t3); p(px, y + 1, t2); p(px, y + 2, t1);
        break;
      }
      case 'carpet': {
        p(px, y - 1, t3); p(px, y, t2); p(px, y + 1, t2); p(px, y + 2, t1); p(px, y + 3, t3);
        break;
      }
      case 'hazard': {
        const s = ((px + y) >> 2) & 1;
        p(px, y, s ? t2 : t3); p(px, y + 1, s ? t2 : t3); p(px, y + 2, zone.ramp[1]);
        break;
      }
    }
  }
}

// Adornos que cuelgan del techo
function drawCeilings(x, room, zone, df) {
  const { W, H, solid } = df;
  for (let y = 0; y < H - 1; y++) for (let px = 0; px < W; px++) {
    const k = y * W + px;
    if (!solid[k] || solid[k + W]) continue;
    const r = hash2(px, y, 5), r2 = hash2(px, y, 6);
    const p = (cx, cy, col) => { x.fillStyle = col; x.fillRect(cx, cy, 1, 1); };
    switch (zone.ceil) {
      case 'vines':
        if (r > 0.9) { const L = 4 + Math.floor(r2 * 26); for (let j = 1; j < L; j++) { const sw = Math.round(Math.sin(j * 0.4 + px) * 0.8); p(px + sw, y + j, j % 5 === 0 ? zone.top2 : zone.top1); if (j % 7 === 3) p(px + sw + 1, y + j, zone.top3); } }
        break;
      case 'roots':
        if (r > 0.92) { const L = 3 + Math.floor(r2 * 14); for (let j = 1; j < L; j++) p(px + Math.round(Math.sin(j * 0.6 + px) * 1.2), y + j, zone.ramp[1 + (j % 2)]); }
        break;
      case 'stalactites':
        if (r > 0.93) { const L = 4 + Math.floor(r2 * 14), w = 1 + Math.floor(L / 5); for (let j = 1; j < L; j++) { const ww = Math.max(0, Math.round(w * (1 - j / L))); for (let i = -ww; i <= ww; i++) p(px + i, y + j, i < 0 ? zone.ramp[3] : zone.ramp[1]); } }
        break;
      case 'icicles':
        if (r > 0.88) { const L = 3 + Math.floor(r2 * 16); for (let j = 1; j < L; j++) { const ww = j < L * 0.4 ? 1 : 0; for (let i = -ww; i <= ww; i++) p(px + i, y + j, i < 0 ? '#e8f6ff' : '#9fd6ea'); } }
        break;
      case 'cables':
        if (r > 0.97) { const L = 10 + Math.floor(r2 * 40), sag = 4 + r2 * 10; for (let i = 0; i < L; i++) { const yy = y + 1 + Math.round(Math.sin((i / L) * Math.PI) * sag); p(px + i, yy, '#0d1118'); p(px + i, yy + 1, '#1c2230'); } }
        break;
      case 'drapes':
        if (px % 64 < 40 && r > 0.2) { const L = 6 + Math.round(Math.abs(Math.sin(px * 0.157)) * 10); for (let j = 1; j < L; j++) p(px, y + j, (px % 8 < 3) ? '#5a1018' : '#8a1f2a'); if (px % 8 === 0) p(px, y + L, '#d8a43a'); }
        break;
      case 'pipes':
        if (px % 96 < 70) { p(px, y + 1, '#2a2622'); p(px, y + 2, '#4e4840'); p(px, y + 3, '#6a6256'); p(px, y + 4, '#3a3530'); p(px, y + 5, '#1a1816'); if (px % 32 === 0) { for (let j = 0; j < 6; j++) p(px, y + j, '#7a2a20'); } }
        break;
    }
  }
}

// Plataformas, pinchos y cerrojos
function drawSpecialTiles(x, room, zone) {
  for (let j = 0; j < room.H; j++) for (let i = 0; i < room.W; i++) {
    const t = room.tiles[j][i], X = i * T, Y = j * T;
    if (t === '=') drawPlank(x, X, Y, zone, room.tiles[j][i - 1] !== '=', room.tiles[j][i + 1] !== '=');
    if (t === '^') drawSpike(x, X, Y, zone);
    if (t === 'L') drawLock(x, X, Y);
  }
}
function drawPlank(x, X, Y, zone, leftEnd, rightEnd) {
  const s = zone.plank;
  const cols = {
    wood: ['#1a100a', '#5a3a22', '#7a5232', '#9a6a40', '#3a2414'],
    stone: [zone.ramp[0], zone.ramp[2], zone.ramp[3], zone.ramp[4], zone.ramp[1]],
    grate: ['#06080c', '#2a3242', '#3e4a60', '#5e6c86', '#1a2030'],
    marble: ['#1a1618', '#a89c98', '#d6ccc6', '#f2ece6', '#d8a43a'],
  }[s];
  x.fillStyle = cols[0]; x.fillRect(X, Y, 16, 6);
  x.fillStyle = cols[2]; x.fillRect(X, Y + 1, 16, 3);
  x.fillStyle = cols[3]; x.fillRect(X, Y + 1, 16, 1);
  x.fillStyle = cols[1]; x.fillRect(X, Y + 4, 16, 1);
  if (s === 'wood') { x.fillStyle = cols[0]; if (X % 32 === 0) x.fillRect(X + 15, Y + 1, 1, 4); x.fillStyle = '#c8b8a0'; x.fillRect(X + 3, Y + 2, 1, 1); x.fillRect(X + 12, Y + 2, 1, 1); }
  if (s === 'grate') { x.fillStyle = cols[0]; for (let k = 2; k < 16; k += 3) x.fillRect(X + k, Y + 2, 1, 2); }
  if (s === 'marble') { x.fillStyle = cols[4]; x.fillRect(X, Y + 4, 16, 1); }
  // ménsulas en los extremos
  x.fillStyle = cols[4];
  if (leftEnd) { x.fillRect(X + 1, Y + 5, 3, 3); x.fillRect(X + 2, Y + 8, 1, 2); }
  if (rightEnd) { x.fillRect(X + 12, Y + 5, 3, 3); x.fillRect(X + 13, Y + 8, 1, 2); }
}
function drawSpike(x, X, Y, zone) {
  const c = { iron: ['#141418', '#5a5e68', '#a8aeb8'], bone: ['#1a1410', '#a8987c', '#e8dcc0'], ice: ['#0c1a26', '#6ab4d6', '#e0f6ff'], emitter: ['#08060c', '#ff3e9a', '#ffd0e8'], gold: ['#2a1a08', '#b07a24', '#ffe08a'] }[zone.spike];
  for (let k = 0; k < 4; k++) {
    const bx = X + k * 4, h = 9 + ((k * 7) % 4);
    for (let j = 0; j < h; j++) {
      const w = Math.max(0, Math.round(2 * (j / h)));
      for (let i = -w; i <= w; i++) { x.fillStyle = i < 0 ? c[2] : i === 0 ? c[1] : c[0]; x.fillRect(bx + 2 + i, Y + 16 - h + j, 1, 1); }
    }
  }
  x.fillStyle = c[0]; x.fillRect(X, Y + 14, 16, 2);
}
function drawLock(x, X, Y) {
  x.fillStyle = '#2a1a08'; x.fillRect(X, Y, 16, 16);
  for (let k = 1; k < 16; k += 5) { x.fillStyle = '#b07a24'; x.fillRect(X + k, Y, 3, 16); x.fillStyle = '#ffe08a'; x.fillRect(X + k, Y, 1, 16); }
  x.fillStyle = '#d8a43a'; x.fillRect(X, Y + 6, 16, 3); x.fillStyle = '#5a3a10'; x.fillRect(X, Y + 9, 16, 1);
}

// ---------- Pared de fondo (zonas interiores) ----------
export function renderBackWall(room, zone) {
  const W = room.W * T, H = room.H * T;
  const [c, x] = mk(W, H);
  const img = x.createImageData(W, H), a = img.data;
  const back = zone.back.map(hex);
  for (let y = 0; y < H; y++) for (let px = 0; px < W; px++) {
    const wx = px + room.px, wy = y + room.py;
    let v;
    switch (zone.material) {
      case 'cave': v = 0.3 + fbm(wx / 40, wy / 40, 4, 21) * 0.7; if (fbm(wx / 12, wy / 12, 2, 22) < 0.33) v -= 0.25; break;
      case 'metal': { const lx = wx % 64, ly = wy % 48; v = lx < 2 || ly < 2 ? 0.1 : 0.55 + (hash2(wx >> 6, wy / 48 | 0, 4) - 0.5) * 0.3; if (ly > 20 && ly < 26 && lx > 10 && lx < 54) v = 0.85; break; }
      case 'marble': { const ly = wy % 128; v = ly > 92 ? 0.35 + ((wx >> 3) & 1) * 0.1 : 0.5 + 0.2 * Math.sin(wx * 0.2) * Math.sin(wy * 0.2) * (((wx >> 4) + (wy >> 4)) & 1); if (ly === 92 || ly === 93) v = 1; break; }
      default: v = 0.4 + (fbm(wx / 30, wy / 30, 3, 23) - 0.5) * 0.5 + ((wy % 64) < 1 ? -0.3 : 0);
    }
    // más oscuro hacia arriba y en los bordes: sensación de encierro
    v -= (1 - y / H) * 0.15;
    v = Math.max(0, Math.min(0.999, v));
    const f = v * (back.length - 1), i = Math.floor(f), t = f - i;
    const col = back[Math.min(back.length - 1, i + (t > bayer(px, y) ? 1 : 0))];
    const k = (y * W + px) * 4;
    a[k] = col[0]; a[k + 1] = col[1]; a[k + 2] = col[2]; a[k + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  return c;
}

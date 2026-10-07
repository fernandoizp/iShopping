// Fondos parallax de las zonas exteriores (cielo + 3 capas) generados con tramado.
import { mk, hex, rgbStr, fbm, rng, bayer, mixHex, crisp } from '../core/gfx.js';
import { W, H } from '../core/gfx.js';

const LW = 1024, LH = H + 120;

function skyGradient(x, cols, w, h) {
  const C = cols.map(hex), n = C.length - 1;
  const img = x.createImageData(w, h), a = img.data;
  for (let j = 0; j < h; j++) {
    const f = (j / h) * n, i = Math.min(n - 1, Math.floor(f)), t = f - i;
    for (let k = 0; k < w; k++) {
      const c = C[i + (t > bayer(k, j) ? 1 : 0)], o = (j * w + k) * 4;
      a[o] = c[0]; a[o + 1] = c[1]; a[o + 2] = c[2]; a[o + 3] = 255;
    }
  }
  x.putImageData(img, 0, 0);
}

function ridge(x, col, base, amp, freq, seed, jag = 0.5) {
  x.fillStyle = col; x.beginPath(); x.moveTo(0, LH);
  for (let i = 0; i <= LW; i += 2) {
    const u = i / LW;
    // periódico para que la capa se repita sin costura
    const h = fbm(Math.cos(u * Math.PI * 2) * freq + 50, Math.sin(u * Math.PI * 2) * freq + seed, 4, seed);
    x.lineTo(i, base - amp * Math.pow(h, 1 + jag));
  }
  x.lineTo(LW, LH); x.closePath(); x.fill();
}

function cypress(x, cx, base, h, w, col, hi) {
  x.fillStyle = col; x.beginPath(); x.moveTo(cx, base - h);
  x.bezierCurveTo(cx + w, base - h * 0.6, cx + w, base - h * 0.15, cx + w * 0.3, base); x.lineTo(cx - w * 0.3, base);
  x.bezierCurveTo(cx - w, base - h * 0.15, cx - w, base - h * 0.6, cx, base - h); x.fill();
  if (hi) { x.fillStyle = hi; x.beginPath(); x.moveTo(cx + 1, base - h + 5); x.bezierCurveTo(cx + w * 0.9, base - h * 0.6, cx + w * 0.8, base - h * 0.2, cx + w * 0.3, base - 2); x.lineTo(cx + 2, base - 2); x.fill(); }
}
function pine(x, cx, base, h, col, snow) {
  for (let k = 0; k < 5; k++) {
    const y0 = base - h + k * h * 0.17, w = (k + 1.5) * h * 0.07;
    x.fillStyle = col; x.beginPath(); x.moveTo(cx, y0); x.lineTo(cx + w, y0 + h * 0.25); x.lineTo(cx - w, y0 + h * 0.25); x.fill();
    if (snow) { x.fillStyle = snow; x.beginPath(); x.moveTo(cx, y0); x.lineTo(cx + w * 0.5, y0 + h * 0.08); x.lineTo(cx - w * 0.6, y0 + h * 0.1); x.fill(); }
  }
  x.fillStyle = col; x.fillRect(cx - 1, base - h * 0.15, 3, h * 0.15);
}

function layer(draw) { const [c, x] = mk(LW, LH); draw(x); crisp(c, 80); return c; }

export function buildParallax(zoneKey, zone) {
  if (zone.indoor) return null;
  const r = rng(zoneKey.length * 7919 + 13);
  const [sky, sx] = mk(W, H);
  skyGradient(sx, [...zone.sky].reverse(), W, H);
  const out = { sky, layers: [] };

  if (zoneKey === 'jardines') {
    // sol y nubes
    const g = sx.createRadialGradient(360, 70, 4, 360, 70, 140); g.addColorStop(0, 'rgba(255,248,220,1)'); g.addColorStop(0.12, 'rgba(255,236,190,.8)'); g.addColorStop(1, 'rgba(255,220,170,0)');
    sx.fillStyle = g; sx.fillRect(0, 0, W, H); sx.fillStyle = '#fff8e4'; sx.beginPath(); sx.arc(360, 70, 12, 0, 7); sx.fill();
    out.layers.push({ img: layer((x) => { ridge(x, zone.far, 190, 110, 1.6, 3, 0.2); ridge(x, mixHex(zone.far, zone.mid, 0.5), 205, 70, 2.4, 5, 0.3); }), f: 0.08, y: -10 });
    out.layers.push({ img: layer((x) => {
      // pueblo blanco sobre la colina
      ridge(x, mixHex(zone.mid, '#b9a2b4', 0.3), 230, 40, 1.2, 9, 0);
      let px = 0;
      while (px < LW) {
        const bw = 18 + r() * 30, bh = 16 + r() * 30, by = 200 + Math.sin(px * 0.01) * 10 - bh;
        x.fillStyle = mixHex('#efe2cf', zone.mid, 0.35); x.fillRect(px, by, bw, bh + 40);
        x.fillStyle = mixHex('#c98a6b', zone.mid, 0.35); x.beginPath(); x.moveTo(px - 2, by); x.lineTo(px + bw / 2, by - 8); x.lineTo(px + bw + 2, by); x.fill();
        x.fillStyle = mixHex('#6a5873', zone.mid, 0.3); if (r() > 0.4) x.fillRect(px + 5, by + 8, 3, 5);
        if (r() > 0.85) { x.fillStyle = mixHex('#efe2cf', zone.mid, 0.35); x.fillRect(px + bw / 2 - 5, by - 40, 10, 42); x.fillStyle = mixHex('#c98a6b', zone.mid, 0.35); x.beginPath(); x.moveTo(px + bw / 2 - 6, by - 40); x.lineTo(px + bw / 2, by - 54); x.lineTo(px + bw / 2 + 6, by - 40); x.fill(); }
        px += bw + 2 + r() * 20;
      }
    }), f: 0.22, y: 0 });
    out.layers.push({ img: layer((x) => {
      for (let cx = 10; cx < LW; cx += 40 + r() * 70) cypress(x, cx, 250, 70 + r() * 60, 9 + r() * 5, zone.near, 'rgba(255,220,150,0.15)');
      x.fillStyle = zone.near; x.fillRect(0, 245, LW, LH);
    }), f: 0.45, y: 10 });
  } else if (zoneKey === 'meseta') {
    const g = sx.createRadialGradient(120, 90, 4, 120, 90, 160); g.addColorStop(0, 'rgba(255,250,220,1)'); g.addColorStop(0.15, 'rgba(255,230,160,.7)'); g.addColorStop(1, 'rgba(255,200,120,0)');
    sx.fillStyle = g; sx.fillRect(0, 0, W, H);
    out.layers.push({ img: layer((x) => { ridge(x, zone.far, 205, 50, 0.8, 2, -0.3); }), f: 0.06, y: 0 });
    out.layers.push({ img: layer((x) => {
      ridge(x, zone.mid, 228, 34, 1.5, 7, 0);
      // castillo en ruinas y molinos lejanos
      const cx = 300; x.fillStyle = zone.mid;
      x.fillRect(cx, 150, 70, 60); x.fillRect(cx - 10, 130, 18, 80); x.fillRect(cx + 62, 136, 16, 74);
      for (let k = 0; k < 70; k += 10) x.fillRect(cx + k, 144, 6, 6);
      for (const mx of [120, 620, 820]) {
        x.fillRect(mx - 5, 170, 10, 40); x.beginPath(); x.moveTo(mx - 7, 172); x.lineTo(mx, 162); x.lineTo(mx + 7, 172); x.fill();
        for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.3; x.save(); x.translate(mx, 170); x.rotate(a); x.fillRect(-1, -28, 3, 28); x.fillRect(1, -26, 5, 18); x.restore(); }
      }
    }), f: 0.2, y: 0 });
    out.layers.push({ img: layer((x) => { ridge(x, zone.near, 262, 30, 2.5, 11, 0.4); for (let i = 0; i < LW; i += 3) if (r() > 0.5) { x.fillStyle = zone.near; x.fillRect(i, 236 + r() * 10, 1, 8); } }), f: 0.42, y: 8 });
  } else if (zoneKey === 'fiordo') {
    // aurora
    for (let b = 0; b < 3; b++) for (let i = 0; i < W; i++) {
      const y0 = 40 + b * 18 + Math.sin(i * 0.02 + b) * 14 + Math.sin(i * 0.051) * 6;
      for (let j = 0; j < 24; j++) if ((j / 24) < bayer(i, j) * 0.8) { sx.fillStyle = b === 1 ? 'rgba(120,255,200,0.12)' : 'rgba(140,200,255,0.10)'; sx.fillRect(i, y0 + j, 1, 1); }
    }
    out.layers.push({ img: layer((x) => { ridge(x, zone.far, 210, 170, 2.2, 4, 1.2); x.fillStyle = 'rgba(240,250,255,0.6)'; ridge(x, 'rgba(235,245,255,0.35)', 120, 60, 2.2, 4, 2.5); }), f: 0.07, y: -6 });
    out.layers.push({ img: layer((x) => {
      ridge(x, zone.mid, 230, 120, 3, 8, 1.4);
      // agua del fiordo con reflejo
      x.fillStyle = mixHex(zone.mid, '#9fd6ea', 0.25); x.fillRect(0, 232, LW, LH);
      for (let i = 0; i < LW; i += 4) { x.fillStyle = 'rgba(220,240,255,0.35)'; x.fillRect(i + r() * 4, 236 + r() * 40, 6, 1); }
    }), f: 0.2, y: 0 });
    out.layers.push({ img: layer((x) => { for (let cx = 0; cx < LW; cx += 18 + r() * 34) pine(x, cx, 262, 60 + r() * 70, zone.near, '#c8dce8'); x.fillStyle = zone.near; x.fillRect(0, 258, LW, LH); }), f: 0.42, y: 10 });
  }
  return out;
}

export function drawParallax(ctx, bg, camX, camY, roomH) {
  if (!bg) return;
  ctx.drawImage(bg.sky, 0, 0);
  // las salas altas desplazan las capas hacia abajo cuando la cámara sube
  const vy = Math.max(0, Math.min(1, camY / Math.max(1, roomH - H)));
  for (const L of bg.layers) {
    const ox = -Math.floor(camX * L.f) % LW;
    const oy = Math.round(L.y + (1 - vy) * 0 - camY * L.f * 0.3) - 20;
    ctx.drawImage(L.img, ox, oy); if (ox + LW < W) ctx.drawImage(L.img, ox + LW, oy);
  }
}

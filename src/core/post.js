// Postprocesado: oscuridad ambiental con luces, brillo aditivo, rayos, niebla, bloom, viñeta y gradación.
import { mk, W, H, fbm, hex, rgbStr, glowSprite } from './gfx.js';

const [DARK, dx] = mk(W, H);
const [BL1, b1] = mk(W / 4, H / 4);
const [BL2, b2] = mk(W / 8, H / 8);
b1.imageSmoothingEnabled = true; b2.imageSmoothingEnabled = true;
const canFilter = typeof b1.filter === 'string' && !/^((?!chrome|android).)*safari/i.test(navigator.userAgent);

// Punto de luz para restar oscuridad (blanco con caída suave)
const [HOLE] = (() => {
  const [c, x] = mk(128, 128);
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(255,255,255,0.75)'); g.addColorStop(0.75, 'rgba(255,255,255,0.25)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  return [c];
})();

// Textura de niebla repetible
const FOG = (() => {
  const [c, x] = mk(512, 160);
  const img = x.createImageData(512, 160), a = img.data;
  for (let j = 0; j < 160; j++) for (let i = 0; i < 512; i++) {
    const u = i / 512 * Math.PI * 2;
    const n = fbm(Math.cos(u) * 2.2 + 9, Math.sin(u) * 2.2 + j / 40, 4, 31);
    const v = Math.max(0, n - 0.42) * 2.4 * Math.sin((j / 160) * Math.PI);
    const k = (j * 512 + i) * 4; a[k] = 255; a[k + 1] = 255; a[k + 2] = 255; a[k + 3] = Math.min(255, v * 255);
  }
  x.putImageData(img, 0, 0);
  return c;
})();
const fogTint = new Map();
function tintedFog(col) {
  if (fogTint.has(col)) return fogTint.get(col);
  const [c, x] = mk(512, 160);
  x.drawImage(FOG, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = col; x.fillRect(0, 0, 512, 160);
  fogTint.set(col, c); return c;
}

// Rayos de luz diagonales
const RAYS = (() => {
  const [c, x] = mk(W + 200, H);
  for (let k = 0; k < 9; k++) {
    const x0 = 40 + k * 70 + (k * 37) % 30, w = 16 + (k * 13) % 26;
    const g = x.createLinearGradient(x0, 0, x0 - 140, H);
    g.addColorStop(0, 'rgba(255,240,200,0.55)'); g.addColorStop(0.6, 'rgba(255,220,170,0.15)'); g.addColorStop(1, 'rgba(255,220,170,0)');
    x.fillStyle = g; x.beginPath(); x.moveTo(x0, 0); x.lineTo(x0 + w, 0); x.lineTo(x0 + w - 150, H); x.lineTo(x0 - 150, H); x.fill();
  }
  return c;
})();

const VIGNETTE = (() => {
  const [c, x] = mk(W, H);
  const g = x.createRadialGradient(W / 2, H / 2, H * 0.42, W / 2, H / 2, W * 0.62);
  g.addColorStop(0, 'rgba(4,2,8,0)'); g.addColorStop(1, 'rgba(4,2,8,0.72)');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  return c;
})();

export function postProcess(ctx, cv, zone, lights, t, camX, camY, opts = {}) {
  // 1) oscuridad con huecos de luz
  const dark = Math.min(0.95, zone.dark + (opts.extraDark || 0));
  if (dark > 0.01) {
    dx.globalCompositeOperation = 'source-over';
    dx.clearRect(0, 0, W, H);
    dx.fillStyle = 'rgb(6,4,12)'; dx.globalAlpha = dark; dx.fillRect(0, 0, W, H); dx.globalAlpha = 1;
    dx.globalCompositeOperation = 'destination-out';
    for (const L of lights) {
      const r = L.r * 1.25;
      dx.globalAlpha = Math.min(1, L.i ?? 1);
      dx.drawImage(HOLE, L.x - r, L.y - r, r * 2, r * 2);
    }
    dx.globalAlpha = 1;
    ctx.drawImage(DARK, 0, 0);
  }
  // 2) brillo de color aditivo
  ctx.globalCompositeOperation = 'lighter';
  for (const L of lights) {
    const s = glowSprite(64, L.col);
    ctx.globalAlpha = 0.16 * (L.i ?? 1) * (L.add ?? 1);
    ctx.drawImage(s, L.x - L.r, L.y - L.r, L.r * 2, L.r * 2);
  }
  // 3) rayos de sol
  if (zone.rays) {
    ctx.globalAlpha = 0.16 + Math.sin(t * 0.01) * 0.03;
    ctx.drawImage(RAYS, -((camX * 0.15) % 200) - 40 + Math.sin(t * 0.005) * 8, 0);
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  // 4) niebla en dos capas con parallax
  const fog = tintedFog(zone.fog.replace(/[\d.]+\)$/, '1)'));
  const fa = parseFloat(zone.fog.match(/([\d.]+)\)$/)[1]);
  for (const [f, y, s, al] of [[0.3, H - 150, 0.15, 1], [0.6, H - 110, 0.35, 0.8]]) {
    const ox = -(((camX * f + t * s) % 512) + 512) % 512;
    ctx.globalAlpha = fa * al;
    for (let x0 = ox; x0 < W; x0 += 512) ctx.drawImage(fog, x0, y - camY * f * 0.2);
  }
  ctx.globalAlpha = 1;
  // 5) gradación de color
  ctx.fillStyle = zone.grade; ctx.fillRect(0, 0, W, H);
  // 6) bloom
  if (opts.bloom !== false) {
    b1.clearRect(0, 0, BL1.width, BL1.height);
    if (canFilter) b1.filter = 'brightness(0.9) contrast(2.2) saturate(1.3)';
    b1.drawImage(cv, 0, 0, BL1.width, BL1.height);
    b1.filter = 'none';
    b2.clearRect(0, 0, BL2.width, BL2.height); b2.drawImage(BL1, 0, 0, BL2.width, BL2.height);
    ctx.save(); ctx.imageSmoothingEnabled = true; ctx.globalCompositeOperation = canFilter ? 'screen' : 'lighter';
    ctx.globalAlpha = canFilter ? 0.32 : 0.08;
    ctx.drawImage(BL2, 0, 0, W, H); ctx.globalAlpha *= 0.8; ctx.drawImage(BL1, 0, 0, W, H);
    ctx.restore(); ctx.imageSmoothingEnabled = false;
  }
  // 7) viñeta
  ctx.drawImage(VIGNETTE, 0, 0);
}

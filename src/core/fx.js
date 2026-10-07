// Partículas de impacto y partículas ambientales por zona.
import { W, H } from './gfx.js';

export class FX {
  constructor() { this.p = []; this.amb = []; }
  add(o) { if (this.p.length < 700) this.p.push(o); }
  spark(x, y, vx, vy, col, life = 20, g = 0.04, size = 1, glow = true) { this.add({ x, y, vx, vy, col, life, max: life, g, size, glow }); }
  burst(x, y, n, col, speed = 2.4, life = 24) {
    for (let k = 0; k < n; k++) { const a = Math.random() * Math.PI * 2, s = (0.3 + Math.random()) * speed; this.spark(x, y, Math.cos(a) * s, Math.sin(a) * s - 0.6, col, life * (0.6 + Math.random() * 0.6), 0.1, Math.random() < 0.3 ? 2 : 1); }
  }
  oil(x, y, n, dir) { for (let k = 0; k < n; k++) this.spark(x, y, dir * (0.5 + Math.random() * 2.5), -Math.random() * 2.5, Math.random() < 0.5 ? '#1a1418' : '#3a2a30', 30, 0.18, 2, false); }
  dust(x, y, n) { for (let k = 0; k < n; k++) this.spark(x + (Math.random() - 0.5) * 10, y - 1, (Math.random() - 0.5) * 1.4, -Math.random() * 0.7, 'rgba(200,190,170,0.7)', 18 + Math.random() * 10, -0.01, 2, false); }
  ring(x, y, col, r = 30) { this.add({ ring: true, x, y, col, life: 16, max: 16, r }); }
  text(x, y, str, col) { this.add({ txt: str, x, y, vx: 0, vy: -0.4, col, life: 60, max: 60, g: 0 }); }

  update(room) {
    for (const q of this.p) {
      if (q.ring) { q.life--; continue; }
      q.x += q.vx; q.y += q.vy; q.vy += q.g; q.vx *= 0.97; q.life--;
    }
    this.p = this.p.filter((q) => q.life > 0);
  }

  draw(ctx, cx, cy, textFn) {
    for (const glow of [false, true]) {
      if (glow) ctx.globalCompositeOperation = 'lighter';
      for (const q of this.p) {
        if (!!q.glow !== glow || q.txt) continue;
        if (q.ring) {
          const k = 1 - q.life / q.max;
          ctx.strokeStyle = q.col; ctx.globalAlpha = 1 - k; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(Math.round(q.x - cx), Math.round(q.y - cy), q.r * k, 0, 7); ctx.stroke(); ctx.globalAlpha = 1;
          continue;
        }
        const s = q.size * (q.life > q.max * 0.4 ? 1 : 0.5) + (glow ? 0 : 0);
        ctx.fillStyle = q.col;
        ctx.fillRect(Math.round(q.x - cx), Math.round(q.y - cy), Math.max(1, Math.round(s)), Math.max(1, Math.round(s)));
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    for (const q of this.p) if (q.txt) { ctx.globalAlpha = Math.min(1, q.life / 20); textFn(q.txt, q.x - cx, q.y - cy, q.col); ctx.globalAlpha = 1; }
  }

  // ── partículas ambientales en espacio de pantalla con parallax ──
  ambient(kind, t, camX, camY) {
    const conf = {
      petals: { n: 26, col: ['#f28aa1', '#ffd0dc', '#ffffff'], vx: -0.35, vy: 0.3, size: 2, sway: 1 },
      dust: { n: 40, col: ['#f6e0a8', '#d8b878'], vx: -0.9, vy: 0.05, size: 1, sway: 0.3 },
      motes: { n: 30, col: ['#ffd8a0', '#c8a070'], vx: 0.05, vy: -0.08, size: 1, sway: 0.4, glow: true },
      embers: { n: 34, col: ['#ffb43c', '#ff7a1f', '#ffe58a'], vx: 0.1, vy: -0.35, size: 1, sway: 0.5, glow: true },
      snow: { n: 70, col: ['#ffffff', '#dceaf4'], vx: -0.3, vy: 0.55, size: 1, sway: 0.8 },
      data: { n: 30, col: ['#3ee8ff', '#ff3e9a'], vx: 0, vy: -0.5, size: 1, sway: 0, glow: true },
      goldust: { n: 30, col: ['#ffe08a', '#d8a43a'], vx: 0.05, vy: 0.08, size: 1, sway: 0.4, glow: true },
      ash: { n: 40, col: ['#6a6460', '#3a3634', '#d0302a'], vx: 0.1, vy: 0.25, size: 1, sway: 0.5 },
    }[kind];
    if (!conf) return;
    if (this.ambKind !== kind) {
      this.ambKind = kind;
      this.amb = Array.from({ length: conf.n }, (_, i) => ({ x: Math.random() * W, y: Math.random() * H, z: 0.4 + Math.random() * 0.9, p: Math.random() * 6, c: conf.col[i % conf.col.length] }));
      this.lastCam = [camX, camY];
    }
    const [lx, ly] = this.lastCam; this.lastCam = [camX, camY];
    for (const a of this.amb) {
      a.p += 0.02;
      a.x += conf.vx * a.z + Math.sin(a.p * 2) * conf.sway * 0.4 - (camX - lx) * a.z;
      a.y += conf.vy * a.z + Math.cos(a.p) * conf.sway * 0.15 - (camY - ly) * a.z;
      if (a.x < -4) a.x += W + 8; if (a.x > W + 4) a.x -= W + 8;
      if (a.y < -4) a.y += H + 8; if (a.y > H + 4) a.y -= H + 8;
    }
    this.ambConf = conf;
  }
  drawAmbient(ctx) {
    const conf = this.ambConf; if (!conf) return;
    if (conf.glow) ctx.globalCompositeOperation = 'lighter';
    for (const a of this.amb) {
      ctx.fillStyle = a.c;
      ctx.globalAlpha = conf.glow ? 0.5 + Math.sin(a.p * 5) * 0.4 : 0.85;
      const s = a.z > 1 ? conf.size + 1 : conf.size;
      ctx.fillRect(Math.round(a.x), Math.round(a.y), s, s);
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
}

// Los cuatro jefes de la hacienda.
import { mk, crisp, outline, quantize, hex } from '../core/gfx.js';
import { move, overlap } from './physics.js';
import { ray, segHit } from './enemies.js';
import { sfx } from '../core/audio.js';

const FLOOR = 240; // altura del suelo en las arenas (fila 15)
const R = (a, b) => a + Math.random() * (b - a);

class Boss {
  constructor(kind, name, title, x, hp) {
    this.kind = kind; this.name = name; this.title = title; this.isBoss = true;
    this.x = x; this.hp = hp; this.maxHp = hp; this.state = 'sleep'; this.timer = 0; this.t = 0; this.flash = 0; this.face = -1; this.dead = false;
  }
  get phase2() { return this.hp <= this.maxHp / 2; }
  set(s, t) { this.state = s; this.timer = t; }
  vulnerable() { return !['sleep', 'intro', 'dying', 'dead'].includes(this.state); }
  hurt(g, dmg, dir, atkDir) {
    if (!this.vulnerable()) return 'blocked';
    this.hp -= dmg; this.flash = 6; sfx('hit');
    if (this.hp <= 0) { this.hp = 0; this.set('dying', 160); g.onBossDying(this); }
  }
  contact(g, rects) { if (!this.vulnerable()) return; for (const r of rects) if (overlap(r, g.hero)) { g.hurtHero(1, r.x + r.w / 2); return; } }
  checkWake(g) { if (this.state === 'sleep' && g.hero.x > 70 && g.hero.x < g.room.W * 16 - 80) { this.set('intro', 120); g.onBossWake(this); } }
  dyingFx(g, cx, cy, w, h, cols) {
    if (this.t % 5 === 0) { g.shake(4, 6); sfx('hit'); g.fx.burst(cx + R(-w, w), cy + R(-h, h), 12, cols[(this.t / 5 | 0) % cols.length], 3.5); }
    if (--this.timer <= 0) { this.state = 'dead'; this.dead = true; g.onBossDead(this); }
  }
}

// Renderiza una figura vectorial a píxel con contorno, en un lienzo reutilizable.
function pixelize(c) { crisp(c, 90); outline(c); return c; }

// ═════════════ 1. EL GIGANTE DEL MOLINO ═════════════
// "¿No ves allí, amigo Sancho, desaforados gigantes?" Un molino que el Patrón convirtió en guardián.
const [GIG, gx] = mk(220, 230);
export class Gigante extends Boss {
  constructor(x) {
    super('gigante', 'EL GIGANTE DEL MOLINO', 'Guardián de la Meseta', x, 44);
    this.y = FLOOR; this.vx = 0; this.vy = 0; this.rot = 0; this.spin = 0.01; this.walkPh = 0; this.onGround = true;
  }
  body() { return { x: this.x - 26, y: this.y - 118, w: 52, h: 118 }; }
  hub() { return { x: this.x + this.face * 4, y: this.y - 86 }; }
  hurtboxes() { return [this.body()]; }
  sails() {
    const h = this.hub(), out = [];
    for (let k = 0; k < 4; k++) { const a = this.rot + k * Math.PI / 2; out.push([h.x, h.y, h.x + Math.cos(a) * 78, h.y + Math.sin(a) * 78]); }
    return out;
  }
  update(g) {
    this.t++; if (this.flash) this.flash--;
    const hero = g.hero, p2 = this.phase2;
    this.checkWake(g);
    this.rot += this.spin;
    if (this.state !== 'dying' && this.state !== 'dead' && this.state !== 'stomp' && this.state !== 'air') this.face = hero.cx > this.x ? 1 : -1;
    switch (this.state) {
      case 'sleep': this.spin = 0.008; break;
      case 'intro':
        this.spin = Math.min(0.12, this.spin + 0.002);
        if (this.timer === 90) { sfx('roar'); g.shake(4, 40); g.say('¿Otra copia del Patrón? Esta tierra es mía.', 150); }
        if (--this.timer <= 0) this.set('walk', 80);
        break;
      case 'walk':
        this.spin += (0.03 - this.spin) * 0.05;
        this.vx = this.face * (p2 ? 1.1 : 0.75); this.walkPh += 0.12;
        if (this.t % 26 === 0) { sfx('slam', 0.4); g.shake(1, 4); }
        if (--this.timer <= 0) this.pick(g);
        break;
      case 'spin':
        this.spin = Math.min(p2 ? 0.2 : 0.15, this.spin + 0.004);
        this.vx = this.face * 0.45; this.walkPh += 0.06;
        if (this.t % 10 === 0) sfx('gear');
        for (const s of this.sails()) if (segHit(s[0], s[1], s[2], s[3], hero, 2)) g.hurtHero(1, this.x);
        if (--this.timer <= 0) this.set('rest', 40);
        break;
      case 'crouch':
        this.vx = 0; if (--this.timer <= 0) { this.set('air', 0); this.vy = -7.6; this.vx = Math.max(-3.4, Math.min(3.4, (hero.cx - this.x) / 48)); this.onGround = false; sfx('jump'); }
        break;
      case 'air':
        if (this.onGround) {
          sfx('slam'); g.shake(6, 22);
          const sp = p2 ? 3 : 2.4;
          g.shootRaw('wave', this.x - 30, FLOOR - 8, -sp, 0, 0); g.shootRaw('wave', this.x + 30, FLOOR - 8, sp, 0, 0);
          g.fx.burst(this.x, FLOOR, 24, '#c8a070', 3);
          this.vx = 0; this.set(p2 && !this.double ? 'crouch' : 'rest', p2 && !this.double ? 18 : 50); this.double = !this.double && p2;
        }
        break;
      case 'sacks':
        this.vx = 0;
        if (this.timer % 18 === 0 && this.timer > 0) {
          const n = p2 ? 2 : 1;
          for (let k = 0; k < n; k++) g.shootRaw('sack', this.hub().x, this.hub().y - 20, this.face * R(1.4, 3.6), R(-6, -4.2), 0.2);
          sfx('spit');
        }
        if (--this.timer <= 0) this.set('rest', 36);
        break;
      case 'rest': this.vx *= 0.8; this.spin += (0.02 - this.spin) * 0.05; if (--this.timer <= 0) this.set('walk', p2 ? 40 : 70); break;
      case 'dying': this.vx = 0; this.spin *= 0.97; this.dyingFx(g, this.x, this.y - 70, 30, 50, ['#ffb43c', '#c8a070', '#ffffff']); break;
    }
    // física sencilla
    if (this.state === 'air') { this.vy += 0.3; }
    this.x += this.vx; this.y += this.vy;
    if (this.y >= FLOOR) { this.y = FLOOR; this.vy = 0; this.onGround = true; } else this.onGround = false;
    this.x = Math.max(48, Math.min(g.room.W * 16 - 48, this.x));
    if (this.vulnerable()) this.contact(g, [this.body()]);
  }
  pick(g) {
    const r = Math.random(), far = Math.abs(g.hero.cx - this.x) > 140;
    if (far && r < 0.5) this.set('sacks', this.phase2 ? 90 : 72);
    else if (r < 0.45) this.set('spin', this.phase2 ? 170 : 140);
    else if (r < 0.8) this.set('crouch', 26);
    else this.set('sacks', 72);
  }
  draw(ctx, cx, cy, t) {
    const x = gx; x.clearRect(0, 0, 220, 230);
    const O = 110, F = 226, crouch = this.state === 'crouch' ? 8 : 0, dying = this.state === 'dying' || this.state === 'dead';
    // piernas mecánicas
    for (const s of [-1, 1]) {
      const a = Math.sin(this.walkPh + (s > 0 ? Math.PI : 0)) * 0.35;
      x.strokeStyle = '#3a3a40'; x.lineWidth = 8; x.lineCap = 'round';
      const kx = O + s * 14 + Math.sin(a) * 10, ky = F - 18 + crouch * 0.5;
      x.beginPath(); x.moveTo(O + s * 12, F - 34 + crouch); x.lineTo(kx, ky); x.lineTo(kx + Math.sin(a) * 4, F - 4); x.stroke();
      x.fillStyle = '#5a5a60'; x.fillRect(kx - 8, F - 6, 18, 6);
    }
    // torre encalada
    const top = F - 118 + crouch;
    let gr = x.createLinearGradient(O - 30, 0, O + 30, 0); gr.addColorStop(0, '#f2e8d6'); gr.addColorStop(0.6, '#cfc2aa'); gr.addColorStop(1, '#8a7e6a');
    x.fillStyle = gr; x.beginPath(); x.moveTo(O - 30, F - 30 + crouch); x.lineTo(O - 22, top + 26); x.lineTo(O + 22, top + 26); x.lineTo(O + 30, F - 30 + crouch); x.fill();
    x.fillStyle = 'rgba(80,60,40,0.25)'; for (let j = top + 34; j < F - 32; j += 9) x.fillRect(O - 26, j, 52, 1);
    // boca-horno
    const glow = this.state === 'sacks' || this.state === 'spin' ? 1 : 0.6;
    x.fillStyle = '#1a0e08'; x.beginPath(); x.arc(O, F - 52 + crouch, 12, Math.PI, 0); x.fillRect(O - 12, F - 52 + crouch, 24, 18); x.fill();
    x.fillStyle = `rgba(255,${120 + glow * 80},40,1)`; x.fillRect(O - 8, F - 48 + crouch, 16, 12);
    x.fillStyle = '#2a1a10'; for (let i = -8; i < 8; i += 4) x.fillRect(O + i, F - 48 + crouch, 1, 12);
    // tejado-cabeza
    x.fillStyle = '#5a3a2a'; x.beginPath(); x.moveTo(O - 28, top + 28); x.lineTo(O, top - 4); x.lineTo(O + 28, top + 28); x.fill();
    x.fillStyle = '#3a2418'; x.fillRect(O - 28, top + 26, 56, 4);
    // ojo-farol
    const eyeCol = this.phase2 ? '#ff3a1a' : '#ffd040';
    x.fillStyle = '#1a1210'; x.fillRect(O - 7 + this.face * 6, top + 10, 14, 9);
    x.fillStyle = eyeCol; x.fillRect(O - 5 + this.face * 6, top + 12, 10, 5); x.fillStyle = '#fff4c8'; x.fillRect(O - 3 + this.face * 8, top + 13, 3, 2);
    // brazos-viga
    x.strokeStyle = '#4a3020'; x.lineWidth = 5;
    for (const s of [-1, 1]) { x.beginPath(); x.moveTo(O + s * 22, top + 48); x.lineTo(O + s * 40, top + 70 + Math.sin(this.t * 0.05 + s) * 4); x.stroke(); }
    // aspas
    const hx = O + this.face * 4, hy = F - 86 + crouch - (F - this.y > 0 ? 0 : 0);
    for (let k = 0; k < 4; k++) {
      const a = this.rot + k * Math.PI / 2;
      x.save(); x.translate(hx, hy); x.rotate(a);
      x.fillStyle = '#3a2a22'; x.fillRect(0, -2, 80, 4);
      x.fillStyle = this.state === 'spin' ? '#fff0d8' : '#e0d4bc'; x.fillRect(12, 2, 64, 12);
      x.fillStyle = '#6a5440'; for (let i = 14; i < 76; i += 8) x.fillRect(i, 2, 1, 12);
      x.restore();
    }
    x.fillStyle = '#2a1a14'; x.beginPath(); x.arc(hx, hy, 7, 0, 7); x.fill(); x.fillStyle = '#d8a43a'; x.beginPath(); x.arc(hx, hy, 3, 0, 7); x.fill();
    pixelize(GIG);
    const dx = Math.round(this.x - O - cx + (dying ? R(-2, 2) : 0)), dy = Math.round(this.y - F - cy);
    ctx.drawImage(GIG, dx, dy);
    if (this.flash) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5; ctx.drawImage(GIG, dx, dy); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
    if (this.state === 'spin') {
      ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(255,240,200,0.25)'; ctx.lineWidth = 3;
      const h = this.hub(); ctx.beginPath(); ctx.arc(h.x - cx, h.y - cy, 74, 0, 7); ctx.stroke(); ctx.globalCompositeOperation = 'source-over';
    }
  }
  lights() { const top = this.y - 118; return this.state === 'dead' ? [] : [{ x: this.x + this.face * 6, y: top + 14, r: 50, col: this.phase2 ? '#ff3a1a' : '#ffd040' }, { x: this.x, y: this.y - 46, r: 60, col: '#ff8a30' }]; }
}

// ═════════════ 2. EL CUÉLEBRE ═════════════
const SCALE = ['#0a110f', '#132019', '#1d3024', '#2b4630', '#3d5f3c', '#567a46', '#7e9a55', '#b3b86c'];
const BELLY = ['#2c1a12', '#4d3220', '#77532f', '#a37a44', '#cba15a', '#ead08a'];
const FIREPAL = ['#fffbe6', '#ffe58a', '#ffb43c', '#ff7a1f', '#d93a1c', '#8a1f1a'];
let CUE = null;
function cuelebreArt() {
  if (CUE) return CUE;
  const seg = (r, pal, scales) => {
    const s = Math.ceil(r * 2 + 4), [c, x] = mk(s, s), m = s / 2;
    const g = x.createRadialGradient(m - r * 0.35, m - r * 0.45, r * 0.1, m, m, r * 1.05);
    g.addColorStop(0, pal[pal.length - 1]); g.addColorStop(0.45, pal[Math.floor(pal.length * 0.55)]); g.addColorStop(1, pal[1]);
    x.fillStyle = g; x.beginPath(); x.arc(m, m, r, 0, 7); x.fill();
    if (scales) {
      x.globalCompositeOperation = 'source-atop';
      for (let j = -r; j < r; j += 3) for (let i = -r; i < r; i += 4) { const ox = i + ((j / 3) & 1 ? 2 : 0); x.strokeStyle = 'rgba(0,0,0,.35)'; x.lineWidth = 1; x.beginPath(); x.arc(m + ox, m + j, 2, 0.2, Math.PI - 0.2); x.stroke(); }
      x.globalCompositeOperation = 'source-over';
    }
    crisp(c); quantize(c, pal, 22); return c;
  };
  const SEG = {}, BSEG = {};
  for (let r = 3; r <= 18; r++) { SEG[r] = seg(r, SCALE, true); BSEG[r] = seg(r, BELLY, false); }
  const [HEAD, x] = mk(72, 44);
  x.fillStyle = '#c9b48a';
  x.beginPath(); x.moveTo(22, 14); x.quadraticCurveTo(6, 2, 0, 6); x.quadraticCurveTo(8, 8, 18, 20); x.fill();
  x.beginPath(); x.moveTo(26, 12); x.quadraticCurveTo(14, -2, 6, 0); x.quadraticCurveTo(16, 4, 24, 18); x.fill();
  let g = x.createLinearGradient(0, 6, 0, 32); g.addColorStop(0, '#8fa65e'); g.addColorStop(0.4, '#4d6c42'); g.addColorStop(1, '#1d3024');
  x.fillStyle = g; x.beginPath(); x.moveTo(16, 18); x.quadraticCurveTo(20, 6, 34, 8); x.quadraticCurveTo(52, 10, 66, 16); x.quadraticCurveTo(70, 20, 66, 24); x.lineTo(40, 27); x.quadraticCurveTo(24, 30, 16, 26); x.closePath(); x.fill();
  x.fillStyle = '#2b4630'; x.beginPath(); x.moveTo(30, 10); x.quadraticCurveTo(42, 8, 50, 14); x.lineTo(46, 15); x.quadraticCurveTo(38, 12, 31, 14); x.fill();
  x.fillStyle = '#3d5f3c'; for (let i = 0; i < 4; i++) { x.beginPath(); x.moveTo(16 + i * 5, 16); x.lineTo(12 + i * 5, 6 - i); x.lineTo(20 + i * 5, 13); x.fill(); }
  x.fillStyle = '#100808'; x.fillRect(42, 15, 7, 4); x.fillStyle = '#ffcf3a'; x.fillRect(43, 15, 5, 3); x.fillStyle = '#fff3b0'; x.fillRect(43, 15, 2, 1); x.fillStyle = '#1a0b08'; x.fillRect(46, 15, 1, 3);
  x.fillStyle = '#0a110f'; x.fillRect(62, 17, 2, 1);
  x.fillStyle = '#efe4c8'; for (let i = 0; i < 8; i++) { const tx = 34 + i * 4; x.beginPath(); x.moveTo(tx, 25); x.lineTo(tx + 3, 25); x.lineTo(tx + 1.5, 29 + (i % 3 === 0 ? 2 : 0)); x.fill(); }
  crisp(HEAD); quantize(HEAD, [...SCALE, '#c9b48a', '#8f7a52', '#efe4c8', '#ffcf3a', '#fff3b0', '#100808'], 16); outline(HEAD);
  const [JAW, j] = mk(60, 20);
  g = j.createLinearGradient(0, 2, 0, 14); g.addColorStop(0, '#3d5f3c'); g.addColorStop(1, '#a37a44');
  j.fillStyle = g; j.beginPath(); j.moveTo(6, 3); j.lineTo(50, 4); j.quadraticCurveTo(56, 6, 50, 9); j.quadraticCurveTo(26, 15, 8, 11); j.closePath(); j.fill();
  j.fillStyle = '#5a1c1c'; j.fillRect(12, 4, 36, 2); j.fillStyle = '#efe4c8'; for (let i = 0; i < 8; i++) { const tx = 18 + i * 4; j.beginPath(); j.moveTo(tx, 4); j.lineTo(tx + 3, 4); j.lineTo(tx + 1.5, 0); j.fill(); }
  crisp(JAW); quantize(JAW, [...SCALE, ...BELLY, '#5a1c1c', '#efe4c8'], 14); outline(JAW);
  const WING = mk(150, 100);
  CUE = { SEG, BSEG, HEAD, JAW, WING };
  return CUE;
}
function tri(x, ax, ay, bx, by, cx, cy, col) { x.fillStyle = col; x.beginPath(); x.moveTo(ax, ay); x.lineTo(bx, by); x.lineTo(cx, cy); x.closePath(); x.fill(); }
const segR = (i) => Math.max(3, Math.round(i < 5 ? 13 + i * 0.8 : 17 - (i - 5) * 0.55));

export class Cuelebre extends Boss {
  constructor(x) {
    super('cuelebre', 'EL CUÉLEBRE', 'Guardián del tesoro del Patrón', x, 52);
    cuelebreArt();
    this.behind = true; this.POOL = 262;
    this.segs = Array.from({ length: 30 }, (_, i) => ({ x, y: this.POOL + 40 + i * 6 }));
    this.hx = x; this.hy = this.POOL + 40; this.tx = x; this.ty = this.hy; this.ang = Math.PI; this.jaw = 0; this.wing = 0; this.aim = 0; this.combo = 0;
    this.fire = [];
  }
  hurtboxes() {
    if (this.state === 'hidden' || this.state === 'sleep') return [];
    const out = [{ x: this.hx - 16, y: this.hy - 16, w: 32, h: 32 }];
    for (let i = 1; i < 8; i++) { const s = this.segs[i], r = segR(i); if (s.y < FLOOR) out.push({ x: s.x - r, y: s.y - r, w: r * 2, h: r * 2 }); }
    return out;
  }
  hurt(g, dmg, dir, atkDir) {
    if (this.state === 'hidden') return 'blocked';
    const crit = this.state === 'stuck';
    const r = super.hurt(g, crit ? dmg * 3 : dmg, dir, atkDir);
    if (r !== 'blocked') g.fx.burst(this.hx, this.hy, 10, crit ? '#fff3b0' : '#7e9a55');
    return r;
  }
  checkWake(g) { if (this.state === 'sleep' && g.hero.x > 90) { this.set('intro', 1); g.onBossWake(this); } }
  update(g) {
    this.t++; if (this.flash) this.flash--;
    const P = g.hero, p2 = this.phase2, W = g.room.W * 16;
    this.checkWake(g);
    this.wing += p2 ? 0.16 : 0.11;
    const toP = P.cx - this.hx;
    switch (this.state) {
      case 'sleep': this.ty = this.POOL + 50; break;
      case 'intro': this.set('hidden', 80); break;
      case 'hidden':
        this.ty = this.POOL + 50; this.jaw = 0;
        if (this.t % 6 === 0) g.fx.spark(this.tx + R(-30, 30), FLOOR - 2, 0, R(-0.6, -0.2), '#5a7a9a', 30, 0, 1, false);
        if (--this.timer <= 0) {
          this.tx = P.cx < W / 2 ? R(W * 0.58, W * 0.83) : R(W * 0.17, W * 0.42); this.hx = this.tx;
          for (const s of this.segs) s.x = this.tx + R(-4, 4);
          this.set('emerge', 70);
        }
        break;
      case 'emerge':
        this.ty = 104; this.face = toP > 0 ? 1 : -1;
        if (this.timer === 40) { sfx('roar'); g.shake(8, 30); if (!this.spoke) { this.spoke = true; g.say('El oro es del Patrón. Y tú también.', 140); } }
        this.jaw = this.timer < 45 ? Math.min(1, (45 - this.timer) / 10) : 0;
        if (--this.timer <= 0) { this.jaw = 0; this.combo = p2 ? 3 : 2; this.pick(); }
        break;
      case 'sway':
        this.tx += (P.cx + (P.cx < this.tx ? 90 : -90) - this.tx) * 0.01; this.ty = 100 + Math.sin(this.t * 0.04) * 16; this.face = toP > 0 ? 1 : -1;
        if (--this.timer <= 0) this.pick();
        break;
      case 'windup':
        this.ty = 86; this.face = toP > 0 ? 1 : -1; this.jaw = Math.min(0.6, this.jaw + 0.03);
        if (this.t % 2 === 0) g.fx.add({ x: this.hx + this.face * 40 + R(-20, 20), y: this.hy + R(-20, 20), vx: 0, vy: 0, g: 0, col: '#ffb43c', life: 20, max: 20, size: 1, glow: true, home: this });
        if (--this.timer <= 0) { this.set('breath', p2 ? 130 : 100); this.aim = Math.atan2(FLOOR - 20 - this.hy, (P.cx - this.face * 60) - this.hx); sfx('fire'); }
        break;
      case 'breath': {
        this.jaw = 1;
        const target = Math.atan2(FLOOR - 4 - this.hy, P.cx + this.face * 70 - this.hx);
        this.aim += (target - this.aim) * (p2 ? 0.035 : 0.025);
        const mx = this.hx + Math.cos(this.ang) * 40, my = this.hy + Math.sin(this.ang) * 40 + 6;
        for (let k = 0; k < 7; k++) { const a = this.aim + R(-0.09, 0.09), sp = R(4.2, 6.2); this.fire.push({ x: mx, y: my, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: R(38, 58), max: 58, s: R(1, 2.5) }); }
        g.shake(2, 2);
        if (--this.timer <= 0) { this.jaw = 0; this.pick(); }
        break;
      }
      case 'coil':
        this.tx += ((this.hx - this.face * 40) - this.tx) * 0.05; this.ty = 80; this.jaw = 0.4;
        if (--this.timer <= 0) { this.set('lunge', 26); this.lx = P.cx; this.ly = FLOOR - 12; sfx('roar'); }
        break;
      case 'lunge':
        this.tx = this.lx; this.ty = this.ly; this.jaw = 1;
        if (this.hy > FLOOR - 26) { g.shake(10, 16); sfx('slam'); g.fx.burst(this.hx, FLOOR, 24, '#a5712a', 3); this.set('stuck', p2 ? 55 : 75); }
        if (--this.timer <= 0) this.set('stuck', 60);
        break;
      case 'stuck': this.jaw = 0.2; this.ty = FLOOR - 14; if (--this.timer <= 0) { this.combo--; this.pick(); } break;
      case 'dive':
        this.ty = this.POOL + 60; this.jaw = 0;
        if (this.hy > FLOOR + 10) { for (let k = 0; k < 20; k++) g.fx.spark(this.hx + R(-20, 20), FLOOR - 2, R(-1.5, 1.5), R(-4, -1), '#7aa8c8', 30, 0.1, 2, false); this.set('hidden', p2 ? 40 : 70); }
        break;
      case 'dying':
        this.ty = 120 + (160 - this.timer) * 1.2; this.jaw = 1;
        this.dyingFx(g, this.hx, this.hy, 30, 30, ['#ffe58a', '#7e9a55', '#ffffff']); break;
      case 'dead': this.ty = this.POOL + 80; break;
    }
    if (!['lunge', 'coil', 'stuck', 'hidden', 'dying', 'dead'].includes(this.state)) this.tx = Math.max(70, Math.min(W - 70, this.tx));
    const k = this.state === 'lunge' ? 0.28 : this.state === 'emerge' ? 0.05 : 0.08;
    const sw = this.state === 'sway' || this.state === 'emerge' ? Math.sin(this.t * 0.07) * 6 : 0;
    this.hx += (this.tx + sw - this.hx) * k; this.hy += (this.ty - this.hy) * k;
    const s = this.segs; s[0].x = this.hx; s[0].y = this.hy;
    for (let i = 1; i < s.length; i++) {
      const a = s[i], q = s[i - 1];
      a.y += 1.4; a.x += (this.tx - a.x) * 0.012 + Math.sin(this.t * 0.05 + i * 0.5) * 0.35;
      const dx = a.x - q.x, dy = a.y - q.y, d = Math.hypot(dx, dy) || 1;
      a.x = q.x + dx / d * 7; a.y = q.y + dy / d * 7;
    }
    let want = this.face > 0 ? 0.15 : Math.PI - 0.15;
    if (this.state === 'breath') want = this.aim;
    if (this.state === 'lunge' || this.state === 'stuck') want = this.face > 0 ? 0.6 : Math.PI - 0.6;
    if (this.state === 'windup') want = this.face > 0 ? -0.45 : Math.PI + 0.45;
    let da = want - this.ang; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
    this.ang += da * 0.15;
    if (!['hidden', 'dying', 'dead', 'sleep'].includes(this.state) && Math.hypot(P.cx - this.hx, P.cy - this.hy) < 24) g.hurtHero(1, this.hx);
    // fuego
    for (const f of this.fire) {
      f.x += f.vx; f.y += f.vy; f.vx *= 0.975; f.vy = f.vy * 0.975 - 0.03; f.life--; f.s += 0.07;
      if (f.y > FLOOR - 2 && f.vy > 0) { f.y = FLOOR - 2; f.vx += Math.sign(f.vx) * Math.abs(f.vy) * 0.6; f.vy = -Math.abs(f.vy) * 0.2; f.ground = true; }
      for (const [px, py, pw] of [[32, 160, 80], [368, 160, 80]]) if (f.x > px && f.x < px + pw && f.y > py && f.y < py + 8 && f.vy > 0) { f.y = py; f.vy = -0.4; }
      if (f.life / f.max > 0.25 && f.x > P.x - 2 && f.x < P.x + P.w + 2 && f.y > P.y && f.y < P.y + P.h) g.hurtHero(1, f.x - f.vx * 4);
      if (f.ground && Math.random() < 0.02) g.fx.spark(f.x, f.y, R(-0.4, 0.4), R(-1.4, -0.4), '#ffb43c', R(30, 60), -0.01);
    }
    this.fire = this.fire.filter((f) => f.life > 0);
  }
  pick() {
    if (this.combo <= 0) { this.set('dive', 0); return; }
    const r = Math.random(), p2 = this.phase2;
    if (r < 0.45) { this.set('windup', p2 ? 40 : 55); this.combo--; }
    else if (r < 0.85) this.set('coil', p2 ? 22 : 32);
    else this.set('sway', 60);
  }
  draw(c, cx, cy, t) {
    if (this.state === 'hidden' || this.state === 'sleep') return;
    const { SEG, BSEG, HEAD, JAW, WING } = CUE, s = this.segs, [WC, wx] = WING;
    const sh = s[4], POOL = FLOOR + 10;
    if (sh.y < POOL) {
      const flap = Math.sin(this.wing) * 0.6;
      wx.clearRect(0, 0, 150, 100);
      const ox = 75, oy = 76;
      const fingers = [0, 1, 2, 3].map((k) => { const a = -Math.PI / 2 - 0.9 + k * 0.38 + flap * (1 - k * 0.2), L = 66 - k * 8; return { x: ox + Math.cos(a) * L * (this.face > 0 ? -1 : 1), y: oy + Math.sin(a) * L }; });
      for (let k = 0; k < 3; k++) tri(wx, ox, oy, fingers[k].x, fingers[k].y, fingers[k + 1].x, fingers[k + 1].y + 6, k % 2 ? '#8a3a3c' : '#a8484a');
      tri(wx, ox, oy, fingers[3].x, fingers[3].y + 6, ox - (this.face > 0 ? -1 : 1) * 12, oy + 4, '#6e2c30');
      wx.strokeStyle = '#c9b48a'; wx.lineWidth = 1.5; for (const f of fingers) { wx.beginPath(); wx.moveTo(ox, oy); wx.lineTo(f.x, f.y); wx.stroke(); }
      crisp(WC); outline(WC);
      c.drawImage(WC, Math.round(sh.x - ox - cx), Math.round(sh.y - oy - cy + 6));
    }
    for (let i = s.length - 2; i >= 1; i--) {
      const a = s[i], q = s[i - 1]; if (a.y > POOL) continue;
      const dx = q.x - a.x, dy = q.y - a.y, d = Math.hypot(dx, dy) || 1, nx = -dy / d * this.face, ny = dx / d * this.face, r = segR(i);
      if (i % 2 === 0 && i < 22) tri(c, a.x + nx * r * 0.6 - dx / d * 3 - cx, a.y + ny * r * 0.6 - dy / d * 3 - cy, a.x + nx * (r + 7) - cx, a.y + ny * (r + 7) - cy, a.x + nx * r * 0.6 + dx / d * 3 - cx, a.y + ny * r * 0.6 + dy / d * 3 - cy, '#1d3024');
    }
    for (let i = s.length - 1; i >= 1; i--) { const a = s[i], r = segR(i); if (a.y - r > POOL) continue; const img = SEG[r]; c.drawImage(img, Math.round(a.x - img.width / 2 - cx), Math.round(a.y - img.height / 2 - cy)); }
    for (let i = s.length - 2; i >= 1; i--) {
      const a = s[i], q = s[i - 1], r = segR(i); if (a.y - r > POOL) continue;
      const dx = q.x - a.x, dy = q.y - a.y, d = Math.hypot(dx, dy) || 1, nx = dy / d * this.face, ny = -dx / d * this.face, img = BSEG[Math.max(3, Math.round(r * 0.42))];
      for (const u of [0, 0.5]) { const bx = a.x + (q.x - a.x) * u, by = a.y + (q.y - a.y) * u; c.drawImage(img, Math.round(bx + nx * r * 0.55 - img.width / 2 - cx), Math.round(by + ny * r * 0.55 - img.height / 2 - cy)); }
    }
    c.save(); c.translate(Math.round(this.hx - cx), Math.round(this.hy - cy)); c.rotate(this.ang); if (Math.cos(this.ang) < 0) c.scale(1, -1);
    c.save(); c.translate(-6, 6); c.rotate(this.jaw * 0.55); c.drawImage(JAW, -6, -2); c.restore();
    c.drawImage(HEAD, -20, -22);
    if (this.flash) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.6; c.drawImage(HEAD, -20, -22); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; }
    c.restore();
  }
  drawFront(c, cx, cy) {
    for (const f of this.fire) { const r = f.life / f.max; if (r < 0.22) { c.fillStyle = `rgba(60,45,50,${r * 2.5})`; const s = Math.ceil(f.s * 1.6); c.fillRect(Math.round(f.x - s / 2 - cx), Math.round(f.y - s / 2 - cy), s, s); } }
    c.globalCompositeOperation = 'lighter';
    for (const f of this.fire) { const r = f.life / f.max; if (r < 0.22) continue; c.fillStyle = FIREPAL[r > 0.85 ? 0 : r > 0.7 ? 1 : r > 0.52 ? 2 : r > 0.38 ? 3 : 4]; const s = Math.ceil(f.s); c.fillRect(Math.round(f.x - s / 2 - cx), Math.round(f.y - s / 2 - cy), s, s); }
    c.globalCompositeOperation = 'source-over';
  }
  lights() {
    const L = [];
    if (!['hidden', 'dead', 'sleep'].includes(this.state)) { L.push({ x: this.hx + Math.cos(this.ang) * 26, y: this.hy + Math.sin(this.ang) * 26 - 4, r: 22, col: '#ffd23c' }); L.push({ x: this.segs[3].x, y: this.segs[3].y, r: 70, col: '#a0c878', i: 0.6 }); }
    if (this.state === 'windup') L.push({ x: this.hx + Math.cos(this.ang) * 40, y: this.hy + Math.sin(this.ang) * 40, r: 30 + (55 - this.timer), col: '#ffaa3c' });
    for (let i = 0; i < this.fire.length; i += 30) L.push({ x: this.fire[i].x, y: this.fire[i].y, r: 60, col: '#ff7a28' });
    return L;
  }
  extraDark() { return -Math.min(0.3, this.fire.length / 1000); }
}

// ═════════════ 3. EL CENTINELA ═════════════
const [CEN, cnx] = mk(140, 130);
export class Centinela extends Boss {
  constructor(x) { super('centinela', 'EL CENTINELA', 'Seguridad del Parque Tecnológico', x, 56); this.y = FLOOR; this.vx = 0; this.walkPh = 0; this.eye = 0; this.beamY = 0; this.summoned = false; }
  body() { return { x: this.x - 24, y: this.y - 92, w: 48, h: 92 }; }
  hurtboxes() { return [this.body()]; }
  update(g) {
    this.t++; if (this.flash) this.flash--;
    const h = g.hero, p2 = this.phase2, W = g.room.W * 16;
    this.checkWake(g);
    if (!['charge', 'dying', 'dead'].includes(this.state)) this.face = h.cx > this.x ? 1 : -1;
    this.beam = null;
    switch (this.state) {
      case 'intro': if (this.timer === 100) { sfx('beam'); g.shake(3, 30); g.say('INTRUSO. COPIA SIN SELLO. PROCEDIENDO A BORRAR.', 150); } if (--this.timer <= 0) this.set('walk', 60); break;
      case 'walk': this.vx = this.face * (p2 ? 1.4 : 1); this.walkPh += 0.15; if (this.t % 18 === 0) sfx('step', 3); if (--this.timer <= 0) this.pick(g); break;
      case 'aim':
        this.vx = 0; this.eye = Math.min(1, this.eye + 0.03);
        this.beamY = this.low ? FLOOR - 10 : FLOOR - 52;
        this.beam = { tele: true, y: this.beamY };
        if (--this.timer <= 0) { this.set('fire', 40); sfx('beam'); }
        break;
      case 'fire': {
        this.beam = { y: this.beamY };
        const x0 = this.x + this.face * 20, x1 = this.face > 0 ? W : 0;
        if (h.y < this.beamY + 4 && h.y + h.h > this.beamY - 4 && (this.face > 0 ? h.cx > x0 : h.cx < x0)) g.hurtHero(1, this.x);
        g.shake(2, 2);
        if (--this.timer <= 0) { this.eye = 0; if (p2 && !this.second) { this.second = true; this.low = !this.low; this.set('aim', 26); } else { this.second = false; this.set('rest', 40); } }
        break;
      }
      case 'missiles':
        this.vx = 0;
        if (this.timer % 22 === 0 && this.timer > 0) { g.shootRaw('missile', this.x - this.face * 10, this.y - 96, -this.face * 1 + R(-0.5, 0.5), -2.6, 0); sfx('laser'); }
        if (--this.timer <= 0) this.set('rest', 30);
        break;
      case 'crouch': this.vx = 0; if (this.t % 4 === 0) g.fx.spark(this.x - this.face * 20, this.y - 10, -this.face, -0.5, '#3ee8ff', 16); if (--this.timer <= 0) { this.set('charge', 0); sfx('dash'); } break;
      case 'charge':
        this.vx = this.face * (p2 ? 7 : 6); this.walkPh += 0.4;
        if (this.t % 2 === 0) g.fx.spark(this.x - this.face * 24, this.y - 40 + R(-30, 30), -this.face * 2, 0, '#3ee8ff', 12);
        if (this.x < 50 || this.x > W - 50) { this.x = Math.max(50, Math.min(W - 50, this.x)); g.shake(6, 14); sfx('slam'); this.set('stun', 60); }
        break;
      case 'stun': this.vx = 0; if (this.t % 8 === 0) g.fx.spark(this.x, this.y - 96, R(-1, 1), -1, '#ffe08a', 20); if (--this.timer <= 0) this.set('walk', 40); break;
      case 'summon': this.vx = 0; if (this.timer === 30) { g.spawnEnemy('dron', this.x - 60, 110); g.spawnEnemy('dron', this.x + 60, 110); sfx('beam'); } if (--this.timer <= 0) this.set('walk', 40); break;
      case 'rest': this.vx *= 0.8; if (--this.timer <= 0) this.set('walk', p2 ? 40 : 60); break;
      case 'dying': this.vx = 0; this.dyingFx(g, this.x, this.y - 50, 26, 40, ['#3ee8ff', '#ff3e9a', '#ffffff']); break;
    }
    this.x += this.vx; this.x = Math.max(40, Math.min(W - 40, this.x));
    if (this.vulnerable()) this.contact(g, [this.body()]);
  }
  pick(g) {
    if (this.phase2 && !this.summoned) { this.summoned = true; this.set('summon', 60); return; }
    const r = Math.random();
    if (r < 0.4) { this.low = Math.random() < 0.6; this.set('aim', this.phase2 ? 32 : 44); sfx('charge'); }
    else if (r < 0.7) this.set('missiles', this.phase2 ? 90 : 68);
    else this.set('crouch', 34);
  }
  hurt(g, dmg, dir, atkDir) { const r = super.hurt(g, this.state === 'stun' ? dmg * 2 : dmg, dir, atkDir); if (r !== 'blocked') g.fx.burst(g.hero.cx + g.hero.face * 20, g.hero.cy, 8, '#3ee8ff'); return r; }
  draw(ctx, cx, cy, t) {
    const x = cnx; x.clearRect(0, 0, 140, 130);
    const O = 70, F = 126, ph = this.walkPh;
    for (const s of [-1, 1]) {
      const a = Math.sin(ph + (s > 0 ? Math.PI : 0)) * (this.state === 'walk' || this.state === 'charge' ? 0.45 : 0.05);
      const hx = O + s * 12, hy = F - 46, kx = hx + Math.sin(a) * 14 + 8, ky = hy + 22, fx = kx - 6 + Math.sin(a) * 10, fy = F - 3;
      x.strokeStyle = s > 0 ? '#2e384c' : '#424e66'; x.lineWidth = 8; x.lineCap = 'round';
      x.beginPath(); x.moveTo(hx, hy); x.lineTo(kx, ky); x.lineTo(fx, fy); x.stroke();
      x.fillStyle = '#1a2030'; x.fillRect(fx - 10, F - 5, 22, 5); x.fillStyle = '#3ee8ff'; x.fillRect(kx - 2, ky - 2, 4, 4);
    }
    const g2 = x.createLinearGradient(O - 30, 0, O + 30, 0); g2.addColorStop(0, '#8a98b0'); g2.addColorStop(0.5, '#5e6c86'); g2.addColorStop(1, '#2e384c');
    x.fillStyle = g2; x.beginPath(); x.moveTo(O - 28, F - 48); x.lineTo(O - 32, F - 86); x.lineTo(O - 18, F - 98); x.lineTo(O + 18, F - 98); x.lineTo(O + 32, F - 86); x.lineTo(O + 28, F - 48); x.fill();
    x.fillStyle = '#1a2030'; x.fillRect(O - 20, F - 64, 40, 3); x.fillStyle = '#ff3e9a'; x.fillRect(O - 20, F - 58, 6, 2); x.fillRect(O + 14, F - 58, 6, 2);
    // vainas de misiles en la espalda
    x.fillStyle = '#2e384c'; x.fillRect(O - 36, F - 104, 18, 22); x.fillStyle = '#ff3e9a'; for (let k = 0; k < 3; k++) x.fillRect(O - 33 + k * 5, F - 102, 3, 3);
    // ojo
    const ec = this.state === 'aim' || this.state === 'fire' ? '#ff3e9a' : '#3ee8ff';
    x.fillStyle = '#06080c'; x.beginPath(); x.arc(O + 12, F - 80, 10, 0, 7); x.fill();
    x.fillStyle = ec; x.beginPath(); x.arc(O + 12, F - 80, 5 + this.eye * 3, 0, 7); x.fill(); x.fillStyle = '#ffffff'; x.fillRect(O + 11, F - 82, 3, 2);
    // brazo-escudo
    x.fillStyle = '#424e66'; x.fillRect(O + 22, F - 80, 10, 40); x.fillStyle = '#3ee8ff'; x.fillRect(O + 25, F - 74, 4, 28);
    pixelize(CEN);
    const dx = Math.round(this.x - O - cx), dy = Math.round(this.y - F - cy);
    ctx.save(); if (this.face < 0) { ctx.translate(dx * 2 + 140, 0); ctx.scale(-1, 1); }
    ctx.drawImage(CEN, dx, dy);
    if (this.flash) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5; ctx.drawImage(CEN, dx, dy); }
    ctx.restore();
    if (this.beam) {
      const x0 = this.x + this.face * 20 - cx, y = this.beam.y - cy, x1 = this.face > 0 ? 960 : -10;
      ctx.globalCompositeOperation = 'lighter';
      if (this.beam.tele) { ctx.strokeStyle = (t >> 2) % 2 ? 'rgba(255,62,154,0.7)' : 'rgba(255,62,154,0.3)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke(); }
      else { for (const [w, col] of [[12, 'rgba(255,62,154,0.35)'], [6, 'rgba(255,120,190,0.8)'], [2, '#ffffff']]) { ctx.strokeStyle = col; ctx.lineWidth = w + Math.sin(t) * 1; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke(); } }
      ctx.globalCompositeOperation = 'source-over';
    }
  }
  lights() {
    if (this.state === 'dead') return [];
    const L = [{ x: this.x + this.face * 12, y: this.y - 80, r: 40, col: this.state === 'aim' || this.state === 'fire' ? '#ff3e9a' : '#3ee8ff' }];
    if (this.beam && !this.beam.tele) for (let k = 0; k < 6; k++) L.push({ x: this.x + this.face * (40 + k * 70), y: this.beam.y, r: 50, col: '#ff3e9a' });
    return L;
  }
}

// ═════════════ 4. EL PATRÓN — LA MÁQUINA ETERNA ═════════════
const [FACE, fcx] = mk(170, 130);
class Hand {
  constructor(boss, side) { this.boss = boss; this.side = side; this.x = boss.x + side * 120; this.y = 150; this.tx = this.x; this.ty = this.y; this.state = 'idle'; this.timer = 0; this.w = 34; this.h = 28; this.flash = 0; this.isHand = true; }
  get cx() { return this.x; }
  hurtboxes() { return [{ x: this.x - 17, y: this.y - 14, w: 34, h: 28 }]; }
  hurt(g, dmg, dir, atk) { if (this.state !== 'stuck') { sfx('clang'); g.fx.burst(this.x, this.y, 6, '#ffe08a', 2, 10); return 'blocked'; } this.flash = 6; this.boss._fromHand = true; const r = this.boss.hurt(g, dmg, dir, atk); this.boss._fromHand = false; return r; }
  get dead() { return this.boss.dead; }
}
export class Patron extends Boss {
  constructor(x) {
    super('patron', 'EL PATRÓN', 'La Máquina Eterna', x, 72);
    this.x = 240; this.fy = 70; this.hands = [new Hand(this, -1), new Hand(this, 1)]; this.over = 0; this.eyes = null; this.glitch = 0; this.lines = 0;
  }
  hurtboxes() { return this.over > 0 ? [{ x: this.x - 50, y: this.fy - 30, w: 100, h: 90 }] : []; }
  hurt(g, dmg, dir, atk) { if (this.over <= 0 && !this._fromHand) return 'blocked'; const r = super.hurt(g, this.over > 0 ? dmg * 2 : dmg, dir, atk); this.glitch = 8; return r; }
  extraHittables() { return this.hands; }
  update(g) {
    this.t++; if (this.flash) this.flash--; if (this.glitch) this.glitch--;
    const h = g.hero, p2 = this.phase2, p3 = this.hp < this.maxHp * 0.3;
    if (this.state === 'sleep' && h.x > 80) { this.set('intro', 200); g.onBossWake(this); }
    this.eyes = null;
    switch (this.state) {
      case 'intro':
        if (this.timer === 190) { g.say('Bienvenido a casa, soldado. Te devolví la vida. ¿Así me lo pagas?', 180); sfx('roar'); }
        if (this.timer === 60) g.shake(6, 40);
        if (--this.timer <= 0) this.set('idle', 50);
        break;
      case 'idle': if (--this.timer <= 0) this.pick(g); break;
      case 'eyes':
        this.aim = this.aim || 0;
        if (this.timer > 30) { this.ea = Math.atan2(h.cy - (this.fy + 10), h.cx - this.x); this.eyes = { tele: true }; }
        else { this.eyes = {}; for (const s of [-1, 1]) { const ox = this.x + s * 22, oy = this.fy + 4, end = ray(g.room, ox, oy, this.ea + s * 0.06, 600); this.eyes[s] = end; if (segHit(ox, oy, end.x, end.y, h, 3)) g.hurtHero(1, ox); } if (this.timer === 30) { sfx('beam'); g.shake(3, 20); } }
        if (--this.timer <= 0) { this.over = p3 ? 70 : 100; this.set('idle', this.over); sfx('door'); }
        break;
      case 'summon':
        if (this.timer === 40) { g.spawnEnemy('guardia', 60, FLOOR); g.spawnEnemy('guardia', 420, FLOOR); g.say('Mis hijos obedientes. Los que no hacen preguntas.', 140); }
        if (--this.timer <= 0) this.set('idle', 40);
        break;
      case 'dying':
        this.glitch = 4;
        this.dyingFx(g, this.x, this.fy + 20, 70, 50, ['#ff3e9a', '#ffd040', '#ffffff', '#d0302a']);
        if (this.timer === 120) g.say('No... yo era... eterno...', 140);
        break;
    }
    if (this.over > 0) this.over--;
    // manos
    for (const hd of this.hands) {
      if (hd.flash) hd.flash--;
      const home = { x: this.x + hd.side * 140, y: 140 + Math.sin(this.t * 0.04 + hd.side) * 8 };
      switch (hd.state) {
        case 'idle': hd.tx = home.x; hd.ty = home.y; break;
        case 'rise': hd.tx = h.cx; hd.ty = 60; if (Math.random() < 0.3) g.fx.spark(hd.x + R(-14, 14), hd.y + 14, 0, 1, '#ffd040', 10); if (--hd.timer <= 0) { hd.state = 'slam'; sfx('dash'); } break;
        case 'slam': hd.ty = FLOOR - 14; hd.y += 9; if (hd.y >= FLOOR - 14) { hd.y = FLOOR - 14; hd.state = 'stuck'; hd.timer = p2 ? 55 : 75; g.shake(7, 16); sfx('slam'); g.fx.burst(hd.x, FLOOR, 20, '#a8a090', 3); if (p2) { g.shootRaw('wave', hd.x - 24, FLOOR - 8, -2.6, 0, 0); g.shootRaw('wave', hd.x + 24, FLOOR - 8, 2.6, 0, 0); } } break;
        case 'stuck': hd.tx = hd.x; hd.ty = hd.y; if (--hd.timer <= 0) hd.state = 'idle'; break;
        case 'sweepPrep': hd.tx = hd.side < 0 ? 30 : 450; hd.ty = FLOOR - 16; if (--hd.timer <= 0) { hd.state = 'sweep'; sfx('dash'); } break;
        case 'sweep': hd.tx = hd.x - hd.side * 7; hd.x = hd.tx; hd.ty = FLOOR - 16; if (hd.x < 20 || hd.x > 460) hd.state = 'idle'; break;
      }
      if (hd.state !== 'slam' && hd.state !== 'sweep') { hd.x += (hd.tx - hd.x) * 0.08; hd.y += (hd.ty - hd.y) * 0.08; }
      if (this.vulnerable() && hd.state !== 'stuck' && hd.state !== 'idle') for (const b of hd.hurtboxes()) if (overlap(b, h)) g.hurtHero(1, hd.x);
    }
  }
  pick(g) {
    const r = Math.random(), p2 = this.phase2;
    const free = this.hands.filter((hd) => hd.state === 'idle');
    if (p2 && !this.summoned) { this.summoned = true; this.set('summon', 60); return; }
    if (r < 0.35 && free.length) { const hd = free[Math.random() * free.length | 0]; hd.state = 'rise'; hd.timer = p2 ? 40 : 55; this.set('idle', p2 ? 50 : 70); }
    else if (r < 0.6 && free.length) { const hd = free[0]; hd.state = 'sweepPrep'; hd.timer = 50; this.set('idle', 90); }
    else { this.set('eyes', 70); sfx('charge'); }
    if (p2 && this.hp < this.maxHp * 0.3 && Math.random() < 0.4 && free.length > 1) { free[1].state = 'rise'; free[1].timer = 70; }
    if (++this.lines % 4 === 0) g.say(['Yo os di la eternidad.', 'Un país entero cabía en mi jardín.', 'Tu hija también firmó el contrato.', 'Sin mí no eres más que chatarra que recuerda.'][(this.lines / 4 - 1) % 4], 140);
  }
  draw(ctx, cx, cy, t) {
    // la cara de pantallas
    const x = fcx; x.clearRect(0, 0, 170, 130);
    const p3 = this.hp < this.maxHp * 0.3;
    x.fillStyle = '#d8a43a'; x.fillRect(4, 4, 162, 122); x.fillStyle = '#5a3a10'; x.fillRect(8, 8, 154, 114);
    for (let j = 0; j < 3; j++) for (let i = 0; i < 4; i++) {
      const sx = 12 + i * 38, sy = 12 + j * 37;
      x.fillStyle = '#05080a'; x.fillRect(sx, sy, 34, 33);
      x.fillStyle = this.over > 0 ? '#3a0a08' : '#0a2a20'; x.fillRect(sx + 2, sy + 2, 30, 29);
    }
    // rostro del Patrón compuesto en las pantallas
    const fc = this.over > 0 ? '#ff6a40' : '#7affc8';
    x.fillStyle = fc;
    x.fillRect(50, 46, 20, 6); x.fillRect(100, 46, 20, 6);              // cejas
    x.fillRect(56, 56, 10, 8); x.fillRect(104, 56, 10, 8);              // ojos
    x.fillRect(80, 60, 8, 22);                                          // nariz
    x.fillRect(58, 88, 54, 8); x.fillRect(52, 84, 8, 6); x.fillRect(110, 84, 8, 6); // bigote
    x.fillRect(66, 100, 38, 3);                                         // boca
    if (p3) { x.fillStyle = '#05080a'; x.beginPath(); x.moveTo(30, 10); x.lineTo(70, 70); x.lineTo(60, 120); x.lineTo(64, 120); x.lineTo(75, 70); x.lineTo(36, 10); x.fill(); }
    // líneas de escaneo
    x.fillStyle = 'rgba(0,0,0,0.35)'; for (let j = 12; j < 120; j += 2) x.fillRect(12, j, 146, 1);
    pixelize(FACE);
    const shake = this.glitch ? R(-3, 3) : 0;
    const dx = Math.round(this.x - 85 - cx + shake), dy = Math.round(this.fy - 50 - cy);
    // cables que bajan al suelo
    ctx.strokeStyle = '#0d1118'; ctx.lineWidth = 3;
    for (let k = 0; k < 8; k++) { ctx.beginPath(); ctx.moveTo(dx + 20 + k * 18, dy + 126); ctx.quadraticCurveTo(dx + k * 24 - 20, dy + 160, dx + k * 30 - 30, FLOOR - cy); ctx.stroke(); }
    ctx.drawImage(FACE, dx, dy);
    if (this.flash) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.6; ctx.drawImage(FACE, dx, dy); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
    if (this.glitch) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,62,154,0.3)'; ctx.fillRect(dx, dy + R(0, 120), 170, 4); ctx.globalCompositeOperation = 'source-over'; }
    // manos
    for (const hd of this.hands) {
      const hx = Math.round(hd.x - cx), hy = Math.round(hd.y - cy), s = hd.side;
      ctx.fillStyle = hd.flash ? '#ffffff' : '#3a3530'; ctx.fillRect(hx - 17, hy - 12, 34, 22);
      ctx.fillStyle = hd.flash ? '#ffffff' : '#d8a43a'; ctx.fillRect(hx - 17, hy - 12, 34, 3);
      for (let k = 0; k < 4; k++) { ctx.fillStyle = '#5a5448'; ctx.fillRect(hx - 15 + k * 8, hy + 10, 6, 6 + (hd.state === 'stuck' ? 0 : 3)); }
      ctx.fillStyle = '#5a5448'; ctx.fillRect(hx + s * 16, hy - 8, 6 * s, 10);
      ctx.fillStyle = hd.state === 'stuck' ? '#ff3e9a' : '#ffd040'; ctx.fillRect(hx - 3, hy - 4, 6, 6);
      // brazo al marco
      ctx.strokeStyle = '#1a1816'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(hx, hy - 12); ctx.quadraticCurveTo((hx + dx + 85) / 2, hy - 80, dx + 85 + s * 70, dy + 60); ctx.stroke();
    }
    // ojos láser
    if (this.eyes) {
      ctx.globalCompositeOperation = 'lighter';
      for (const s of [-1, 1]) {
        const ox = this.x + s * 22 - cx, oy = this.fy + 4 - cy;
        if (this.eyes.tele) { ctx.strokeStyle = (t >> 2) % 2 ? 'rgba(255,80,60,0.7)' : 'rgba(255,80,60,0.3)'; ctx.lineWidth = 1; const e = { x: this.x + s * 22 + Math.cos(this.ea) * 600, y: this.fy + 4 + Math.sin(this.ea) * 600 }; ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(e.x - cx, e.y - cy); ctx.stroke(); }
        else if (this.eyes[s]) { const e = this.eyes[s]; for (const [w, c] of [[9, 'rgba(255,60,40,0.4)'], [4, 'rgba(255,140,100,0.8)'], [2, '#ffffff']]) { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(e.x - cx, e.y - cy); ctx.stroke(); } }
      }
      ctx.globalCompositeOperation = 'source-over';
    }
  }
  lights() {
    if (this.state === 'dead') return [];
    const L = [{ x: this.x, y: this.fy + 10, r: 110, col: this.over > 0 ? '#ff5a3a' : '#5affc0', i: 0.8 }];
    for (const hd of this.hands) L.push({ x: hd.x, y: hd.y, r: 30, col: hd.state === 'stuck' ? '#ff3e9a' : '#ffd040' });
    if (this.eyes && !this.eyes.tele) for (const s of [-1, 1]) if (this.eyes[s]) L.push({ x: this.eyes[s].x, y: this.eyes[s].y, r: 50, col: '#ff4a30' });
    return L;
  }
}

export function makeBoss(kind, x) {
  return new { gigante: Gigante, cuelebre: Cuelebre, centinela: Centinela, patron: Patron }[kind](x);
}

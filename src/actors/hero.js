// El protagonista: un soldado muerto cuya mente vive en un cuerpo de androide.
import { mk, crisp, outline } from '../core/gfx.js';
import { move, wallAt, touchesSpike, tileAt, SOLID, overlap } from './physics.js';
import { sfx } from '../core/audio.js';

export const PHYS = {
  G: 0.34, MAXF: 7.4, RUN: 2.35, ACC: 0.45, FRIC: 0.55,
  JUMP: -6.9, DJUMP: -6.3, CUT: -2.2, DASH: 6.2, DASHT: 14, DASHCD: 34,
  SLIDE: 1.5, WJX: 3.6, WJY: -6.6, WJLOCK: 9,
};
const P = PHYS;

export class Hero {
  constructor(x, y, save) {
    this.x = x; this.y = y; this.w = 12; this.h = 36; this.vx = 0; this.vy = 0; this.face = 1;
    this.maxHp = save.maxHp; this.hp = save.maxHp; this.energy = 0;
    this.ab = save.abilities;
    this.onGround = false; this.coyote = 0; this.airJumps = 0; this.airDash = true;
    this.dashT = 0; this.dashCd = 0; this.wall = 0; this.wallLock = 0; this.wallCoyote = 0; this.lastWall = 0;
    this.atkT = 0; this.atkDir = 'side'; this.atkId = 0; this.combo = 0; this.hits = new Set();
    this.inv = 0; this.hurtT = 0; this.healT = 0; this.dead = 0; this.anim = 0; this.phase = 0; this.pogoT = 0;
    this.cape = Array.from({ length: 7 }, () => ({ x: x + 6, y: y + 8 }));
    this.trail = []; this.lastSafe = { x, y }; this.stepT = 0;
    this.frozen = 0; // durante diálogos y cinemáticas
  }
  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }
  get feet() { return this.y + this.h; }

  update(g) {
    const I = g.input, room = g.room;
    this.anim++;
    if (this.inv > 0) this.inv--;
    if (this.dashCd > 0) this.dashCd--;
    if (this.wallLock > 0) this.wallLock--;
    if (this.pogoT > 0) this.pogoT--;
    if (this.dead) { this.dead++; this.vx *= 0.9; this.vy = Math.min(this.vy + P.G, P.MAXF); move(this, room, true); this.updateCape(); return; }

    const dir = this.frozen ? 0 : (I.down('right') ? 1 : 0) - (I.down('left') ? 1 : 0);
    if (this.hurtT > 0) {
      this.hurtT--; this.vy = Math.min(this.vy + P.G, P.MAXF); this.vx *= 0.92;
      move(this, room, true); this.updateCape(); this.checkSpikes(g); return;
    }
    if (this.frozen) { this.vx *= 0.7; this.vy = Math.min(this.vy + P.G, P.MAXF); move(this, room, true); this.updateCape(); return; }

    // ── curación (mantener pulsado en el suelo) ──
    const canHeal = this.onGround && this.energy >= 33 && this.hp < this.maxHp && !this.atkT && !this.dashT;
    if (I.down('heal') && canHeal && !dir) {
      this.healT++; this.vx *= 0.6;
      if (this.healT % 6 === 0) g.fx.spark(this.cx + (Math.random() - 0.5) * 20, this.feet - Math.random() * 30, 0, -0.6, '#7fe8ff', 24);
      if (this.healT === 1) sfx('charge');
      if (this.healT >= 48) { this.healT = 0; this.hp++; this.energy -= 33; sfx('heal'); g.fx.burst(this.cx, this.cy, 14, '#7fe8ff'); }
      this.vy = Math.min(this.vy + P.G, P.MAXF); move(this, room, true); this.updateCape(); return;
    }
    this.healT = 0;

    // ── impulso ──
    if (this.ab.dash && this.dashCd === 0 && !this.atkT && (this.onGround || this.airDash || this.wall) && I.pressed('dash')) {
      if (this.wall) { this.face = -this.wall; this.wall = 0; }
      else if (dir) this.face = dir;
      this.dashT = P.DASHT; this.dashCd = P.DASHCD; if (!this.onGround) this.airDash = false;
      this.inv = Math.max(this.inv, P.DASHT); sfx('dash'); g.shake(1, 4);
    }
    if (this.dashT > 0) {
      this.dashT--; this.vx = this.face * P.DASH; this.vy = 0;
      if (this.anim % 2 === 0) this.trail.push({ x: this.cx, y: this.feet, face: this.face, life: 12 });
      g.fx.spark(this.cx - this.face * 6, this.cy + (Math.random() - 0.5) * 20, -this.face * 1.5, 0, '#a9b0ba', 10);
      move(this, room, true);
      if (this.hitWall) this.dashT = 0;
      if (this.dashT === 0) this.vx = this.face * P.RUN;
      this.updateCape(); this.checkSpikes(g); return;
    }

    // ── movimiento horizontal ──
    if (this.wallLock === 0) {
      const target = dir * P.RUN;
      if (dir) { this.vx += Math.sign(target - this.vx) * Math.min(Math.abs(target - this.vx), P.ACC); if (!this.atkT) this.face = dir; }
      else this.vx -= Math.sign(this.vx) * Math.min(Math.abs(this.vx), this.onGround ? P.FRIC : 0.2);
    }

    // ── pared ──
    this.wall = 0;
    if (this.ab.wall && !this.onGround && this.vy > -1) {
      if (dir > 0 && wallAt(this, room, 1)) this.wall = 1;
      else if (dir < 0 && wallAt(this, room, -1)) this.wall = -1;
    }
    if (this.wall) { this.wallCoyote = 7; this.lastWall = this.wall; } else if (this.wallCoyote > 0) this.wallCoyote--;

    // ── saltos ──
    if (this.onGround) { this.coyote = 7; this.airJumps = this.ab.double ? 1 : 0; this.airDash = true; }
    else if (this.coyote > 0) this.coyote--;
    this.dropping = false;
    if (I.peek('jump')) {
      if (this.onGround && I.down('down') && this.onOneway(room)) {
        I.pressed('jump'); this.dropping = true; this.y += 2; this.coyote = 0;
      } else if (this.coyote > 0) {
        I.pressed('jump'); this.vy = P.JUMP; this.coyote = 0; sfx('jump');
        g.fx.dust(this.cx, this.feet, 5);
      } else if (this.wallCoyote > 0 && this.ab.wall) {
        I.pressed('jump'); const wdir = this.wall || this.lastWall;
        this.vy = P.WJY; this.vx = -wdir * P.WJX; this.face = -wdir; this.wallLock = P.WJLOCK; this.wallCoyote = 0; this.wall = 0;
        this.airDash = true; sfx('jump'); g.fx.dust(this.cx + wdir * 6, this.cy, 5);
      } else if (this.airJumps > 0) {
        I.pressed('jump'); this.vy = Math.min(this.vy, P.DJUMP); this.airJumps--; sfx('djump');
        for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; g.fx.spark(this.cx, this.feet - 4, Math.cos(a) * 1.8, Math.sin(a) * 0.6 + 0.6, k % 2 ? '#7fe8ff' : '#e8fbff', 18); }
      }
    }
    if (!I.down('jump') && this.vy < P.CUT && !this.noCut && this.pogoT === 0) this.vy = P.CUT;

    // gravedad (más suave al deslizarse por la pared)
    this.vy = Math.min(this.vy + P.G, this.wall && this.vy > 0 ? P.SLIDE : P.MAXF);
    if (this.vy >= 0) this.noCut = false;
    if (this.wall && this.vy > 0 && this.anim % 4 === 0) { g.fx.spark(this.cx + this.wall * 6, this.y + 4, -this.wall * 0.5, -0.5, '#c4cad2', 10); if (this.anim % 12 === 0) sfx('wall'); }

    // ── ataque ──
    if (!this.atkT && I.pressed('attack')) {
      this.atkT = 18; this.atkId++; this.hits.clear(); this.combo = (this.combo + 1) % 2;
      this.atkDir = I.down('up') ? 'up' : I.down('down') && !this.onGround ? 'down' : 'side';
      sfx('slash');
    }
    if (this.atkT > 0) {
      this.atkT--;
      if (this.atkT >= 8 && this.atkT <= 15) this.doAttack(g);
    }

    move(this, room, true);
    if (this.landed) { sfx('land'); g.fx.dust(this.cx, this.feet, 6); }
    if (this.onGround && Math.abs(this.vx) > 0.5) {
      this.phase += Math.abs(this.vx) * 0.14;
      if (Math.floor(this.phase / Math.PI) !== this.stepT) { this.stepT = Math.floor(this.phase / Math.PI); sfx('step'); if (Math.random() < 0.5) g.fx.dust(this.cx - this.face * 4, this.feet, 1); }
    }
    if (this.onGround && !this.nearHazard(room)) this.lastSafe = { x: this.x, y: this.y };
    this.updateCape();
    this.checkSpikes(g);
  }

  onOneway(room) {
    const j = Math.floor((this.feet + 1) / 16);
    let one = false;
    for (let i = Math.floor(this.x / 16); i <= Math.floor((this.x + this.w - 0.01) / 16); i++) {
      const t = tileAt(room, i, j); if (SOLID(t)) return false; if (t === '=') one = true;
    }
    return one;
  }
  nearHazard(room) {
    const j = Math.floor((this.feet + 1) / 16);
    for (let i = Math.floor(this.x / 16) - 1; i <= Math.floor((this.x + this.w) / 16) + 1; i++) {
      if (tileAt(room, i, j - 1) === '^' || tileAt(room, i, j) === '^' || tileAt(room, i, j) === null) return true;
    }
    return false;
  }
  checkSpikes(g) { if (!this.dead && touchesSpike(this, g.room)) g.hurtHero(1, null, true); }

  attackBox() {
    if (this.atkDir === 'up') return { x: this.cx - 14, y: this.y - 30, w: 28, h: 34 };
    if (this.atkDir === 'down') return { x: this.cx - 13, y: this.feet - 6, w: 26, h: 32 };
    return { x: this.face > 0 ? this.x + this.w - 2 : this.x - 34, y: this.y - 2, w: 36, h: 30 };
  }

  doAttack(g) {
    const box = this.attackBox();
    let pogo = false, hit = false;
    for (const en of g.hittables()) {
      if (en.dead || this.hits.has(en)) continue;
      const boxes = en.hurtboxes ? en.hurtboxes() : [en];
      if (!boxes.some((b) => overlap(box, b))) continue;
      this.hits.add(en);
      const res = en.hurt(g, 1, this.atkDir === 'side' ? this.face : 0, this.atkDir, this);
      if (res !== 'blocked') { hit = true; this.energy = Math.min(99, this.energy + 11); }
      if (this.atkDir === 'down') pogo = true;
      else if (this.atkDir === 'side') this.vx = -this.face * (this.onGround ? 1.8 : 1.2);
    }
    for (const p of g.projectiles) if (p.breakable && !p.dead && overlap(box, p)) { p.dead = true; g.fx.burst(p.x + p.w / 2, p.y + p.h / 2, 8, '#ffb43c'); hit = true; }
    // muros rompibles y rebote sobre pinchos
    const i0 = Math.floor(box.x / 16), i1 = Math.floor((box.x + box.w) / 16), j0 = Math.floor(box.y / 16), j1 = Math.floor((box.y + box.h) / 16);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const t = tileAt(g.room, i, j);
      if (t === 'X' && !this.hits.has(i + ',' + j)) { this.hits.add(i + ',' + j); g.breakTile(i, j); }
      if (t === '^' && this.atkDir === 'down') pogo = true;
    }
    if (pogo && this.pogoT === 0) {
      this.vy = -6.6; this.airJumps = this.ab.double ? 1 : 0; this.airDash = true; this.pogoT = 12;
    }
    if (hit) g.hitstop(3);
  }

  hurt(g, dmg, fromX) {
    if (this.inv > 0 || this.dead) return false;
    this.hp -= dmg; this.inv = 80; this.hurtT = 18; this.dashT = 0; this.atkT = 0; this.healT = 0;
    const d = fromX == null ? -this.face : Math.sign(this.cx - fromX) || 1;
    this.vx = d * 3; this.vy = -3.6; sfx('hurt');
    if (this.hp <= 0) { this.hp = 0; this.dead = 1; }
    return true;
  }

  updateCape() {
    const c = this.cape, ax = this.cx - this.face * 3, ay = this.y + 9;
    c[0].x = ax; c[0].y = ay;
    for (let i = 1; i < c.length; i++) {
      const p = c[i], q = c[i - 1];
      p.x += -this.face * 0.35 - this.vx * 0.32 + Math.sin(this.anim * 0.1 + i) * 0.3;
      p.y += 0.65 - Math.min(0, this.vy) * 0.25 + Math.cos(this.anim * 0.15 + i * 0.7) * 0.2;
      const dx = p.x - q.x, dy = p.y - q.y, d = Math.hypot(dx, dy) || 1;
      p.x = q.x + dx / d * 4.2; p.y = q.y + dy / d * 4.2;
    }
  }

  // ───────────── Dibujo ─────────────
  draw(ctx, cx, cy, t) {
    for (const tr of this.trail) {
      ctx.globalAlpha = tr.life / 30;
      ctx.drawImage(this.lastFrame || HERO, Math.round(tr.x - 32 - cx) + (tr.face < 0 ? 0 : 0), Math.round(tr.y - 60 - cy));
      tr.life--;
    }
    ctx.globalAlpha = 1;
    this.trail = this.trail.filter((tr) => tr.life > 0);
    if (this.inv > 0 && !this.dashT && !this.dead && this.hurtT === 0 && Math.floor(this.inv / 3) % 2 === 0) return;
    const img = renderHero(this, t);
    this.lastFrame = img;
    ctx.save();
    if (this.dead) ctx.globalAlpha = Math.max(0, 1 - this.dead / 140);
    ctx.drawImage(img, Math.round(this.cx - 32 - cx), Math.round(this.feet - 60 - cy));
    ctx.restore();
    if (this.hurtT > 10) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.6; ctx.drawImage(img, Math.round(this.cx - 32 - cx), Math.round(this.feet - 60 - cy)); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
    this.drawSlash(ctx, cx, cy);
  }

  drawSlash(ctx, cx, cy) {
    if (!(this.atkT >= 7 && this.atkT <= 16)) return;
    const k = (16 - this.atkT) / 9;
    ctx.save();
    ctx.translate(Math.round(this.cx - cx), Math.round(this.y + 14 - cy));
    if (this.atkDir === 'up') ctx.rotate(-Math.PI / 2 * this.face);
    if (this.atkDir === 'down') ctx.rotate(Math.PI / 2 * this.face);
    ctx.scale(this.face, this.combo ? -1 : 1);
    const r = 24;
    for (let w = 0; w < 4; w++) {
      ctx.strokeStyle = ['rgba(255,255,255,0.95)', 'rgba(200,250,255,0.8)', 'rgba(127,232,255,0.55)', 'rgba(60,140,200,0.3)'][w];
      ctx.lineWidth = w === 0 ? 2 : 2;
      ctx.beginPath();
      ctx.arc(4, 4, r - w * 3, -1.4 + k * 0.6, -1.4 + k * 0.6 + 2.2 * Math.min(1, k * 1.6), false);
      ctx.stroke();
    }
    ctx.restore();
  }
}

// Render del androide en un lienzo de 64×64 con los pies en y=60.
const [HERO, hx] = mk(64, 64);
const METAL = ['#23262d', '#40444e', '#646a75', '#8f96a1', '#c4cad2'];
export function renderHero(h, t) {
  const x = hx, O = 32, F = 60;
  x.clearRect(0, 0, 64, 64);
  const moving = Math.abs(h.vx) > 0.4 && h.onGround, air = !h.onGround && !h.dead;
  const kneel = h.healT > 0, dead = h.dead > 0;
  const bob = moving ? -Math.abs(Math.sin(h.phase)) * 1.6 : Math.sin(t * 0.05) * 0.5;
  let hipY = F - 18 + bob + (kneel ? 5 : 0) + (dead ? Math.min(14, h.dead * 0.4) : 0);
  let lean = h.dashT ? 0.35 : moving ? 0.1 : air ? -0.05 : 0;
  if (h.wall) lean = -0.1;
  if (dead) lean = Math.min(1.3, h.dead * 0.03);
  const face = 1; // dibujamos mirando a la derecha y volteamos al final

  const leg = (ang, bend, cloth, metal) => {
    const kx = O + Math.sin(ang) * 9, ky = hipY + Math.cos(ang) * 9;
    const sa = ang - bend, fx = kx + Math.sin(sa) * 9, fy = Math.min(F, ky + Math.cos(sa) * 9);
    x.lineCap = 'round';
    x.strokeStyle = metal; x.lineWidth = 3; x.beginPath(); x.moveTo(kx, ky); x.lineTo(fx, fy); x.stroke();
    x.strokeStyle = cloth; x.lineWidth = 4; x.beginPath(); x.moveTo(O, hipY); x.lineTo(kx, ky); x.stroke();
    x.fillStyle = METAL[0]; x.fillRect(kx - 1, ky, 3, 2);
    x.fillStyle = metal; x.fillRect(fx - 2, fy - 1, 6, 3); x.fillStyle = METAL[4]; x.fillRect(fx - 1, fy - 1, 3, 1);
  };
  let a1, a2, b1, b2;
  if (kneel) { a1 = -1.2; b1 = -1.6; a2 = 0.9; b2 = 1.9; }
  else if (h.wall) { a1 = 0.6; b1 = 0.9; a2 = 0.2; b2 = 0.6; }
  else if (h.dashT) { a1 = -0.9; b1 = -0.4; a2 = 0.7; b2 = 0.9; }
  else if (air) { const s = Math.max(-1, Math.min(1, h.vy / 6)); a1 = -0.5 - s * 0.2; b1 = -0.9; a2 = 0.45 + s * 0.2; b2 = 0.3; }
  else if (moving) { const s = Math.sin(h.phase); a1 = -s * 0.7; a2 = s * 0.7; b1 = Math.max(0, Math.sin(h.phase + 1.4)) * 1.0; b2 = Math.max(0, -Math.sin(h.phase + 1.4)) * 1.0; }
  else { a1 = -0.12; a2 = 0.14; b1 = 0; b2 = 0; }

  // capa: cuelga de los hombros y ondea
  const sgn = h.face;
  const pts = h.cape.map((p) => ({ x: O + Math.max(-20, Math.min(4, (p.x - h.cx) * sgn)), y: Math.min(F - 2, F + (p.y - h.feet)) }));
  const end = pts[pts.length - 1], mid = pts[3];
  x.fillStyle = '#26404e';
  x.beginPath(); x.moveTo(O + 3, hipY - 25); x.lineTo(O - 6, hipY - 25);
  x.quadraticCurveTo(mid.x - 5, mid.y, end.x - 3, end.y + 4);
  x.lineTo(end.x + 1, end.y); x.lineTo(end.x + 5, end.y + 5); x.lineTo(end.x + 8, end.y + 1); x.lineTo(O + 2, hipY + 8); x.closePath(); x.fill();
  x.fillStyle = '#1a2e3a'; x.beginPath(); x.moveTo(O - 2, hipY - 22); x.quadraticCurveTo(mid.x, mid.y + 2, end.x + 2, end.y + 2); x.lineTo(O + 1, hipY + 6); x.fill();
  x.fillStyle = '#3a5a6a'; x.fillRect(O - 6, hipY - 25, 2, 6);

  leg(a1, b1, '#2a2632', METAL[1]);
  x.save(); x.translate(O, hipY); x.rotate(lean);
  // brazo trasero
  x.strokeStyle = METAL[1]; x.lineWidth = 3; x.lineCap = 'round';
  x.beginPath(); x.moveTo(-4, -21); x.lineTo(-6, -12); x.lineTo(-5, -4); x.stroke();
  // túnica gastada
  const g = x.createLinearGradient(-7, 0, 7, 0); g.addColorStop(0, '#8c8270'); g.addColorStop(0.55, '#665e50'); g.addColorStop(1, '#443e36');
  x.fillStyle = g;
  x.beginPath(); x.moveTo(-6, -24); x.lineTo(6, -24); x.lineTo(7, -8); x.lineTo(8, 1); x.lineTo(-7, 1); x.lineTo(-7, -8); x.closePath(); x.fill();
  x.fillStyle = '#3a352e'; x.fillRect(-7, 0, 15, 1); x.fillRect(1, -20, 1, 20);
  x.fillStyle = '#a89c84'; x.fillRect(-6, -23, 1, 14);
  x.fillStyle = '#6a2e2e'; x.fillRect(-5, -17, 3, 3);                                   // remiendo
  x.fillStyle = '#35271c'; x.fillRect(-8, -7, 16, 2);                                   // cinturón
  x.fillStyle = '#56412e'; x.fillRect(3, -6, 4, 4); x.fillRect(-7, -6, 3, 3);
  x.fillStyle = '#c9a24c'; x.fillRect(0, -7, 2, 2);
  // capucha bajada
  x.fillStyle = '#3a5a6a'; x.beginPath(); x.ellipse(-1, -24, 7, 3, 0, 0, 7); x.fill();
  x.fillStyle = '#26404e'; x.fillRect(-7, -24, 13, 2);
  // cuello con cables
  x.fillStyle = METAL[0]; x.fillRect(-1, -28, 3, 4); x.fillStyle = '#8a2b2b'; x.fillRect(-2, -27, 1, 3);
  // cabeza de metal
  x.fillStyle = METAL[2]; x.beginPath(); x.ellipse(0.5, -33, 4.6, 5.3, 0, 0, 7); x.fill();
  x.fillStyle = METAL[3]; x.beginPath(); x.ellipse(-0.5, -35, 3, 3, 0, 0, 7); x.fill();
  x.fillStyle = METAL[4]; x.fillRect(-2, -37, 2, 1);
  x.fillStyle = METAL[1]; x.fillRect(-4, -31, 1, 3); x.fillRect(-1, -29, 5, 1);
  x.fillStyle = METAL[0]; x.fillRect(-3, -34, 2, 2);
  // visor
  const vis = dead ? '#203038' : kneel ? (t % 8 < 4 ? '#e8fbff' : '#7fe8ff') : '#7fe8ff';
  x.fillStyle = '#0c1014'; x.fillRect(0, -34, 5, 2);
  x.fillStyle = vis; x.fillRect(1, -34, 4, 1); if (!dead) { x.fillStyle = '#e8fbff'; x.fillRect(3, -34, 1, 1); }
  x.restore();
  leg(a2, b2, '#39344a', METAL[2]);

  // brazo delantero y espada
  const sh = { x: O + 3 + Math.sin(lean) * -20, y: hipY - 21 };
  const arm = (hx2, hy2) => {
    const ex = (sh.x + hx2) / 2 + 1, ey = (sh.y + hy2) / 2 + 1;
    x.strokeStyle = METAL[2]; x.lineWidth = 3; x.lineCap = 'round';
    x.beginPath(); x.moveTo(sh.x, sh.y); x.lineTo(ex, ey); x.lineTo(hx2, hy2); x.stroke();
    x.fillStyle = METAL[0]; x.fillRect(ex - 1, ey - 1, 2, 2);
    x.fillStyle = METAL[3]; x.fillRect(sh.x - 1, sh.y - 2, 3, 2);
    x.fillStyle = METAL[1]; x.fillRect(hx2 - 1, hy2 - 1, 3, 3);
  };
  const blade = (hx2, hy2, ang, len) => {
    x.save(); x.translate(hx2, hy2); x.rotate(ang);
    x.fillStyle = '#6b717c'; x.fillRect(-1, -3, 2, 6);
    x.fillStyle = '#c8ced8'; x.fillRect(1, -1, len, 2); x.fillStyle = '#ffffff'; x.fillRect(1, -1, len, 1);
    x.fillStyle = '#c8ced8'; x.fillRect(len, -1, 2, 1);
    x.restore();
  };
  if (h.atkT > 0 && !dead) {
    const k = Math.min(1, (18 - h.atkT) / 6);
    if (h.atkDir === 'up') { arm(sh.x + 3, sh.y - 10); blade(sh.x + 3, sh.y - 10, -Math.PI / 2 + (1 - k) * 0.8, 20); }
    else if (h.atkDir === 'down') { arm(sh.x + 3, sh.y + 10); blade(sh.x + 3, sh.y + 10, Math.PI / 2 - (1 - k) * 0.6, 20); }
    else { const hx2 = sh.x + 9 * k + 3, hy2 = sh.y + 3; arm(hx2, hy2); blade(hx2, hy2, (1 - k) * -1.2, 22); }
  } else if (h.wall) {
    arm(sh.x + 6, sh.y - 6); blade(sh.x - 2, sh.y + 6, 2.2, 16);
  } else if (kneel) {
    arm(sh.x + 4, sh.y + 8); blade(sh.x + 4, sh.y + 8, 1.35, 20);
  } else {
    const sw = moving ? Math.sin(h.phase) * 3 : 0;
    arm(sh.x + 3 - sw, sh.y + 11); blade(sh.x + 3 - sw, sh.y + 11, 1.1 + (air ? -0.5 : 0), 16);
  }
  crisp(HERO, 90); outline(HERO);
  if (h.face < 0) {
    const [c2, x2] = FLIP;
    x2.clearRect(0, 0, 64, 64); x2.save(); x2.translate(64, 0); x2.scale(-1, 1); x2.drawImage(HERO, 0, 0); x2.restore();
    return c2;
  }
  return HERO;
}
const FLIP = mk(64, 64);

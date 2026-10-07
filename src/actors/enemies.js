// Enemigos de la hacienda y proyectiles.
import { mk, crisp, outline, pair, drawSpr } from '../core/gfx.js';
import { move, groundAhead, tileAt, SOLID, overlap } from './physics.js';
import { sfx } from '../core/audio.js';

// ───────────── Sprites (vector → píxel) ─────────────
function frames(w, h, n, draw) {
  return Array.from({ length: n }, (_, f) => { const [c, x] = mk(w, h); draw(x, f, w, h); crisp(c, 90); outline(c); return pair(c); });
}
function G(x, x0, y0, x1, y1, cols) { const g = x.createLinearGradient(x0, y0, x1, y1); cols.forEach((c, i) => g.addColorStop(i / (cols.length - 1), c)); return g; }
const legs = (x, cx, top, ph, len, col, w = 2) => { x.strokeStyle = col; x.lineWidth = w; x.lineCap = 'round'; for (const s of [1, -1]) { const a = Math.sin(ph) * 0.6 * s; x.beginPath(); x.moveTo(cx + s * 3, top); x.lineTo(cx + s * 3 + Math.sin(a) * len, top + Math.cos(a) * len); x.stroke(); } };

const SPR = {};
function buildSprites() {
  // Jardinero autómata: sombrero de paja, delantal y tijeras de podar
  SPR.jardinero = frames(36, 38, 6, (x, f) => {
    const snip = f >= 4, ph = f * Math.PI / 2;
    legs(x, 16, 26, snip ? 0.3 : ph, 10, '#4a4e58', 3);
    x.fillStyle = G(x, 8, 0, 24, 0, ['#9aa0aa', '#6a707a', '#40444e']); x.fillRect(9, 12, 14, 15);
    x.fillStyle = G(x, 0, 14, 0, 30, ['#6a8a4a', '#3f5a2e']); x.fillRect(10, 16, 12, 12);
    x.fillStyle = '#7a8088'; x.beginPath(); x.arc(16, 9, 5, 0, 7); x.fill();
    x.fillStyle = '#ff6a3a'; x.fillRect(18, 8, 3, 2);
    x.fillStyle = '#d8b860'; x.beginPath(); x.ellipse(16, 5, 10, 3, 0, 0, 7); x.fill(); x.fillRect(11, 0, 10, 5); x.fillStyle = '#8a2a2a'; x.fillRect(11, 3, 10, 1);
    // tijeras
    const op = snip ? (f === 4 ? 0.7 : 0.05) : 0.25;
    x.strokeStyle = '#3a3a3a'; x.lineWidth = 2; x.beginPath(); x.moveTo(20, 18); x.lineTo(26, 19); x.stroke();
    x.strokeStyle = '#d8dce4'; x.lineWidth = 2;
    for (const s of [1, -1]) { x.beginPath(); x.moveTo(25, 19); x.lineTo(25 + Math.cos(op * s) * 10, 19 + Math.sin(op * s) * 10); x.stroke(); }
  });
  // Dron vigía
  SPR.dron = frames(26, 22, 2, (x, f) => {
    x.fillStyle = '#2a2e38'; x.fillRect(3, 3, 20, 2); x.fillStyle = f ? '#a8b0c0' : '#5a6070'; x.fillRect(f ? 1 : 5, 1, f ? 8 : 4, 1); x.fillRect(f ? 17 : 17, 1, f ? 8 : 4, 1);
    x.fillStyle = G(x, 4, 5, 22, 18, ['#8a92a0', '#4a505c', '#262a32']); x.beginPath(); x.ellipse(13, 12, 9, 7, 0, 0, 7); x.fill();
    x.fillStyle = '#101218'; x.beginPath(); x.arc(15, 12, 4, 0, 7); x.fill();
    x.fillStyle = '#ff3a3a'; x.beginPath(); x.arc(15, 12, 2, 0, 7); x.fill(); x.fillStyle = '#ffd0d0'; x.fillRect(14, 11, 1, 1);
    x.fillStyle = '#3a3e48'; x.fillRect(12, 19, 1, 3);
  });
  // Toro de hierro
  SPR.toro = frames(56, 38, 7, (x, f) => {
    const wind = f === 4 || f === 5, charge = f === 6, ph = f * Math.PI / 2;
    for (const [lx, o] of [[14, 0], [20, 1], [38, 0], [44, 1]]) { const a = charge ? Math.sin(f + o * 2) * 0.8 : Math.sin(ph + o * Math.PI) * 0.5; x.strokeStyle = o ? '#4a3a2a' : '#6a5038'; x.lineWidth = 4; x.lineCap = 'round'; x.beginPath(); x.moveTo(lx, 24); x.lineTo(lx + Math.sin(a) * 9, 35); x.stroke(); }
    x.fillStyle = G(x, 0, 8, 0, 28, ['#c08a4a', '#8a5a2a', '#4a2e18']); x.beginPath(); x.ellipse(28, 18, 20, 10, 0, 0, 7); x.fill();
    x.fillStyle = 'rgba(40,20,10,0.5)'; for (let i = 12; i < 46; i += 6) x.fillRect(i, 10, 1, 16);
    x.fillStyle = '#d8a46a'; x.fillRect(16, 9, 22, 2);
    const hy = wind ? 22 : charge ? 20 : 14;
    x.fillStyle = G(x, 40, hy - 6, 54, hy + 6, ['#b07a3a', '#5a3a1e']); x.beginPath(); x.ellipse(47, hy, 8, 7, 0, 0, 7); x.fill();
    x.fillStyle = '#e8dcc0'; x.beginPath(); x.moveTo(44, hy - 5); x.quadraticCurveTo(40, hy - 14, 46, hy - 16); x.lineTo(46, hy - 13); x.quadraticCurveTo(44, hy - 10, 47, hy - 5); x.fill();
    x.beginPath(); x.moveTo(50, hy - 5); x.quadraticCurveTo(56, hy - 12, 54, hy - 16); x.lineTo(53, hy - 13); x.quadraticCurveTo(53, hy - 9, 49, hy - 5); x.fill();
    x.fillStyle = wind || charge ? '#ff3a1a' : '#ffaa30'; x.fillRect(48, hy - 2, 3, 2);
    x.fillStyle = '#2a1a10'; x.fillRect(52, hy + 3, 2, 1);
    x.fillStyle = '#6a5038'; x.fillRect(6, 12, 4, 2); x.fillRect(4, 13, 2, 6);
  });
  // Murciélago de cueva
  SPR.murcielago = frames(34, 20, 3, (x, f) => {
    if (f === 2) { x.fillStyle = G(x, 12, 0, 22, 20, ['#5a3a4a', '#2a1a24']); x.beginPath(); x.ellipse(17, 10, 6, 9, 0, 0, 7); x.fill(); x.fillStyle = '#ff5a3a'; x.fillRect(15, 14, 1, 1); x.fillRect(19, 14, 1, 1); return; }
    const up = f === 0;
    x.fillStyle = '#3a2430';
    for (const s of [1, -1]) { x.beginPath(); x.moveTo(17, 9); x.lineTo(17 + s * 16, up ? 1 : 15); x.lineTo(17 + s * 11, up ? 8 : 18); x.lineTo(17 + s * 6, up ? 6 : 13); x.lineTo(17 + s * 3, 12); x.fill(); }
    x.fillStyle = G(x, 12, 4, 22, 16, ['#6a4a5a', '#2a1a24']); x.beginPath(); x.ellipse(17, 10, 5, 6, 0, 0, 7); x.fill();
    x.fillStyle = '#ff5a3a'; x.fillRect(15, 8, 1, 1); x.fillRect(19, 8, 1, 1);
    x.fillStyle = '#e8dcc0'; x.fillRect(16, 12, 1, 2); x.fillRect(18, 12, 1, 2);
  });
  // Ídolo escupefuego (cabeza de piedra ibérica)
  SPR.escupidor = frames(32, 36, 2, (x, f) => {
    x.fillStyle = G(x, 0, 24, 0, 36, ['#7c5a3c', '#3a2a20']); x.fillRect(4, 26, 24, 10);
    x.fillStyle = G(x, 4, 0, 28, 0, ['#a07a4c', '#7c5a3c', '#4a3424']); x.beginPath(); x.ellipse(16, 14, 11, 13, 0, 0, 7); x.fill();
    x.fillStyle = '#3a2a20'; x.fillRect(9, 9, 5, 3); x.fillRect(18, 9, 5, 3);
    x.fillStyle = '#ff9a30'; x.fillRect(10, 10, 3, 1); x.fillRect(19, 10, 3, 1);
    x.fillStyle = '#2a1a14'; x.fillRect(15, 12, 2, 5);
    x.fillStyle = f ? '#ffb43c' : '#2a1a14'; x.fillRect(11, 19, 10, f ? 5 : 2);
    x.fillStyle = '#c49d64'; x.fillRect(8, 4, 16, 2);
  });
  // Lobo de hielo
  SPR.lobo = frames(46, 30, 5, (x, f) => {
    const leap = f === 4, ph = f * Math.PI / 2;
    for (const [lx, o] of [[12, 0], [16, 1], [32, 0], [36, 1]]) { const a = leap ? (lx < 20 ? 0.9 : -0.9) : Math.sin(ph + o * Math.PI) * 0.7; x.strokeStyle = o ? '#3a4a5a' : '#5a6a7a'; x.lineWidth = 3; x.lineCap = 'round'; x.beginPath(); x.moveTo(lx, 18); x.lineTo(lx + Math.sin(a) * 9, 28); x.stroke(); }
    x.fillStyle = G(x, 0, 8, 0, 22, ['#c4d4e0', '#6a8496', '#3a4a5a']); x.beginPath(); x.ellipse(24, 15, 16, 6, 0, 0, 7); x.fill();
    x.fillStyle = '#e8f4ff'; for (let i = 12; i < 34; i += 4) { x.beginPath(); x.moveTo(i, 10); x.lineTo(i + 2, 4); x.lineTo(i + 4, 10); x.fill(); }
    x.fillStyle = G(x, 34, 6, 46, 18, ['#c4d4e0', '#5a6a7a']); x.beginPath(); x.moveTo(34, 8); x.lineTo(46, 13); x.lineTo(44, 17); x.lineTo(34, 18); x.fill();
    x.beginPath(); x.moveTo(36, 8); x.lineTo(38, 2); x.lineTo(40, 9); x.fill();
    x.fillStyle = '#7fe8ff'; x.fillRect(40, 11, 2, 1);
    x.strokeStyle = '#6a8496'; x.lineWidth = 2; x.beginPath(); x.moveTo(9, 13); x.quadraticCurveTo(2, 10, 3, 4); x.stroke();
  });
  // Guardia del Patrón: escudo torre y porra
  SPR.guardia = frames(40, 46, 7, (x, f) => {
    const wind = f === 4 || f === 5, strike = f === 6, ph = f * Math.PI / 2;
    legs(x, 18, 30, wind || strike ? 0.4 : ph, 13, '#2a2a30', 4);
    x.fillStyle = G(x, 10, 0, 26, 0, ['#5a5e68', '#3a3e48', '#22242a']); x.fillRect(11, 14, 14, 18);
    x.fillStyle = '#8a1f2a'; x.beginPath(); x.moveTo(11, 14); x.lineTo(25, 28); x.lineTo(25, 31); x.lineTo(11, 17); x.fill();
    x.fillStyle = '#d8a43a'; x.fillRect(16, 20, 3, 3);
    x.fillStyle = '#4a4e58'; x.beginPath(); x.arc(18, 9, 6, 0, 7); x.fill();
    x.fillStyle = '#2a2a30'; x.fillRect(11, 4, 14, 4); x.fillStyle = '#8a1f2a'; x.fillRect(14, 1, 8, 3);
    x.fillStyle = '#ff4a3a'; x.fillRect(19, 9, 4, 1);
    // porra
    const ba = strike ? 0.4 : wind ? -2.2 : -0.6;
    x.save(); x.translate(13, 17); x.rotate(ba); x.fillStyle = '#1a1a1e'; x.fillRect(0, -1, 18, 3); x.fillStyle = '#ffd040'; x.fillRect(14, -1, 4, 3); x.restore();
    // escudo torre delante
    x.fillStyle = G(x, 24, 0, 34, 0, ['#8a8e98', '#5a5e68', '#3a3e48']); x.fillRect(25, 10, 9, 30);
    x.fillStyle = '#d8a43a'; x.fillRect(25, 10, 9, 2); x.fillRect(25, 38, 9, 2); x.fillRect(28, 20, 3, 8);
  });
  // Torreta del techo (el cañón se dibuja aparte)
  SPR.torreta = frames(24, 14, 1, (x) => {
    x.fillStyle = G(x, 0, 0, 0, 14, ['#5e6c86', '#2e384c']); x.fillRect(2, 0, 20, 6); x.beginPath(); x.arc(12, 6, 7, 0, Math.PI); x.fill();
    x.fillStyle = '#3ee8ff'; x.fillRect(11, 8, 2, 2);
  });
}

// ───────────── Base ─────────────
export class Enemy {
  constructor(kind, x, feet, w, h, hp) {
    this.kind = kind; this.w = w; this.h = h; this.x = x - w / 2; this.y = feet - h;
    this.hp = hp; this.maxHp = hp; this.vx = 0; this.vy = 0; this.face = -1; this.t = Math.random() * 100 | 0;
    this.flash = 0; this.kb = 0; this.dead = false; this.state = 'idle'; this.timer = 0; this.damage = 1; this.home = { x: this.x, y: this.y };
  }
  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }
  hurt(g, dmg, dir, atkDir) {
    this.hp -= dmg; this.flash = 8; this.kb = dir * 3;
    sfx('hit'); g.fx.oil(this.cx, this.cy, 6, dir || 1); g.fx.burst(this.cx, this.cy, 5, '#ffffff', 2, 12);
    if (this.hp <= 0) this.die(g);
  }
  die(g) {
    this.dead = true; sfx('kill'); g.shake(2, 6);
    g.fx.burst(this.cx, this.cy, 18, '#ffb43c', 3); g.fx.oil(this.cx, this.cy, 10, 1); g.fx.oil(this.cx, this.cy, 10, -1); g.fx.ring(this.cx, this.cy, '#ffd890', 26);
    if (Math.random() < 0.5) g.spawnOrb(this.cx, this.cy);
  }
  gravity(g) { this.vy = Math.min(this.vy + 0.34, 7); }
  sees(hero, range, dy = 60) { return Math.abs(hero.cx - this.cx) < range && Math.abs(hero.cy - this.cy) < dy && !hero.dead; }
  draw(ctx, cx, cy, t) {
    const spr = SPR[this.kind][this.frame ?? 0];
    drawSpr(ctx, spr, this.cx - cx, this.y + this.h - cy + (this.drawOff || 0), -this.face * (this.flipArt ? -1 : 1) * -1, this.flash > 0);
  }
  lights() { return []; }
}

class Jardinero extends Enemy {
  constructor(x, y) { super('jardinero', x, y, 16, 34, 3); this.face = -1; }
  update(g) {
    this.t++; if (this.flash) this.flash--;
    const h = g.hero;
    switch (this.state) {
      case 'idle':
        this.vx = this.face * 0.7;
        if (!groundAhead(this, g.room, this.face) || this.hitWall) this.face *= -1;
        if (this.sees(h, 90, 30) && Math.sign(h.cx - this.cx) === this.face) { this.state = 'wind'; this.timer = 22; this.vx = 0; }
        this.frame = Math.floor(this.t / 8) % 4; break;
      case 'wind': this.vx = 0; this.frame = 4; if (--this.timer <= 0) { this.state = 'lunge'; this.timer = 14; sfx('slash'); } break;
      case 'lunge': this.vx = this.face * 3.6; this.frame = 5; if (--this.timer <= 0) { this.state = 'rest'; this.timer = 34; } break;
      case 'rest': this.vx *= 0.8; this.frame = 0; if (--this.timer <= 0) { this.state = 'idle'; if (Math.sign(h.cx - this.cx)) this.face = Math.sign(h.cx - this.cx); } break;
    }
    this.vx += this.kb; this.kb *= 0.7;
    this.gravity(); move(this, g.room);
  }
}

class Dron extends Enemy {
  constructor(x, y) { super('dron', x, y, 20, 16, 2); this.fly = true; this.cool = 90 + Math.random() * 60; }
  update(g) {
    this.t++; if (this.flash) this.flash--;
    const h = g.hero;
    let tx = this.home.x, ty = this.home.y + Math.sin(this.t * 0.04) * 10;
    if (this.sees(h, 200, 160)) { tx = h.cx - this.w / 2 - Math.sign(h.cx - this.cx) * 50; ty = h.y - 50; this.face = Math.sign(h.cx - this.cx) || 1; if (--this.cool <= 0) { this.cool = 150; g.shoot('orb', this.cx, this.cy + 4, h.cx, h.cy); sfx('laser'); } }
    this.vx += Math.max(-0.08, Math.min(0.08, (tx - this.x) * 0.004)) + this.kb * 0.3; this.kb *= 0.7;
    this.vy += Math.max(-0.08, Math.min(0.08, (ty - this.y) * 0.004));
    this.vx *= 0.95; this.vy *= 0.95;
    move(this, g.room);
    this.frame = (this.t >> 1) % 2;
  }
  lights() { return [{ x: this.cx + this.face * 2, y: this.cy, r: 26, col: '#ff3a3a' }]; }
}

class Toro extends Enemy {
  constructor(x, y) { super('toro', x, y, 40, 30, 6); this.face = -1; }
  update(g) {
    this.t++; if (this.flash) this.flash--;
    const h = g.hero;
    switch (this.state) {
      case 'idle':
        this.vx = this.face * 0.5;
        if (!groundAhead(this, g.room, this.face) || this.hitWall) this.face *= -1;
        if (this.sees(h, 220, 40)) { this.face = Math.sign(h.cx - this.cx) || this.face; this.state = 'wind'; this.timer = 40; sfx('roar'); }
        this.frame = Math.floor(this.t / 9) % 4; break;
      case 'wind':
        this.vx = 0; this.frame = 4 + ((this.t >> 3) & 1);
        if (this.t % 6 === 0) g.fx.dust(this.cx - this.face * 16, this.y + this.h, 2);
        if (this.t % 10 === 0) g.fx.spark(this.cx + this.face * 22, this.y + 14, this.face * 0.6, -0.4, 'rgba(230,230,230,0.6)', 20, -0.01, 2, false);
        if (--this.timer <= 0) { this.state = 'charge'; this.timer = 100; this.damage = 2; } break;
      case 'charge':
        this.vx = this.face * 5.2; this.frame = 6;
        if (this.t % 3 === 0) g.fx.dust(this.cx - this.face * 18, this.y + this.h, 2);
        if (this.hitWall || !groundAhead(this, g.room, this.face) || --this.timer <= 0) {
          if (this.hitWall) { g.shake(5, 14); sfx('slam'); g.fx.burst(this.cx + this.face * 20, this.cy, 16, '#c8a070'); }
          this.state = 'stun'; this.timer = 80; this.vx = 0; this.damage = 1;
        }
        break;
      case 'stun':
        this.vx = 0; this.frame = 0;
        if (this.t % 12 === 0) g.fx.spark(this.cx, this.y - 4, (Math.random() - 0.5), -0.8, '#ffe08a', 20);
        if (--this.timer <= 0) { this.state = 'idle'; this.face = -this.face; } break;
    }
    this.vx += this.kb * (this.state === 'charge' ? 0 : 0.5); this.kb *= 0.7;
    this.gravity(); move(this, g.room);
  }
  hurt(g, dmg, dir, atkDir) { super.hurt(g, this.state === 'stun' ? dmg * 2 : dmg, dir, atkDir); }
}

class Murcielago extends Enemy {
  constructor(x, y) { super('murcielago', x, y, 18, 14, 2); this.fly = true; this.awake = false; this.y = y * 1 - 14; this.home.y = this.y; }
  update(g) {
    this.t++; if (this.flash) this.flash--;
    const h = g.hero;
    if (!this.awake) { this.frame = 2; if (this.sees(h, 120, 140)) { this.awake = true; sfx('spit'); } return; }
    const dx = h.cx - this.cx, dy = h.cy - this.cy, d = Math.hypot(dx, dy) || 1;
    this.vx += dx / d * 0.09 + this.kb; this.kb = 0; this.vy += dy / d * 0.09 + Math.sin(this.t * 0.12) * 0.12;
    const s = Math.hypot(this.vx, this.vy); if (s > 1.9) { this.vx *= 1.9 / s; this.vy *= 1.9 / s; }
    this.face = Math.sign(this.vx) || 1;
    move(this, g.room);
    this.frame = (this.t >> 2) % 2;
  }
}

class Escupidor extends Enemy {
  constructor(x, y) { super('escupidor', x, y, 22, 34, 4); this.cool = 80; this.open = 0; }
  update(g) {
    this.t++; if (this.flash) this.flash--;
    const h = g.hero; this.face = Math.sign(h.cx - this.cx) || 1;
    if (this.open > 0) this.open--;
    if (--this.cool <= 0 && this.sees(h, 260, 140)) {
      this.cool = 120; this.open = 24; sfx('spit');
      const vx = Math.max(-3.4, Math.min(3.4, (h.cx - this.cx) / 46));
      g.shootRaw('fire', this.cx + this.face * 6, this.y + 18, vx, -4.4, 0.16);
    }
    this.frame = this.open > 0 ? 1 : 0; this.gravity(); move(this, g.room);
  }
  hurt(g, d, dir, a) { this.kb = 0; super.hurt(g, d, 0, a); }
  lights() { return this.open > 0 ? [{ x: this.cx, y: this.y + 20, r: 40, col: '#ff8a30' }] : [{ x: this.cx, y: this.y + 10, r: 16, col: '#ff8a30' }]; }
}

class Lobo extends Enemy {
  constructor(x, y) { super('lobo', x, y, 34, 24, 4); }
  update(g) {
    this.t++; if (this.flash) this.flash--;
    const h = g.hero;
    if (this.state === 'idle') {
      this.vx = this.face * 0.8;
      if (!groundAhead(this, g.room, this.face) || this.hitWall) this.face *= -1;
      if (this.sees(h, 170, 60)) this.state = 'hunt';
      this.frame = Math.floor(this.t / 8) % 4;
    } else if (this.state === 'hunt') {
      this.face = Math.sign(h.cx - this.cx) || this.face;
      this.vx = this.face * 2.8; this.frame = Math.floor(this.t / 5) % 4;
      if (this.onGround && Math.abs(h.cx - this.cx) < 80 && this.t % 2 === 0) { this.vy = -5.6; this.vx = this.face * 4.2; this.state = 'leap'; sfx('jump'); }
      if (!this.sees(h, 260, 120)) this.state = 'idle';
    } else if (this.state === 'leap') {
      this.frame = 4;
      if (this.onGround && this.vy >= 0) { this.state = 'rest'; this.timer = 40; }
    } else if (this.state === 'rest') { this.vx *= 0.8; this.frame = 0; if (--this.timer <= 0) this.state = 'hunt'; }
    if (this.state !== 'leap') { this.vx += this.kb; } this.kb *= 0.7;
    this.gravity(); move(this, g.room);
  }
}

class Guardia extends Enemy {
  constructor(x, y) { super('guardia', x, y, 18, 40, 5); this.turn = 0; }
  update(g) {
    this.t++; if (this.flash) this.flash--;
    const h = g.hero, want = Math.sign(h.cx - this.cx) || this.face;
    switch (this.state) {
      case 'idle':
        if (want !== this.face) { if (++this.turn > 26) { this.face = want; this.turn = 0; } } else this.turn = 0;
        this.vx = this.sees(h, 240, 50) && this.turn === 0 ? this.face * 1.0 : 0;
        if (!groundAhead(this, g.room, this.face)) this.vx = 0;
        this.frame = this.vx ? Math.floor(this.t / 9) % 4 : 0;
        if (this.sees(h, 46, 40) && want === this.face) { this.state = 'wind'; this.timer = 24; }
        break;
      case 'wind': this.vx = 0; this.frame = 4 + ((this.t >> 2) & 1); if (--this.timer <= 0) { this.state = 'strike'; this.timer = 10; sfx('slash'); } break;
      case 'strike': {
        this.frame = 6; this.vx = this.face * 1.5;
        const box = { x: this.face > 0 ? this.x + this.w : this.x - 30, y: this.y + 4, w: 30, h: 24 };
        if (overlap(box, h)) g.hurtHero(1, this.cx);
        if (--this.timer <= 0) { this.state = 'rest'; this.timer = 34; }
        break;
      }
      case 'rest': this.vx = 0; this.frame = 0; if (--this.timer <= 0) this.state = 'idle'; break;
    }
    this.vx += this.kb; this.kb *= 0.6;
    this.gravity(); move(this, g.room);
  }
  hurt(g, dmg, dir, atkDir, hero) {
    // el escudo bloquea los golpes laterales de frente
    if (atkDir === 'side' && hero && Math.sign(hero.cx - this.cx) === this.face && this.state !== 'strike') {
      sfx('clang'); g.fx.burst(this.cx + this.face * 10, this.cy, 8, '#ffe08a', 2.5, 12); hero.vx = -hero.face * 3.4; this.kb = -this.face * 1.2;
      return 'blocked';
    }
    super.hurt(g, dmg, dir, atkDir);
  }
}

class Torreta extends Enemy {
  constructor(x, y) { super('torreta', x, y * 1 + 14, 22, 14, 3); this.ang = Math.PI / 2; this.cool = 60; this.static = true; }
  update(g) {
    this.t++; if (this.flash) this.flash--;
    const h = g.hero, ox = this.cx, oy = this.y + 8;
    if (this.state === 'idle') {
      const want = Math.atan2(h.cy - oy, h.cx - ox); this.ang += (want - this.ang) * 0.05;
      if (--this.cool <= 0 && this.sees(h, 300, 260)) { this.state = 'aim'; this.timer = 46; sfx('charge'); }
    } else if (this.state === 'aim') {
      const want = Math.atan2(h.cy - oy, h.cx - ox); this.ang += (want - this.ang) * 0.02;
      if (--this.timer <= 0) { this.state = 'fire'; this.timer = 18; sfx('laser'); g.shake(2, 6); }
    } else if (this.state === 'fire') {
      const end = ray(g.room, ox, oy, this.ang, 500);
      if (segHit(ox, oy, end.x, end.y, h, 4)) g.hurtHero(1, ox);
      if (this.t % 2 === 0) g.fx.spark(end.x, end.y, (Math.random() - 0.5) * 2, -Math.random() * 2, '#ffd0e8', 14);
      if (--this.timer <= 0) { this.state = 'idle'; this.cool = 80; }
    }
    this.beam = this.state !== 'idle' ? ray(g.room, ox, oy, this.ang, 500) : null;
  }
  draw(ctx, cx, cy, t) {
    const ox = this.cx - cx, oy = this.y + 8 - cy;
    if (this.beam) {
      ctx.globalCompositeOperation = 'lighter';
      if (this.state === 'aim') { ctx.strokeStyle = (t >> 2) % 2 ? 'rgba(255,60,150,0.6)' : 'rgba(255,60,150,0.25)'; ctx.lineWidth = 1; }
      else { ctx.strokeStyle = 'rgba(255,80,170,0.95)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(this.beam.x - cx, this.beam.y - cy); ctx.stroke(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; }
      ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(this.beam.x - cx, this.beam.y - cy); ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.save(); ctx.translate(Math.round(ox), Math.round(oy)); ctx.rotate(this.ang);
    ctx.fillStyle = '#1a2030'; ctx.fillRect(0, -2, 14, 4); ctx.fillStyle = '#5e6c86'; ctx.fillRect(0, -2, 14, 1); ctx.fillStyle = '#ff3e9a'; ctx.fillRect(13, -1, 2, 2);
    ctx.restore();
    drawSpr(ctx, SPR.torreta[0], this.cx - cx, this.y + this.h - cy, 1, this.flash > 0);
  }
  lights() { return this.beam ? [{ x: this.cx, y: this.y + 8, r: 50, col: '#ff3e9a' }, { x: this.beam.x, y: this.beam.y, r: 40, col: '#ff3e9a' }] : [{ x: this.cx, y: this.y + 8, r: 14, col: '#3ee8ff' }]; }
}

// Rayo contra los tiles
export function ray(room, x0, y0, ang, max) {
  const dx = Math.cos(ang), dy = Math.sin(ang);
  for (let d = 0; d < max; d += 3) {
    const x = x0 + dx * d, y = y0 + dy * d, t = tileAt(room, Math.floor(x / 16), Math.floor(y / 16));
    if (t === null || SOLID(t)) return { x, y };
  }
  return { x: x0 + dx * max, y: y0 + dy * max };
}
export function segHit(x0, y0, x1, y1, b, pad = 0) {
  const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 6);
  for (let k = 0; k <= n; k++) { const x = x0 + (x1 - x0) * k / n, y = y0 + (y1 - y0) * k / n; if (x > b.x - pad && x < b.x + b.w + pad && y > b.y - pad && y < b.y + b.h + pad) return true; }
  return false;
}

const KINDS = { jardinero: Jardinero, dron: Dron, toro: Toro, murcielago: Murcielago, escupidor: Escupidor, lobo: Lobo, guardia: Guardia, torreta: Torreta };
export function makeEnemy(kind, x, y) {
  if (!SPR.dron) buildSprites();
  return new KINDS[kind](x, y);
}

// ───────────── Proyectiles ─────────────
const PCOL = { orb: ['#ff3a3a', '#ffd0d0'], fire: ['#ff7a1f', '#ffe58a'], wave: ['#7fe8ff', '#ffffff'], sack: ['#d8c8a0', '#ffffff'], missile: ['#ff3e9a', '#ffd0e8'], spore: ['#ffb43c', '#fff1a8'], dark: ['#d0302a', '#ffb0a0'] };
export class Projectile {
  constructor(type, x, y, vx, vy, grav = 0) {
    this.type = type; this.vx = vx; this.vy = vy; this.grav = grav; this.t = 0; this.dead = false;
    const s = { orb: 6, fire: 8, wave: 12, sack: 12, missile: 8, spore: 6, dark: 8 }[type] || 6;
    this.w = s; this.h = type === 'wave' ? 16 : s; this.x = x - this.w / 2; this.y = y - this.h / 2;
    this.breakable = type !== 'wave'; this.life = type === 'wave' ? 200 : 400;
  }
  update(g) {
    this.t++;
    if (this.type === 'missile' && this.t < 90) {
      const h = g.hero, a = Math.atan2(h.cy - this.y, h.cx - this.x), cur = Math.atan2(this.vy, this.vx), sp = Math.hypot(this.vx, this.vy);
      let d = a - cur; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
      const na = cur + Math.max(-0.05, Math.min(0.05, d)); this.vx = Math.cos(na) * Math.min(3.4, sp + 0.04); this.vy = Math.sin(na) * Math.min(3.4, sp + 0.04);
      if (this.t % 2 === 0) g.fx.spark(this.x + 4, this.y + 4, -this.vx * 0.3, -this.vy * 0.3, '#ffd0e8', 12);
    }
    this.vy += this.grav; this.x += this.vx; this.y += this.vy;
    const t = tileAt(g.room, Math.floor((this.x + this.w / 2) / 16), Math.floor((this.y + this.h / 2) / 16));
    if (this.type === 'wave') {
      const below = tileAt(g.room, Math.floor((this.x + this.w / 2) / 16), Math.floor((this.y + this.h + 2) / 16));
      if (!SOLID(below) || SOLID(t)) this.dead = true;
      if (this.t % 2 === 0) g.fx.spark(this.x + this.w / 2, this.y + this.h, -this.vx * 0.2, -Math.random() * 2, this.col2 || '#7fe8ff', 14);
    } else if (t === null || SOLID(t)) {
      this.dead = true; g.fx.burst(this.x + this.w / 2, this.y + this.h / 2, 8, PCOL[this.type][0]);
      if (this.type === 'sack') { for (let k = 0; k < 14; k++) g.fx.spark(this.x + 6, this.y + 6, (Math.random() - 0.5) * 3, -Math.random() * 2, 'rgba(240,235,220,0.8)', 40, 0.02, 3, false); }
    }
    if (--this.life <= 0) this.dead = true;
    if (!this.dead && overlap(this, g.hero)) { g.hurtHero(this.type === 'wave' ? 1 : 1, this.x); if (this.type !== 'wave') this.dead = true; }
  }
  draw(ctx, cx, cy, t) {
    const [c1, c2] = PCOL[this.type], x = Math.round(this.x - cx), y = Math.round(this.y - cy);
    if (this.type === 'wave') {
      ctx.globalCompositeOperation = 'lighter';
      for (let k = 0; k < this.w; k++) { const hh = Math.sin((k / this.w) * Math.PI) * this.h; ctx.fillStyle = k % 3 ? c1 : c2; ctx.fillRect(x + k, y + this.h - hh, 1, hh); }
      ctx.globalCompositeOperation = 'source-over'; return;
    }
    if (this.type === 'sack') { ctx.fillStyle = '#a89070'; ctx.fillRect(x, y, 12, 12); ctx.fillStyle = '#e0d0b0'; ctx.fillRect(x + 1, y + 1, 10, 9); ctx.fillStyle = '#5a4030'; ctx.fillRect(x + 4, y, 4, 2); return; }
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = c1; ctx.beginPath(); ctx.arc(x + this.w / 2, y + this.h / 2, this.w / 2 + 1, 0, 7); ctx.fill();
    ctx.fillStyle = c2; ctx.fillRect(x + this.w / 2 - 1, y + this.h / 2 - 1, 3, 3);
    ctx.globalCompositeOperation = 'source-over';
  }
  light() { return this.type === 'sack' ? null : { x: this.x + this.w / 2, y: this.y + this.h / 2, r: this.type === 'wave' ? 30 : 34, col: PCOL[this.type][0] }; }
}

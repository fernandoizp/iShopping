// Objetos interactivos y recogibles.
import { mk, crisp, outline, pair, drawSpr } from '../core/gfx.js';
import { overlap } from './physics.js';

function art(w, h, draw, ol = true) { const [c, x] = mk(w, h); draw(x); crisp(c, 90); if (ol) outline(c); return c; }
function G(x, x0, y0, x1, y1, cols) { const g = x.createLinearGradient(x0, y0, x1, y1); cols.forEach((c, i) => g.addColorStop(i / (cols.length - 1), c)); return g; }

let ART = null;
function build() {
  ART = {
    terminal: art(26, 46, (x) => {
      x.fillStyle = G(x, 0, 0, 26, 0, ['#5e6c86', '#2e384c', '#1a2030']); x.fillRect(5, 8, 16, 34); x.fillRect(2, 40, 22, 6);
      x.fillStyle = '#0a1018'; x.fillRect(8, 12, 10, 12); x.fillStyle = '#2a3242'; x.fillRect(4, 4, 18, 5);
      x.fillStyle = '#3ee8ff'; x.fillRect(9, 30, 8, 2); x.fillRect(9, 34, 5, 2);
    }),
    rosario: pair(art(30, 44, (x) => {
      x.fillStyle = '#4a4e58'; x.fillRect(11, 32, 3, 12); x.fillRect(17, 32, 3, 12);
      x.fillStyle = G(x, 0, 14, 0, 34, ['#7a8a5a', '#4a5a3a']); x.beginPath(); x.moveTo(8, 14); x.lineTo(22, 14); x.lineTo(24, 34); x.lineTo(6, 34); x.fill();
      x.fillStyle = '#8a8070'; x.fillRect(9, 18, 12, 12);
      x.fillStyle = '#9aa0aa'; x.beginPath(); x.ellipse(15, 9, 5, 6, 0, 0, 7); x.fill();
      x.fillStyle = '#7fe8ff'; x.fillRect(16, 8, 3, 1);
      x.fillStyle = '#d8b860'; x.beginPath(); x.ellipse(15, 4, 11, 3, 0, 0, 7); x.fill(); x.fillRect(10, 0, 10, 4); x.fillStyle = '#c4623e'; x.fillRect(10, 3, 10, 1);
      x.strokeStyle = '#5a3a20'; x.lineWidth = 2; x.beginPath(); x.moveTo(24, 20); x.lineTo(26, 44); x.stroke(); x.fillStyle = '#9aa0aa'; x.fillRect(22, 40, 7, 3);
    })),
    ermitano: pair(art(30, 44, (x) => {
      x.fillStyle = G(x, 0, 0, 30, 0, ['#6a5a48', '#4a3e30', '#2a2218']); x.beginPath(); x.moveTo(15, 4); x.lineTo(25, 18); x.lineTo(26, 44); x.lineTo(4, 44); x.lineTo(6, 18); x.fill();
      x.fillStyle = '#c8906a'; x.fillRect(13, 10, 7, 7); x.fillStyle = '#e8e0d0'; x.fillRect(13, 15, 8, 6);
      x.fillStyle = '#2a1a14'; x.fillRect(17, 12, 2, 1);
      x.strokeStyle = '#5a3a20'; x.lineWidth = 2; x.beginPath(); x.moveTo(4, 22); x.lineTo(2, 44); x.stroke();
      x.fillStyle = '#3a3030'; x.fillRect(22, 26, 6, 8); x.fillStyle = '#ffcf6a'; x.fillRect(23, 28, 4, 4);
    })),
    ingrid: pair(art(28, 46, (x) => {
      x.fillStyle = '#9fe8ff'; x.beginPath(); x.ellipse(14, 8, 5, 6, 0, 0, 7); x.fill();
      x.fillStyle = '#e8fbff'; x.fillRect(9, 3, 3, 14); x.fillRect(16, 3, 3, 12);
      x.fillStyle = '#5ac8e8'; x.beginPath(); x.moveTo(8, 16); x.lineTo(20, 16); x.lineTo(23, 44); x.lineTo(5, 44); x.fill();
      x.fillStyle = '#e8fbff'; x.fillRect(10, 20, 8, 2);
    }, false)),
    core: art(16, 16, (x) => {
      x.fillStyle = '#d8a43a'; x.beginPath(); x.arc(8, 8, 7, 0, 7); x.fill();
      x.fillStyle = '#b23246'; x.beginPath(); x.arc(8, 8, 5, 0, 7); x.fill(); x.fillStyle = '#ff8a8a'; x.fillRect(6, 5, 2, 2);
    }),
    elevator: art(48, 16, (x) => {
      x.fillStyle = G(x, 0, 0, 0, 16, ['#8a8478', '#3a3530']); x.fillRect(0, 4, 48, 12);
      x.fillStyle = '#d8a43a'; x.fillRect(0, 4, 48, 2); x.fillStyle = '#1a1816'; for (let i = 4; i < 48; i += 8) x.fillRect(i, 8, 4, 6);
    }),
    record: art(20, 14, (x) => { x.fillStyle = '#2e384c'; x.fillRect(2, 6, 16, 8); x.fillStyle = '#3ee8ff'; x.fillRect(8, 2, 4, 4); }),
  };
}

export class Obj {
  constructor(type, x, y, p) { if (!ART) build(); this.type = type; this.p = p; this.t = Math.random() * 100 | 0; this.dead = false; Object.assign(this, p); this.x = x; this.y = y; }
  get box() { return { x: this.x - 12, y: this.y - 40, w: 24, h: 40 }; }
  near(h) { return overlap(this.box, h); }
  update() { this.t++; }
  draw() {}
  lights() { return []; }
}

export class Terminal extends Obj {
  constructor(x, y) { super('terminal', x, y, {}); }
  get prompt() { return 'GUARDAR'; }
  draw(ctx, cx, cy, t) {
    ctx.drawImage(ART.terminal, Math.round(this.x - 13 - cx), Math.round(this.y - 46 - cy));
    // pantalla viva
    ctx.fillStyle = '#3ee8ff';
    for (let k = 0; k < 4; k++) ctx.fillRect(Math.round(this.x - 4 - cx), Math.round(this.y - 32 + k * 3 - cy), 2 + ((t / 6 + k * 5) % 7), 1);
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(62,232,255,0.15)';
    const h = 30 + Math.sin(t * 0.05) * 4;
    ctx.fillRect(Math.round(this.x - 7 - cx), Math.round(this.y - 46 - h - cy), 14, h);
    ctx.globalCompositeOperation = 'source-over';
  }
  lights() { return [{ x: this.x, y: this.y - 40, r: 60, col: '#3ee8ff' }]; }
}

export class Npc extends Obj {
  constructor(x, y, id) { super('npc', x, y, { id }); this.face = -1; }
  get prompt() { return 'HABLAR'; }
  update(g) { this.t++; this.face = g.hero.cx > this.x ? 1 : -1; }
  draw(ctx, cx, cy, t) {
    const spr = ART[this.id];
    const bob = Math.round(Math.sin(t * 0.04) * (this.id === 'ingrid' ? 2 : 0.5));
    if (this.id === 'ingrid') { ctx.globalAlpha = 0.55 + Math.sin(t * 0.3) * 0.15; ctx.globalCompositeOperation = 'lighter'; }
    drawSpr(ctx, spr, this.x - cx, this.y - cy + bob, this.face);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    if (this.id === 'ingrid' && t % 30 < 2) { ctx.fillStyle = 'rgba(159,232,255,0.5)'; ctx.fillRect(Math.round(this.x - 14 - cx), Math.round(this.y - 30 - cy), 28, 2); }
  }
  lights() { return this.id === 'ingrid' ? [{ x: this.x, y: this.y - 24, r: 50, col: '#7fe8ff' }] : this.id === 'ermitano' ? [{ x: this.x + 10, y: this.y - 14, r: 60, col: '#ffcf6a' }] : []; }
}

// Reliquia de habilidad, recuerdo y núcleo: flotan y se recogen al tocarlas.
export class Pickup extends Obj {
  constructor(kind, x, y, p) { super(kind, x, y, p); }
  get box() { return { x: this.x - 10, y: this.y - 28, w: 20, h: 26 }; }
  draw(ctx, cx, cy, t) {
    if (this.hidden) return;
    const X = Math.round(this.x - cx), Y = Math.round(this.y - 16 - cy + Math.sin(t * 0.06) * 3);
    if (this.type === 'core') { ctx.drawImage(ART.core, X - 8, Y - 8); return; }
    ctx.globalCompositeOperation = 'lighter';
    const col = this.type === 'memory' ? ['#9fd6ff', '#e8f6ff'] : ['#ffd040', '#fff4c8'];
    for (let k = 0; k < 3; k++) { const a = t * 0.05 + k * 2.1; ctx.fillStyle = col[0]; ctx.fillRect(X + Math.round(Math.cos(a) * 10), Y + Math.round(Math.sin(a) * 4), 2, 2); }
    ctx.globalCompositeOperation = 'source-over';
    if (this.type === 'memory') {
      // cristal de memoria
      ctx.fillStyle = '#0b0810'; ctx.beginPath(); ctx.moveTo(X, Y - 9); ctx.lineTo(X + 6, Y); ctx.lineTo(X, Y + 9); ctx.lineTo(X - 6, Y); ctx.fill();
      ctx.fillStyle = '#5a9ad6'; ctx.beginPath(); ctx.moveTo(X, Y - 8); ctx.lineTo(X + 5, Y); ctx.lineTo(X, Y + 8); ctx.lineTo(X - 5, Y); ctx.fill();
      ctx.fillStyle = '#e8f6ff'; ctx.beginPath(); ctx.moveTo(X, Y - 8); ctx.lineTo(X - 5, Y); ctx.lineTo(X, Y); ctx.fill();
    } else {
      // reliquia: engranaje dorado con núcleo
      ctx.fillStyle = '#0b0810'; ctx.beginPath(); ctx.arc(X, Y, 9, 0, 7); ctx.fill();
      ctx.fillStyle = '#d8a43a'; for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + t * 0.02; ctx.fillRect(X + Math.round(Math.cos(a) * 7) - 1, Y + Math.round(Math.sin(a) * 7) - 1, 3, 3); }
      ctx.beginPath(); ctx.arc(X, Y, 6, 0, 7); ctx.fill();
      ctx.fillStyle = this.type === 'item' && this.ability === 'key' ? '#b23246' : '#7fe8ff'; ctx.beginPath(); ctx.arc(X, Y, 3, 0, 7); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.fillRect(X - 1, Y - 2, 1, 1);
    }
  }
  lights() { return this.hidden ? [] : [{ x: this.x, y: this.y - 16, r: 44, col: this.type === 'memory' ? '#9fd6ff' : this.type === 'core' ? '#ff5a5a' : '#ffd040' }]; }
}

export class Elevator extends Obj {
  constructor(x, y, p) { super('elevator', x, y, p); }
  get box() { return { x: this.x - 20, y: this.y - 40, w: 40, h: 40 }; }
  get prompt() { return 'ASCENSOR'; }
  draw(ctx, cx, cy, t) {
    const X = Math.round(this.x - 24 - cx), Y = Math.round(this.y - 16 - cy);
    ctx.fillStyle = '#1a1816'; ctx.fillRect(X + 2, Y - 60, 2, 60); ctx.fillRect(X + 44, Y - 60, 2, 60);
    ctx.drawImage(ART.elevator, X, Y + 6);
    ctx.fillStyle = this.on ? '#3ee8ff' : '#5a2020'; ctx.fillRect(X + 22, Y - 2, 4, 3);
  }
  lights() { return [{ x: this.x, y: this.y - 10, r: 30, col: this.on ? '#3ee8ff' : '#ff3020' }]; }
}

export class Record extends Obj {
  constructor(x, y, p) { super('record', x, y, p); }
  get prompt() { return 'ESCUCHAR'; }
  draw(ctx, cx, cy, t) {
    ctx.drawImage(ART.record, Math.round(this.x - 10 - cx), Math.round(this.y - 14 - cy));
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.25 + Math.sin(t * 0.2) * 0.1;
    ctx.fillStyle = '#3ee8ff'; ctx.beginPath(); ctx.moveTo(this.x - 2 - cx, this.y - 12 - cy); ctx.lineTo(this.x - 14 - cx, this.y - 60 - cy); ctx.lineTo(this.x + 14 - cx, this.y - 60 - cy); ctx.lineTo(this.x + 2 - cx, this.y - 12 - cy); ctx.fill();
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
  lights() { return [{ x: this.x, y: this.y - 30, r: 40, col: '#3ee8ff' }]; }
}

// Orbe de energía que sueltan los enemigos
export class Orb {
  constructor(x, y) { this.x = x; this.y = y; this.vx = (Math.random() - 0.5) * 3; this.vy = -2 - Math.random() * 2; this.t = 0; this.dead = false; }
  update(g) {
    this.t++;
    const h = g.hero, dx = h.cx - this.x, dy = h.cy - this.y, d = Math.hypot(dx, dy);
    if (this.t > 25) { this.vx += dx / d * 0.5; this.vy += dy / d * 0.5; this.vx *= 0.9; this.vy *= 0.9; } else { this.vy += 0.1; this.vx *= 0.96; }
    this.x += this.vx; this.y += this.vy;
    if (d < 12 && this.t > 20) { this.dead = true; h.energy = Math.min(99, h.energy + 11); g.sfxPick(); }
    if (this.t > 400) this.dead = true;
  }
  draw(ctx, cx, cy) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = '#7fe8ff'; ctx.fillRect(Math.round(this.x - 1 - cx), Math.round(this.y - 1 - cy), 3, 3); ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(this.x - cx), Math.round(this.y - cy), 1, 1); ctx.globalCompositeOperation = 'source-over'; }
  light() { return { x: this.x, y: this.y, r: 18, col: '#7fe8ff' }; }
}

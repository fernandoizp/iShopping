// PARADISE · un metroidvania sobre la Hacienda Nápoles.
import { W, H, mk, text, wrap, FONT_TITLE, glowSprite } from './core/gfx.js';
import { Input } from './core/input.js';
import { sfx, unlockAudio, playMusic, stopMusic, toggleMute, setAmbience } from './core/audio.js';
import { FX } from './core/fx.js';
import { postProcess } from './core/post.js';
import { ZONES } from './world/zones.js';
import { buildWorld, roomAt, SW, SH } from './world/rooms.js';
import { renderRoom, renderBackWall } from './world/render.js';
import { buildParallax, drawParallax } from './world/background.js';
import { getDeco, drawFlame } from './world/deco.js';
import { Hero } from './actors/hero.js';
import { makeEnemy, Projectile } from './actors/enemies.js';
import { makeBoss } from './actors/bosses.js';
import { Terminal, Npc, Pickup, Elevator, Record, Orb } from './actors/objects.js';
import { overlap } from './actors/physics.js';
import { NPCS, RECORDS, MEMORIES, ITEMS, INTRO, ending } from './story.js';
import { drawHUD, drawZoneBanner, drawPrompt, drawDialog, drawPopup, drawSubtitle, drawMap } from './ui.js';

const cv = document.getElementById('screen');
const ctx = cv.getContext('2d');
cv.width = W; cv.height = H; ctx.imageSmoothingEnabled = false;

function resize() {
  const touch = document.body.classList.contains('touch'), portrait = innerHeight > innerWidth;
  const s = Math.min(innerWidth / W, (innerHeight * (touch && portrait ? 0.6 : 1)) / H);
  const k = s >= 1 ? (s >= 2 ? Math.floor(s) : s) : s;
  cv.style.width = `${Math.floor(W * k)}px`; cv.style.height = `${Math.floor(H * k)}px`;
}
addEventListener('resize', resize);

const SAVE_KEY = 'paradise-save-v1';
const BOSS_DROP = { gigante: 'dash', cuelebre: 'wall', centinela: 'key' };
const BOSS_MUSIC = { patron: 'final' };
const newSave = () => ({ room: 'puerta', tx: null, ty: null, maxHp: 5, abilities: { double: false, dash: false, wall: false, key: false }, flags: {}, memories: [], cores: [], broken: [], visited: [], time: 0 });
function loadSave() { try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); return s && s.room ? s : null; } catch { return null; } }

class Game {
  constructor() {
    this.input = new Input(); this.input.onAny = () => unlockAudio();
    addEventListener('pointerdown', () => unlockAudio());
    this.fx = new FX();
    this.world = buildWorld();
    this.byId = Object.fromEntries(this.world.map((r) => [r.id, r]));
    this.cache = {}; this.bgs = {};
    this.state = 'title'; this.t = 0; this.menu = 0;
    this.saved = loadSave();
    this.shakeP = 0; this.shakeT = 0; this.stop = 0; this.fade = 0;
    this.camX = 0; this.camY = 0;
  }

  // ───────────── Partida ─────────────
  start(cont) {
    this.save = cont && this.saved ? JSON.parse(JSON.stringify(this.saved)) : newSave();
    for (const k of this.save.broken) { const [id, ij] = k.split(':'), [i, j] = ij.split(',').map(Number); if (this.byId[id]) this.byId[id].tiles[j][i] = '.'; }
    if (this.save.abilities.key) this.unlockSeals(false);
    const room = this.byId[this.save.room] || this.world[0];
    let x, y;
    if (this.save.tx != null) { x = this.save.tx; y = this.save.ty; }
    else { const s = room.ents.find((e) => e.type === 'start'); x = s.x * 16 + 8; y = s.y * 16; }
    this.hero = new Hero(x - 6, y - 36, this.save);
    this.enterRoom(room);
    this.snapCamera();
    this.state = 'play'; this.fade = 40;
    this.dialog = null; this.popup = null; this.sub = null; this.lastZone = null;
    this.banner = { zone: ZONES[room.zone], t: 1 };
    this.lastZone = room.zone;
  }

  persist() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.save)); } catch {}
    this.saved = JSON.parse(JSON.stringify(this.save));
  }

  enterRoom(room) {
    this.room = room;
    for (const row of room.tiles) for (let i = 0; i < row.length; i++) if (row[i] === 'G') row[i] = '.';
    if (!this.cache[room.id]) {
      const z = ZONES[room.zone];
      this.cache[room.id] = { tiles: renderRoom(room, z), back: z.indoor ? renderBackWall(room, z) : null };
    }
    const z = ZONES[room.zone];
    if (!z.indoor && !this.bgs[room.zone]) this.bgs[room.zone] = buildParallax(room.zone, z);
    this.enemies = []; this.objs = []; this.projectiles = []; this.orbs = []; this.boss = null;
    this.decos = room.deco.map((d) => ({ ...d, def: getDeco(d.kind, z, room.zone), X: d.x * 16 + 8, Y: d.y * 16 })).filter((d) => d.def);
    for (const e of room.ents) {
      const X = e.x * 16 + 8, Y = e.y * 16;
      switch (e.type) {
        case 'terminal': this.objs.push(new Terminal(X, Y)); break;
        case 'npc': this.objs.push(new Npc(X, Y, e.id)); break;
        case 'enemy': this.enemies.push(makeEnemy(e.kind, X, Y)); break;
        case 'boss': if (!this.save.flags[e.kind + 'Dead']) this.boss = makeBoss(e.kind, X); break;
        case 'item': if (!this.save.abilities[e.ability]) this.objs.push(new Pickup('item', X, Y, { ability: e.ability })); break;
        case 'memory': if (!this.save.memories.includes(e.n)) this.objs.push(new Pickup('memory', X, Y, { n: e.n, hidden: e.hidden && !this.save.flags[e.hidden] ? e.hidden : null })); break;
        case 'core': if (!this.save.cores.includes(e.n)) this.objs.push(new Pickup('core', X, Y, { n: e.n })); break;
        case 'elevator': this.objs.push(new Elevator(X, Y, { to: e.to, eid: e.id, on: !e.flag || !!this.save.flags[e.flag], flag: e.flag })); break;
        case 'record': this.objs.push(new Record(X, Y, { id: e.id })); break;
      }
    }
    // tras derrotar a un jefe, su recompensa sigue esperando si no se recogió
    if (room.boss && this.save.flags[room.boss + 'Dead']) {
      const ab = BOSS_DROP[room.boss];
      if (ab && !this.save.abilities[ab]) this.objs.push(new Pickup('item', room.W * 8, 15 * 16 - 8, { ability: ab }));
    }
    if (!this.save.visited.includes(room.id)) this.save.visited.push(room.id);
    if (this.lastZone && this.lastZone !== room.zone) this.banner = { zone: z, t: 1 };
    this.lastZone = room.zone;
    if (!this.boss || this.boss.state === 'sleep') playMusic(z.music);
    setAmbience(z.amb);
    this.bossBarT = 0; this.bossBanner = null; this.endingT = this.endingT || 0;
  }

  // Depuración: __game.warp('molino', 5, 15)
  warp(id, tx, ty) {
    const room = this.byId[id], h = this.hero;
    const t = room.ents.find((e) => e.type === 'terminal' || e.type === 'start' || e.type === 'elevator');
    h.x = (tx ?? t?.x ?? 4) * 16 + 2; h.y = (ty ?? t?.y ?? room.H - 2) * 16 - h.h; h.vx = h.vy = 0;
    h.lastSafe = { x: h.x, y: h.y }; this.respawnT = 0;
    this.enterRoom(room); this.snapCamera();
  }

  snapCamera() {
    const h = this.hero, r = this.room;
    this.camX = Math.max(0, Math.min(r.W * 16 - W, h.cx - W / 2));
    this.camY = Math.max(0, Math.min(r.H * 16 - H, h.cy - H / 2));
  }

  checkTransition() {
    const h = this.hero, r = this.room;
    if (h.cx >= 0 && h.cy >= 0 && h.cx < r.W * 16 && h.cy < r.H * 16) return;
    const next = roomAt(this.world, r.px + h.cx, r.py + h.cy);
    if (!next) { h.x = Math.max(0, Math.min(r.W * 16 - h.w, h.x)); h.y = Math.min(h.y, r.H * 16 - h.h); return; }
    const up = h.cy < 0;
    const dx = r.px - next.px, dy = r.py - next.py;
    h.x += dx; h.y += dy; for (const c of h.cape) { c.x += dx; c.y += dy; } h.trail = [];
    h.lastSafe = { x: h.x, y: h.y };
    if (up) { h.vy = Math.min(h.vy, -7.4); h.noCut = true; h.airJumps = h.ab.double ? 1 : 0; }
    this.camX += dx; this.camY += dy;
    this.enterRoom(next);
    this.fade = 6;
  }

  // ───────────── API para los actores ─────────────
  shake(p, f) { this.shakeP = Math.max(this.shakeP, p); this.shakeT = Math.max(this.shakeT, f); }
  hitstop(f) { this.stop = Math.max(this.stop, f); }
  hittables() { const out = [...this.enemies]; if (this.boss && !this.boss.dead) { out.push(this.boss); if (this.boss.extraHittables) out.push(...this.boss.extraHittables()); } return out; }
  shoot(type, x, y, tx, ty) { const a = Math.atan2(ty - y, tx - x), sp = 2; this.projectiles.push(new Projectile(type, x, y, Math.cos(a) * sp, Math.sin(a) * sp)); }
  shootRaw(type, x, y, vx, vy, grav) { this.projectiles.push(new Projectile(type, x, y, vx, vy, grav)); }
  spawnOrb(x, y) { for (let k = 0; k < 2; k++) this.orbs.push(new Orb(x, y)); }
  spawnEnemy(kind, x, y) { const e = makeEnemy(kind, x, y); this.enemies.push(e); this.fx.burst(x, y - 10, 16, '#3ee8ff'); }
  sfxPick() { sfx('select'); }
  say(str, dur = 150) { this.sub = { text: str, t: dur, max: dur }; }

  hurtHero(dmg, fromX, spike) {
    const h = this.hero;
    if (!h.hurt(this, dmg, fromX)) return;
    this.shake(5, 14); this.hitstop(6);
    this.fx.burst(h.cx, h.cy, 14, '#7fe8ff'); this.fx.oil(h.cx, h.cy, 8, 1);
    if (h.dead) { this.state = 'dead'; this.deadT = 0; stopMusic(); sfx('kill'); return; }
    if (spike) this.respawnT = 28;
  }

  breakTile(i, j) {
    const r = this.room;
    r.tiles[j][i] = '.';
    this.save.broken.push(`${r.id}:${i},${j}`);
    this.cache[r.id].tiles.getContext('2d').clearRect(i * 16, j * 16, 16, 16);
    sfx('break'); this.shake(3, 8);
    this.fx.burst(i * 16 + 8, j * 16 + 8, 16, ZONES[r.zone].ramp[3], 3);
    for (let k = 0; k < 6; k++) this.fx.spark(i * 16 + Math.random() * 16, j * 16 + Math.random() * 16, (Math.random() - 0.5) * 3, -Math.random() * 3, ZONES[r.zone].ramp[2], 40, 0.25, 3, false);
  }

  unlockSeals(animate) {
    for (const r of this.world) for (let j = 0; j < r.H; j++) for (let i = 0; i < r.W; i++) if (r.tiles[j][i] === 'L') {
      r.tiles[j][i] = '.';
      if (this.cache[r.id]) this.cache[r.id].tiles.getContext('2d').clearRect(i * 16, j * 16, 16, 16);
    }
    if (animate) { sfx('door'); this.shake(4, 20); }
  }

  setGates(closed) {
    const r = this.room;
    for (const d of r.doors) for (let k = d.start; k < d.start + d.size; k++) for (let dd = 0; dd < 2; dd++) {
      let i, j;
      if (d.side === 'L') { i = dd; j = k; } else if (d.side === 'R') { i = r.W - 1 - dd; j = k; } else continue;
      if (closed && r.tiles[j][i] === '.') r.tiles[j][i] = 'G';
      if (!closed && r.tiles[j][i] === 'G') r.tiles[j][i] = '.';
    }
    sfx('door');
  }

  onBossWake(b) {
    this.setGates(true); this.shake(3, 20);
    playMusic(BOSS_MUSIC[b.kind] || 'boss');
    this.bossBanner = { name: b.name, title: b.title, t: 1 };
    this.bossBarT = 1;
  }
  onBossDying() { stopMusic(); this.hitstop(18); }
  onBossDead(b) {
    this.save.flags[b.kind + 'Dead'] = true;
    this.setGates(false);
    this.fx.burst(b.hx ?? b.x, (b.hy ?? b.y) - 40, 40, '#ffe08a', 4);
    this.hero.hp = this.hero.maxHp;
    const ab = BOSS_DROP[b.kind];
    if (ab) this.objs.push(new Pickup('item', this.room.W * 8, 15 * 16 - 8, { ability: ab }));
    if (b.kind === 'centinela') for (const o of this.objs) if (o.type === 'elevator') o.on = true;
    if (b.kind === 'patron') {
      for (const o of this.objs) if (o.type === 'memory') o.hidden = null;
      this.endingT = 1;
    }
    playMusic(ZONES[this.room.zone].music);
    this.persist();
  }

  // ───────────── Interacción ─────────────
  interact(o) {
    const s = this.save;
    if (o.type === 'terminal') {
      s.room = this.room.id; s.tx = o.x; s.ty = o.y;
      this.hero.hp = this.hero.maxHp; this.persist();
      sfx('save'); this.fx.ring(o.x, o.y - 30, '#7fe8ff', 50); this.fx.burst(o.x, o.y - 30, 20, '#7fe8ff');
      this.popup = { title: 'TERMINAL DE MEMORIA', body: 'Recuerdos guardados. Integridad restaurada.', t: 0 };
    } else if (o.type === 'npc') {
      const n = NPCS[o.id];
      this.dialog = { name: n.name, role: n.role, lines: n.talk(s), i: 0, chars: 0, t: 0 };
    } else if (o.type === 'record') {
      this.dialog = { name: 'GRABACIÓN', role: 'Holograma', lines: RECORDS[o.id], i: 0, chars: 0, t: 0 };
    } else if (o.type === 'elevator') {
      if (!o.on) { this.popup = { title: 'ASCENSOR', body: 'No responde. Falta energía en algún lugar del parque.', t: 0 }; return; }
      sfx('elevator'); this.travel = { to: o.to, from: this.room.id, t: 0 };
    }
  }

  collect(o) {
    const s = this.save;
    o.dead = true;
    this.fx.burst(o.x, o.y - 16, 30, o.type === 'memory' ? '#9fd6ff' : '#ffe08a', 3); this.fx.ring(o.x, o.y - 16, '#ffffff', 40);
    if (o.type === 'item') {
      s.abilities[o.ability] = true; sfx('relic'); this.hitstop(20);
      const [title, body] = ITEMS[o.ability];
      this.popup = { title, body, t: 0 };
      if (o.ability === 'key') this.unlockSeals(true);
    } else if (o.type === 'memory') {
      s.memories.push(o.n); sfx('memory');
      const [title, body] = MEMORIES[o.n];
      this.popup = { title, body, t: 0, memory: true };
    } else if (o.type === 'core') {
      s.cores.push(o.n); s.maxHp++; this.hero.maxHp++; this.hero.hp = this.hero.maxHp; sfx('pickup');
      this.popup = { title: ITEMS.core[0], body: ITEMS.core[1], t: 0 };
    }
    this.persist();
  }

  // ───────────── Bucle ─────────────
  update() {
    this.input.update();
    this.t++;
    if (this.input.pressed('mute')) this.say(toggleMute() ? 'Sonido desactivado' : 'Sonido activado', 60);
    if (this.state === 'title') return this.updateTitle();
    if (this.state === 'intro') return this.updateIntro();
    if (this.state === 'ending') return this.updateEnding();
    if (this.state === 'pause') { if (this.input.pressed('start') || this.input.pressed('map')) { this.state = 'play'; sfx('select'); } return; }
    if (this.state === 'dead') {
      this.deadT++; this.hero.update(this); this.fx.update();
      if (this.deadT > 170) { this.saved = loadSave() || this.saved; this.start(!!this.saved); }
      return;
    }
    // ventanas modales
    if (this.popup) {
      this.popup.t++;
      if (this.popup.t > 40 && (this.input.pressed('jump') || this.input.pressed('attack') || this.input.pressed('up') || this.input.pressed('start'))) { this.popup = null; sfx('select'); }
      return;
    }
    if (this.dialog) {
      const d = this.dialog; d.t++;
      const full = d.lines[d.i];
      if (d.chars < full.length) { d.chars += 1.2; if (d.t % 3 === 0) sfx('text'); }
      if (this.input.pressed('jump') || this.input.pressed('attack') || this.input.pressed('up')) {
        if (d.chars < full.length) d.chars = full.length;
        else if (++d.i >= d.lines.length) this.dialog = null;
        else d.chars = 0;
      }
      return;
    }
    if (this.travel) {
      const tr = this.travel; tr.t++;
      if (tr.t === 40) {
        const dest = this.byId[tr.to];
        const el = dest.ents.find((e) => e.type === 'elevator' && e.to === tr.from) || dest.ents.find((e) => e.type === 'elevator');
        this.hero.x = el.x * 16 + 8 - 6; this.hero.y = el.y * 16 - 36; this.hero.vx = this.hero.vy = 0;
        this.enterRoom(dest); this.snapCamera();
      }
      if (tr.t >= 80) this.travel = null;
      return;
    }
    if (this.input.pressed('start') || this.input.pressed('map')) { this.state = 'pause'; sfx('select'); return; }

    this.save.time++;
    if (this.stop > 0) { this.stop--; return; }
    if (this.fade > 0) this.fade--;
    if (this.shakeT > 0) this.shakeT--; else this.shakeP = 0;
    if (this.banner) { this.banner.t++; if (this.banner.t > 260) this.banner = null; }
    if (this.bossBanner) { this.bossBanner.t++; if (this.bossBanner.t > 200) this.bossBanner = null; }
    if (this.sub) this.sub.t--;
    if (this.boss && this.boss.state !== 'sleep') this.bossBarT++;

    const h = this.hero;
    if (this.respawnT > 0) { if (--this.respawnT === 0) { h.x = h.lastSafe.x; h.y = h.lastSafe.y; h.vx = h.vy = 0; h.hurtT = 0; this.fade = 12; } }
    else h.update(this);
    this.checkTransition();

    for (const e of this.enemies) {
      e.update(this);
      if (!e.dead && !e.harmless && overlap(e, h)) this.hurtHero(e.damage, e.cx);
      if (e.y > this.room.H * 16 + 40) e.dead = true;
    }
    this.enemies = this.enemies.filter((e) => !e.dead);
    if (this.boss) this.boss.update(this);
    for (const p of this.projectiles) p.update(this);
    this.projectiles = this.projectiles.filter((p) => !p.dead);
    for (const o of this.orbs) o.update(this);
    this.orbs = this.orbs.filter((o) => !o.dead);

    // objetos: interacción y recogida
    this.near = null;
    for (const o of this.objs) {
      o.update(this);
      if (o.dead || o.hidden) continue;
      if (o instanceof Pickup) { if (overlap(o.box, h)) this.collect(o); }
      else if (o.near(h) && h.onGround) { this.near = o; }
    }
    this.objs = this.objs.filter((o) => !o.dead);
    if (this.near && this.input.pressed('up')) this.interact(this.near);

    this.fx.update();
    this.updateCamera();
    if (this.endingT) { this.endingT++; if (this.endingT > 420 && !this.objs.some((o) => o.type === 'memory')) this.beginEnding(); if (this.endingT > 900) this.beginEnding(); }
  }

  updateCamera() {
    const h = this.hero, r = this.room;
    this.look = (this.look || 0) + ((h.face * 40) - (this.look || 0)) * 0.03;
    const tx = Math.max(0, Math.min(r.W * 16 - W, h.cx - W / 2 + this.look));
    const ty = Math.max(0, Math.min(r.H * 16 - H, h.cy - H / 2 - 16));
    this.camX += (tx - this.camX) * 0.1; this.camY += (ty - this.camY) * (h.vy > 4 ? 0.2 : 0.1);
  }

  // ───────────── Título, intro y final ─────────────
  titleOptions() { return this.saved && !this.saved.finished ? ['CONTINUAR', 'NUEVA PARTIDA'] : ['NUEVA PARTIDA']; }
  updateTitle() {
    const opts = this.titleOptions();
    if (this.input.pressed('up') || this.input.pressed('down')) { this.menu = (this.menu + 1) % opts.length; sfx('select'); }
    if (this.input.pressed('jump') || this.input.pressed('start') || this.input.pressed('attack')) {
      unlockAudio(); sfx('save');
      if (opts[this.menu] === 'CONTINUAR') this.start(true);
      else { this.state = 'intro'; this.introT = 0; playMusic('title'); }
    }
  }
  updateIntro() {
    this.introT++;
    if (this.introT > 20 && (this.input.pressed('jump') || this.input.pressed('start') || this.input.pressed('attack'))) {
      if (this.introT < INTRO.length * 150) this.introT = INTRO.length * 150; else { try { localStorage.removeItem(SAVE_KEY); } catch {} this.saved = null; this.start(false); }
    }
    if (this.introT > INTRO.length * 150 + 300) { try { localStorage.removeItem(SAVE_KEY); } catch {} this.saved = null; this.start(false); }
  }
  beginEnding() {
    if (this.state === 'ending') return;
    this.state = 'ending'; this.endT = 0; this.endLines = ending(this.save.memories.length);
    this.save.finished = true; this.persist(); playMusic('ending'); setAmbience(null);
  }
  updateEnding() {
    this.endT++;
    if (this.endT > this.endLines.length * 180 + 400 && (this.input.pressed('jump') || this.input.pressed('start'))) { this.state = 'title'; this.saved = loadSave(); this.menu = 0; }
  }

  // ───────────── Dibujo ─────────────
  draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    if (this.state === 'title') return this.drawTitle();
    if (this.state === 'intro') return this.drawIntro();
    if (this.state === 'ending') return this.drawEnding();
    this.drawWorld();
    drawHUD(ctx, this);
    if (this.banner) drawZoneBanner(ctx, this.banner.zone, this.banner.t);
    if (this.bossBanner) this.drawBossBanner();
    drawSubtitle(ctx, this.sub);
    if (this.near && !this.dialog && !this.popup && this.state === 'play') drawPrompt(ctx, this.near.x - this.camX, this.near.y - 50 - this.camY, this.near.prompt, this.t);
    if (this.dialog) drawDialog(ctx, this.dialog);
    if (this.popup) drawPopup(ctx, this.popup, this.t);
    if (this.state === 'pause') drawMap(ctx, this, this.t);
    if (this.state === 'dead') {
      ctx.fillStyle = `rgba(4,2,8,${Math.min(0.9, this.deadT / 80)})`; ctx.fillRect(0, 0, W, H);
      if (this.deadT > 50) text(ctx, 'TU MEMORIA SE APAGA', W / 2, H / 2, 16, '#c06060', 'center', { font: FONT_TITLE, weight: 'bold' });
    }
    let f = this.fade / 10;
    if (this.travel) f = this.travel.t < 40 ? this.travel.t / 40 : 1 - (this.travel.t - 40) / 40;
    if (f > 0) { ctx.fillStyle = `rgba(4,2,8,${Math.min(1, f)})`; ctx.fillRect(0, 0, W, H); }
  }

  drawWorld() {
    const r = this.room, z = ZONES[r.zone], c = this.cache[r.id], t = this.t;
    let sx = 0, sy = 0;
    if (this.shakeT > 0) { sx = Math.round((Math.random() * 2 - 1) * this.shakeP); sy = Math.round((Math.random() * 2 - 1) * this.shakeP); }
    const cx = Math.round(this.camX) - sx, cy = Math.round(this.camY) - sy;
    // fondo
    if (c.back) ctx.drawImage(c.back, -cx, -cy);
    else drawParallax(ctx, this.bgs[r.zone], r.px + cx, cy, r.H * 16);
    const lights = [];
    const pushL = (L) => { if (!L) return; const x = L.x - cx, y = L.y - cy; if (x < -L.r || x > W + L.r || y < -L.r || y > H + L.r) return; lights.push({ ...L, x, y }); };
    // decorados de fondo
    for (const d of this.decos) {
      if (d.layer !== 'bg') continue;
      this.drawDeco(d, cx, cy, t, pushL);
    }
    if (this.boss && this.boss.behind) this.boss.draw(ctx, cx, cy, t);
    ctx.drawImage(c.tiles, -cx, -cy);
    this.drawGates(cx, cy);
    for (const o of this.objs) { o.draw(ctx, cx, cy, t); for (const L of o.lights()) pushL(L); }
    for (const e of this.enemies) { e.draw(ctx, cx, cy, t); for (const L of e.lights()) pushL(L); }
    if (this.boss && !this.boss.behind && this.boss.state !== 'dead') this.boss.draw(ctx, cx, cy, t);
    if (this.boss) for (const L of this.boss.lights()) pushL(L);
    const h = this.hero;
    if (!(this.respawnT > 0 && this.respawnT < 16)) h.draw(ctx, cx, cy, t);
    if (!h.dead) { pushL({ x: h.cx + h.face * 3, y: h.y + 6, r: 54, col: '#7fe8ff', i: 0.9 }); pushL({ x: h.cx, y: h.cy, r: 110, col: '#9ab0c8', i: 0.55, add: 0.2 }); }
    for (const p of this.projectiles) { p.draw(ctx, cx, cy, t); pushL(p.light()); }
    for (const o of this.orbs) { o.draw(ctx, cx, cy); pushL(o.light()); }
    if (this.boss && this.boss.drawFront) this.boss.drawFront(ctx, cx, cy);
    for (const d of this.decos) if (d.layer === 'fg') this.drawDeco(d, cx, cy, t, pushL);
    this.fx.draw(ctx, cx, cy, (s, x, y, col) => text(ctx, s, x, y, 8, col, 'center'));
    this.fx.ambient(z.particles, t, this.camX, this.camY);
    this.fx.drawAmbient(ctx);
    const extra = this.boss?.extraDark?.() || 0;
    postProcess(ctx, cv, z, lights, t, r.px + cx, cy, { extraDark: extra });
  }

  drawDeco(d, cx, cy, t, pushL) {
    const def = d.def, X = d.X - cx, Y = d.Y - cy, img = def.img;
    const x0 = Math.round(X - def.ax), y0 = Math.round(Y - (def.hang ? 0 : def.ay) + (def.hang ? 0 : 0));
    if (x0 > W + 20 || x0 + img.width < -20 || y0 > H + 20 || y0 + img.height < -20) {
      for (const L of def.light || []) pushL({ ...L, x: d.X + L.dx, y: d.Y + L.dy, r: L.r });
      return;
    }
    if (def.dim) ctx.globalAlpha = def.dim;
    if (def.sway) { const s = Math.round(Math.sin(t * 0.02 + d.X) * 1.5); ctx.drawImage(img, x0 + s, y0); }
    else ctx.drawImage(img, x0, y0);
    ctx.globalAlpha = 1;
    if (def.anim) def.anim(ctx, X, Y, t, img);
    for (const L of def.light || []) {
      let i = 1;
      if (L.flicker) i = 1 - L.flicker + Math.random() * L.flicker * 2;
      if (L.pulse) i = 0.3 + Math.max(0, Math.sin(t * 0.12)) * 0.9;
      pushL({ x: d.X + L.dx, y: d.Y + L.dy, r: L.r * (0.9 + i * 0.1), col: L.col, i });
    }
  }

  drawGates(cx, cy) {
    const r = this.room;
    for (const d of r.doors) {
      if (d.side !== 'L' && d.side !== 'R') continue;
      const i = d.side === 'L' ? 1 : r.W - 2;
      if (r.tiles[d.start][i] !== 'G') continue;
      const x = i * 16 - cx, y = d.start * 16 - cy;
      ctx.fillStyle = '#0b0810'; ctx.fillRect(x, y, 16, d.size * 16);
      for (let k = 1; k < 16; k += 5) { ctx.fillStyle = '#5a5e68'; ctx.fillRect(x + k, y, 3, d.size * 16); ctx.fillStyle = '#a8aeb8'; ctx.fillRect(x + k, y, 1, d.size * 16); }
      ctx.fillStyle = '#8a1f2a'; ctx.fillRect(x, y + 8, 16, 3);
    }
  }

  drawBossBanner() {
    const b = this.bossBanner, a = Math.min(1, b.t / 20, (200 - b.t) / 30);
    ctx.globalAlpha = Math.max(0, a);
    const y = 196;
    const gr = ctx.createLinearGradient(0, 0, W, 0); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.5, 'rgba(20,0,0,0.7)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gr; ctx.fillRect(0, y - 22, W, 46);
    text(ctx, b.name, W / 2, y - 4, 20, '#e8c8a0', 'center', { font: FONT_TITLE, weight: 'bold' });
    text(ctx, b.title, W / 2, y + 16, 8, '#b09080', 'center');
    ctx.globalAlpha = 1;
  }

  drawTitle() {
    const z = ZONES.jardines;
    if (!this.bgs.jardines) this.bgs.jardines = buildParallax('jardines', z);
    drawParallax(ctx, this.bgs.jardines, this.t * 0.4, 40, 400);
    ctx.fillStyle = 'rgba(10,6,16,0.45)'; ctx.fillRect(0, 0, W, H);
    postProcess(ctx, cv, { ...z, dark: 0.3 }, [{ x: 360, y: 70, r: 120, col: '#ffd890' }], this.t, this.t * 0.4, 0, {});
    const glow = glowSprite(64, '#ffb060');
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.25; ctx.drawImage(glow, W / 2 - 160, 10, 320, 110); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    text(ctx, 'PARADISE', W / 2, 62, 44, '#f2e2c4', 'center', { font: FONT_TITLE, weight: 'bold', shadow: '#2a1408' });
    ctx.fillStyle = '#d8a43a'; ctx.fillRect(W / 2 - 110, 90, 220, 1);
    text(ctx, 'LA HACIENDA NÁPOLES', W / 2, 102, 12, '#d8c0a0', 'center', { font: FONT_TITLE });
    const opts = this.titleOptions();
    opts.forEach((o, k) => { const sel = k === this.menu; text(ctx, (sel ? '›  ' : '') + o + (sel ? '  ‹' : ''), W / 2, 150 + k * 16, 10, sel ? '#ffffff' : '#9a90a4', 'center'); });
    if ((this.t >> 5) % 2) text(ctx, this.input.device === 'touch' ? 'PULSA A' : 'PULSA Z O ENTER', W / 2, 200, 8, '#7fe8ff', 'center');
    text(ctx, 'PROTOTIPO · ARTE PROVISIONAL', 8, H - 10, 8, '#6a6274');
  }

  drawIntro() {
    ctx.fillStyle = '#05030a'; ctx.fillRect(0, 0, W, H);
    INTRO.forEach((l, k) => {
      const t0 = k * 150, a = Math.max(0, Math.min(1, (this.introT - t0) / 60));
      if (a <= 0) return;
      ctx.globalAlpha = a;
      l.split('\n').forEach((ln, j) => text(ctx, ln, W / 2, 60 + k * 30 + j * 12, 10, k === INTRO.length - 1 ? '#ffd8a0' : '#d8d0c4', 'center', { font: FONT_TITLE }));
    });
    ctx.globalAlpha = 1;
    if (this.introT > INTRO.length * 150 && (this.t >> 5) % 2) text(ctx, 'PULSA PARA DESPERTAR', W / 2, H - 24, 8, '#7fe8ff', 'center');
  }

  drawEnding() {
    ctx.fillStyle = '#05030a'; ctx.fillRect(0, 0, W, H);
    let y = 40;
    this.endLines.forEach((l, k) => {
      const a = Math.max(0, Math.min(1, (this.endT - k * 180) / 80));
      const isLast = l.startsWith('—'), size = isLast ? 14 : 10;
      const ls = wrap(l, size, W - 80, { font: FONT_TITLE });
      if (a > 0) {
        ctx.globalAlpha = a;
        ls.forEach((ln, j) => text(ctx, ln, W / 2, y + j * (size + 3), size, isLast ? '#ffd8a0' : '#d8d0c4', 'center', { font: FONT_TITLE }));
      }
      y += ls.length * (size + 3) + 10;
    });
    ctx.globalAlpha = 1;
    const tEnd = this.endLines.length * 180 + 120;
    if (this.endT > tEnd) {
      ctx.globalAlpha = Math.min(1, (this.endT - tEnd) / 80);
      text(ctx, 'FIN', W / 2, 220, 18, '#efe2c8', 'center', { font: FONT_TITLE, weight: 'bold' });
      const m = Math.floor(this.save.time / 3600), s = Math.floor(this.save.time / 60) % 60;
      text(ctx, `RECUERDOS ${this.save.memories.length}/8 · NÚCLEOS ${this.save.cores.length}/3 · ${m}:${String(s).padStart(2, '0')}`, W / 2, 244, 8, '#8a8296', 'center');
      ctx.globalAlpha = 1;
    }
  }
}

// ───────────── Arranque a paso fijo de 60 Hz ─────────────
if ('ontouchstart' in window || navigator.maxTouchPoints > 0) document.body.classList.add('touch');
resize();
const game = new Game();
window.__game = game;
let acc = 0, last = performance.now();
function frame(now) {
  acc += Math.min(100, now - last); last = now;
  let n = 0;
  while (acc >= 1000 / 60 && n < 4) { game.update(); acc -= 1000 / 60; n++; }
  game.draw();
  requestAnimationFrame(frame);
}
// las fuentes web cambian el texto cacheado: esperamos un momento a que carguen
const fontsReady = document.fonts ? Promise.all([document.fonts.load('bold 20px "Cinzel"'), document.fonts.load('10px "Cinzel"'), document.fonts.load('9px "Pixelify Sans"')]).catch(() => {}) : Promise.resolve();
Promise.race([fontsReady, new Promise((r) => setTimeout(r, 2500))]).then(() => requestAnimationFrame(frame));

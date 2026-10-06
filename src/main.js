// LUMBRE: un metroidvania de pixel art al estilo Game Boy Advance.
import { W, H, TILE, PAL, gba, makeCanvas, drawText, drawTextC, textWidth } from './gfx.js';
import { SHRINE, FLAME, TORCH, ALTAR, GLOW, HUD_FLAME, HUD_FLAME_EMPTY, PLAYER, ORB, ORB_FIRE } from './art.js';
import { AREAS, buildTileset, renderRoomTiles, buildBackground, drawBackground } from './tiles.js';
import { ROOMS, loadRoom, roomAt, SCREEN_W, SCREEN_H } from './world.js';
import { Player, Crawler, Bat, Spitter, Boss, Pickup, overlap } from './entities.js';
import { Input } from './input.js';
import { sfx, unlockAudio, playMusic, toggleMute, MUSIC, stopMusic } from './audio.js';

const canvas = document.getElementById('screen');
const ctx = canvas.getContext('2d');
canvas.width = W; canvas.height = H;
ctx.imageSmoothingEnabled = false;

function resize() {
  const touch = document.body.classList.contains('touch');
  const availH = innerHeight * (touch && innerHeight > innerWidth ? 0.55 : 1);
  const s = Math.max(1, Math.min(innerWidth / W, availH / H));
  const k = s >= 2 ? Math.floor(s) : s;
  canvas.style.width = `${W * k}px`;
  canvas.style.height = `${H * k}px`;
}
addEventListener('resize', resize);

const SAVE_KEY = 'lumbre-save-v1';
const TOTAL_ITEMS = 4; // 2 vasijas + 2 reliquias

function newSave() {
  return { room: 'santuario', sx: null, sy: null, maxHp: 4, abilities: { double: false, dash: false }, taken: [], bossDead: false, time: 0, visited: ['santuario'] };
}
function loadSave() {
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); return s && s.room ? s : null; } catch { return null; }
}

class Game {
  constructor() {
    this.input = new Input();
    this.input.onAny = () => unlockAudio();
    addEventListener('pointerdown', () => unlockAudio());
    this.rooms = ROOMS.map(loadRoom);
    this.tilesets = {};
    this.backgrounds = {};
    for (const k of Object.keys(AREAS)) { this.tilesets[k] = buildTileset(k); this.backgrounds[k] = buildBackground(k); }
    this.state = 'title';
    this.menu = 0;
    this.t = 0;
    this.particles = [];
    this.fade = 0;
    this.darkness = makeCanvas(W, H);
    this.saved = loadSave();
  }

  // ---------- Partida ----------
  start(fromSave) {
    this.save = fromSave && this.saved ? JSON.parse(JSON.stringify(this.saved)) : newSave();
    this.save.visited ||= [this.save.room];
    const room = this.rooms.find((r) => r.id === this.save.room) || this.rooms[0];
    let x, y;
    if (this.save.sx != null) { x = this.save.sx; y = this.save.sy; }
    else {
      const p = room.spawns.find((s) => s.type === 'P') || room.spawns.find((s) => s.type === 'S');
      x = p.i * 16 + 4; y = p.j * 16;
    }
    this.player = new Player(x, y, this.save);
    this.enterRoom(room, true);
    this.state = 'play';
    this.fade = 30;
    this.banner = { text: AREAS[room.area].name, t: 150 };
    this.toast = null;
  }

  enterRoom(room, snap) {
    const prevArea = this.room?.area;
    this.room = room;
    // Copia de tiles por si se rompen muros o se cierran puertas
    room.tiles = room.tiles.map((r) => r.slice());
    if (this.broken) for (const k of this.broken) { const [id, i, j] = k.split(','); if (id === room.id) room.tiles[+j][+i] = '.'; }
    this.enemies = []; this.projectiles = []; this.pickups = []; this.shrines = []; this.altar = null;
    for (const s of room.spawns) {
      const x = s.i * 16, y = s.j * 16;
      switch (s.type) {
        case 'c': this.enemies.push(new Crawler(x, y)); break;
        case 'b': this.enemies.push(new Bat(x, y)); break;
        case 'f': this.enemies.push(new Spitter(x, y)); break;
        case 'B': if (!this.save.bossDead) { this.boss = new Boss(x, y); this.enemies.push(this.boss); } break;
        case 'S': this.shrines.push({ x, y: y - 16, w: 16, h: 32 }); break;
        case 'A': this.altar = { x: x - 8, y: y - 8, w: 32, h: 24 }; break;
        case 'D': case 'H': case '+': {
          const id = `${room.id}:${s.i},${s.j}`;
          if (!this.save.taken.includes(id)) {
            const type = s.type === 'D' ? 'double' : s.type === 'H' ? 'dash' : 'heart';
            this.pickups.push(new Pickup(type, x + 3, y + 3, id));
          }
          break;
        }
      }
    }
    if (!room.boss) this.boss = null;
    this.tileCanvas = renderRoomTiles(room, this.tilesets[room.area]);
    this.motes = Array.from({ length: 14 }, () => ({ x: Math.random() * room.w * 16, y: Math.random() * room.h * 16, p: Math.random() * 6 }));
    if (!this.save.visited.includes(room.id)) this.save.visited.push(room.id);
    if (prevArea && prevArea !== room.area) this.banner = { text: AREAS[room.area].name, t: 150 };
    if (!room.boss || this.save.bossDead) playMusic(MUSIC[room.area]);
    else stopMusic();
    if (snap) this.snapCamera();
  }

  // Depuración: __game.warp('cavernas')
  warp(id, i, j) {
    const room = this.rooms.find((r) => r.id === id);
    const s = room.spawns.find((q) => q.type === 'S' || q.type === 'P');
    this.player.x = i != null ? i * 16 + 4 : s ? s.i * 16 + 4 : 24;
    this.player.y = j != null ? j * 16 : s ? s.j * 16 : room.h * 16 - 48;
    this.player.lastSafe = { x: this.player.x, y: this.player.y };
    this.respawnT = 0;
    this.enterRoom(room, true);
  }

  snapCamera() {
    const p = this.player, r = this.room;
    this.camX = Math.max(0, Math.min(r.w * 16 - W, p.cx - W / 2));
    this.camY = Math.max(0, Math.min(r.h * 16 - H, p.cy - H / 2));
  }

  checkTransition() {
    const p = this.player, r = this.room;
    const lx = p.cx, ly = p.cy;
    if (lx >= 0 && ly >= 0 && lx < r.w * 16 && ly < r.h * 16) return;
    const wx = r.px + lx, wy = r.py + ly;
    const next = roomAt(this.rooms, wx, wy);
    if (!next) { p.x = Math.max(0, Math.min(r.w * 16 - p.w, p.x)); return; }
    const goingUp = ly < 0;
    p.x += r.px - next.px; p.y += r.py - next.py;
    p.lastSafe = { x: p.x, y: p.y };
    p.scarf.forEach((s) => { s.x += r.px - next.px; s.y += r.py - next.py; });
    p.trail = [];
    if (goingUp) { p.vy = Math.min(p.vy, -5.8); p.noCut = true; p.airJumps = p.abilities.double ? 1 : 0; }
    this.enterRoom(next, true);
    this.fade = 8;
  }

  // ---------- Eventos ----------
  particle(x, y, vx, vy, life, color, grav = 0.05) {
    if (this.particles.length > 300) return;
    this.particles.push({ x, y, vx, vy, life, max: life, color: gba(color), grav });
  }
  burst(x, y, n, color) {
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2, s = 0.5 + Math.random() * 2;
      this.particle(x, y, Math.cos(a) * s, Math.sin(a) * s - 0.5, 15 + Math.random() * 15, color, 0.08);
    }
  }
  shake(power, frames) { this.shakeP = Math.max(this.shakeP || 0, power); this.shakeT = Math.max(this.shakeT || 0, frames); }
  hitstop(f) { this.stop = Math.max(this.stop || 0, f); }

  hurtPlayer(dmg, fromX, spike) {
    const p = this.player;
    if (!p.hurt(this, dmg, fromX)) return;
    this.shake(3, 12); this.hitstop(5);
    this.burst(p.cx, p.cy, 10, PAL.r);
    if (p.dead) { this.state = 'dead'; this.deadT = 0; stopMusic(); return; }
    if (spike) this.respawnT = 26;
  }

  breakTile(i, j) {
    this.room.tiles[j][i] = '.';
    (this.broken ||= new Set()).add(`${this.room.id},${i},${j}`);
    this.tileCanvas = renderRoomTiles(this.room, this.tilesets[this.room.area]);
    sfx('break'); this.shake(2, 8);
    this.burst(i * 16 + 8, j * 16 + 8, 14, this.tilesetColor());
  }
  tilesetColor() { return AREAS[this.room.area].stone[3]; }

  collect(pk) {
    const p = this.player;
    if (pk.type === 'health') {
      if (p.hp < p.maxHp) { p.hp++; sfx('heal'); }
      return;
    }
    this.save.taken.push(pk.id);
    this.burst(pk.x + 5, pk.y + 5, 24, PAL.y);
    if (pk.type === 'heart') {
      this.save.maxHp++; p.maxHp++; p.hp = p.maxHp;
      sfx('pickup');
      this.showMessage(['VASIJA DE BRASAS', 'TU LLAMA CRECE: +1 VIDA']);
    } else if (pk.type === 'double') {
      this.save.abilities.double = true;
      sfx('relic');
      this.showMessage(['ALAS DE CENIZA', 'PULSA SALTAR EN EL AIRE', 'PARA HACER UN DOBLE SALTO']);
    } else if (pk.type === 'dash') {
      this.save.abilities.dash = true;
      sfx('relic');
      this.showMessage(['ZARPAZO DE BRASA', 'PULSA C / L PARA', 'IMPULSARTE HACIA DELANTE']);
    }
  }

  showMessage(lines) { this.message = { lines, t: 0 }; this.state = 'message'; }

  doSave(shrine) {
    const p = this.player;
    this.save.room = this.room.id;
    this.save.sx = shrine.x + 4; this.save.sy = shrine.y + 16;
    p.hp = p.maxHp;
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.save)); } catch {}
    this.saved = JSON.parse(JSON.stringify(this.save));
    sfx('save');
    this.toast = { text: 'PARTIDA GUARDADA', t: 120 };
    for (let k = 0; k < 20; k++) this.particle(shrine.x + 8, shrine.y + 4, (Math.random() - 0.5) * 2, -Math.random() * 2, 40, k % 2 ? PAL.y : PAL.o, -0.01);
  }

  onBossWake() {
    // Cierra las puertas de la arena
    const r = this.room;
    for (let j = 6; j <= 8; j++) { r.tiles[j][0] = '#'; r.tiles[j][r.w - 1] = '#'; }
    this.tileCanvas = renderRoomTiles(r, this.tilesets[r.area]);
    sfx('door');
    this.banner = { text: 'COLOSO DE MUSGO', t: 140, boss: true };
    setTimeout(() => playMusic(MUSIC.boss), 900);
  }
  onBossDying() { stopMusic(); }
  onBossDead(b) {
    this.save.bossDead = true;
    const r = this.room;
    for (let j = 6; j <= 8; j++) { r.tiles[j][0] = '.'; r.tiles[j][r.w - 1] = '.'; }
    this.tileCanvas = renderRoomTiles(r, this.tilesets[r.area]);
    sfx('door');
    this.burst(b.x + 12, b.y + 14, 40, PAL.y);
    this.player.hp = this.player.maxHp;
    this.toast = { text: 'EL CAMINO ESTÁ ABIERTO', t: 160 };
    playMusic(MUSIC.keep);
  }

  // ---------- Bucle ----------
  update() {
    this.input.update();
    this.t++;
    if (this.input.pressed('mute')) { const m = toggleMute(); this.toast = { text: m ? 'SONIDO: NO' : 'SONIDO: SÍ', t: 60 }; }

    if (this.state === 'title') return this.updateTitle();
    if (this.state === 'intro') return this.updateIntro();
    if (this.state === 'message') {
      this.message.t++;
      if (this.message.t > 40 && (this.input.pressed('jump') || this.input.pressed('attack') || this.input.pressed('start'))) { this.state = 'play'; sfx('select'); }
      return;
    }
    if (this.state === 'pause') {
      if (this.input.pressed('start') || this.input.pressed('map')) { this.state = 'play'; sfx('select'); }
      return;
    }
    if (this.state === 'dead') {
      this.deadT++;
      this.updateParticles();
      if (this.deadT > 150) { this.saved = loadSave(); this.start(!!this.saved); }
      return;
    }
    if (this.state === 'ending') {
      this.endT++;
      this.updateParticles();
      if (this.endT % 4 === 0) this.particle(Math.random() * W + this.camX, this.camY + H, (Math.random() - 0.5) * 0.3, -0.5 - Math.random(), 160, Math.random() < 0.5 ? PAL.o : PAL.y, -0.002);
      if (this.endT > 400 && (this.input.pressed('jump') || this.input.pressed('start'))) { this.state = 'title'; this.saved = loadSave(); }
      return;
    }

    if (this.input.pressed('start') || this.input.pressed('map')) { this.state = 'pause'; sfx('select'); return; }

    this.save.time++;
    if (this.stop > 0) { this.stop--; return; }
    if (this.fade > 0) this.fade--;

    const p = this.player;
    if (this.respawnT > 0) {
      if (--this.respawnT === 0) { p.x = p.lastSafe.x; p.y = p.lastSafe.y; p.vx = p.vy = 0; p.hurtT = 0; this.fade = 10; }
    } else {
      p.update(this);
    }
    this.checkTransition();

    for (const e of this.enemies) {
      e.update(this);
      if (!e.dead && e.state !== 'sleep' && e.state !== 'dying' && overlap(e, p)) this.hurtPlayer(e.damage, e.x + e.w / 2);
    }
    this.enemies = this.enemies.filter((e) => !e.dead);
    for (const pr of this.projectiles) pr.update(this);
    this.projectiles = this.projectiles.filter((x) => !x.dead);
    for (const pk of this.pickups) pk.update(this);
    this.pickups = this.pickups.filter((x) => !x.dead);

    // Santuarios: arriba para guardar
    this.nearShrine = null;
    for (const s of this.shrines) {
      if (overlap(s, p)) {
        this.nearShrine = s;
        if (this.input.pressed('up')) this.doSave(s);
      }
    }
    if (this.altar && overlap(this.altar, p) && this.input.pressed('up')) this.beginEnding();
    this.nearAltar = this.altar && overlap(this.altar, p);

    this.updateParticles();
    this.updateCamera();
    if (this.banner && --this.banner.t <= 0) this.banner = null;
    if (this.toast && --this.toast.t <= 0) this.toast = null;
    if (this.shakeT > 0) this.shakeT--;
  }

  updateParticles() {
    for (const q of this.particles) { q.x += q.vx; q.y += q.vy; q.vy += q.grav; q.vx *= 0.98; q.life--; }
    this.particles = this.particles.filter((q) => q.life > 0);
  }

  updateCamera() {
    const p = this.player, r = this.room;
    const tx = Math.max(0, Math.min(r.w * 16 - W, p.cx - W / 2 + p.facing * 16));
    const ty = Math.max(0, Math.min(r.h * 16 - H, p.cy - H / 2 - 8));
    this.camX += (tx - this.camX) * 0.12;
    this.camY += (ty - this.camY) * 0.12;
  }

  beginEnding() {
    this.state = 'ending'; this.endT = 0;
    sfx('relic');
    playMusic(MUSIC.end);
    this.save.finished = true;
    this.save.room = 'altar';
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.save)); } catch {}
  }

  updateTitle() {
    const opts = this.titleOptions();
    if (this.input.pressed('up') || this.input.pressed('down')) { this.menu = (this.menu + 1) % opts.length; sfx('select'); }
    if (this.input.pressed('jump') || this.input.pressed('start') || this.input.pressed('attack')) {
      unlockAudio();
      sfx('save');
      if (opts[this.menu] === 'CONTINUAR') this.start(true);
      else { this.state = 'intro'; this.introT = 0; playMusic(MUSIC.garden); }
    }
  }
  titleOptions() { return this.saved && !this.saved.finished ? ['CONTINUAR', 'NUEVA PARTIDA'] : ['NUEVA PARTIDA']; }

  updateIntro() {
    this.introT++;
    if (this.introT > 30 && (this.input.pressed('jump') || this.input.pressed('start') || this.input.pressed('attack'))) {
      if (this.introT < 520) this.introT = 520; else { try { localStorage.removeItem(SAVE_KEY); } catch {} this.start(false); }
    }
    if (this.introT > 900) { try { localStorage.removeItem(SAVE_KEY); } catch {} this.start(false); }
  }

  // ---------- Dibujo ----------
  draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    if (this.state === 'title') return this.drawTitle();
    if (this.state === 'intro') return this.drawIntro();
    this.drawWorld();
    this.drawHUD();
    if (this.state === 'pause') this.drawMap();
    if (this.state === 'message') this.drawMessage();
    if (this.state === 'dead') this.drawDead();
    if (this.state === 'ending') this.drawEnding();
    if (this.fade > 0) { ctx.fillStyle = gba(PAL.k); ctx.globalAlpha = Math.min(1, this.fade / 8); ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
  }

  drawWorld() {
    const r = this.room, area = AREAS[r.area];
    let sx = 0, sy = 0;
    if (this.shakeT > 0) { sx = ((Math.random() * 2 - 1) * this.shakeP) | 0; sy = ((Math.random() * 2 - 1) * this.shakeP) | 0; }
    const cx = Math.round(this.camX) - sx, cy = Math.round(this.camY) - sy;
    drawBackground(ctx, this.backgrounds[r.area], r.px + cx, cy, this.t);

    // Motas ambientales (luciérnagas, polvo de cristal, ascuas)
    ctx.fillStyle = gba(area.mote);
    for (const m of this.motes) {
      m.p += 0.02;
      m.x += Math.sin(m.p) * 0.2 + (r.area === 'keep' ? 0.05 : 0);
      m.y += r.area === 'keep' ? -0.25 : Math.cos(m.p * 0.7) * 0.15;
      if (m.y < 0) m.y = r.h * 16; if (m.x < 0) m.x = r.w * 16; if (m.x > r.w * 16) m.x = 0;
      if (Math.sin(m.p * 3) > -0.3) ctx.fillRect(Math.round(m.x - cx), Math.round(m.y - cy), 1, 1);
    }

    this.drawDecor(cx, cy, false);
    ctx.drawImage(this.tileCanvas, -cx, -cy);

    for (const s of this.shrines) {
      ctx.drawImage(SHRINE, s.x - cx, s.y - cy);
      ctx.drawImage(FLAME[Math.floor(this.t / 6) % 3], s.x + 4 - cx, s.y + 3 + Math.round(Math.sin(this.t * 0.05) * 1.5) - cy);
    }
    if (this.altar) {
      const a = this.altar;
      ctx.drawImage(ALTAR, a.x - cx, a.y - cy);
      if (this.state === 'ending') {
        const f = FLAME[Math.floor(this.t / 5) % 3];
        ctx.drawImage(f, a.x + 8 - cx, a.y - 10 - cy, 16, 14);
      }
    }
    for (const pk of this.pickups) pk.draw(ctx, cx, cy);
    for (const e of this.enemies) e.draw(ctx, cx, cy);
    if (!(this.state === 'dead' && this.deadT > 50) && !(this.respawnT > 0 && this.respawnT < 14)) this.player.draw(ctx, cx, cy);
    for (const pr of this.projectiles) pr.draw(ctx, cx, cy);
    for (const q of this.particles) {
      ctx.fillStyle = q.color;
      ctx.fillRect(Math.round(q.x - cx), Math.round(q.y - cy), q.life > q.max * 0.5 ? 2 : 1, q.life > q.max * 0.5 ? 2 : 1);
    }
    this.drawDecor(cx, cy, true);
    this.drawLighting(cx, cy);

    // Indicadores de interacción
    if (this.nearShrine && this.state === 'play') drawTextC(ctx, '^ GUARDAR', this.nearShrine.x + 8 - cx, this.nearShrine.y - 4 - cy, PAL.y);
    if (this.nearAltar && this.state === 'play') drawTextC(ctx, '^ ENCENDER', this.altar.x + 16 - cx, this.altar.y - 2 - cy, PAL.y);
    if (r.id === 'santuario' && this.state === 'play') {
      const keyb = this.input.lastDevice !== 'touch';
      drawTextC(ctx, keyb ? 'FLECHAS: MOVER' : 'CRUCETA: MOVER', 120 - cx, 66 - cy, PAL.g);
      drawTextC(ctx, keyb ? 'Z: SALTAR   X: ATACAR' : 'A: SALTAR   B: ATACAR', 120 - cx, 74 - cy, PAL.g);
      drawTextC(ctx, keyb ? 'ENTER: MAPA' : 'START: MAPA', 120 - cx, 82 - cy, PAL.g);
    }
  }

  drawDecor(cx, cy, front) {
    const r = this.room, area = AREAS[r.area];
    for (const d of r.decor) {
      const x = d.i * 16 - cx, y = d.j * 16 - cy;
      if (x < -32 || x > W + 32 || y < -48 || y > H + 32) continue;
      if (d.type === 'v' && !front) {
        // Enredadera colgante con balanceo
        const len = 14 + ((d.i * 7 + d.j * 3) % 18);
        for (let k = 0; k < len; k++) {
          const sw = Math.round(Math.sin(this.t * 0.03 + k * 0.25 + d.i) * (k / len) * 2);
          ctx.fillStyle = gba(area.accent[k % 5 === 0 ? 2 : 1]);
          ctx.fillRect(x + 7 + sw, y + k, 1, 1);
          if (k % 4 === 2) { ctx.fillStyle = gba(area.accent[2]); ctx.fillRect(x + 8 + sw, y + k, 1, 1); }
          if (k % 6 === 4) { ctx.fillStyle = gba(area.accent[1]); ctx.fillRect(x + 6 + sw, y + k, 1, 1); }
        }
      } else if (d.type === 't' && !front) {
        ctx.drawImage(TORCH, x + 4, y + 6);
        ctx.drawImage(FLAME[Math.floor(this.t / 5 + d.i) % 3], x + 4, y - 1);
      } else if (d.type === 'g' && front) {
        for (let k = 0; k < 5; k++) {
          const bx = x + 2 + k * 3, h = 3 + ((k * 5 + d.i) % 4);
          const sw = Math.sin(this.t * 0.05 + k + d.i) > 0.6 ? 1 : 0;
          ctx.fillStyle = gba(area.accent[k % 2 ? 2 : 1]);
          for (let m = 0; m < h; m++) ctx.fillRect(bx + (m > h - 2 ? sw : 0), y + 16 - m - 1, 1, 1);
        }
      } else if (d.type === 'r' && !front) {
        // Racimo de cristales
        const c = area.accent;
        const cr = [[4, 8, 3], [8, 4, 4], [12, 9, 2]];
        for (const [ox, h, w] of cr) {
          for (let m = 0; m < 16 - h; m++) {
            const ww = Math.min(w, Math.ceil(m / 2) + 1);
            ctx.fillStyle = gba(c[2]); ctx.fillRect(x + ox - (ww >> 1), y + h + m, ww, 1);
            ctx.fillStyle = gba(c[3]); ctx.fillRect(x + ox - (ww >> 1), y + h + m, 1, 1);
          }
        }
        if ((this.t + d.i * 13) % 90 < 6) { ctx.fillStyle = gba(PAL.w); ctx.fillRect(x + 8, y + 5, 1, 1); }
      }
    }
  }

  drawLighting(cx, cy) {
    const r = this.room;
    const lights = [];
    for (const d of r.decor) if (d.type === 't') lights.push([d.i * 16 + 8, d.j * 16 + 4, GLOW.torch]);
    for (const d of r.decor) if (d.type === 'r') lights.push([d.i * 16 + 8, d.j * 16 + 10, GLOW.blue]);
    for (const s of this.shrines) lights.push([s.x + 8, s.y + 6, GLOW.big]);
    if (this.altar && this.state === 'ending') lights.push([this.altar.x + 16, this.altar.y, GLOW.big]);

    // Brillo aditivo tramado
    ctx.globalCompositeOperation = 'lighter';
    for (const [lx, ly, g] of lights) {
      ctx.globalAlpha = 0.28 + Math.sin(this.t * 0.2 + lx) * 0.03;
      ctx.drawImage(g, Math.round(lx - g.width / 2 - cx), Math.round(ly - g.height / 2 - cy));
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    // Oscuridad en cavernas y fortaleza, con huecos de luz
    const dark = r.area === 'cavern' ? 0.6 : r.area === 'keep' ? 0.32 : 0.12;
    const [dc, dx] = this.darkness;
    dx.globalCompositeOperation = 'source-over';
    dx.clearRect(0, 0, W, H);
    dx.fillStyle = gba(PAL.k);
    dx.fillRect(0, 0, W, H);
    dx.globalCompositeOperation = 'destination-out';
    const p = this.player;
    const pl = [[p.cx, p.cy, GLOW.player], ...lights];
    for (const pr of this.projectiles) pl.push([pr.x + 2, pr.y + 2, GLOW.ember]);
    for (const pk of this.pickups) pl.push([pk.x + 5, pk.y + 5, GLOW.blue]);
    for (const [lx, ly, g] of pl) {
      const s = g === GLOW.player ? 2.2 : 1.6;
      dx.drawImage(g, Math.round(lx - (g.width * s) / 2 - cx), Math.round(ly - (g.height * s) / 2 - cy), g.width * s, g.height * s);
    }
    ctx.globalAlpha = dark;
    ctx.drawImage(dc, 0, 0);
    ctx.globalAlpha = 1;
  }

  drawHUD() {
    const p = this.player;
    for (let k = 0; k < p.maxHp; k++) {
      ctx.drawImage(k < p.hp ? HUD_FLAME : HUD_FLAME_EMPTY, 4 + k * 9, 4 + (k < p.hp && (this.t + k * 7) % 50 < 4 ? -1 : 0));
    }
    let ix = 4;
    if (p.abilities.double) { ctx.drawImage(ORB, ix, 15); ix += 12; }
    if (p.abilities.dash) { ctx.drawImage(ORB_FIRE, ix, 15); }

    if (this.banner) {
      const b = this.banner, a = Math.min(1, b.t / 30, (150 - b.t) / 20);
      ctx.globalAlpha = Math.max(0, a);
      const y = b.boss ? 120 : 30;
      const w = textWidth(b.text) + 16;
      ctx.fillStyle = gba(PAL.k);
      ctx.fillRect(120 - w / 2, y - 5, w, 15);
      ctx.fillStyle = gba(b.boss ? PAL.r : PAL.y);
      ctx.fillRect(120 - w / 2, y - 5, w, 1); ctx.fillRect(120 - w / 2, y + 9, w, 1);
      drawTextC(ctx, b.text, 120, y, b.boss ? PAL.r : PAL.w);
      ctx.globalAlpha = 1;
    }
    if (this.toast) drawTextC(ctx, this.toast.text, 120, 140, PAL.y);

    // Barra de vida del jefe
    const b = this.boss;
    if (b && !b.dead && b.state !== 'sleep') {
      ctx.fillStyle = gba(PAL.k); ctx.fillRect(40, 148, 160, 6);
      ctx.fillStyle = gba(PAL.d); ctx.fillRect(41, 149, 158, 4);
      ctx.fillStyle = gba(b.phase2 ? PAL.o : PAL.r); ctx.fillRect(41, 149, Math.round(158 * b.hp / b.maxHp), 4);
      ctx.fillStyle = gba(PAL.y); ctx.fillRect(41, 149, Math.round(158 * b.hp / b.maxHp), 1);
    }
  }

  drawMap() {
    ctx.fillStyle = gba(PAL.k);
    ctx.globalAlpha = 0.85; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
    drawTextC(ctx, 'MAPA', 120, 10, PAL.y);
    const cw = 24, ch = 16, ox = 120 - (7 * cw) / 2, oy = 34;
    const colors = { garden: '#346524', cavern: '#2f5279', keep: '#8a2b3b' };
    for (const r of this.rooms) {
      if (!this.save.visited.includes(r.id)) continue;
      const x = ox + r.x * cw, y = oy + r.y * ch, w = (r.w / SCREEN_W) * cw, h = (r.h / SCREEN_H) * ch;
      ctx.fillStyle = gba(PAL.w); ctx.fillRect(x, y, w, h);
      ctx.fillStyle = gba(colors[r.area]); ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
      if (r.spawns.some((s) => s.type === 'S')) { ctx.fillStyle = gba(PAL.y); ctx.fillRect(x + w / 2 - 1, y + h / 2 - 1, 3, 3); }
      if (r.boss && !this.save.bossDead) { ctx.fillStyle = gba(PAL.r); ctx.fillRect(x + w / 2 - 1, y + h / 2 - 1, 3, 3); }
    }
    // Posición del jugador
    const p = this.player, r = this.room;
    if (this.t % 30 < 20) {
      ctx.fillStyle = gba(PAL.c);
      ctx.fillRect(ox + r.x * cw + Math.floor((p.cx / (SCREEN_W * 16)) * cw) - 1, oy + r.y * ch + Math.floor((p.cy / (SCREEN_H * 16)) * ch) - 1, 3, 3);
    }
    const pct = Math.round((this.save.taken.length / TOTAL_ITEMS) * 100);
    drawText(ctx, `OBJETOS ${pct}%`, 8, 140, PAL.g);
    drawText(ctx, `TIEMPO ${fmtTime(this.save.time)}`, 8, 148, PAL.g);
    drawText(ctx, 'N: SONIDO', 190, 148, PAL.G);
    drawTextC(ctx, AREAS[r.area].name, 120, 20, PAL.w);
  }

  drawMessage() {
    const m = this.message, n = m.lines.length;
    const h = 14 + n * 9;
    const y = 80 - h / 2;
    ctx.fillStyle = gba(PAL.k); ctx.fillRect(30, y, 180, h);
    ctx.fillStyle = gba(PAL.y); ctx.fillRect(30, y, 180, 1); ctx.fillRect(30, y + h - 1, 180, 1);
    ctx.fillRect(30, y, 1, h); ctx.fillRect(209, y, 1, h);
    m.lines.forEach((l, k) => drawTextC(ctx, l, 120, y + 7 + k * 9, k === 0 ? PAL.y : PAL.w));
  }

  drawDead() {
    const a = Math.min(1, this.deadT / 60);
    ctx.fillStyle = gba(PAL.k);
    ctx.globalAlpha = a * 0.9; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
    if (this.deadT > 40) drawTextC(ctx, 'TU LLAMA SE APAGA...', 120, 76, PAL.r);
  }

  drawEnding() {
    const a = Math.min(1, Math.max(0, (this.endT - 60) / 120));
    ctx.fillStyle = gba(PAL.k);
    ctx.globalAlpha = a * 0.75; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
    for (const q of this.particles) { ctx.fillStyle = q.color; ctx.fillRect(Math.round(q.x - this.camX), Math.round(q.y - this.camY), 1, 1); }
    if (this.endT > 120) {
      drawTextC(ctx, 'EL GRAN FUEGO VUELVE A ARDER', 120, 50, PAL.y);
      if (this.endT > 200) drawTextC(ctx, 'Y EL REINO DESPIERTA DE SU LARGO INVIERNO.', 120, 62, PAL.w);
      if (this.endT > 280) {
        drawTextC(ctx, `TIEMPO ${fmtTime(this.save.time)}`, 120, 84, PAL.g);
        drawTextC(ctx, `OBJETOS ${Math.round((this.save.taken.length / TOTAL_ITEMS) * 100)}%`, 120, 93, PAL.g);
      }
      if (this.endT > 400 && this.t % 60 < 40) drawTextC(ctx, 'GRACIAS POR JUGAR', 120, 120, PAL.c);
    }
  }

  drawTitle() {
    const bg = this.backgrounds.garden;
    drawBackground(ctx, bg, this.t * 0.5, 0, this.t);
    ctx.fillStyle = gba(PAL.k);
    ctx.globalAlpha = 0.35; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
    drawLogo(ctx, 120, 26);
    const f = FLAME[Math.floor(this.t / 5) % 3];
    ctx.drawImage(f, 116, 12 + Math.round(Math.sin(this.t * 0.05)));
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.35;
    ctx.drawImage(GLOW.big, 120 - 40, 18 - 40);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    drawTextC(ctx, 'LA ÚLTIMA BRASA', 120, 60, PAL.E);

    // Protagonista mirando al horizonte
    const pf = PLAYER['idle' + (Math.floor(this.t / 30) % 2)];
    ctx.drawImage(pf.r, 112, 112);
    ctx.fillStyle = gba(AREAS.garden.stone[2]); ctx.fillRect(0, 132, W, 28);
    ctx.fillStyle = gba(AREAS.garden.accent[2]); ctx.fillRect(0, 132, W, 1);

    const opts = this.titleOptions();
    opts.forEach((o, k) => {
      const sel = k === this.menu;
      drawTextC(ctx, (sel ? '> ' : '  ') + o + (sel ? ' <' : '  '), 120, 80 + k * 10, sel ? PAL.w : PAL.g);
    });
    if (this.t % 60 < 40) drawTextC(ctx, this.input.lastDevice === 'touch' ? 'PULSA A' : 'PULSA Z O ENTER', 120, 102, PAL.c);
    drawText(ctx, 'V1.0', 4, 152, PAL.G);
  }

  drawIntro() {
    ctx.fillStyle = gba(PAL.k); ctx.fillRect(0, 0, W, H);
    const lines = [
      'HACE MIL INVIERNOS, EL GRAN FUEGO',
      'SE APAGÓ Y EL REINO CAYÓ EN SOMBRAS.',
      '',
      'DE SUS CENIZAS QUEDÓ UNA SOLA BRASA:',
      'TÚ.',
      '',
      'ATRAVIESA EL JARDÍN, LAS CAVERNAS Y',
      'LA FORTALEZA, Y REAVIVA LA LLAMA.',
    ];
    lines.forEach((l, k) => {
      const t0 = k * 60;
      const a = Math.min(1, Math.max(0, (this.introT - t0) / 40));
      if (a <= 0) return;
      ctx.globalAlpha = a;
      drawTextC(ctx, l, 120, 30 + k * 11, k === 4 ? PAL.o : PAL.w);
    });
    ctx.globalAlpha = 1;
    const f = FLAME[Math.floor(this.t / 5) % 3];
    ctx.drawImage(f, 116, 10);
    if (this.introT > 520 && this.t % 60 < 40) drawTextC(ctx, 'PULSA PARA EMPEZAR', 120, 140, PAL.c);
  }
}

// Logo con una fuente 5x7 propia, ampliada ×4 con degradado de fuego.
const LOGO = {
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
};
function drawLogo(c, cx, y) {
  const word = 'LUMBRE', S = 4, lw = (word.length * 6 - 1) * S, x0 = Math.round(cx - lw / 2);
  const rows = [PAL.y, PAL.y, PAL.o, PAL.o, PAL.o, PAL.r, PAL.R];
  for (const pass of [0, 1, 2]) {
    [...word].forEach((ch, n) => {
      LOGO[ch].forEach((row, j) => {
        for (let i = 0; i < 5; i++) {
          if (row[i] !== '1') continue;
          const x = x0 + (n * 6 + i) * S, yy = y + j * S;
          if (pass === 0) { c.fillStyle = gba(PAL.d); c.fillRect(x - 1, yy + 2, S + 2, S + 2); }
          else if (pass === 1) { c.fillStyle = gba(PAL.k); c.fillRect(x - 1, yy - 1, S + 2, S + 2); }
          else {
            c.fillStyle = gba(rows[j]); c.fillRect(x, yy, S, S);
            if (j === 0 || row[i - 1] !== '1') { c.fillStyle = gba(j < 2 ? PAL.w : PAL.y); c.fillRect(x, yy, 1, 1); }
          }
        }
      });
    });
  }
}

function fmtTime(frames) {
  const s = Math.floor(frames / 60), m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

// ---------- Arranque con paso fijo a 60 Hz ----------
if ('ontouchstart' in window || navigator.maxTouchPoints > 0) document.body.classList.add('touch');
resize();
const game = new Game();
window.__game = game;
let acc = 0, last = performance.now();
function frame(now) {
  acc += Math.min(100, now - last);
  last = now;
  let steps = 0;
  while (acc >= 1000 / 60 && steps < 5) { game.update(); acc -= 1000 / 60; steps++; }
  game.draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

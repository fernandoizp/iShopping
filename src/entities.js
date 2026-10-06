// Física de tiles, protagonista, enemigos, jefe, proyectiles y objetos.
import { PLAYER, SLASH, SLASH_UP, CRAWLER, BAT, BAT_HANG, SPITTER, BOSS, SPORE, WAVE, ORB, ORB_FIRE, HEART_ITEM, HEALTH, GLOW } from './art.js';
import { PAL, gba } from './gfx.js';
import { sfx } from './audio.js';

// ---------------- Física ----------------
export function tileAt(room, i, j) {
  if (i < 0 || j < 0 || i >= room.w || j >= room.h) return null;
  return room.tiles[j][i];
}
const SOLID = (t) => t === '#' || t === 'X';

// oob: qué devolver fuera de la sala (el jugador puede salir por las aberturas; los enemigos no).
function solidAt(room, i, j, oob) {
  const t = tileAt(room, i, j);
  if (t === null) {
    // Fuera de la sala: sólido salvo que la celda del borde sea una abertura.
    if (!oob) return true;
    const ci = Math.max(0, Math.min(room.w - 1, i)), cj = Math.max(0, Math.min(room.h - 1, j));
    return SOLID(room.tiles[cj][ci]);
  }
  return SOLID(t);
}

export function moveAndCollide(e, room, oob = false) {
  e.hitWall = 0; e.hitCeil = false;
  // Eje X
  e.x += e.vx;
  const j0 = Math.floor(e.y / 16), j1 = Math.floor((e.y + e.h - 0.01) / 16);
  if (e.vx > 0) {
    const i = Math.floor((e.x + e.w - 0.01) / 16);
    for (let j = j0; j <= j1; j++) if (solidAt(room, i, j, oob)) { e.x = i * 16 - e.w; e.vx = 0; e.hitWall = 1; break; }
  } else if (e.vx < 0) {
    const i = Math.floor(e.x / 16);
    for (let j = j0; j <= j1; j++) if (solidAt(room, i, j, oob)) { e.x = (i + 1) * 16; e.vx = 0; e.hitWall = -1; break; }
  }
  // Eje Y
  const prevBottom = e.y + e.h;
  e.y += e.vy;
  const wasGround = e.onGround;
  e.onGround = false;
  const i0 = Math.floor(e.x / 16), i1 = Math.floor((e.x + e.w - 0.01) / 16);
  if (e.vy > 0) {
    const j = Math.floor((e.y + e.h - 0.01) / 16);
    for (let i = i0; i <= i1; i++) {
      const t = tileAt(room, i, j);
      const oneway = t === '=' && prevBottom <= j * 16 + 0.5 && !e.dropping;
      if (solidAt(room, i, j, oob) || oneway) {
        e.y = j * 16 - e.h; e.vy = 0; e.onGround = true; break;
      }
    }
  } else if (e.vy < 0) {
    const j = Math.floor(e.y / 16);
    for (let i = i0; i <= i1; i++) if (solidAt(room, i, j, oob)) { e.y = (j + 1) * 16; e.vy = 0; e.hitCeil = true; break; }
  }
  e.landed = e.onGround && !wasGround;
}

export function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function touchesSpike(e, room) {
  const i0 = Math.floor(e.x / 16), i1 = Math.floor((e.x + e.w - 0.01) / 16);
  const j0 = Math.floor(e.y / 16), j1 = Math.floor((e.y + e.h - 0.01) / 16);
  for (let j = j0; j <= j1; j++)
    for (let i = i0; i <= i1; i++)
      if (tileAt(room, i, j) === '^' && e.y + e.h > j * 16 + 8) return true;
  return false;
}

// ---------------- Protagonista ----------------
const G = 0.24, MAX_FALL = 4.6, RUN = 1.65, ACC = 0.32, FRIC = 0.38;
const JUMP_V = -4.55, DJUMP_V = -4.1, DASH_V = 4.4, DASH_T = 15;

export class Player {
  constructor(x, y, save) {
    this.x = x; this.y = y; this.w = 8; this.h = 16;
    this.vx = 0; this.vy = 0;
    this.facing = 1;
    this.maxHp = save.maxHp; this.hp = save.maxHp;
    this.abilities = save.abilities;
    this.onGround = false;
    this.coyote = 0; this.jumpBuf = 0; this.airJumps = 0; this.airDash = true;
    this.attackT = 0; this.attackDir = 'side'; this.attackCd = 0; this.hitSet = new Set(); this.slashFrame = 0;
    this.dashT = 0; this.dashCd = 0;
    this.invuln = 0; this.hurtT = 0;
    this.anim = 0;
    this.lastSafe = { x, y };
    this.scarf = Array.from({ length: 6 }, () => ({ x: x + 4, y: y + 2 }));
    this.trail = [];
    this.dead = false;
  }

  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }

  update(game) {
    const inp = game.input, room = game.room;
    this.anim++;
    if (this.invuln > 0) this.invuln--;
    if (this.attackCd > 0) this.attackCd--;
    if (this.dashCd > 0) this.dashCd--;

    const left = inp.down('left'), right = inp.down('right');
    const dir = (right ? 1 : 0) - (left ? 1 : 0);

    if (this.hurtT > 0) {
      this.hurtT--;
      this.vy = Math.min(this.vy + G, MAX_FALL);
      this.vx *= 0.9;
      moveAndCollide(this, room, true);
      this.updateScarf();
      return;
    }

    // Impulso (dash)
    if (inp.pressed('dash') && this.abilities.dash && this.dashCd === 0 && (this.onGround || this.airDash) && this.attackT === 0) {
      this.dashT = DASH_T; this.dashCd = 30;
      if (!this.onGround) this.airDash = false;
      if (dir) this.facing = dir;
      sfx('dash');
      game.shake(1, 4);
      for (let k = 0; k < 6; k++) game.particle(this.cx, this.cy + 4, -this.facing * Math.random() * 1.5, (Math.random() - 0.5), 18, PAL.t, 0);
    }
    if (this.dashT > 0) {
      this.dashT--;
      this.vx = this.facing * DASH_V;
      this.vy = 0;
      if (this.anim % 2 === 0) this.trail.push({ x: this.x, y: this.y, f: this.facing, life: 10 });
      moveAndCollide(this, room, true);
      if (this.hitWall) this.dashT = 0;
      if (this.dashT === 0) this.vx = this.facing * RUN;
      this.updateScarf();
      this.checkHazards(game);
      return;
    }

    // Movimiento horizontal
    const target = dir * RUN;
    if (dir) {
      this.vx += Math.sign(target - this.vx) * Math.min(Math.abs(target - this.vx), ACC);
      if (this.attackT === 0) this.facing = dir;
    } else {
      this.vx -= Math.sign(this.vx) * Math.min(Math.abs(this.vx), FRIC);
    }

    // Saltos con coyote time y buffer
    if (this.onGround) { this.coyote = 6; this.airJumps = this.abilities.double ? 1 : 0; this.airDash = true; }
    else if (this.coyote > 0) this.coyote--;
    if (inp.pressed('jump')) this.jumpBuf = 7; else if (this.jumpBuf > 0) this.jumpBuf--;

    this.dropping = false;
    if (this.jumpBuf > 0) {
      if (this.onGround && inp.down('down') && this.standingOnOneway(room)) {
        this.dropping = true; this.y += 2; this.jumpBuf = 0; this.coyote = 0;
      } else if (this.coyote > 0) {
        this.vy = JUMP_V; this.coyote = 0; this.jumpBuf = 0;
        sfx('jump');
        for (let k = 0; k < 4; k++) game.particle(this.cx, this.y + this.h, (Math.random() - 0.5) * 1.2, -Math.random() * 0.6, 14, PAL.g, 0.02);
      } else if (this.airJumps > 0) {
        this.vy = Math.min(this.vy, DJUMP_V); this.airJumps--; this.jumpBuf = 0;
        sfx('djump');
        for (let k = 0; k < 10; k++) {
          const a = (k / 10) * Math.PI * 2;
          game.particle(this.cx, this.y + this.h, Math.cos(a) * 1.4, Math.sin(a) * 0.5 + 0.4, 16, k % 2 ? PAL.y : PAL.o, 0);
        }
      }
    }
    if (this.vy >= 0) this.noCut = false;
    if (inp.released('jump') && this.vy < -1.6 && !this.noCut) this.vy = -1.6;

    this.vy = Math.min(this.vy + G, MAX_FALL);

    // Ataque
    if (inp.pressed('attack') && this.attackCd === 0) {
      this.attackT = 14; this.attackCd = 18; this.hitSet.clear();
      this.slashFrame = (this.slashFrame + 1) % 2;
      this.attackDir = inp.down('up') ? 'up' : (inp.down('down') && !this.onGround ? 'down' : 'side');
      sfx('slash');
    }
    if (this.attackT > 0) {
      this.attackT--;
      if (this.attackT > 4) this.doAttack(game);
    }

    moveAndCollide(this, room, true);
    if (this.landed) {
      sfx('land');
      for (let k = 0; k < 5; k++) game.particle(this.cx, this.y + this.h, (Math.random() - 0.5) * 1.6, -Math.random() * 0.5, 12, PAL.g, 0.02);
    }
    if (this.onGround && Math.abs(this.vx) > 1 && this.anim % 8 === 0) {
      game.particle(this.cx - this.facing * 3, this.y + this.h, -this.facing * 0.3, -0.3, 10, PAL.g, 0.01);
    }

    // Último punto seguro (para reaparecer tras caer en pinchos)
    if (this.onGround && !this.nearSpike(room)) this.lastSafe = { x: this.x, y: this.y };

    this.updateScarf();
    this.checkHazards(game);
  }

  standingOnOneway(room) {
    const j = Math.floor((this.y + this.h + 1) / 16);
    const i0 = Math.floor(this.x / 16), i1 = Math.floor((this.x + this.w - 0.01) / 16);
    let one = false;
    for (let i = i0; i <= i1; i++) {
      const t = tileAt(room, i, j);
      if (SOLID(t)) return false;
      if (t === '=') one = true;
    }
    return one;
  }

  nearSpike(room) {
    const j = Math.floor((this.y + this.h + 1) / 16);
    for (let i = Math.floor(this.x / 16) - 1; i <= Math.floor((this.x + this.w) / 16) + 1; i++) {
      if (tileAt(room, i, j - 1) === '^' || tileAt(room, i, j) === '^') return true;
    }
    return false;
  }

  attackBox() {
    if (this.attackDir === 'up') return { x: this.cx - 9, y: this.y - 20, w: 18, h: 22 };
    if (this.attackDir === 'down') return { x: this.cx - 9, y: this.y + this.h - 2, w: 18, h: 20 };
    return { x: this.facing > 0 ? this.x + this.w - 2 : this.x - 22, y: this.y - 3, w: 24, h: 18 };
  }

  doAttack(game) {
    const box = this.attackBox();
    let pogo = false;
    for (const en of game.enemies) {
      if (en.dead || this.hitSet.has(en) || !overlap(box, en)) continue;
      this.hitSet.add(en);
      en.hurt(game, 1, this.attackDir === 'side' ? this.facing : 0);
      if (this.attackDir === 'down') pogo = true;
      else if (this.attackDir === 'side' && !this.onGround) this.vx -= this.facing * 0.8;
      else if (this.attackDir === 'side') this.vx = -this.facing * 1.4;
    }
    for (const p of game.projectiles) {
      if (p.breakable && overlap(box, p)) { p.dead = true; game.burst(p.x + 2, p.y + 2, 6, PAL.o); }
    }
    // Muros rompibles y pinchos (para rebotar)
    const i0 = Math.floor(box.x / 16), i1 = Math.floor((box.x + box.w) / 16);
    const j0 = Math.floor(box.y / 16), j1 = Math.floor((box.y + box.h) / 16);
    for (let j = j0; j <= j1; j++)
      for (let i = i0; i <= i1; i++) {
        const t = tileAt(game.room, i, j);
        if (t === 'X' && !this.hitSet.has(`${i},${j}`)) {
          this.hitSet.add(`${i},${j}`);
          game.breakTile(i, j);
        }
        if (t === '^' && this.attackDir === 'down') pogo = true;
      }
    if (pogo && !this.pogoed) {
      this.vy = -4.2; this.airJumps = this.abilities.double ? 1 : 0; this.airDash = true;
      this.pogoed = true;
    }
    if (this.attackT <= 5) this.pogoed = false;
  }

  checkHazards(game) {
    if (touchesSpike(this, game.room)) game.hurtPlayer(1, null, true);
  }

  hurt(game, dmg, fromX) {
    if (this.invuln > 0 || this.dead) return false;
    this.hp -= dmg;
    this.invuln = 70; this.hurtT = 16; this.dashT = 0; this.attackT = 0;
    const d = fromX == null ? -this.facing : Math.sign(this.cx - fromX) || 1;
    this.vx = d * 2.2; this.vy = -2.6;
    sfx('hurt');
    if (this.hp <= 0) { this.hp = 0; this.dead = true; }
    return true;
  }

  updateScarf() {
    // Bufanda: cadena de puntos con inercia que ondea detrás del personaje.
    const s = this.scarf;
    s[0].x = this.cx - this.facing * 4; s[0].y = this.y + 8 + (this.bodyBob() ? 1 : 0);
    for (let k = 1; k < s.length; k++) {
      const p = s[k], q = s[k - 1];
      p.x += (-this.facing * 0.6 - this.vx * 0.15) + Math.sin(this.anim * 0.15 + k) * 0.25;
      p.y += 0.25 + Math.cos(this.anim * 0.2 + k * 0.7) * 0.15;
      const dx = p.x - q.x, dy = p.y - q.y, d = Math.hypot(dx, dy) || 1;
      p.x = q.x + (dx / d) * 2; p.y = q.y + (dy / d) * 2;
    }
  }

  bodyBob() {
    return this.onGround && Math.abs(this.vx) < 0.2 && Math.floor(this.anim / 30) % 2 === 1;
  }

  frame() {
    if (this.hurtT > 0) return PLAYER.hurt;
    if (this.dashT > 0) return PLAYER.dash;
    if (this.attackT > 6 && this.attackDir === 'side') return PLAYER.attack;
    if (!this.onGround) return this.vy < 0 ? PLAYER.jump : PLAYER.fall;
    if (Math.abs(this.vx) > 0.3) return PLAYER['run' + (Math.floor(this.anim / 6) % 4)];
    return this.bodyBob() ? PLAYER.idle1 : PLAYER.idle0;
  }

  draw(ctx, cx, cy) {
    // Estela del impulso
    for (const t of this.trail) {
      ctx.globalAlpha = t.life / 20;
      const f = PLAYER.dash;
      ctx.drawImage(t.f > 0 ? f.wr : f.wl, Math.round(t.x - 4 - cx), Math.round(t.y - 4 - cy));
      t.life--;
    }
    ctx.globalAlpha = 1;
    this.trail = this.trail.filter((t) => t.life > 0);

    if (this.invuln > 0 && this.hurtT === 0 && Math.floor(this.invuln / 3) % 2 === 0) return;
    const px = Math.round(this.x - 4 - cx), py = Math.round(this.y - 4 - cy);

    // Bufanda (detrás del cuerpo): se rellenan los tramos entre puntos para que sea continua
    for (let k = 1; k < this.scarf.length; k++) {
      const a = this.scarf[k - 1], b = this.scarf[k];
      ctx.fillStyle = gba(k > 3 ? PAL.R : PAL.r);
      const sz = k < 3 ? 2 : 1;
      for (let u = 0; u < 1; u += 0.34) {
        ctx.fillRect(Math.round(a.x + (b.x - a.x) * u - cx), Math.round(a.y + (b.y - a.y) * u - cy), sz, sz);
      }
    }
    const f = this.frame();
    const white = this.hurtT > 10;
    ctx.drawImage(this.facing > 0 ? (white ? f.wr : f.r) : (white ? f.wl : f.l), px, py);

    // Tajo
    if (this.attackT > 4) {
      const fr = 14 - this.attackT;
      if (this.attackDir === 'side') {
        const s = SLASH[this.slashFrame];
        const sy = py + (fr < 4 ? 0 : 2);
        ctx.drawImage(this.facing > 0 ? s.r : s.l, this.facing > 0 ? px + 10 : px - 18, sy);
      } else {
        const s = SLASH_UP[0];
        const img = this.slashFrame ? s.r : s.l;
        if (this.attackDir === 'up') ctx.drawImage(img, px, py - 14);
        else {
          ctx.save(); ctx.translate(px, py + 34); ctx.scale(1, -1); ctx.drawImage(img, 0, 0); ctx.restore();
        }
      }
    }
  }
}

// ---------------- Enemigos ----------------
class Enemy {
  constructor(x, y, w, h, hp) {
    this.x = x; this.y = y; this.w = w; this.h = h; this.hp = hp;
    this.vx = 0; this.vy = 0; this.flash = 0; this.dead = false; this.t = 0;
    this.damage = 1; this.kb = 0;
  }
  hurt(game, dmg, dir) {
    this.hp -= dmg; this.flash = 8;
    this.kb = dir * 2.5;
    game.hitstop(3);
    sfx('hit');
    game.burst(this.x + this.w / 2, this.y + this.h / 2, 5, PAL.w);
    if (this.hp <= 0) this.die(game);
  }
  die(game) {
    this.dead = true;
    sfx('kill');
    game.burst(this.x + this.w / 2, this.y + this.h / 2, 16, PAL.P);
    game.burst(this.x + this.w / 2, this.y + this.h / 2, 8, PAL.y);
    if (Math.random() < 0.45) game.pickups.push(new Pickup('health', this.x + this.w / 2 - 2, this.y));
  }
  drawSpr(ctx, spr, cx, cy, face, ox = 0, oy = 0) {
    const img = this.flash > 0 ? (face > 0 ? spr.wr : spr.wl) : (face > 0 ? spr.r : spr.l);
    ctx.drawImage(img, Math.round(this.x + ox - cx), Math.round(this.y + oy - cy));
  }
}

export class Crawler extends Enemy {
  constructor(x, y) { super(x, y + 4, 14, 12, 3); this.dir = -1; this.vx = -0.4; }
  update(game) {
    this.t++; if (this.flash) this.flash--;
    const room = game.room;
    this.vx = this.dir * 0.4 + this.kb; this.kb *= 0.8;
    this.vy = Math.min(this.vy + G, MAX_FALL);
    moveAndCollide(this, room);
    if (this.hitWall) this.dir = -this.hitWall;
    if (this.onGround) {
      // Darse la vuelta en los bordes
      const ahead = Math.floor((this.dir > 0 ? this.x + this.w + 1 : this.x - 1) / 16);
      const below = Math.floor((this.y + this.h + 1) / 16);
      const t = tileAt(room, ahead, below);
      if (!(t === '#' || t === 'X' || t === '=')) this.dir *= -1;
    }
  }
  draw(ctx, cx, cy) { this.drawSpr(ctx, CRAWLER[Math.floor(this.t / 10) % 2], cx, cy, this.dir, -1, 0); }
}

export class Bat extends Enemy {
  constructor(x, y) { super(x + 2, y, 12, 9, 2); this.awake = false; this.homeY = y; }
  update(game) {
    this.t++; if (this.flash) this.flash--;
    const p = game.player;
    const dx = p.cx - (this.x + 6), dy = p.cy - (this.y + 5);
    if (!this.awake) {
      if (Math.abs(dx) < 80 && Math.abs(dy) < 90) this.awake = true;
      return;
    }
    const d = Math.hypot(dx, dy) || 1;
    this.vx += (dx / d) * 0.06 + this.kb; this.kb = 0;
    this.vy += (dy / d) * 0.06 + Math.sin(this.t * 0.1) * 0.08;
    this.vx *= 0.96; this.vy *= 0.96;
    const sp = Math.hypot(this.vx, this.vy);
    if (sp > 1.3) { this.vx *= 1.3 / sp; this.vy *= 1.3 / sp; }
    moveAndCollide(this, game.room);
  }
  draw(ctx, cx, cy) {
    if (!this.awake) { this.drawSpr(ctx, BAT_HANG, cx, cy, 1, -2, -1); return; }
    this.drawSpr(ctx, BAT[Math.floor(this.t / 6) % 2], cx, cy, this.vx > 0 ? 1 : -1, -2, -1);
  }
}

export class Spitter extends Enemy {
  constructor(x, y) { super(x + 2, y, 12, 16, 3); this.cool = 60; }
  update(game) {
    this.t++; if (this.flash) this.flash--;
    const p = game.player;
    this.face = p.cx > this.x + 6 ? 1 : -1;
    const dx = p.cx - (this.x + 6);
    if (this.cool > 0) this.cool--;
    else if (Math.abs(dx) < 130 && Math.abs(p.cy - this.y) < 100) {
      this.cool = 110; this.open = 16;
      sfx('spit');
      const vx = Math.max(-2, Math.min(2, dx / 50));
      game.projectiles.push(new Projectile('spore', this.x + 6 + this.face * 4, this.y + 4, vx, -3.2, 0.12));
    }
    if (this.open > 0) this.open--;
  }
  draw(ctx, cx, cy) { this.drawSpr(ctx, SPITTER[this.open > 0 ? 1 : 0], cx, cy, this.face || 1, -2, 0); }
}

// ---------------- Jefe: Coloso de Musgo ----------------
export class Boss extends Enemy {
  constructor(x, y) {
    super(x, y - 12, 24, 28, 30);
    this.maxHp = 30; this.state = 'sleep'; this.timer = 0; this.face = -1; this.isBoss = true;
    this.dropping = true; // atraviesa las plataformas finas
  }
  get phase2() { return this.hp <= this.maxHp / 2; }
  hurt(game, dmg, dir) {
    if (this.state === 'sleep' || this.state === 'intro' || this.state === 'dying') return;
    this.hp -= dmg; this.flash = 6;
    game.hitstop(2);
    sfx('hit');
    game.burst(this.x + 12, this.y + 10, 6, PAL.g);
    if (this.hp <= 0) {
      this.hp = 0; this.state = 'dying'; this.timer = 120; this.vx = 0;
      game.onBossDying();
    }
  }
  setState(s, t) { this.state = s; this.timer = t; }
  update(game) {
    this.t++; if (this.flash) this.flash--;
    const p = game.player, room = game.room;
    if (this.state !== 'leap' && this.state !== 'dying') this.face = p.cx > this.x + 12 ? 1 : -1;
    this.vy = Math.min(this.vy + G, 6);
    switch (this.state) {
      case 'sleep':
        // Despierta solo cuando el jugador ha cruzado el umbral (para no cerrar la puerta encima)
        if (p.x > 40 && p.x < room.w * 16 - 48) { this.setState('intro', 80); game.onBossWake(); }
        break;
      case 'intro':
        if (this.timer === 60) { sfx('roar'); game.shake(3, 40); }
        if (--this.timer <= 0) this.setState('idle', 40);
        break;
      case 'idle':
        this.vx *= 0.8;
        if (--this.timer <= 0) {
          const r = Math.random(), far = Math.abs(p.cx - this.x - 12) > 70;
          if (r < 0.4 || far) this.setState('crouch', 22);
          else if (r < 0.7) this.setState('spores', 40);
          else this.setState('walk', 70);
        }
        break;
      case 'walk':
        this.vx = this.face * (this.phase2 ? 1.2 : 0.8);
        if (this.t % 16 === 0) { game.shake(1, 3); sfx('land'); }
        if (--this.timer <= 0) this.setState('idle', this.phase2 ? 20 : 35);
        break;
      case 'crouch':
        this.vx = 0;
        if (--this.timer <= 0) {
          this.state = 'leap';
          this.vy = -6.2;
          const tx = Math.max(24, Math.min(room.w * 16 - 48, p.cx - 12));
          this.vx = (tx - this.x) / 52;
          sfx('jump');
        }
        break;
      case 'leap':
        if (this.onGround && this.vy >= 0) {
          sfx('slam'); game.shake(4, 20);
          const sp = this.phase2 ? 2.6 : 2;
          const fy = this.y + this.h - 5;
          game.projectiles.push(new Projectile('wave', this.x - 6, fy, -sp, 0, 0));
          game.projectiles.push(new Projectile('wave', this.x + this.w - 2, fy, sp, 0, 0));
          game.burst(this.x + 12, this.y + this.h, 14, PAL.g);
          this.vx = 0;
          this.setState('idle', this.phase2 ? 25 : 45);
        }
        break;
      case 'spores': {
        this.vx = 0;
        const n = this.phase2 ? 5 : 3;
        if (this.timer === 20) {
          sfx('spit');
          for (let k = 0; k < n; k++) {
            const a = (k - (n - 1) / 2) * 0.7;
            game.projectiles.push(new Projectile('spore', this.x + 12, this.y + 4, this.face * (1.2 + Math.abs(a) * 0.2) + a * 0.9, -3.8 + Math.abs(a) * 0.4, 0.13));
          }
        }
        if (--this.timer <= 0) this.setState('idle', this.phase2 ? 20 : 40);
        break;
      }
      case 'dying':
        this.vx = 0;
        if (this.t % 6 === 0) { game.burst(this.x + Math.random() * 24, this.y + Math.random() * 28, 8, Math.random() < 0.5 ? PAL.o : PAL.g); sfx('hit'); game.shake(2, 6); }
        if (--this.timer <= 0) { this.dead = true; game.onBossDead(this); }
        break;
    }
    moveAndCollide(this, room);
  }
  draw(ctx, cx, cy) {
    const angry = this.state === 'spores' || this.state === 'crouch' || this.state === 'intro' || this.phase2;
    const spr = angry ? BOSS.angry : BOSS.idle;
    let oy = this.state === 'crouch' ? 2 : 0;
    if (this.state === 'walk') oy = Math.floor(this.t / 8) % 2;
    const ox = this.state === 'dying' ? (Math.random() * 3 - 1) | 0 : 0;
    // El sprite mira a la izquierda por defecto
    this.drawSpr(ctx, spr, cx, cy, -this.face, -4 + ox, -2 + oy);
    if (this.state === 'sleep') return;
    const g = GLOW.ember;
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.6;
    ctx.drawImage(g, Math.round(this.x + 12 - 10 - cx - this.face * 2), Math.round(this.y + 3 - 10 - cy));
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
}

// ---------------- Proyectiles ----------------
export class Projectile {
  constructor(type, x, y, vx, vy, grav) {
    this.type = type; this.x = x; this.y = y; this.vx = vx; this.vy = vy; this.grav = grav;
    this.w = type === 'wave' ? 8 : 4; this.h = type === 'wave' ? 5 : 4;
    this.dead = false; this.t = 0; this.breakable = type === 'spore';
  }
  update(game) {
    this.t++;
    this.vy += this.grav;
    this.x += this.vx; this.y += this.vy;
    const i = Math.floor((this.x + this.w / 2) / 16), j = Math.floor((this.y + this.h / 2) / 16);
    const t = tileAt(game.room, i, j);
    if (t === null || SOLID(t)) {
      this.dead = true;
      if (this.type === 'spore') game.burst(this.x + 2, this.y + 2, 5, PAL.o);
    }
    if (this.type === 'wave' && this.t % 3 === 0) game.particle(this.x + 4, this.y + 4, -this.vx * 0.2, -Math.random(), 10, PAL.t, 0.05);
    if (this.t > 400) this.dead = true;
    if (overlap(this, game.player)) game.hurtPlayer(1, this.x);
  }
  draw(ctx, cx, cy) {
    const s = this.type === 'wave' ? WAVE : SPORE;
    ctx.drawImage(this.vx >= 0 ? s.r : s.l, Math.round(this.x - cx), Math.round(this.y - cy));
  }
}

// ---------------- Objetos ----------------
export class Pickup {
  constructor(type, x, y, id) {
    this.type = type; this.x = x; this.y = y; this.id = id; this.t = (Math.random() * 100) | 0;
    this.w = type === 'health' ? 4 : 10; this.h = this.w;
    this.vy = type === 'health' ? -2 : 0; this.vx = 0; this.dead = false; this.life = 600;
  }
  update(game) {
    this.t++;
    if (this.type === 'health') {
      this.vy = Math.min(this.vy + 0.15, 2);
      moveAndCollide(this, game.room);
      if (--this.life <= 0) this.dead = true;
    }
    const p = game.player;
    if (overlap({ x: this.x - 2, y: this.y - 2, w: this.w + 4, h: this.h + 4 }, p)) {
      this.dead = true;
      game.collect(this);
    }
  }
  draw(ctx, cx, cy) {
    if (this.type === 'health' && this.life < 120 && this.t % 6 < 3) return;
    const bob = this.type === 'health' ? 0 : Math.round(Math.sin(this.t * 0.07) * 2);
    const x = Math.round(this.x - cx), y = Math.round(this.y - cy) + bob;
    const img = this.type === 'health' ? HEALTH : this.type === 'heart' ? HEART_ITEM : this.type === 'double' ? ORB : ORB_FIRE;
    if (this.type !== 'health') {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.5 + Math.sin(this.t * 0.1) * 0.2;
      const g = this.type === 'double' ? GLOW.blue : GLOW.ember;
      ctx.drawImage(g, x + this.w / 2 - g.width / 2, y + this.h / 2 - g.height / 2);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.drawImage(img, x, y);
    if (this.type !== 'health' && this.t % 40 < 4) {
      ctx.fillStyle = gba(PAL.w);
      ctx.fillRect(x + 2, y + 1, 1, 1);
    }
  }
}

// Colisión AABB contra la rejilla de tiles. Las entidades usan x, y (esquina superior izquierda), w, h, vx, vy.
const T = 16;
export const SOLID = (c) => c === '#' || c === 'X' || c === 'L' || c === 'G';

export function tileAt(room, i, j) {
  if (i < 0 || j < 0 || i >= room.W || j >= room.H) return null;
  return room.tiles[j][i];
}

// Fuera de la sala: sólido salvo por las aberturas (para que el héroe pueda salir por las puertas).
function solidAt(room, i, j, open) {
  const t = tileAt(room, i, j);
  if (t === null) {
    if (!open) return true;
    const ci = Math.max(0, Math.min(room.W - 1, i)), cj = Math.max(0, Math.min(room.H - 1, j));
    return SOLID(room.tiles[cj][ci]);
  }
  return SOLID(t);
}

export function move(e, room, open = false) {
  e.hitWall = 0; e.hitCeil = false;
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(e.vx), Math.abs(e.vy)) / 7));
  const vx = e.vx / steps, vy = e.vy / steps;
  const wasGround = e.onGround;
  let ground = false;
  for (let s = 0; s < steps; s++) {
    e.x += vx;
    const j0 = Math.floor(e.y / T), j1 = Math.floor((e.y + e.h - 0.01) / T);
    if (vx > 0) {
      const i = Math.floor((e.x + e.w - 0.01) / T);
      for (let j = j0; j <= j1; j++) if (solidAt(room, i, j, open)) { e.x = i * T - e.w; e.vx = 0; e.hitWall = 1; break; }
    } else if (vx < 0) {
      const i = Math.floor(e.x / T);
      for (let j = j0; j <= j1; j++) if (solidAt(room, i, j, open)) { e.x = (i + 1) * T; e.vx = 0; e.hitWall = -1; break; }
    }
    const prevBottom = e.y + e.h;
    e.y += vy;
    const i0 = Math.floor(e.x / T), i1 = Math.floor((e.x + e.w - 0.01) / T);
    if (vy > 0) {
      const j = Math.floor((e.y + e.h - 0.01) / T);
      for (let i = i0; i <= i1; i++) {
        const t = tileAt(room, i, j);
        const oneway = t === '=' && prevBottom <= j * T + 0.5 && !e.dropping;
        if (solidAt(room, i, j, open) || oneway) { e.y = j * T - e.h; e.vy = 0; ground = true; break; }
      }
    } else if (vy < 0) {
      const j = Math.floor(e.y / T);
      for (let i = i0; i <= i1; i++) if (solidAt(room, i, j, open)) { e.y = (j + 1) * T; e.vy = 0; e.hitCeil = true; break; }
    }
    if (e.vx === 0 && e.vy === 0) break;
  }
  // seguir en el suelo si no nos hemos movido verticalmente
  if (!ground && e.vy === 0 && wasGround) ground = standing(e, room);
  e.onGround = ground;
  e.landed = ground && !wasGround;
}

export function standing(e, room) {
  const j = Math.floor((e.y + e.h + 1) / T);
  const i0 = Math.floor(e.x / T), i1 = Math.floor((e.x + e.w - 0.01) / T);
  for (let i = i0; i <= i1; i++) {
    const t = tileAt(room, i, j);
    if (SOLID(t) || (t === '=' && Math.abs(e.y + e.h - j * T) < 1)) return true;
  }
  return false;
}

export function wallAt(e, room, dir) {
  const i = dir > 0 ? Math.floor((e.x + e.w + 1) / T) : Math.floor((e.x - 1) / T);
  const j0 = Math.floor((e.y + 4) / T), j1 = Math.floor((e.y + e.h - 4) / T);
  for (let j = j0; j <= j1; j++) { const t = tileAt(room, i, j); if (SOLID(t)) return true; }
  return false;
}

export function groundAhead(e, room, dir) {
  const i = Math.floor((dir > 0 ? e.x + e.w + 2 : e.x - 2) / T), j = Math.floor((e.y + e.h + 2) / T);
  const t = tileAt(room, i, j);
  return SOLID(t) || t === '=';
}

export function touchesSpike(e, room) {
  const i0 = Math.floor((e.x + 2) / T), i1 = Math.floor((e.x + e.w - 2) / T);
  const j0 = Math.floor(e.y / T), j1 = Math.floor((e.y + e.h - 0.01) / T);
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++)
    if (tileAt(room, i, j) === '^' && e.y + e.h > j * T + 7) return true;
  return false;
}

export const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

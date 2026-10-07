// Mapa de la Hacienda Nápoles. Cada sala ocupa w×h pantallas en una rejilla global.
// Una pantalla = 30×17 tiles de 16 px (480×272). Las puertas se tallan a la vez en las dos salas vecinas.
//
// Tiles: '#' roca  '=' plataforma atravesable  '^' pinchos  'X' muro rompible  'L' cerrojo del Patrón  'G' compuerta (jefes)
export const SW = 30, SH = 17;

class Builder {
  constructor(def) {
    this.W = def.w * SW; this.H = def.h * SH;
    this.t = Array.from({ length: this.H }, () => Array(this.W).fill('.'));
    this.ents = []; this.deco = [];
  }
  set(x, y, c) { if (x >= 0 && y >= 0 && x < this.W && y < this.H) this.t[y][x] = c; }
  fill(x, y, w, h, c = '#') { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, c); return this; }
  clear(x, y, w, h) { return this.fill(x, y, w, h, '.'); }
  walls() { this.fill(0, 0, this.W, 2); this.fill(0, this.H - 2, this.W, 2); this.fill(0, 0, 2, this.H); this.fill(this.W - 2, 0, 2, this.H); return this; }
  plat(x, y, w) { return this.fill(x, y, w, 1, '='); }
  spikes(x, y, w) { return this.fill(x, y, w, 1, '^'); }
  brk(x, y, w, h) { return this.fill(x, y, w, h, 'X'); }
  lock(x, y, w, h) { return this.fill(x, y, w, h, 'L'); }
  e(type, x, y, p = {}) { this.ents.push({ type, x, y, ...p }); return this; }
  d(kind, x, y, p = {}) { this.deco.push({ kind, x, y, layer: 'bg', ...p }); return this; }
}

export const ROOMS = [
  // ───────────── JARDINES DE ENTRADA ─────────────
  { id: 'puerta', name: 'Puerta de la Hacienda', zone: 'jardines', x: 0, y: 1, w: 1, h: 1, build(b) {
    b.walls();
    b.plat(9, 10, 5);
    b.d('gate', 6, 15).d('lamp', 13, 15).d('cypress', 18, 15).d('cypress', 26, 15).d('pot', 22, 15).d('pot', 3, 15)
      .d('vines', 8, 2).d('vines', 21, 2).d('bush', 16, 15, { layer: 'fg' }).d('bush', 28, 15, { layer: 'fg' });
    b.e('start', 4, 15).e('terminal', 15, 15);
  } },
  { id: 'patio', name: 'Patio de los Naranjos', zone: 'jardines', x: 1, y: 1, w: 2, h: 1, build(b) {
    b.walls();
    b.plat(12, 15, 3);                  // tapa sobre el pozo del castro
    b.fill(26, 12, 10, 3);              // terraza central
    b.plat(18, 9, 5).plat(38, 8, 5).plat(45, 6, 3);
    b.fill(50, 3, 8, 1);                // repisa alta (doble salto)
    b.d('orange', 7, 15).d('orange', 21, 15).d('fountain', 31, 12).d('orange', 41, 15).d('orange', 55, 15)
      .d('arcade', 3, 15).d('arcade', 46, 15).d('lamp', 25, 12).d('lamp', 36, 12)
      .d('vines', 10, 2).d('vines', 30, 2).d('vines', 48, 2)
      .d('bush', 4, 15, { layer: 'fg' }).d('bush', 24, 15, { layer: 'fg' }).d('bush', 52, 15, { layer: 'fg' });
    b.e('npc', 44, 15, { id: 'rosario' })
      .e('enemy', 22, 15, { kind: 'jardinero' }).e('enemy', 50, 15, { kind: 'jardinero' }).e('enemy', 34, 6, { kind: 'dron' })
      .e('memory', 54, 3, { n: 0 });
  } },
  { id: 'fuente', name: 'Fuente de los Leones', zone: 'jardines', x: 3, y: 1, w: 1, h: 1, build(b) {
    b.walls();
    b.plat(4, 11, 5).plat(7, 7, 5);     // subida hacia el cerrojo
    b.lock(8, 0, 4, 3);                 // cerrojo del Palacio
    b.fill(24, 9, 6, 2);                // repisa hacia la Meseta (doble salto)
    b.fill(14, 13, 7, 2);               // pila de la fuente
    b.brk(22, 15, 3, 2);                // suelo agrietado: atajo a las cuevas
    b.d('lionfountain', 17, 13).d('arcade', 4, 15).d('cypress', 27, 9).d('lamp', 12, 15).d('vines', 18, 2).d('vines', 26, 2)
      .d('lockdoor', 10, 3).d('bush', 2, 15, { layer: 'fg' });
    b.e('item', 17, 12, { ability: 'double' }).e('terminal', 26, 15).e('enemy', 22, 5, { kind: 'dron' })
      .e('elevator', 5, 15, { to: 'centinela', flag: 'centinelaDead', id: 'ascJ' });
  } },

  // ───────────── LA MESETA ─────────────
  { id: 'llanura', name: 'Llanura de los Molinos', zone: 'meseta', x: 4, y: 1, w: 2, h: 1, build(b) {
    b.walls();
    b.fill(0, 9, 7, 2);                 // repisa de llegada desde la fuente
    b.plat(7, 12, 3);
    b.fill(24, 13, 8, 2).fill(44, 12, 6, 3);
    b.plat(30, 9, 4).plat(50, 8, 4);
    b.fill(52, 4, 5, 1);
    b.d('windmill', 18, 15).d('windmill', 40, 15).d('hay', 9, 15).d('hay', 34, 15).d('fence', 13, 15).d('fence', 57, 15).d('drytree', 27, 13)
      .d('rock', 47, 12).d('grassfg', 5, 15, { layer: 'fg' }).d('grassfg', 38, 15, { layer: 'fg' });
    b.e('terminal', 12, 15).e('enemy', 20, 15, { kind: 'toro' }).e('enemy', 37, 15, { kind: 'toro' }).e('enemy', 46, 6, { kind: 'dron' })
      .e('memory', 54, 4, { n: 1 });
  } },
  { id: 'molino', name: 'El Gran Molino', zone: 'meseta', x: 6, y: 1, w: 1, h: 1, boss: 'gigante', build(b) {
    b.walls();
    b.plat(3, 10, 5).plat(22, 10, 5);
    b.d('millstone', 4, 15).d('sacks', 26, 15).d('sacks', 9, 15).d('beam', 15, 2);
    b.e('boss', 17, 15, { kind: 'gigante' });
  } },

  // ───────────── POBLADO IBÉRICO / GRUTA ─────────────
  { id: 'pozo', name: 'Pozo del Castro', zone: 'poblado', x: 1, y: 2, w: 1, h: 2, build(b) {
    b.walls();
    b.fill(21, 15, 9, 2);               // repisa hacia las cuevas pintadas
    b.plat(16, 28, 4).plat(10, 24, 4).plat(16, 20, 4).plat(10, 16, 4).plat(9, 12, 4).plat(14, 8, 4).plat(11, 4, 4);
    b.d('torch', 6, 30).d('torch', 24, 12).d('torch', 4, 9).d('bones', 20, 32).d('painting', 25, 30).d('roots', 18, 2).d('roots', 7, 17);
    b.e('enemy', 20, 9, { kind: 'murcielago' }).e('enemy', 5, 21, { kind: 'murcielago' }).e('enemy', 24, 32, { kind: 'escupidor' });
  } },
  { id: 'cuevas', name: 'Cuevas Pintadas', zone: 'poblado', x: 2, y: 2, w: 2, h: 1, build(b) {
    b.walls();
    b.plat(38, 8, 5).plat(30, 11, 4);
    b.fill(54, 8, 4, 7).brk(54, 11, 1, 4).clear(55, 11, 3, 4);  // escondite tras el muro rompible
    b.d('painting', 14, 12).d('painting', 26, 10).d('painting', 44, 12).d('torch', 6, 12).d('torch', 22, 12).d('torch', 36, 12)
      .d('hut', 18, 15).d('pottery', 11, 15).d('pottery', 33, 15).d('bones', 48, 15).d('roots', 20, 2).d('roots', 42, 2);
    b.e('terminal', 8, 15).e('npc', 21, 15, { id: 'ermitano' })
      .e('enemy', 30, 15, { kind: 'escupidor' }).e('enemy', 46, 6, { kind: 'murcielago' })
      .e('memory', 40, 8, { n: 2 }).e('core', 56, 15, { n: 0 });
  } },
  { id: 'paso', name: 'Paso del Tesoro', zone: 'gruta', x: 2, y: 3, w: 1, h: 1, build(b) {
    b.walls();
    b.fill(8, 2, 14, 10);               // techo bajo: solo se cruza con el impulso
    b.spikes(12, 14, 6);
    b.d('goldpile', 4, 15).d('goldpile', 26, 15).d('torch', 4, 9).d('torch', 25, 9).d('bones', 20, 15).d('stalactites', 24, 2);
    b.e('enemy', 25, 6, { kind: 'murcielago' });
  } },
  { id: 'gruta', name: 'Gruta del Cuélebre', zone: 'gruta', x: 3, y: 3, w: 1, h: 1, boss: 'cuelebre', build(b) {
    b.walls();
    b.plat(2, 10, 5).plat(23, 10, 5);
    b.d('goldpile', 5, 15).d('goldpile', 24, 15).d('goldpile', 15, 15).d('column', 9, 15).d('column', 21, 15).d('torch', 2, 7).d('torch', 27, 7);
    b.e('boss', 15, 15, { kind: 'cuelebre' });
  } },

  // ───────────── EL FIORDO ─────────────
  { id: 'garganta', name: 'Garganta Helada', zone: 'fiordo', x: 7, y: 0, w: 1, h: 2, build(b) {
    b.walls();
    b.fill(2, 2, 10, 26);               // pared izquierda del tiro
    b.fill(18, 15, 12, 17);             // pared derecha y repisa superior
    b.d('icefall', 15, 2).d('frozen', 6, 32).d('pine', 24, 15).d('pine', 27, 15).d('icicles', 14, 2).d('icicles', 22, 2);
    b.e('enemy', 22, 8, { kind: 'dron' });
  } },
  { id: 'fiordo', name: 'El Fiordo', zone: 'fiordo', x: 8, y: 0, w: 2, h: 1, build(b) {
    b.walls();
    b.fill(10, 11, 8, 4).fill(26, 9, 6, 6).fill(40, 12, 6, 3);
    b.plat(34, 7, 4).plat(20, 7, 3);
    b.fill(52, 5, 4, 1);                // repisa alta (salto en pared)
    b.d('pine', 4, 15).d('pine', 22, 15).d('pine', 37, 15).d('cabin', 47, 15).d('banner', 29, 9).d('frozen', 14, 11).d('pine', 58, 15)
      .d('icicles', 30, 2).d('icicles', 44, 2).d('snowfg', 8, 15, { layer: 'fg' }).d('snowfg', 33, 15, { layer: 'fg' });
    b.e('terminal', 6, 15).e('npc', 20, 15, { id: 'ingrid' })
      .e('enemy', 24, 15, { kind: 'lobo' }).e('enemy', 44, 12, { kind: 'lobo' }).e('enemy', 36, 4, { kind: 'dron' })
      .e('memory', 29, 9, { n: 3 }).e('core', 54, 5, { n: 1 });
  } },

  // ───────────── PARQUE TECNOLÓGICO ─────────────
  { id: 'biodomo', name: 'Biodomo', zone: 'tecnologico', x: 8, y: 1, w: 2, h: 1, build(b) {
    b.walls();
    b.plat(49, 10, 5).plat(50, 5, 4);   // subida de vuelta al fiordo
    b.fill(10, 13, 6, 2).fill(30, 12, 5, 3);
    b.fill(3, 6, 6, 1).plat(24, 8, 4).plat(28, 4, 4);
    b.d('tank', 6, 15).d('tank', 20, 15).d('tank', 38, 15).d('server', 26, 15).d('server', 44, 15).d('monitor', 13, 13)
      .d('neonsign', 32, 4).d('cables', 16, 2).d('cables', 40, 2).d('lablamp', 12, 2).d('lablamp', 34, 2);
    b.e('terminal', 42, 15).e('enemy', 20, 15, { kind: 'guardia' }).e('enemy', 37, 15, { kind: 'guardia' })
      .e('enemy', 28, 7, { kind: 'dron' }).e('enemy', 9, 2, { kind: 'torreta' })
      .e('memory', 6, 6, { n: 4 }).e('core', 30, 4, { n: 2 });
  } },
  { id: 'centinela', name: 'Sala del Centinela', zone: 'tecnologico', x: 10, y: 1, w: 1, h: 1, boss: 'centinela', build(b) {
    b.walls();
    b.plat(3, 10, 5).plat(22, 10, 5);
    b.d('server', 4, 15).d('server', 26, 15).d('cables', 8, 2).d('cables', 22, 2).d('lablamp', 15, 2);
    b.e('boss', 18, 15, { kind: 'centinela' }).e('elevator', 26, 15, { to: 'fuente', flag: 'centinelaDead', id: 'ascT' });
  } },

  // ───────────── EL PALACIO ─────────────
  { id: 'galeria', name: 'Galería de los Espejos', zone: 'palacio', x: 3, y: 0, w: 2, h: 1, build(b) {
    b.walls();
    b.plat(6, 13, 7);                   // llegada desde la fuente
    b.plat(20, 10, 4).plat(44, 9, 4).fill(50, 5, 6, 1);
    b.d('column', 4, 15).d('column', 16, 15).d('column', 28, 15).d('column', 40, 15).d('column', 54, 15)
      .d('portrait', 10, 8).d('mirror', 22, 12).d('portrait', 34, 8).d('mirror', 46, 12)
      .d('chandelier', 12, 2).d('chandelier', 30, 2).d('chandelier', 48, 2).d('drapes', 2, 2).d('drapes', 57, 2);
    b.e('enemy', 24, 15, { kind: 'guardia' }).e('enemy', 44, 15, { kind: 'guardia' }).e('enemy', 34, 5, { kind: 'dron' })
      .e('memory', 53, 5, { n: 5 });
  } },
  { id: 'trono', name: 'Salón del Trono', zone: 'palacio', x: 5, y: 0, w: 1, h: 1, build(b) {
    b.walls();
    b.fill(17, 13, 10, 2);
    b.d('throne', 22, 13).d('statue', 9, 15).d('column', 4, 15).d('column', 15, 15).d('chandelier', 15, 2).d('drapes', 19, 2).d('drapes', 26, 2);
    b.e('terminal', 6, 15).e('record', 13, 15, { id: 'trono' }).e('elevator', 27, 13, { to: 'bunker', id: 'ascP' });
  } },

  // ───────────── LOS SÓTANOS ─────────────
  { id: 'bunker', name: 'El Búnker', zone: 'sotanos', x: 5, y: 2, w: 1, h: 1, build(b) {
    b.walls();
    b.plat(12, 8, 5).fill(20, 12, 4, 3);
    b.d('cell', 10, 15).d('cell', 16, 15).d('pipes', 4, 2).d('pipes', 20, 2).d('alarm', 14, 2).d('alarm', 26, 2).d('tank', 24, 12);
    b.e('elevator', 3, 15, { to: 'trono', id: 'ascB' }).e('terminal', 8, 15)
      .e('enemy', 17, 15, { kind: 'guardia' }).e('enemy', 26, 15, { kind: 'guardia' }).e('memory', 14, 8, { n: 6 });
  } },
  { id: 'maquina', name: 'La Máquina Eterna', zone: 'sotanos', x: 6, y: 2, w: 1, h: 1, boss: 'patron', build(b) {
    b.walls();
    b.plat(3, 10, 5).plat(22, 10, 5);
    b.d('pipes', 3, 2).d('pipes', 25, 2).d('alarm', 8, 2).d('alarm', 22, 2);
    b.e('boss', 21, 15, { kind: 'patron' }).e('memory', 5, 10, { n: 7, hidden: 'patronDead' });
  } },
];

// Puertas: [sala, lado (L/R/U/D), inicio (fila o columna local), tamaño]
export const DOORS = [
  ['puerta', 'R', 11, 4], ['patio', 'R', 11, 4], ['patio', 'D', 12, 3],
  ['fuente', 'R', 5, 4], ['fuente', 'U', 8, 4], ['fuente', 'D', 22, 3],
  ['llanura', 'R', 11, 4], ['molino', 'R', 11, 4],
  ['garganta', 'R', 11, 4],
  ['fiordo', 'D', 50, 4], ['biodomo', 'R', 11, 4],
  ['galeria', 'R', 11, 4],
  ['pozo', 'R', 11, 4], ['pozo', 'R', 28, 4], ['paso', 'R', 11, 4],
  ['bunker', 'R', 11, 4],
];

function roomAtCell(rooms, gx, gy) {
  return rooms.find((r) => gx >= r.x * SW && gy >= r.y * SH && gx < (r.x + r.w) * SW && gy < (r.y + r.h) * SH);
}

// Talla la abertura en ambas salas (solo sustituye roca: respeta plataformas, cerrojos y muros rompibles).
function carve(room, side, start, size) {
  const W = room.W, H = room.H, D = 3;
  const cut = (i, j) => { if (room.tiles[j]?.[i] === '#') room.tiles[j][i] = '.'; };
  for (let k = start; k < start + size; k++) for (let d = 0; d < D; d++) {
    if (side === 'L') cut(d, k);
    if (side === 'R') cut(W - 1 - d, k);
    if (side === 'U') cut(k, d);
    if (side === 'D') cut(k, H - 1 - d);
  }
}

export function buildWorld() {
  const rooms = ROOMS.map((def) => {
    const b = new Builder(def);
    def.build(b);
    return { ...def, W: b.W, H: b.H, tiles: b.t, ents: b.ents, deco: b.deco, px: def.x * SW * 16, py: def.y * SH * 16, doors: [] };
  });
  const byId = Object.fromEntries(rooms.map((r) => [r.id, r]));
  for (const [id, side, start, size] of DOORS) {
    const a = byId[id];
    const gx = a.x * SW, gy = a.y * SH;
    let nx, ny, other;
    if (side === 'R') { nx = gx + a.W; ny = gy + start; }
    if (side === 'L') { nx = gx - 1; ny = gy + start; }
    if (side === 'D') { nx = gx + start; ny = gy + a.H; }
    if (side === 'U') { nx = gx + start; ny = gy - 1; }
    other = roomAtCell(rooms, nx, ny);
    if (!other) throw new Error(`Puerta de ${id} (${side}) no lleva a ninguna sala`);
    const opp = { R: 'L', L: 'R', U: 'D', D: 'U' }[side];
    const ostart = side === 'L' || side === 'R' ? gy + start - other.y * SH : gx + start - other.x * SW;
    carve(a, side, start, size); carve(other, opp, ostart, size);
    a.doors.push({ side, start, size, to: other.id }); other.doors.push({ side: opp, start: ostart, size, to: a.id });
  }
  return rooms;
}

export function roomAt(rooms, wx, wy) {
  return rooms.find((r) => wx >= r.px && wy >= r.py && wx < r.px + r.W * 16 && wy < r.py + r.H * 16);
}

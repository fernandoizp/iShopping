// Todo el pixel art del juego, dibujado a mano como cuadrículas de texto (1 carácter = 1 píxel).
// Las letras corresponden a la paleta PAL de gfx.js.
import { sprPair, sprite, glow, PAL } from './gfx.js';

// ---------------- Protagonista: Brasa, un pequeño caballero encapuchado ----------------
// 16x20, mirando a la derecha. Cabeza + torso fijos; las piernas cambian por frame.
const HEAD = [
  '................',
  '......kkkkk.....',
  '....kkNNNNNkk...',
  '...kNNbbNNNNNk..',
  '...kNbNNNNNNNNk.',
  '..kNNNNNkkkkkNk.',
  '..kNNNNkkkkkkkk.',
  '..kNNNNkkwkkwkk.',
  '..kNNNNkkckkckk.',
  '..knNNNNkkkkkNk.',
  '...knNNNNNNNNk..',
];
const TORSO = [
  '...kRrrrrrrrRk..',
  '..kRrroooorrrRk.',
  '..knRRRRRRRRRnk.',
  '..kNNNNNNNNNNNk.',
  '..kNbNNNNNNNNnk.',
  '...knNNNNNNNnk..',
];
const LEGS = {
  stand: ['....kGGk.kGGk...', '....kGk..kGGk...', '...keek..keeek..'],
  run1: ['....kGGkkGGk....', '...kGGk...kGk...', '..keek....keek..'],
  run2: ['.....kGGGGk.....', '.....kGkkGk.....', '....keekkeek....'],
  run3: ['....kGGk.kGGk...', '...kGGk...kGGk..', '..keek.....keek.'],
  jump: ['....kGGkkGGk....', '.....kGGkGk.....', '......keekk.....'],
  fall: ['...kGGk..kGGk...', '...kGk....kGk...', '..keek....keek..'],
  crouch: ['...kGGGGGGGGk...', '..keeek..keeek..', '................'],
};
function body(legs, bob = 0, lean = 0) {
  const rows = [...HEAD, ...TORSO, ...LEGS[legs]];
  let out = rows.map((r) => (lean > 0 ? '.' + r.slice(0, 15) : r));
  if (bob > 0) out = ['................', ...out.slice(0, 13), ...out.slice(14)];
  return out;
}
export const PLAYER = {
  idle0: sprPair(body('stand')),
  idle1: sprPair(body('stand', 1)),
  run0: sprPair(body('run1')),
  run1: sprPair(body('run2', 1)),
  run2: sprPair(body('run3')),
  run3: sprPair(body('run2', 1)),
  jump: sprPair(body('jump')),
  fall: sprPair(body('fall')),
  attack: sprPair(body('stand', 0, 1)),
  dash: sprPair(body('jump', 0, 1)),
  hurt: sprPair(body('fall').map((r) => r.replace(/[wc]/g, 'r'))),
};

// Tajo de espada (arco luminoso) 24x18.
export const SLASH = [
  sprPair([
    '..........wwww..........',
    '.......wwwttttww........',
    '.....wwtttcccttww.......',
    '....wttccc...ccttw......',
    '...wtcc........cctw.....',
    '...tc............ctw....',
    '..tc...............tw...',
    '..c.................tw..',
    '.....................tw.',
    '......................t.',
  ]),
  sprPair([
    '..........tttt..........',
    '.......tttccccct........',
    '.....ttccc....ccct......',
    '....tcc.........cct.....',
    '...tc.............ct....',
    '...c...............ct...',
    '...................ct...',
    '....................c...',
  ]),
];
export const SLASH_UP = [
  sprPair([
    '......ww........',
    '....wwttw.......',
    '...wtccttw......',
    '..wtc...ctw.....',
    '..tc.....ctw....',
    '.tc.......ct....',
    '.tc........tw...',
    'tc.........ct...',
    'tc..........tw..',
    'c...........ct..',
    '............ct..',
    '.............c..',
  ]),
];

// ---------------- Enemigos ----------------
// Caracol de cripta (rastrero) 16x12, dos frames.
const CRAWL_TOP = [
  '................',
  '.....kkkkk......',
  '...kkPPPPPkk....',
  '..kPPqqPPPPPk...',
  '.kPqPPPPpPPPPk..',
  '.kPPPPpppPPPPk..',
  'kpPPPpPPPpPPPk..',
  'kpPPPpPqPpPPkk.k',
  'kppPPPpppPPpkVky',
  'kkpppppppppkVVVk',
];
export const CRAWLER = [
  sprPair([...CRAWL_TOP, '.kVVVVVVVVVVVVVk', '.kkvkkvkkvkkvkk.']),
  sprPair([...CRAWL_TOP, '.kVVVVVVVVVVVVVk', '..kkvkkvkkvkkvk.']),
];

// Murciélago 16x10, alas arriba / abajo.
export const BAT = [
  sprPair([
    'k..............k',
    'kk............kk',
    'kPk..........kPk',
    'kPPk..k..k..kPPk',
    'kPpPkkpkkpkkPpPk',
    '.kPpPPprrpPPpPk.',
    '..kkPPpppppPkk..',
    '....kkPPPPkk....',
    '......kwwk......',
    '................',
  ]),
  sprPair([
    '................',
    '................',
    '......k..k......',
    '.....kpkkpk.....',
    '...kkPprrpPkk...',
    '.kkPPPpppppPPkk.',
    'kPPpPPPPPPPPpPPk',
    'kPpkkkPPPPkkkpPk',
    'kpk...kwwk...kpk',
    'kk............kk',
  ]),
];
export const BAT_HANG = sprPair([
  '......kkkk......',
  '......kPPk......',
  '.....kPppPk.....',
  '....kPPppPPk....',
  '....kpPrrPpk....',
  '....kpPPPPpk....',
  '....kpPPPPpk....',
  '.....kpPPpk.....',
  '......kkkk......',
  '................',
]);

// Planta escupidora 16x16, boca cerrada / abierta.
const SPIT_STEM = [
  '......kvvk......',
  '.....kvVVvk.....',
  '..kk.kvVVvk.kk..',
  '.kVVkkvVVvkkVVk.',
  'kVlVVkvVvkVVlVk.',
  '.kkvvvvvvvvvvkk.',
];
export const SPITTER = [
  sprPair([
    '.....kkkkkk.....',
    '...kkrrrrrrkk...',
    '..krrooorrrrRk..',
    '.krroyyorrrrRk..',
    '.krroorrrrrRRk..',
    '.kRrrrrrrrrRRk..',
    '..kRRkkkkkRRk...',
    '...kRRRRRRRk....',
    '....kkkkkkk.....',
    '.......kk.......',
    ...SPIT_STEM,
  ]),
  sprPair([
    '.....kkkkkk.....',
    '...kkrrrrrrkk...',
    '..krrooorrrrRk..',
    '.krroyyorrRRkk..',
    '.krroorrrRkkk...',
    '.kRrrrrrRkdd....',
    '.kRrrrrrRkkk....',
    '..kRRRRRRRRk....',
    '...kkkkkkkk.....',
    '.......kk.......',
    ...SPIT_STEM,
  ]),
];

// Coloso de Musgo (jefe) 32x32.
const BOSS_ROWS = [
  '...........kkkkkkkkk............',
  '.........kkgggggggggkk..........',
  '........kgghhhggggggggk.........',
  '.......kghhgggggggVVggk.........',
  '......kgghggggggVVlVVggk........',
  '......kgggggkkkkkVVVggggk.......',
  '......kggggkyyyyykgggggGk.......',
  '......kggggkyywyykggggGGk.......',
  '......kgggggkkkkkggggGGGk.......',
  '......kGgggggggggggggGGk........',
  '.......kGGgggggggggGGGk.........',
  '....kkkkkGGGGGGGGGGGkkkkk.......',
  '..kkggggkkkkkkkkkkkkgggggkk.....',
  '.kgghhgggGGVVVVVggggGGggggk.....',
  'kgghggggGGVVlVVVVgggGGGgggGk....',
  'kgggggGGkVVVVVVVVVgggGkkggGk....',
  'kgggGGGkkggVVVggggggGGk.kgGk....',
  'kVggGGk.kgggggggggggGGk.kgGk....',
  'kVVgGk..kgghhgggggggGGk.kVGk....',
  'kVlVk...kgggggggggggGGk.kVVk....',
  '.kVVk...kGgggggggggGGGk.kVlVk...',
  '..kk....kGGgggggggGGGk..kVVVk...',
  '........kkGGGGGGGGGGkk...kkk....',
  '........kGGkkkkkkkkGGk..........',
  '.......kgggGk....kgggGk.........',
  '.......kghggGk...kghggGk........',
  '.......kgggGGk...kgggGGk........',
  '......kgggggGk..kgggggGk........',
  '......kVgggGGk..kVgggGGk........',
  '.....kVVlVVVGk.kVVlVVVGk........',
  '.....kkkkkkkkk.kkkkkkkkk........',
  '................................',
];
export const BOSS = {
  idle: sprPair(BOSS_ROWS),
  angry: sprPair(BOSS_ROWS.map((r) => r.replace(/y/g, 'r').replace(/w/g, 'o'))),
};

// Proyectiles
export const SPORE = sprPair(['.kk.', 'kyok', 'kork', '.kk.']);
export const WAVE = sprPair([
  '...ww...',
  '..wttw..',
  '.wtcctw.',
  'wtc..ctw',
  'tc....ct',
]);

// ---------------- Objetos ----------------
export const HEART_ITEM = sprite([
  '.kkk..kkk.',
  'kryrkkrrRk',
  'kyorrrrrRk',
  'krorrrrrRk',
  'krrrrrrRRk',
  '.krrrrrRk.',
  '..krrrRk..',
  '...krRk...',
  '....kk....',
]);
export const ORB = sprite([
  '...kkkk...',
  '..kttttk..',
  '.ktwwttck.',
  'ktwwtttcSk',
  'kttttttcSk',
  'kttttccSSk',
  'kcttccSSSk',
  '.kcSSSSsk.',
  '..ksssk...',
  '...kkk....',
]);
export const ORB_FIRE = sprite([
  '...kkkk...',
  '..kyyyyk..',
  '.kywwyyok.',
  'kywwyyyoRk',
  'kyyyyyyork',
  'kyyyyoorRk',
  'koyyoorRRk',
  '.korRRRdk.',
  '..kRRdk...',
  '...kkk....',
]);
export const HEALTH = sprite(['.kk.', 'kowk', 'krok', '.kk.']);

// Flama del protagonista en el HUD (llena / vacía) 8x9
export const HUD_FLAME = sprite([
  '...kk...',
  '..kyk...',
  '.kyyok..',
  '.kyoyok.',
  'kyowyrok',
  'koyyyork',
  'kroyorRk',
  '.kRrrRk.',
  '..kkkk..',
]);
export const HUD_FLAME_EMPTY = sprite([
  '...kk...',
  '..kGk...',
  '.kGKGk..',
  '.kGKKGk.',
  'kGKKKKGk',
  'kGKKKKGk',
  'kGKKKKGk',
  '.kGGGGk.',
  '..kkkk..',
]);

// Santuario de guardado 16x32 (la llama flota encima).
export const SHRINE = sprite([
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '...kkkkkkkkkk...',
  '..khhhhhhhhhgk..',
  '..kgggggggggGk..',
  '...kGGGGGGGGk...',
  '....kghhggGk....',
  '....kggggGGk....',
  '....kgcwcgGk....',
  '....kgtctgGk....',
  '....kggcggGk....',
  '....kggggGGk....',
  '....kgggGGGk....',
  '....kVgggGGk....',
  '....kVVggGGk....',
  '...kkkkkkkkkk...',
  '..khhhhhhhhhgk..',
  '..kgggggggggGk..',
  '.kkkkkkkkkkkkkk.',
  '.kghhgggggggGGk.',
  '.kGGGGGGGGGGGGk.',
  '.kkkkkkkkkkkkkk.',
]);
export const FLAME = [
  sprite(['...y....', '..yoy...', '..yooy..', '.yowoy..', '.yowwoy.', '.oyyyoo.', '..oro...']),
  sprite(['....y...', '...yoy..', '..yooy..', '.yowoy..', '.yowwoy.', '.ooyyoo.', '..oro...']),
  sprite(['........', '...yy...', '..yooy..', '.yoowy..', '.yowwoy.', '.oyyyro.', '..oro...']),
];
export const TORCH = sprite(['.kkkkk..', 'kGgggGk.', '.kGgGk..', '..kGk...', '..kek...', '..kek...', '..kek...', '...k....']);

// Altar final 32x24
export const ALTAR = sprite([
  '................................',
  '................................',
  '................................',
  '.........kkkkkkkkkkkkkk.........',
  '........kdRRRRRRRRRRRRdk........',
  '.......kRRrrrrrrrrrrrrRRk.......',
  '.......kkkkkkkkkkkkkkkkkk.......',
  '........kgghhhhhhhhhhggk........',
  '.........kgggggggggggGk.........',
  '..........kgggyygggGGk..........',
  '..........kggyoyggGGGk..........',
  '..........kgggyggGGGGk..........',
  '..........kggggggGGGGk..........',
  '..........kgggggGGGGGk..........',
  '..........kVggggGGGGGk..........',
  '..........kVVgggGGGGVk..........',
  '.........kkkkkkkkkkkkkk.........',
  '........kghhhhhhhhhhhhgk........',
  '.......kggggggggggggggGGk.......',
  '......kkkkkkkkkkkkkkkkkkkk......',
  '......kghhhhhhhhhhhhhhhhgk......',
  '......kgggggggggggggggggGk......',
  '......kGGGGGGGGGGGGGGGGGGk......',
  '......kkkkkkkkkkkkkkkkkkkk......',
]);

// Brillos tramados reutilizables
export const GLOW = {
  torch: glow(22, PAL.o, 0.55),
  ember: glow(10, PAL.y, 0.6),
  blue: glow(16, PAL.c, 0.5),
  big: glow(40, PAL.o, 0.45),
  player: glow(26, PAL.c, 0.22),
};

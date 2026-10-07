// Entrada unificada (teclado, mando y táctil) con búfer de pulsaciones.
const KEYS = {
  left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'], up: ['ArrowUp', 'KeyW'], down: ['ArrowDown', 'KeyS'],
  jump: ['KeyZ', 'Space', 'KeyJ'], attack: ['KeyX', 'KeyK'], dash: ['KeyC', 'KeyL', 'ShiftLeft', 'ShiftRight'],
  heal: ['KeyV', 'KeyQ', 'KeyF'], start: ['Enter', 'Escape', 'KeyP'], map: ['KeyM', 'Tab'], mute: ['KeyN'],
};
const ACTIONS = Object.keys(KEYS);
const BUFFER = 7; // fotogramas que dura una pulsación sin consumir

export class Input {
  constructor() {
    this.keys = new Set(); this.touch = new Set();
    this.held = {}; this.prev = {}; this.buf = {};
    this.device = 'keyboard';
    addEventListener('keydown', (e) => {
      if (ACTIONS.some((a) => KEYS[a].includes(e.code))) e.preventDefault();
      this.keys.add(e.code); this.device = 'keyboard'; this.onAny?.();
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => { this.keys.clear(); this.touch.clear(); });
    this.bindTouch();
  }
  bindTouch() {
    const pad = document.getElementById('touch');
    if (!pad) return;
    const active = new Map();
    const sync = () => { this.touch.clear(); for (const a of active.values()) for (const k of a.split(' ')) this.touch.add(k); };
    const at = (x, y) => document.elementFromPoint(x, y)?.closest?.('[data-a]')?.dataset.a;
    const move = (e) => {
      for (const t of e.changedTouches) { const a = at(t.clientX, t.clientY); if (a) active.set(t.identifier, a); else active.delete(t.identifier); }
      sync(); e.preventDefault();
    };
    const end = (e) => { for (const t of e.changedTouches) active.delete(t.identifier); sync(); e.preventDefault(); };
    pad.addEventListener('touchstart', (e) => { this.device = 'touch'; this.onAny?.(); move(e); }, { passive: false });
    pad.addEventListener('touchmove', move, { passive: false });
    pad.addEventListener('touchend', end, { passive: false });
    pad.addEventListener('touchcancel', end, { passive: false });
  }
  update() {
    this.prev = this.held;
    const h = {};
    for (const a of ACTIONS) h[a] = KEYS[a].some((k) => this.keys.has(k)) || this.touch.has(a);
    for (const gp of navigator.getGamepads?.() || []) {
      if (!gp) continue;
      const b = (i) => gp.buttons[i]?.pressed, ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
      h.left ||= b(14) || ax < -0.4; h.right ||= b(15) || ax > 0.4;
      h.up ||= b(12) || ay < -0.5; h.down ||= b(13) || ay > 0.5;
      h.jump ||= b(0); h.attack ||= b(2); h.dash ||= b(5) || b(7) || b(1); h.heal ||= b(3) || b(4) || b(6);
      h.start ||= b(9); h.map ||= b(8);
      if (gp.buttons.some((x) => x.pressed)) { this.device = 'gamepad'; this.onAny?.(); }
    }
    this.held = h;
    for (const a of ACTIONS) {
      if (h[a] && !this.prev[a]) this.buf[a] = BUFFER;
      else if (this.buf[a] > 0) this.buf[a]--;
    }
  }
  down(a) { return !!this.held[a]; }
  // pressed consume la pulsación del búfer: no se pierde durante el hitstop o la pausa breve
  pressed(a) { if (this.buf[a] > 0) { this.buf[a] = 0; return true; } return false; }
  peek(a) { return this.buf[a] > 0; }
  released(a) { return !this.held[a] && !!this.prev[a]; }
  clear() { this.buf = {}; }
}

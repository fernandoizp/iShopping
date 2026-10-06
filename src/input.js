// Entrada unificada: teclado, mando (Gamepad API) y botones táctiles.
const KEYS = {
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  up: ['ArrowUp', 'KeyW'],
  down: ['ArrowDown', 'KeyS'],
  jump: ['KeyZ', 'KeyJ', 'Space'],
  attack: ['KeyX', 'KeyK'],
  dash: ['KeyC', 'KeyL', 'ShiftLeft', 'ShiftRight'],
  start: ['Enter', 'Escape', 'KeyP'],
  map: ['KeyM', 'Tab'],
  mute: ['KeyN'],
};
const ACTIONS = Object.keys(KEYS);

export class Input {
  constructor() {
    this.keys = new Set();
    this.touch = new Set();
    this.held = {};
    this.prev = {};
    this.lastDevice = 'keyboard';
    addEventListener('keydown', (e) => {
      if (ACTIONS.some((a) => KEYS[a].includes(e.code))) e.preventDefault();
      this.keys.add(e.code);
      this.lastDevice = 'keyboard';
      this.onAny?.();
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());
    this.bindTouch();
  }

  bindTouch() {
    const pad = document.getElementById('touch');
    if (!pad) return;
    const active = new Map();
    const update = () => {
      this.touch.clear();
      for (const a of active.values()) a.split(' ').forEach((x) => this.touch.add(x));
    };
    const hit = (x, y) => {
      const el = document.elementFromPoint(x, y);
      return el?.closest?.('[data-a]')?.dataset.a;
    };
    const move = (e) => {
      for (const t of e.changedTouches) {
        const a = hit(t.clientX, t.clientY);
        if (a) active.set(t.identifier, a); else active.delete(t.identifier);
      }
      update();
      e.preventDefault();
    };
    const end = (e) => {
      for (const t of e.changedTouches) active.delete(t.identifier);
      update();
      e.preventDefault();
    };
    pad.addEventListener('touchstart', (e) => { this.lastDevice = 'touch'; this.onAny?.(); move(e); }, { passive: false });
    pad.addEventListener('touchmove', move, { passive: false });
    pad.addEventListener('touchend', end, { passive: false });
    pad.addEventListener('touchcancel', end, { passive: false });
  }

  update() {
    this.prev = this.held;
    const h = {};
    for (const a of ACTIONS) h[a] = KEYS[a].some((k) => this.keys.has(k)) || this.touch.has(a);
    const gps = navigator.getGamepads?.() || [];
    for (const gp of gps) {
      if (!gp) continue;
      const b = (i) => gp.buttons[i]?.pressed;
      const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
      h.left ||= b(14) || ax < -0.4;
      h.right ||= b(15) || ax > 0.4;
      h.up ||= b(12) || ay < -0.5;
      h.down ||= b(13) || ay > 0.5;
      h.jump ||= b(0);
      h.attack ||= b(2) || b(1);
      h.dash ||= b(5) || b(7) || b(4) || b(6);
      h.start ||= b(9);
      h.map ||= b(8);
      if (gp.buttons.some((x) => x.pressed)) { this.lastDevice = 'gamepad'; this.onAny?.(); }
    }
    this.held = h;
  }

  down(a) { return !!this.held[a]; }
  pressed(a) { return !!this.held[a] && !this.prev[a]; }
  released(a) { return !this.held[a] && !!this.prev[a]; }
}

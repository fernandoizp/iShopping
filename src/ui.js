// Interfaz: HUD, diálogos, ventanas emergentes, subtítulos, mapa y pantallas.
import { W, H, text, wrap, FONT_TITLE, FONT_UI } from './core/gfx.js';
import { ZONES } from './world/zones.js';
import { SW, SH } from './world/rooms.js';
import { MEMORIES } from './story.js';

const C = { ink: '#07050a', panel: 'rgba(10,8,14,0.88)', line: '#8a7a5a', gold: '#d8a43a', text: '#e8e0d0', dim: '#8a8296', cyan: '#7fe8ff', red: '#d0302a' };

function frame(ctx, x, y, w, h, col = C.line) {
  ctx.fillStyle = C.panel; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = col; ctx.fillRect(x, y, w, 1); ctx.fillRect(x, y + h - 1, w, 1); ctx.fillRect(x, y, 1, h); ctx.fillRect(x + w - 1, y, 1, h);
  // esquinas ornamentales
  for (const [cx, cy] of [[x, y], [x + w - 3, y], [x, y + h - 3], [x + w - 3, y + h - 3]]) { ctx.fillStyle = C.gold; ctx.fillRect(cx, cy, 3, 3); }
}

export function drawHUD(ctx, g) {
  const h = g.hero;
  // integridad: celdas hexagonales
  for (let i = 0; i < h.maxHp; i++) {
    const x = 12 + i * 13, y = 12, on = i < h.hp;
    ctx.fillStyle = C.ink; ctx.beginPath(); ctx.moveTo(x + 5, y - 1); ctx.lineTo(x + 11, y + 2); ctx.lineTo(x + 11, y + 10); ctx.lineTo(x + 5, y + 13); ctx.lineTo(x - 1, y + 10); ctx.lineTo(x - 1, y + 2); ctx.fill();
    ctx.fillStyle = on ? '#c4cad2' : '#2a2630'; ctx.beginPath(); ctx.moveTo(x + 5, y + 1); ctx.lineTo(x + 9, y + 3); ctx.lineTo(x + 9, y + 9); ctx.lineTo(x + 5, y + 11); ctx.lineTo(x + 1, y + 9); ctx.lineTo(x + 1, y + 3); ctx.fill();
    if (on) { ctx.fillStyle = '#7fe8ff'; ctx.fillRect(x + 3, y + 4, 5, 4); ctx.fillStyle = '#e8fbff'; ctx.fillRect(x + 3, y + 4, 2, 1); }
  }
  // energía: tres segmentos (cada uno cura una celda)
  const ex = 12, ey = 30;
  ctx.fillStyle = C.ink; ctx.fillRect(ex - 1, ey - 1, 3 * 26 + 1, 6);
  for (let s = 0; s < 3; s++) {
    const fill = Math.max(0, Math.min(1, (h.energy - s * 33) / 33));
    ctx.fillStyle = '#16222a'; ctx.fillRect(ex + s * 26, ey, 25, 4);
    ctx.fillStyle = fill >= 1 ? '#7fe8ff' : '#3a8aa0'; ctx.fillRect(ex + s * 26, ey, Math.round(25 * fill), 4);
    if (fill >= 1) { ctx.fillStyle = '#e8fbff'; ctx.fillRect(ex + s * 26, ey, 25, 1); }
  }
  if (h.healT > 0) { ctx.fillStyle = '#e8fbff'; ctx.fillRect(ex, ey + 6, Math.round(77 * h.healT / 48), 1); }
  // recuerdos
  const m = g.save.memories.length;
  ctx.fillStyle = '#5a9ad6'; ctx.beginPath(); ctx.moveTo(W - 46, 12); ctx.lineTo(W - 42, 18); ctx.lineTo(W - 46, 24); ctx.lineTo(W - 50, 18); ctx.fill();
  text(ctx, `${m}/8`, W - 38, 18, 8, C.text);
  // barra del jefe
  const b = g.boss;
  if (b && !['sleep', 'dead'].includes(b.state) && g.bossBarT > 0) {
    const bw = 300, bx = (W - bw) / 2, by = H - 18, a = Math.min(1, g.bossBarT / 30);
    ctx.globalAlpha = a;
    text(ctx, b.name, W / 2, by - 9, 10, '#e8d29a', 'center', { font: FONT_TITLE, weight: 'bold' });
    ctx.fillStyle = C.ink; ctx.fillRect(bx - 1, by - 1, bw + 2, 7);
    ctx.fillStyle = '#3a1418'; ctx.fillRect(bx, by, bw, 5);
    const f = Math.max(0, b.hp / b.maxHp);
    ctx.fillStyle = b.phase2 ? '#e2562a' : '#b23246'; ctx.fillRect(bx, by, Math.round(bw * f), 5);
    ctx.fillStyle = '#ffcf8a'; ctx.fillRect(bx, by, Math.round(bw * f), 1);
    ctx.globalAlpha = 1;
  }
}

export function drawZoneBanner(ctx, z, t) {
  if (!z || t <= 0) return;
  const a = Math.min(1, t / 30, (260 - t) / 40);
  if (a <= 0) return;
  ctx.globalAlpha = Math.max(0, Math.min(1, (260 - t) / 40, t / 30));
  const y = 70;
  const grad = ctx.createLinearGradient(0, 0, W, 0); grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(0.5, 'rgba(0,0,0,0.6)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad; ctx.fillRect(0, y - 22, W, 48);
  ctx.fillStyle = C.gold; ctx.fillRect(W / 2 - 90, y + 9, 180, 1);
  text(ctx, z.name, W / 2, y - 4, 18, '#efe2c8', 'center', { font: FONT_TITLE, weight: 'bold' });
  text(ctx, z.sub, W / 2, y + 17, 8, '#b8a890', 'center');
  ctx.globalAlpha = 1;
}

export function drawPrompt(ctx, x, y, label, t) {
  const bob = Math.round(Math.sin(t * 0.1) * 1.5);
  text(ctx, '▲ ' + label, x, y - 8 + bob, 8, '#ffe8b0', 'center');
}

// Diálogo con efecto máquina de escribir
export function drawDialog(ctx, d) {
  const x = 30, y = H - 84, w = W - 60, h = 70;
  frame(ctx, x, y, w, h, d.memory ? '#5a9ad6' : C.line);
  if (d.name) text(ctx, d.name, x + 10, y + 10, 9, d.memory ? '#9fd6ff' : '#e8c88a', 'left', { font: FONT_TITLE, weight: 'bold' });
  if (d.role) text(ctx, d.role, x + w - 10, y + 10, 8, C.dim, 'right');
  const full = d.lines[d.i] || '';
  const shown = full.slice(0, Math.floor(d.chars));
  const ls = wrap(shown, 9, w - 24);
  ls.forEach((l, k) => text(ctx, l, x + 10, y + 27 + k * 11, 9, C.text));
  if (d.chars >= full.length && (d.t >> 4) % 2) text(ctx, '▼', x + w - 12, y + h - 9, 8, C.gold, 'center');
}

export function drawPopup(ctx, p, t) {
  const w = 300, h = 76, x = (W - w) / 2, y = 80;
  const a = Math.min(1, p.t / 20);
  ctx.globalAlpha = a;
  frame(ctx, x, y, w, h, p.memory ? '#5a9ad6' : C.gold);
  text(ctx, p.title, W / 2, y + 16, 12, p.memory ? '#9fd6ff' : '#ffe08a', 'center', { font: FONT_TITLE, weight: 'bold' });
  wrap(p.body, 9, w - 30).forEach((l, k) => text(ctx, l, W / 2, y + 36 + k * 11, 9, C.text, 'center'));
  if (p.t > 50 && (t >> 4) % 2) text(ctx, '▼', W / 2, y + h - 8, 8, C.gold, 'center');
  ctx.globalAlpha = 1;
}

export function drawSubtitle(ctx, s) {
  if (!s || s.t <= 0) return;
  ctx.globalAlpha = Math.min(1, s.t / 20, (s.max - s.t + 1) / 10);
  const ls = wrap(s.text, 10, W - 120, { font: FONT_TITLE });
  ls.forEach((l, k) => text(ctx, l, W / 2, 46 + k * 13, 10, '#ffd0b0', 'center', { font: FONT_TITLE }));
  ctx.globalAlpha = 1;
}

// Mapa del mundo en la pausa
export function drawMap(ctx, g, t) {
  ctx.fillStyle = 'rgba(6,4,10,0.92)'; ctx.fillRect(0, 0, W, H);
  text(ctx, 'HACIENDA NÁPOLES', W / 2, 18, 14, '#efe2c8', 'center', { font: FONT_TITLE, weight: 'bold' });
  const rooms = g.world, cw = 34, ch = 20;
  const maxX = Math.max(...rooms.map((r) => r.x + r.w)), maxY = Math.max(...rooms.map((r) => r.y + r.h));
  const ox = Math.round((W - maxX * cw) / 2), oy = 40;
  for (const r of rooms) {
    if (!g.save.visited.includes(r.id)) continue;
    const z = ZONES[r.zone], x = ox + r.x * cw, y = oy + r.y * ch, w = r.w * cw, h = r.h * ch;
    ctx.fillStyle = '#d8ccb6'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = z.ramp[3]; ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
    ctx.fillStyle = z.ramp[2]; ctx.fillRect(x + 1, y + h - 4, w - 2, 3);
    // puertas
    ctx.fillStyle = '#d8ccb6';
    for (const d of r.doors) {
      if (d.side === 'R') ctx.fillRect(x + w - 1, y + Math.round((d.start + d.size / 2) / SH * ch) - 2, 3, 4);
      if (d.side === 'D') ctx.fillRect(x + Math.round((d.start + d.size / 2) / SW * cw) - 2, y + h - 1, 4, 3);
    }
    if (r.ents.some((e) => e.type === 'terminal')) { ctx.fillStyle = '#3ee8ff'; ctx.fillRect(x + 3, y + 3, 3, 3); }
    if (r.boss && !g.save.flags[r.boss + 'Dead']) { ctx.fillStyle = C.red; ctx.fillRect(x + w / 2 - 2, y + h / 2 - 2, 4, 4); }
    if (r.ents.some((e) => e.type === 'memory' && !g.save.memories.includes(e.n))) { ctx.fillStyle = '#9fd6ff'; ctx.fillRect(x + w - 6, y + 3, 2, 2); }
  }
  // posición del héroe
  const r = g.room;
  if ((t >> 3) % 2) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(ox + r.x * cw + Math.floor(g.hero.cx / (SW * 16) * cw) - 2, oy + r.y * ch + Math.floor(g.hero.cy / (SH * 16) * ch) - 2, 4, 4);
  }
  // panel inferior: zona, habilidades y estadísticas
  const y0 = 140;
  text(ctx, ZONES[r.zone].name + ' · ' + r.name, W / 2, y0, 9, '#e8c88a', 'center');
  const ab = g.save.abilities, items = [['double', 'PROPULSOR'], ['dash', 'IMPULSO'], ['wall', 'GARRAS'], ['key', 'SELLO']];
  items.forEach(([k, n], i) => {
    const x = 70 + i * 90, has = ab[k];
    ctx.fillStyle = has ? '#d8a43a' : '#2a2630'; ctx.beginPath(); ctx.arc(x, y0 + 26, 7, 0, 7); ctx.fill();
    ctx.fillStyle = has ? (k === 'key' ? '#b23246' : '#7fe8ff') : '#16121a'; ctx.beginPath(); ctx.arc(x, y0 + 26, 3, 0, 7); ctx.fill();
    text(ctx, has ? n : '???', x, y0 + 42, 8, has ? C.text : C.dim, 'center');
  });
  const mins = Math.floor(g.save.time / 3600), secs = Math.floor(g.save.time / 60) % 60;
  text(ctx, `RECUERDOS ${g.save.memories.length}/8    NÚCLEOS ${g.save.cores.length}/3    TIEMPO ${mins}:${String(secs).padStart(2, '0')}`, W / 2, y0 + 64, 8, C.dim, 'center');
  const dev = g.input.device;
  const help = dev === 'touch' ? 'A SALTAR · B ESPADA · R IMPULSO · H CURAR · ▲ HABLAR' : 'Z SALTAR · X ESPADA · C IMPULSO · V CURAR · ▲ HABLAR · N SONIDO';
  text(ctx, help, W / 2, y0 + 82, 8, '#6a6274', 'center');
  text(ctx, 'ENTER · VOLVER', W / 2, H - 12, 8, C.gold, 'center');
  // lista de recuerdos encontrados
}

export function drawMemoryList(ctx, g) {
  g.save.memories.slice().sort((a, b) => a - b).forEach((n, k) => text(ctx, MEMORIES[n][0], 20, 60 + k * 10, 8, '#9fd6ff'));
}

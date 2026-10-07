// Audio sintetizado con WebAudio: efectos, música por zona y ambiente, con reverberación.
let ac = null, master, musicBus, sfxBus, ambBus, verb, noiseBuf;
let muted = false;
try { muted = localStorage.getItem('paradise-mute') === '1'; } catch {}

export function unlockAudio() {
  if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ac = new AC();
  master = ac.createGain(); master.gain.value = muted ? 0 : 0.7;
  const comp = ac.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 4;
  master.connect(comp); comp.connect(ac.destination);
  // reverberación: respuesta al impulso generada (sala grande de piedra)
  verb = ac.createConvolver();
  const len = ac.sampleRate * 2.8, ir = ac.createBuffer(2, len, ac.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
  verb.buffer = ir;
  const verbGain = ac.createGain(); verbGain.gain.value = 0.42; verb.connect(verbGain); verbGain.connect(master);
  musicBus = ac.createGain(); musicBus.gain.value = 0.34; musicBus.connect(master); musicBus.connect(verb);
  sfxBus = ac.createGain(); sfxBus.gain.value = 0.55; sfxBus.connect(master);
  const sfxVerb = ac.createGain(); sfxVerb.gain.value = 0.25; sfxBus.connect(sfxVerb); sfxVerb.connect(verb);
  ambBus = ac.createGain(); ambBus.gain.value = 0.18; ambBus.connect(master);
  noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
  const nd = noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  if (pendingSong != null) { const s = pendingSong; pendingSong = null; playMusic(s); }
  if (pendingAmb) { const a = pendingAmb; pendingAmb = null; setAmbience(a); }
}
export function toggleMute() {
  muted = !muted;
  try { localStorage.setItem('paradise-mute', muted ? '1' : '0'); } catch {}
  if (master) master.gain.value = muted ? 0 : 0.7;
  return muted;
}

const hz = (n) => 440 * Math.pow(2, (n - 69) / 12);

function osc({ type = 'square', f0, f1 = f0, t = 0, dur = 0.1, vol = 0.2, out = sfxBus, att = 0.004, filt = 0, q = 1, vib = 0, detune = 0 }) {
  if (!ac) return;
  const st = ac.currentTime + t, o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.detune.value = detune;
  o.frequency.setValueAtTime(f0, st);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), st + dur);
  let node = o;
  if (vib) { const l = ac.createOscillator(), lg = ac.createGain(); l.frequency.value = 5.2; lg.gain.value = vib; l.connect(lg); lg.connect(o.frequency); l.start(st); l.stop(st + dur + 0.1); }
  if (filt) { const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filt; f.Q.value = q; o.connect(f); node = f; }
  g.gain.setValueAtTime(0.0001, st); g.gain.exponentialRampToValueAtTime(vol, st + att);
  g.gain.exponentialRampToValueAtTime(0.0001, st + dur);
  node.connect(g); g.connect(out); o.start(st); o.stop(st + dur + 0.05);
}
function noise({ t = 0, dur = 0.1, vol = 0.2, freq = 2000, q = 0.8, type = 'bandpass', out = sfxBus, f1 }) {
  if (!ac) return;
  const st = ac.currentTime + t, s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  s.buffer = noiseBuf; f.type = type; f.frequency.setValueAtTime(freq, st); f.Q.value = q;
  if (f1) f.frequency.exponentialRampToValueAtTime(f1, st + dur);
  g.gain.setValueAtTime(vol, st); g.gain.exponentialRampToValueAtTime(0.0001, st + dur);
  s.connect(f); f.connect(g); g.connect(out); s.start(st, Math.random()); s.stop(st + dur + 0.05);
}

export function sfx(name, v = 1) {
  if (!ac || muted) return;
  switch (name) {
    case 'step': noise({ dur: 0.04, vol: 0.05 * v, freq: 900 }); break;
    case 'jump': noise({ dur: 0.12, vol: 0.12, freq: 1400, f1: 3000 }); osc({ type: 'triangle', f0: 160, f1: 320, dur: 0.1, vol: 0.12 }); break;
    case 'djump': osc({ type: 'sawtooth', f0: 300, f1: 900, dur: 0.18, vol: 0.08, filt: 2000 }); noise({ dur: 0.2, vol: 0.14, freq: 4000 }); break;
    case 'land': noise({ dur: 0.08, vol: 0.12, freq: 500 }); osc({ type: 'sine', f0: 90, f1: 50, dur: 0.1, vol: 0.2 }); break;
    case 'slash': noise({ dur: 0.11, vol: 0.22, freq: 5200, f1: 2200, q: 1.5 }); break;
    case 'hit': osc({ type: 'square', f0: 240, f1: 70, dur: 0.12, vol: 0.18, filt: 1800 }); noise({ dur: 0.1, vol: 0.3, freq: 1500 }); break;
    case 'clang': osc({ type: 'square', f0: 1400, f1: 1200, dur: 0.25, vol: 0.08 }); osc({ type: 'square', f0: 2100, f1: 1900, dur: 0.2, vol: 0.05 }); noise({ dur: 0.06, vol: 0.2, freq: 6000 }); break;
    case 'kill': osc({ type: 'sawtooth', f0: 300, f1: 40, dur: 0.35, vol: 0.15, filt: 1200 }); noise({ dur: 0.35, vol: 0.25, freq: 900 }); break;
    case 'hurt': osc({ type: 'sawtooth', f0: 180, f1: 40, dur: 0.4, vol: 0.25, filt: 900 }); noise({ dur: 0.3, vol: 0.3, freq: 400 }); break;
    case 'dash': noise({ dur: 0.22, vol: 0.25, freq: 1800, f1: 600 }); osc({ type: 'sine', f0: 120, f1: 60, dur: 0.15, vol: 0.2 }); break;
    case 'wall': noise({ dur: 0.05, vol: 0.08, freq: 3000 }); break;
    case 'heal': [72, 76, 79].forEach((n, i) => osc({ type: 'sine', f0: hz(n), t: i * 0.07, dur: 0.5, vol: 0.12 })); break;
    case 'charge': osc({ type: 'sine', f0: 200, f1: 600, dur: 0.6, vol: 0.06 }); break;
    case 'pickup': [69, 73, 76, 81].forEach((n, i) => osc({ type: 'triangle', f0: hz(n), t: i * 0.06, dur: 0.3, vol: 0.15 })); break;
    case 'memory': [64, 67, 71, 74, 76].forEach((n, i) => osc({ type: 'sine', f0: hz(n), t: i * 0.14, dur: 1.4, vol: 0.12 })); break;
    case 'relic': [57, 64, 69, 72, 76, 81, 84].forEach((n, i) => osc({ type: 'triangle', f0: hz(n), t: i * 0.09, dur: 0.9, vol: 0.14 })); osc({ type: 'sine', f0: hz(45), dur: 2, vol: 0.2 }); break;
    case 'save': [62, 66, 69, 74].forEach((n, i) => osc({ type: 'sine', f0: hz(n), t: i * 0.12, dur: 1.2, vol: 0.14 })); break;
    case 'break': noise({ dur: 0.45, vol: 0.4, freq: 600 }); osc({ type: 'square', f0: 110, f1: 40, dur: 0.3, vol: 0.18, filt: 800 }); break;
    case 'spit': osc({ type: 'square', f0: 520, f1: 180, dur: 0.1, vol: 0.1, filt: 2000 }); break;
    case 'laser': osc({ type: 'sawtooth', f0: 1800, f1: 600, dur: 0.25, vol: 0.08, filt: 4000 }); break;
    case 'beam': osc({ type: 'sawtooth', f0: 90, dur: 1.2, vol: 0.12, filt: 1400, vib: 6 }); noise({ dur: 1.2, vol: 0.12, freq: 3000 }); break;
    case 'slam': noise({ dur: 0.6, vol: 0.55, freq: 250 }); osc({ type: 'sine', f0: 80, f1: 28, dur: 0.6, vol: 0.5 }); break;
    case 'roar': osc({ type: 'sawtooth', f0: 140, f1: 55, dur: 1.4, vol: 0.2, filt: 900, vib: 8 }); osc({ type: 'square', f0: 90, f1: 40, dur: 1.4, vol: 0.12, filt: 600 }); noise({ dur: 1.3, vol: 0.35, freq: 420 }); break;
    case 'fire': noise({ dur: 1.6, vol: 0.4, freq: 700, type: 'lowpass' }); osc({ type: 'sawtooth', f0: 70, f1: 55, dur: 1.6, vol: 0.12, filt: 300 }); break;
    case 'gear': for (let i = 0; i < 4; i++) noise({ t: i * 0.06, dur: 0.04, vol: 0.12, freq: 2500 }); break;
    case 'door': noise({ dur: 0.7, vol: 0.35, freq: 200 }); osc({ type: 'square', f0: 60, dur: 0.6, vol: 0.08, filt: 300 }); break;
    case 'select': osc({ type: 'triangle', f0: hz(81), dur: 0.08, vol: 0.12 }); break;
    case 'text': osc({ type: 'square', f0: hz(84 + ((Math.random() * 3) | 0)), dur: 0.03, vol: 0.03, filt: 3000 }); break;
    case 'elevator': osc({ type: 'sawtooth', f0: 50, dur: 2.2, vol: 0.12, filt: 300 }); noise({ dur: 2.2, vol: 0.1, freq: 300 }); break;
  }
}

// ---------- Música ----------
// Cada canción: bpm, escala de notas MIDI para melodía (lead), bajo, acordes (pad), arpegio y batería.
// En lead/bass: número = nota, -1 = mantener, 0 = silencio. Pasos de semicorchea.
const S = {
  title: { bpm: 70, lead: [74, -1, -1, -1, 72, -1, 70, -1, 69, -1, -1, -1, -1, -1, 0, 0, 70, -1, 69, -1, 67, -1, 65, -1, 67, -1, -1, -1, -1, -1, 0, 0], leadType: 'sine', bass: [38, -1, -1, -1, -1, -1, -1, -1, 34, -1, -1, -1, -1, -1, -1, -1], pad: [[62, 65, 69], [58, 62, 65]], arp: [], drums: '' },
  garden: { bpm: 96, lead: [69, -1, 70, -1, 73, -1, 74, -1, 76, -1, 74, 73, 74, -1, -1, -1, 77, -1, 76, -1, 74, -1, 73, -1, 70, -1, 69, -1, -1, -1, 0, 0, 69, -1, 70, -1, 73, -1, 74, 76, 77, -1, 79, -1, 77, 76, 74, -1, 73, -1, 70, -1, 69, -1, 70, -1, 69, -1, -1, -1, 0, 0, 0, 0], leadType: 'triangle', bass: [38, 0, 50, 0, 45, 0, 50, 0, 46, 0, 50, 0, 45, 0, 49, 0], pad: [[62, 66, 69], [58, 62, 65], [57, 61, 64], [62, 66, 69]], arp: [62, 66, 69, 74, 69, 66], arpType: 'pluck', drums: 'k..hs..hk.k.s..h' },
  meseta: { bpm: 80, lead: [76, -1, -1, -1, 74, -1, 72, -1, 71, -1, -1, -1, 69, -1, -1, -1, 72, -1, 71, -1, 69, -1, 67, -1, 69, -1, -1, -1, -1, -1, -1, -1], leadType: 'sine', vib: 4, bass: [45, -1, -1, -1, -1, -1, -1, -1, 41, -1, -1, -1, 43, -1, -1, -1], pad: [[57, 60, 64], [53, 57, 60], [55, 59, 62], [57, 60, 64]], arp: [69, 72, 76], arpType: 'pluck', drums: '........k.......' },
  cave: { bpm: 66, lead: [0, 0, 0, 0, 64, -1, -1, -1, 67, -1, 66, -1, 64, -1, -1, -1, -1, -1, -1, -1, 62, -1, -1, -1, 63, -1, -1, -1, -1, -1, -1, -1], leadType: 'sine', bass: [28, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 29, -1, -1, -1, -1, -1, -1, -1, 28, -1, -1, -1, -1, -1, -1, -1], pad: [[52, 55, 59], [53, 56, 60]], arp: [], drums: 'k...............' },
  fjord: { bpm: 60, lead: [74, -1, -1, -1, 77, -1, -1, -1, 76, -1, 74, -1, 72, -1, -1, -1, 69, -1, -1, -1, 72, -1, 70, -1, 69, -1, -1, -1, -1, -1, -1, -1], leadType: 'sine', bell: true, bass: [38, -1, -1, -1, -1, -1, -1, -1, 34, -1, -1, -1, -1, -1, -1, -1, 36, -1, -1, -1, -1, -1, -1, -1, 33, -1, -1, -1, -1, -1, -1, -1], pad: [[62, 65, 69], [58, 62, 65], [60, 64, 67], [57, 60, 64]], arp: [74, 81, 77, 84], arpType: 'bell', drums: '' },
  tech: { bpm: 118, lead: [72, -1, 75, -1, 79, -1, 77, 75, 74, -1, -1, -1, 72, -1, 70, -1, 72, -1, 75, -1, 79, -1, 82, -1, 80, -1, 79, -1, 77, -1, -1, -1], leadType: 'sawtooth', filt: 1800, bass: [36, 36, 48, 36, 36, 48, 36, 36, 32, 32, 44, 32, 34, 34, 46, 34], pad: [[60, 63, 67], [56, 60, 63], [58, 62, 65], [55, 58, 62]], arp: [60, 63, 67, 72, 67, 63], arpType: 'square', drums: 'k.h.s.hkk.h.s.hh' },
  palace: { bpm: 74, lead: [67, -1, -1, -1, 70, -1, 74, -1, 72, -1, 70, -1, 69, -1, -1, -1, 67, -1, 66, -1, 67, -1, 69, -1, 70, -1, 69, -1, 67, -1, -1, -1], leadType: 'organ', bass: [43, -1, -1, -1, -1, -1, -1, -1, 39, -1, -1, -1, 38, -1, -1, -1], pad: [[55, 58, 62, 67], [51, 55, 58, 63], [50, 54, 57, 62], [55, 58, 62, 67]], arp: [], drums: '' },
  bunker: { bpm: 58, lead: [0, 0, 0, 0, 0, 0, 0, 0, 61, -1, -1, -1, 60, -1, -1, -1, 0, 0, 0, 0, 0, 0, 0, 0, 58, -1, -1, -1, 57, -1, -1, -1], leadType: 'sine', bass: [25, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1], pad: [[49, 52, 56]], arp: [], drums: 'k..k............' },
  boss: { bpm: 144, lead: [62, 63, 62, 0, 62, 63, 62, 0, 65, 66, 65, 0, 68, 0, 67, 0, 62, 63, 62, 0, 62, 63, 62, 0, 70, 69, 68, 67, 66, 65, 64, 63], leadType: 'sawtooth', filt: 2200, bass: [26, 26, 38, 26, 26, 38, 26, 26, 27, 27, 39, 27, 25, 25, 37, 25], pad: [[50, 53, 56], [51, 54, 58]], arp: [50, 53, 56, 62], arpType: 'square', drums: 'k.hsk.hsk.hsk.ss' },
  final: { bpm: 152, lead: [74, -1, 73, -1, 74, -1, 77, -1, 76, -1, 74, -1, 73, -1, 70, -1, 69, -1, 70, -1, 73, -1, 74, -1, 76, 77, 76, 74, 73, -1, -1, -1], leadType: 'organ', bass: [26, 26, 38, 26, 22, 22, 34, 22, 21, 21, 33, 21, 25, 25, 37, 25], pad: [[62, 65, 69], [58, 62, 65], [57, 61, 64], [61, 64, 67]], arp: [62, 65, 69, 74], arpType: 'square', drums: 'k.hsk.hsk.hsk.sk' },
  ending: { bpm: 72, lead: [72, -1, 76, -1, 79, -1, 84, -1, 83, -1, 79, -1, 76, -1, -1, -1, 77, -1, 81, -1, 84, -1, 88, -1, 86, -1, 84, -1, 83, -1, -1, -1], leadType: 'triangle', bass: [48, -1, -1, -1, 43, -1, -1, -1, 41, -1, -1, -1, 43, -1, -1, -1], pad: [[60, 64, 67], [55, 59, 62], [53, 57, 60], [55, 59, 62]], arp: [72, 76, 79], arpType: 'bell', drums: '' },
};

let song = null, songKey = null, step = 0, next = 0, timer = null, pendingSong = null, pendingAmb = null;
export function playMusic(key) {
  if (!ac) { pendingSong = key; return; }
  if (key === songKey) return;
  songKey = key; song = key ? S[key] : null; step = 0; next = ac.currentTime + 0.15;
  if (!timer) timer = setInterval(schedule, 25);
}
export const stopMusic = () => playMusic(null);

function voice(type, note, t, dur, vol, s) {
  const f = hz(note);
  if (type === 'organ') { osc({ type: 'square', f0: f, t, dur, vol: vol * 0.5, out: musicBus, filt: 1600, att: 0.05 }); osc({ type: 'sine', f0: f * 2, t, dur, vol: vol * 0.4, out: musicBus, att: 0.05 }); osc({ type: 'sine', f0: f / 2, t, dur, vol: vol * 0.5, out: musicBus, att: 0.05 }); return; }
  if (type === 'pluck') { osc({ type: 'triangle', f0: f, t, dur: Math.min(dur, 0.5), vol, out: musicBus, att: 0.002 }); osc({ type: 'square', f0: f, t, dur: 0.12, vol: vol * 0.25, out: musicBus, filt: 2500 }); return; }
  if (type === 'bell') { osc({ type: 'sine', f0: f, t, dur: 1.6, vol, out: musicBus, att: 0.002 }); osc({ type: 'sine', f0: f * 2.76, t, dur: 0.6, vol: vol * 0.3, out: musicBus, att: 0.002 }); return; }
  osc({ type, f0: f, t, dur, vol, out: musicBus, filt: s.filt || (type === 'sawtooth' ? 2400 : 0), att: 0.02, vib: s.vib || 0 });
}

function schedule() {
  if (!ac || !song) return;
  const s = song, sd = 60 / s.bpm / 4;
  while (next < ac.currentTime + 0.15) {
    const t = next - ac.currentTime;
    const L = s.lead[step % s.lead.length];
    if (L > 0) {
      let len = 1; while (s.lead[(step + len) % s.lead.length] === -1 && len < 32) len++;
      voice(s.leadType, L, t, sd * len * 0.95, 0.12, s);
      if (s.bell) voice('bell', L + 12, t, 1, 0.03, s);
    }
    const B = s.bass[step % s.bass.length];
    if (B > 0) { let len = 1; while (s.bass[(step + len) % s.bass.length] === -1 && len < 32) len++; osc({ type: 'triangle', f0: hz(B), t, dur: sd * len, vol: 0.32, out: musicBus, att: 0.01 }); osc({ type: 'sawtooth', f0: hz(B), t, dur: sd * len, vol: 0.06, out: musicBus, filt: 400 }); }
    // pad: un acorde por compás (16 pasos)
    if (step % 16 === 0 && s.pad.length) {
      const ch = s.pad[(step / 16) % s.pad.length];
      for (const n of ch) { osc({ type: 'sawtooth', f0: hz(n), t, dur: sd * 16, vol: 0.022, out: musicBus, filt: 900, att: 0.6, detune: -7 }); osc({ type: 'sawtooth', f0: hz(n), t, dur: sd * 16, vol: 0.022, out: musicBus, filt: 900, att: 0.6, detune: 7 }); }
    }
    if (s.arp.length && step % 2 === 0) voice(s.arpType || 'pluck', s.arp[(step / 2) % s.arp.length], t, sd * 1.5, 0.035, s);
    const d = s.drums[step % (s.drums.length || 1)];
    if (d === 'k') osc({ type: 'sine', f0: 140, f1: 38, t, dur: 0.22, vol: 0.5, out: musicBus, att: 0.001 });
    if (d === 's') noise({ t, dur: 0.14, vol: 0.18, freq: 1600, out: musicBus });
    if (d === 'h') noise({ t, dur: 0.035, vol: 0.06, freq: 8000, out: musicBus });
    step++; next += sd;
  }
}

// ---------- Ambiente (viento, goteo, zumbido) ----------
let ambNodes = [], ambKey = null;
export function setAmbience(kind) {
  if (!ac) { pendingAmb = kind; return; }
  if (kind === ambKey) return;
  ambKey = kind;
  for (const n of ambNodes) { try { n.stop(); } catch {} }
  ambNodes = [];
  if (!kind) return;
  const src = ac.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
  const f = ac.createBiquadFilter(), g = ac.createGain();
  const cfg = { wind: ['bandpass', 500, 0.6, 0.5], cave: ['lowpass', 220, 0.8, 0.6], hum: ['bandpass', 120, 6, 0.5], birds: ['highpass', 3000, 0.5, 0.08], cold: ['bandpass', 900, 0.4, 0.6] }[kind] || ['lowpass', 300, 1, 0.3];
  f.type = cfg[0]; f.frequency.value = cfg[1]; f.Q.value = cfg[2]; g.gain.value = cfg[3];
  // modulación lenta del filtro para que el viento respire
  const l = ac.createOscillator(), lg = ac.createGain(); l.frequency.value = 0.08; lg.gain.value = cfg[1] * 0.5; l.connect(lg); lg.connect(f.frequency); l.start();
  src.connect(f); f.connect(g); g.connect(ambBus); src.start();
  ambNodes.push(src, l);
}

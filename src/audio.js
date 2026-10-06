// Sonido chiptune sintetizado con WebAudio: canales de onda cuadrada, triángulo y ruido,
// como el APU de la Game Boy Advance. Sin archivos de audio.
let ac = null, master = null, musicGain = null, sfxGain = null, noiseBuf = null;
let muted = false;
try { muted = localStorage.getItem('lumbre-mute') === '1'; } catch {}

export function unlockAudio() {
  if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ac = new AC();
  master = ac.createGain(); master.gain.value = muted ? 0 : 0.5; master.connect(ac.destination);
  musicGain = ac.createGain(); musicGain.gain.value = 0.32; musicGain.connect(master);
  sfxGain = ac.createGain(); sfxGain.gain.value = 0.6; sfxGain.connect(master);
  noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}

export function toggleMute() {
  muted = !muted;
  try { localStorage.setItem('lumbre-mute', muted ? '1' : '0'); } catch {}
  if (master) master.gain.value = muted ? 0 : 0.5;
  return muted;
}
export const isMuted = () => muted;

const hz = (n) => 440 * Math.pow(2, (n - 69) / 12);

// Onda cuadrada con ciclo de trabajo configurable (12.5 / 25 / 50 %) como en la GBA.
const waves = {};
function pulse(duty) {
  if (waves[duty]) return waves[duty];
  const n = 32, re = new Float32Array(n), im = new Float32Array(n);
  for (let k = 1; k < n; k++) im[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
  return (waves[duty] = ac.createPeriodicWave(re, im));
}

function tone({ type = 'square', duty = 0.5, f0, f1 = f0, t = 0, dur = 0.1, vol = 0.3, out = sfxGain }) {
  if (!ac) return;
  const o = ac.createOscillator(), g = ac.createGain();
  const st = ac.currentTime + t;
  if (type === 'square') o.setPeriodicWave(pulse(duty)); else o.type = type;
  o.frequency.setValueAtTime(f0, st);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), st + dur);
  g.gain.setValueAtTime(vol, st);
  g.gain.exponentialRampToValueAtTime(0.001, st + dur);
  o.connect(g); g.connect(out);
  o.start(st); o.stop(st + dur + 0.02);
}

function noise({ t = 0, dur = 0.1, vol = 0.3, freq = 3000, out = sfxGain }) {
  if (!ac) return;
  const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  const st = ac.currentTime + t;
  s.buffer = noiseBuf;
  f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.8;
  g.gain.setValueAtTime(vol, st);
  g.gain.exponentialRampToValueAtTime(0.001, st + dur);
  s.connect(f); f.connect(g); g.connect(out);
  s.start(st, Math.random() * 0.5); s.stop(st + dur + 0.02);
}

export function sfx(name) {
  if (!ac || muted) return;
  switch (name) {
    case 'jump': tone({ duty: 0.25, f0: 300, f1: 620, dur: 0.12, vol: 0.18 }); break;
    case 'djump': tone({ duty: 0.125, f0: 500, f1: 1100, dur: 0.14, vol: 0.16 }); noise({ dur: 0.12, vol: 0.1, freq: 5000 }); break;
    case 'land': noise({ dur: 0.05, vol: 0.12, freq: 900 }); break;
    case 'slash': noise({ dur: 0.09, vol: 0.25, freq: 6000 }); tone({ duty: 0.125, f0: 900, f1: 300, dur: 0.07, vol: 0.06 }); break;
    case 'hit': tone({ duty: 0.5, f0: 220, f1: 80, dur: 0.1, vol: 0.25 }); noise({ dur: 0.08, vol: 0.25, freq: 2000 }); break;
    case 'kill': tone({ duty: 0.25, f0: 400, f1: 60, dur: 0.25, vol: 0.2 }); noise({ dur: 0.25, vol: 0.25, freq: 1200 }); break;
    case 'hurt': tone({ duty: 0.5, f0: 160, f1: 50, dur: 0.3, vol: 0.3 }); noise({ dur: 0.2, vol: 0.2, freq: 600 }); break;
    case 'dash': noise({ dur: 0.18, vol: 0.22, freq: 2500 }); tone({ type: 'triangle', f0: 200, f1: 600, dur: 0.12, vol: 0.2 }); break;
    case 'pickup': [72, 76, 79, 84].forEach((n, i) => tone({ duty: 0.25, f0: hz(n), t: i * 0.06, dur: 0.12, vol: 0.18 })); break;
    case 'relic': [60, 64, 67, 72, 76, 79, 84, 88].forEach((n, i) => tone({ duty: 0.25, f0: hz(n), t: i * 0.08, dur: 0.3, vol: 0.16 })); break;
    case 'save': [67, 71, 74, 79].forEach((n, i) => tone({ type: 'triangle', f0: hz(n), t: i * 0.1, dur: 0.5, vol: 0.3 })); break;
    case 'heal': tone({ duty: 0.25, f0: hz(84), f1: hz(91), dur: 0.1, vol: 0.12 }); break;
    case 'break': noise({ dur: 0.3, vol: 0.35, freq: 700 }); tone({ duty: 0.5, f0: 120, f1: 40, dur: 0.25, vol: 0.2 }); break;
    case 'spit': tone({ duty: 0.5, f0: 500, f1: 200, dur: 0.08, vol: 0.12 }); break;
    case 'slam': noise({ dur: 0.4, vol: 0.45, freq: 300 }); tone({ type: 'triangle', f0: 90, f1: 30, dur: 0.4, vol: 0.5 }); break;
    case 'roar': tone({ duty: 0.5, f0: 110, f1: 70, dur: 0.6, vol: 0.25 }); noise({ dur: 0.6, vol: 0.2, freq: 400 }); break;
    case 'select': tone({ duty: 0.25, f0: hz(79), dur: 0.06, vol: 0.15 }); break;
    case 'door': noise({ dur: 0.5, vol: 0.3, freq: 250 }); break;
  }
}

// ---------------- Música ----------------
// Secuenciador sencillo: cada canción tiene melodía, bajo y percusión en pasos de semicorchea.
// Notas MIDI; 0 = silencio, -1 = mantener.
const SONGS = [
  { // Jardín Hundido: melancólica, la menor
    bpm: 92,
    lead: [69, -1, 72, -1, 76, -1, 74, 72, 71, -1, -1, -1, 67, -1, 69, -1,
      72, -1, 71, -1, 69, -1, 67, 64, 65, -1, -1, -1, 0, 0, 0, 0,
      69, -1, 72, -1, 76, -1, 79, 77, 76, -1, 74, -1, 72, -1, 71, -1,
      72, -1, 74, -1, 71, -1, 67, -1, 69, -1, -1, -1, 0, 0, 0, 0],
    bass: [45, 0, 52, 0, 45, 0, 52, 0, 43, 0, 50, 0, 43, 0, 50, 0,
      41, 0, 48, 0, 41, 0, 48, 0, 40, 0, 47, 0, 40, 0, 47, 0],
    arp: [57, 60, 64, 60],
    drums: 'k...h...s...h.h.',
  },
  { // Cavernas de Cristal: misteriosa, arpegios fríos
    bpm: 76,
    lead: [76, -1, -1, -1, 75, -1, 71, -1, 72, -1, -1, -1, 0, 0, 0, 0,
      74, -1, -1, -1, 72, -1, 69, -1, 71, -1, -1, -1, 0, 0, 0, 0,
      76, -1, 79, -1, 83, -1, 81, -1, 79, -1, 76, -1, 75, -1, -1, -1,
      72, -1, 71, -1, 69, -1, 68, -1, 69, -1, -1, -1, 0, 0, 0, 0],
    bass: [40, 0, 0, 0, 40, 0, 0, 0, 36, 0, 0, 0, 36, 0, 0, 0,
      38, 0, 0, 0, 38, 0, 0, 0, 35, 0, 0, 0, 35, 0, 0, 0],
    arp: [64, 67, 71, 76, 71, 67],
    drums: '....h.......h...',
  },
  { // Fortaleza de Ceniza: épica, re menor
    bpm: 132,
    lead: [62, -1, 65, -1, 69, -1, 70, 69, 67, -1, 65, -1, 64, -1, 65, 67,
      69, -1, -1, -1, 74, -1, 72, -1, 70, -1, 69, -1, 67, -1, -1, -1,
      62, -1, 65, -1, 69, -1, 70, 72, 74, -1, 72, -1, 70, -1, 69, -1,
      67, -1, 69, -1, 65, -1, 64, -1, 62, -1, -1, -1, 0, 0, 0, 0],
    bass: [38, 38, 50, 38, 38, 38, 50, 38, 34, 34, 46, 34, 34, 34, 46, 34,
      36, 36, 48, 36, 36, 36, 48, 36, 33, 33, 45, 33, 33, 33, 45, 33],
    arp: [62, 65, 69],
    drums: 'k.h.s.h.k.k.s.hh',
  },
  { // Jefe
    bpm: 150,
    lead: [62, 63, 62, 0, 62, 63, 62, 0, 65, 66, 65, 0, 68, 0, 67, 0,
      62, 63, 62, 0, 62, 63, 62, 0, 70, 69, 68, 67, 66, 65, 64, 63],
    bass: [26, 26, 38, 26, 26, 38, 26, 26, 27, 27, 39, 27, 25, 25, 37, 25],
    arp: [50, 53, 56],
    drums: 'k.hsk.hsk.hsk.ss',
  },
  { // Final: victoria serena
    bpm: 84,
    lead: [72, -1, 76, -1, 79, -1, 84, -1, 83, -1, 79, -1, 76, -1, -1, -1,
      77, -1, 81, -1, 84, -1, 88, -1, 86, -1, 84, -1, 83, -1, -1, -1,
      84, -1, -1, -1, 79, -1, -1, -1, 76, -1, 77, -1, 79, -1, -1, -1,
      72, -1, -1, -1, -1, -1, -1, -1, 0, 0, 0, 0, 0, 0, 0, 0],
    bass: [48, 0, 55, 0, 52, 0, 55, 0, 53, 0, 57, 0, 60, 0, 57, 0],
    arp: [60, 64, 67, 72],
    drums: '................',
  },
];

let song = -1, step = 0, nextTime = 0, timer = null;

export function playMusic(idx) {
  if (!ac || idx === song) return;
  song = idx;
  step = 0;
  nextTime = ac.currentTime + 0.1;
  if (!timer) timer = setInterval(schedule, 25);
}

export function stopMusic() {
  song = -1;
}

function schedule() {
  if (!ac || song < 0) return;
  const s = SONGS[song];
  const stepDur = 60 / s.bpm / 4;
  while (nextTime < ac.currentTime + 0.12) {
    const t = nextTime - ac.currentTime;
    const ln = s.lead[step % s.lead.length];
    if (ln > 0) {
      let len = 1;
      while (s.lead[(step + len) % s.lead.length] === -1 && len < 16) len++;
      tone({ duty: 0.25, f0: hz(ln), t, dur: stepDur * len * 0.95, vol: 0.13, out: musicGain });
      tone({ duty: 0.125, f0: hz(ln) * 1.003, t: t + stepDur * 0.75, dur: stepDur * len * 0.7, vol: 0.04, out: musicGain });
    }
    const bn = s.bass[step % s.bass.length];
    if (bn > 0) tone({ type: 'triangle', f0: hz(bn), t, dur: stepDur * 1.8, vol: 0.35, out: musicGain });
    if (step % 2 === 0) {
      const an = s.arp[(step / 2) % s.arp.length];
      tone({ duty: 0.125, f0: hz(an + 12), t, dur: stepDur * 0.9, vol: 0.03, out: musicGain });
    }
    const dr = s.drums[step % s.drums.length];
    if (dr === 'k') tone({ type: 'triangle', f0: 150, f1: 40, t, dur: 0.12, vol: 0.45, out: musicGain });
    if (dr === 's') noise({ t, dur: 0.1, vol: 0.18, freq: 1800, out: musicGain });
    if (dr === 'h') noise({ t, dur: 0.03, vol: 0.07, freq: 8000, out: musicGain });
    step++;
    nextTime += stepDur;
  }
}

export const MUSIC = { garden: 0, cavern: 1, keep: 2, boss: 3, end: 4 };

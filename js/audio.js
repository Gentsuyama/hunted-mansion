"use strict";
// ==================================================================
// ÁUDIO — 100% sintetizado (sem assets)
// ==================================================================
let AC = null, master = null, droneG = null, droneLp = null;

function initAudio() {
  if (AC) return;
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    master = AC.createGain(); master.gain.value = 0.55;
    master.connect(AC.destination);

    // drone grave contínuo (a casa "nota" você: audioTensao abre o filtro)
    const g = AC.createGain(); g.gain.value = 0.05;
    const lp = AC.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 180;
    droneG = g; droneLp = lp;
    const o1 = AC.createOscillator(); o1.type = "triangle"; o1.frequency.value = 48;
    const o2 = AC.createOscillator(); o2.type = "sine";     o2.frequency.value = 48.7;
    o1.connect(lp); o2.connect(lp); lp.connect(g); g.connect(master);
    const lfo = AC.createOscillator(); lfo.frequency.value = 0.07;
    const lfoG = AC.createGain(); lfoG.gain.value = 0.03;
    lfo.connect(lfoG); lfoG.connect(g.gain);
    o1.start(); o2.start(); lfo.start();
  } catch (e) { /* sem áudio, segue o jogo */ }
}

const NOISE_BUFS = {};
function noiseBuf(sec) {
  if (NOISE_BUFS[sec]) return NOISE_BUFS[sec];
  const b = AC.createBuffer(1, AC.sampleRate * sec, AC.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return (NOISE_BUFS[sec] = b);
}
// tensão 0..1: o drone engrossa e clareia quando algo te caça
function audioTensao(k) {
  if (!AC || !droneG) return;
  const t = AC.currentTime;
  droneG.gain.setTargetAtTime(0.05 + 0.07 * k, t, 0.6);
  droneLp.frequency.setTargetAtTime(180 + 380 * k, t, 0.6);
}
// saída posicionada no estéreo (−1 esquerda … 1 direita), quando o navegador tem
function panOut(pan) {
  if (!pan || !AC.createStereoPanner) return master;
  const p = AC.createStereoPanner();
  p.pan.value = Math.max(-1, Math.min(1, pan));
  p.connect(master);
  return p;
}
function envGain(v0, t1) {
  const g = AC.createGain();
  g.gain.setValueAtTime(v0, AC.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, AC.currentTime + t1);
  g.connect(master);
  return g;
}
function sfxCamera() {
  if (!AC) return;
  const o = AC.createOscillator(); o.type = "square"; o.frequency.value = 900;
  o.connect(envGain(0.12, 0.05)); o.start(); o.stop(AC.currentTime + 0.05);
  const n = AC.createBufferSource(); n.buffer = noiseBuf(0.25);
  const f = AC.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 2000;
  n.connect(f); f.connect(envGain(0.2, 0.25)); n.start();
}
function sfxDry() {
  if (!AC) return;
  const o = AC.createOscillator(); o.type = "square"; o.frequency.value = 300;
  o.connect(envGain(0.06, 0.04)); o.start(); o.stop(AC.currentTime + 0.04);
}
function sfxPickup() {
  if (!AC) return;
  const o = AC.createOscillator(); o.type = "sine";
  o.frequency.setValueAtTime(500, AC.currentTime);
  o.frequency.linearRampToValueAtTime(760, AC.currentTime + 0.12);
  o.connect(envGain(0.12, 0.18)); o.start(); o.stop(AC.currentTime + 0.18);
}
function sfxDissolve() {
  if (!AC) return;
  const n = AC.createBufferSource(); n.buffer = noiseBuf(0.6);
  const f = AC.createBiquadFilter(); f.type = "bandpass"; f.Q.value = 4;
  f.frequency.setValueAtTime(2200, AC.currentTime);
  f.frequency.exponentialRampToValueAtTime(120, AC.currentTime + 0.55);
  n.connect(f); f.connect(envGain(0.25, 0.6)); n.start();
}
function sfxSting() {
  if (!AC) return;
  [55, 58.3, 82.4].forEach(fr => {
    const o = AC.createOscillator(); o.type = "sawtooth"; o.frequency.value = fr;
    const lp = AC.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 500;
    o.connect(lp); lp.connect(envGain(0.09, 1.2));
    o.start(); o.stop(AC.currentTime + 1.2);
  });
}
// piano fantasma da Olívia: frase curta em tom menor, desafinada de leve
function sfxPiano() {
  if (!AC) return;
  const notas = [220, 261.6, 196, 164.8, 220];      // lá-dó-sol-mi-lá (menor)
  notas.forEach((fr, i) => {
    const t0 = AC.currentTime + i * 0.42 + Math.random() * 0.05;
    const o = AC.createOscillator(); o.type = "triangle";
    o.frequency.value = fr * (1 + (Math.random() - 0.5) * 0.008);
    const g = AC.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.14, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.4);
    o.connect(g); g.connect(master);
    o.start(t0); o.stop(t0 + 1.4);
  });
}
// virar de página do álbum (farfalhar curto)
function sfxPage() {
  if (!AC) return;
  const n = AC.createBufferSource(); n.buffer = noiseBuf(0.22);
  const f = AC.createBiquadFilter(); f.type = "bandpass"; f.Q.value = 1.2;
  f.frequency.setValueAtTime(900, AC.currentTime);
  f.frequency.exponentialRampToValueAtTime(2600, AC.currentTime + 0.18);
  n.connect(f); f.connect(envGain(0.1, 0.22)); n.start();
}
// passo pesado do Seu Bento (baque surdo)
function sfxStep() {
  if (!AC) return;
  const o = AC.createOscillator(); o.type = "sine";
  o.frequency.setValueAtTime(70, AC.currentTime);
  o.frequency.exponentialRampToValueAtTime(38, AC.currentTime + 0.18);
  o.connect(envGain(0.16, 0.22)); o.start(); o.stop(AC.currentTime + 0.22);
}
function sfxHeart(vol) {
  if (!AC) return;
  for (const dt of [0, 0.14]) {
    const o = AC.createOscillator(); o.type = "sine"; o.frequency.value = 55;
    const g = AC.createGain();
    g.gain.setValueAtTime(0, AC.currentTime + dt);
    g.gain.linearRampToValueAtTime(vol, AC.currentTime + dt + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, AC.currentTime + dt + 0.12);
    o.connect(g); g.connect(master);
    o.start(AC.currentTime + dt); o.stop(AC.currentTime + dt + 0.15);
  }
}
function sfxWhisper() {
  if (!AC) return;
  const n = AC.createBufferSource(); n.buffer = noiseBuf(1.0);
  const f = AC.createBiquadFilter(); f.type = "bandpass"; f.Q.value = 1.5;
  f.frequency.setValueAtTime(500 + Math.random() * 600, AC.currentTime);
  f.frequency.linearRampToValueAtTime(300, AC.currentTime + 1.0);
  n.connect(f); f.connect(envGain(0.07, 1.0)); n.start();
}
function sfxDamage() {
  if (!AC) return;
  const n = AC.createBufferSource(); n.buffer = noiseBuf(0.3);
  const f = AC.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 400;
  n.connect(f); f.connect(envGain(0.3, 0.3)); n.start();
}
function sfxDeath() {
  if (!AC) return;
  const o = AC.createOscillator(); o.type = "sawtooth";
  o.frequency.setValueAtTime(200, AC.currentTime);
  o.frequency.exponentialRampToValueAtTime(30, AC.currentTime + 2);
  const lp = AC.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 600;
  o.connect(lp); lp.connect(envGain(0.25, 2)); o.start(); o.stop(AC.currentTime + 2);
}
// porta batendo (intro / eventos)
function sfxSlam() {
  if (!AC) return;
  const n = AC.createBufferSource(); n.buffer = noiseBuf(0.5);
  const f = AC.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 220;
  n.connect(f); f.connect(envGain(0.6, 0.5)); n.start();
  const o = AC.createOscillator(); o.type = "sine";
  o.frequency.setValueAtTime(70, AC.currentTime);
  o.frequency.exponentialRampToValueAtTime(32, AC.currentTime + 0.35);
  o.connect(envGain(0.5, 0.4)); o.start(); o.stop(AC.currentTime + 0.4);
}
// passos em escada (troca de andar)
function sfxStairs() {
  if (!AC) return;
  for (let i = 0; i < 4; i++) {
    const t0 = i * 0.13;
    const o = AC.createOscillator(); o.type = "triangle";
    o.frequency.value = 90 + Math.random() * 30;
    const g = AC.createGain();
    g.gain.setValueAtTime(0, AC.currentTime + t0);
    g.gain.linearRampToValueAtTime(0.12, AC.currentTime + t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, AC.currentTime + t0 + 0.1);
    o.connect(g); g.connect(master);
    o.start(AC.currentTime + t0); o.stop(AC.currentTime + t0 + 0.12);
  }
}

// passo do streamer: o chão diz onde você está pisando
function sfxPasso(sup, vol, eco) {
  if (!AC) return;
  const t = AC.currentTime, v = (vol || 0.6) * 0.5;
  const ruido = (dur, tipo, freq, q, g0) => {
    const n = AC.createBufferSource(); n.buffer = noiseBuf(dur);
    const f = AC.createBiquadFilter(); f.type = tipo; f.frequency.value = freq;
    if (q) f.Q.value = q;
    n.connect(f); f.connect(envGain(g0, dur)); n.start();
  };
  const baque = (f0, f1, dur, g0) => {
    const o = AC.createOscillator(); o.type = "sine";
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    o.connect(envGain(g0, dur)); o.start(); o.stop(t + dur);
  };
  // o passo que NÃO é seu soa mais grave; os seus variam um pouco a cada vez
  const des = eco ? 0.8 : 0.94 + Math.random() * 0.14;
  if (sup === "madeira") {
    baque(96 * des, 52 * des, 0.09, 0.22 * v);
    ruido(0.05, "bandpass", 850 * des, 1.4, 0.16 * v);
    if (!eco && Math.random() < 0.09) {          // uma tábua range
      const o = AC.createOscillator(); o.type = "sawtooth";
      o.frequency.setValueAtTime(210 + Math.random() * 60, t);
      o.frequency.linearRampToValueAtTime(330 + Math.random() * 80, t + 0.22);
      const f = AC.createBiquadFilter(); f.type = "bandpass";
      f.frequency.value = 900; f.Q.value = 6;
      o.connect(f); f.connect(envGain(0.035 * v, 0.24)); o.start(); o.stop(t + 0.24);
    }
  } else if (sup === "tapete") {
    ruido(0.09, "lowpass", 260 * des, 0, 0.26 * v);
  } else if (sup === "ladrilho") {
    ruido(0.03, "highpass", 2400 * des, 0, 0.14 * v);
    baque(190 * des, 120 * des, 0.05, 0.10 * v);
  } else {                                        // pedra do porão
    ruido(0.07, "bandpass", 520 * des, 0.9, 0.22 * v);
    baque(80 * des, 48 * des, 0.07, 0.12 * v);
  }
}
// motor da polaroid cuspindo a foto
function sfxEjeta() {
  if (!AC) return;
  const t = AC.currentTime + 0.14;
  const o = AC.createOscillator(); o.type = "sawtooth";
  o.frequency.setValueAtTime(150, t);
  o.frequency.linearRampToValueAtTime(205, t + 0.12);
  o.frequency.setValueAtTime(205, t + 0.5);
  o.frequency.linearRampToValueAtTime(120, t + 0.62);
  const lp = AC.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 900;
  const g = AC.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.05, t + 0.05);
  g.gain.setValueAtTime(0.05, t + 0.52);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.66);
  const lfo = AC.createOscillator(); lfo.frequency.value = 38;
  const lg = AC.createGain(); lg.gain.value = 18;
  lfo.connect(lg); lg.connect(o.frequency);
  o.connect(lp); lp.connect(g); g.connect(master);
  o.start(t); o.stop(t + 0.7); lfo.start(t); lfo.stop(t + 0.7);
}
// FUI VISTO — timbre exclusivo deste aviso: duas notas roçando que crescem
// como som tocado ao contrário e cortam seco
function sfxVisto() {
  if (!AC) return;
  const t = AC.currentTime;
  for (const fr of [466, 493]) {
    const o = AC.createOscillator(); o.type = "sine"; o.frequency.value = fr;
    const g = AC.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.11, t + 0.5);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.62);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.65);
  }
  const n = AC.createBufferSource(); n.buffer = noiseBuf(0.6);
  const f = AC.createBiquadFilter(); f.type = "bandpass"; f.Q.value = 3;
  f.frequency.setValueAtTime(400, t);
  f.frequency.exponentialRampToValueAtTime(3200, t + 0.5);
  const g2 = AC.createGain();
  g2.gain.setValueAtTime(0.0001, t);
  g2.gain.exponentialRampToValueAtTime(0.08, t + 0.5);
  g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
  n.connect(f); f.connect(g2); g2.connect(master); n.start(t);
}

// O BOTE — o eco PUXA O AR (chiado que cresce e sobe, do lado de onde ele vem)…
function sfxInspira(pan) {
  if (!AC) return;
  const t = AC.currentTime, T = BOTE.inspira, out = panOut(pan);
  const n = AC.createBufferSource(); n.buffer = noiseBuf(1.5);
  const f = AC.createBiquadFilter(); f.type = "bandpass"; f.Q.value = 2.2;
  f.frequency.setValueAtTime(240, t);
  f.frequency.exponentialRampToValueAtTime(2500, t + T);
  const g = AC.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.22, t + T * 0.93);
  g.gain.exponentialRampToValueAtTime(0.0001, t + T);
  n.connect(f); f.connect(g); g.connect(out); n.start(t); n.stop(t + T + 0.05);
  const o = AC.createOscillator(); o.type = "sine";
  o.frequency.setValueAtTime(104, t);
  o.frequency.exponentialRampToValueAtTime(340, t + T);
  const g2 = AC.createGain();
  g2.gain.setValueAtTime(0.0001, t);
  g2.gain.exponentialRampToValueAtTime(0.1, t + T * 0.9);
  g2.gain.exponentialRampToValueAtTime(0.0001, t + T);
  o.connect(g2); g2.connect(out); o.start(t); o.stop(t + T + 0.05);
}
// …e SALTA: um rasgo de ar que desce
function sfxBote() {
  if (!AC) return;
  const t = AC.currentTime;
  const n = AC.createBufferSource(); n.buffer = noiseBuf(0.5);
  const f = AC.createBiquadFilter(); f.type = "bandpass"; f.Q.value = 1.3;
  f.frequency.setValueAtTime(2800, t);
  f.frequency.exponentialRampToValueAtTime(170, t + 0.4);
  n.connect(f); f.connect(envGain(0.36, 0.45)); n.start(t);
}
// a lamparina: um fósforo e duas notas quentes que demoram a morrer
function sfxLamparina() {
  if (!AC) return;
  const t = AC.currentTime;
  const n = AC.createBufferSource(); n.buffer = noiseBuf(0.25);
  const f = AC.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 3000;
  n.connect(f); f.connect(envGain(0.1, 0.25)); n.start(t);
  for (const fr of [220, 277.2, 329.6]) {
    const o = AC.createOscillator(); o.type = "sine"; o.frequency.value = fr;
    const g = AC.createGain();
    g.gain.setValueAtTime(0.0001, t + 0.15);
    g.gain.exponentialRampToValueAtTime(0.06, t + 0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.6);
    o.connect(g); g.connect(master); o.start(t + 0.15); o.stop(t + 2.7);
  }
}
// o flash DELE carregando: um apito fino que sobe até o disparo
function sfxCarga() {
  if (!AC) return;
  const t = AC.currentTime;
  const o = AC.createOscillator(); o.type = "sine";
  o.frequency.setValueAtTime(700, t);
  o.frequency.exponentialRampToValueAtTime(5600, t + 1.5);
  const g = AC.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.07, t + 1.4);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 1.52);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + 1.55);
}

// ------------------------------------------------------------------
// A ASSINATURA SONORA de cada alma: ela se anuncia pelo som antes de
// aparecer, vindo do lado em que está. Um som, um significado.
// ------------------------------------------------------------------
function saidaEm(vol, pan) {
  const g = AC.createGain();
  g.gain.value = vol;
  g.connect(panOut(pan));
  return g;
}
function notaEm(out, tipo, fr, t0, dur, pico, vib) {
  const o = AC.createOscillator(); o.type = tipo; o.frequency.value = fr;
  const g = AC.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(pico, t0 + Math.min(0.08, dur * 0.3));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  if (vib) {
    const l = AC.createOscillator(); l.frequency.value = 5;
    const lg = AC.createGain(); lg.gain.value = vib;
    l.connect(lg); lg.connect(o.frequency); l.start(t0); l.stop(t0 + dur);
  }
  o.connect(g); g.connect(out); o.start(t0); o.stop(t0 + dur + 0.02);
}
const MOTIVO = {
  tomas(out, t) {      // a risadinha de quem está escondido
    [1180, 1320, 1050, 1240, 930].forEach((f, i) => notaEm(out, "sine", f, t + i * 0.09, 0.08, 0.11));
  },
  cecilia(out, t) {    // a marcha nupcial, devagar e meio tom abaixo
    [[246.9, 0, 0.9], [329.6, 0.95, 0.5], [329.6, 1.5, 0.28], [329.6, 1.85, 1.3]]
      .forEach(([f, d, du]) => notaEm(out, "triangle", f, t + d, du, 0.1, 3));
  },
  bento(out, t) {      // o molho de chaves na cintura
    for (let i = 0; i < 5; i++)
      notaEm(out, "square", 3200 + Math.random() * 2600, t + i * 0.07 + Math.random() * 0.03, 0.05, 0.035);
  },
  hospede(out, t) {    // prata: a moeda que ele deixa cair
    notaEm(out, "sine", 2093, t, 0.5, 0.09); notaEm(out, "sine", 3136, t + 0.01, 0.4, 0.05);
    notaEm(out, "sine", 2093, t + 0.22, 0.3, 0.05); notaEm(out, "sine", 2093, t + 0.36, 0.22, 0.03);
  },
  aurora(out, t) {     // uma cantiga de ninar: só as três primeiras notas, sem fim
    [[329.6, 0, 0.5], [329.6, 0.55, 0.5], [392, 1.1, 1.3]]
      .forEach(([f, d, du]) => notaEm(out, "sine", f, t + d, du, 0.09, 4));
  },
};
function sfxMotivo(id, vol, pan) {
  if (!AC || !MOTIVO[id]) return;
  MOTIVO[id](saidaEm(Math.max(0.05, Math.min(1, vol)), pan), AC.currentTime);
}

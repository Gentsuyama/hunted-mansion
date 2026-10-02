"use strict";
// ==================================================================
// ÁUDIO — 100% sintetizado (sem assets)
// ==================================================================
let AC = null, master = null;

function initAudio() {
  if (AC) return;
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    master = AC.createGain(); master.gain.value = 0.55;
    master.connect(AC.destination);

    // drone grave contínuo
    const g = AC.createGain(); g.gain.value = 0.05;
    const lp = AC.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 180;
    const o1 = AC.createOscillator(); o1.type = "triangle"; o1.frequency.value = 48;
    const o2 = AC.createOscillator(); o2.type = "sine";     o2.frequency.value = 48.7;
    o1.connect(lp); o2.connect(lp); lp.connect(g); g.connect(master);
    const lfo = AC.createOscillator(); lfo.frequency.value = 0.07;
    const lfoG = AC.createGain(); lfoG.gain.value = 0.03;
    lfo.connect(lfoG); lfoG.connect(g.gain);
    o1.start(); o2.start(); lfo.start();
  } catch (e) { /* sem áudio, segue o jogo */ }
}

function noiseBuf(sec) {
  const b = AC.createBuffer(1, AC.sampleRate * sec, AC.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
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

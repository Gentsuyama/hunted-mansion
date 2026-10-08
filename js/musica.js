"use strict";
// ==================================================================
// A TRILHA (v2) — música de fundo gerada ao vivo, que nunca se repete igual.
//
// A v1 doía o ouvido: quase toda a energia ficava abaixo de 200 Hz (um
// drone de 48 Hz em audio.js + o pad em ré2, desafinados entre si e
// batendo sem parar), as "cordas" eram duas serras a um semitom e a
// caixinha tinha um parcial a 4× (até 9 kHz). A v2 troca pressão por
// espaço:
//   · FUNDAÇÃO: um acorde grave que RESPIRA (sobe e some em ciclos de
//     1–1,5 min, com pausas de verdade), raiz em ré2 e as outras vozes
//     entre 110 e 300 Hz, sem desafino constante, filtro que abre devagar
//   · AR: vento filtrado (150–650 Hz) e um tom de sala quase inaudível
//   · PIANO DISTANTE: o motivo de ninar do Tomás (ré fá lá sol fá ré),
//     em frases curtas e raras, com reverberação de corredor; na loucura
//     as notas saem desafinadas (a caixinha está quebrada)
//   · PULSO: batimento surdo, só quando algo caça
//   · TENSÃO: duas vozes em quinta no registro médio que viram atrito
//     (uma segunda menor por cima) quando a caça aperta, mais um
//     "subir sem chegar" de ruído filtrado (ilusão de Shepard)
//   · SINOS: só na alvorada (e um resto no refúgio), parciais harmônicos
// Tudo passa por: passa-altas 42 Hz, prateleira −5 dB acima de 2,6 kHz,
// passa-baixas (abafa atrás de painéis), compressor suave e reverberação
// gerada por convolução. Cada CENA é um vetor de níveis; trocar de cena é
// um crossfade de segundos. A verificação é por número (tools/trilha-render.py):
// energia por banda, pico, RMS, crista — o juízo final é do ouvido do Rodolfo.
//
// Acervo opcional: Assets/Musica/<cena>-01.ogg… (ver MUS_ARQ): quando existe,
// toca em rodízio com crossfade e as camadas geradas viram cama baixa.
// ==================================================================
const MUS = {
  vol: 0.26,                       // nível geral da música (a casa fala baixo)
  abafa: 900,                      // passa-baixas (Hz) com painel/álbum/chat aberto
  raizHz: 73.42,                   // Ré2: a casa está em ré menor
  cenas: {
    abertura: { fund: 0.55, ar: 0.30, piano: 0.50, pulso: 0.00, tens: 0.00, sinos: 0.00, paleta: "escura" },
    calma:    { fund: 0.55, ar: 0.45, piano: 0.28, pulso: 0.00, tens: 0.00, sinos: 0.00, paleta: "escura" },
    tensao:   { fund: 0.50, ar: 0.55, piano: 0.10, pulso: 0.35, tens: 0.40, sinos: 0.00, paleta: "escura" },
    caca:     { fund: 0.35, ar: 0.50, piano: 0.00, pulso: 1.00, tens: 0.95, sinos: 0.00, paleta: "escura" },
    refugio:  { fund: 0.65, ar: 0.20, piano: 0.55, pulso: 0.00, tens: 0.00, sinos: 0.12, paleta: "morna" },
    boss:     { fund: 0.45, ar: 0.30, piano: 0.25, pulso: 0.80, tens: 1.00, sinos: 0.00, paleta: "escura" },
    queda:    { fund: 0.75, ar: 0.30, piano: 0.00, pulso: 0.25, tens: 0.55, sinos: 0.00, paleta: "fundo" },
    loucura:  { fund: 0.50, ar: 0.90, piano: 0.35, pulso: 0.60, tens: 0.65, sinos: 0.08, paleta: "fundo" },
    alvorada: { fund: 0.55, ar: 0.10, piano: 0.35, pulso: 0.00, tens: 0.00, sinos: 1.00, paleta: "clara" },
  },
  // acordes em semitons a partir da raiz (ré); a FUNDAÇÃO decide a oitava de cada voz
  paletas: {
    escura: [[0, 3, 7], [0, 3, 7, 10], [5, 8, 12], [8, 12, 15], [1, 5, 8], [7, 10, 14], [0, 3, 8], [3, 7, 10]],
    morna:  [[0, 4, 7], [5, 9, 12], [0, 4, 7, 11], [7, 11, 14], [0, 2, 7], [5, 9, 12, 16]],
    fundo:  [[0, 1, 7], [0, 6, 7], [0, 3, 6], [0, 1, 6], [0, 3, 7, 13]],
    clara:  [[0, 4, 7], [5, 9, 12], [7, 11, 14], [0, 4, 7, 12], [0, 4, 9]],
  },
  motivo: [0, 3, 7, 5, 3, 0],      // a cantiga do Tomás: ré fá lá sol fá ré (menor)
  motivoClaro: [0, 4, 7, 5, 4, 0], // a mesma, em maior (alvorada)
};

let mus = null;                     // o estado vivo da trilha (null até o áudio existir)

function musicaInit() {
  if (mus || !AC) return;
  const t = AC.currentTime;
  // --- cadeia de saída: pre → passa-altas → prateleira → passa-baixas → compressor → saida ---
  const pre = AC.createGain(); pre.gain.value = 1;
  const hp = AC.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 42; hp.Q.value = 0.7;
  const hs = AC.createBiquadFilter(); hs.type = "highshelf"; hs.frequency.value = 2600; hs.gain.value = -5;
  const lp = AC.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 16000;
  const comp = AC.createDynamicsCompressor();
  comp.threshold.value = -22; comp.knee.value = 14; comp.ratio.value = 3;
  comp.attack.value = 0.012; comp.release.value = 0.3;
  const saida = AC.createGain(); saida.gain.value = 0;        // entra devagar
  pre.connect(hp); hp.connect(hs); hs.connect(lp); lp.connect(comp); comp.connect(saida); saida.connect(master);
  saida.gain.setTargetAtTime(MUS.vol, t + 0.5, 3);
  // --- reverberação do corredor (resposta ao impulso gerada) ---
  const rev = AC.createConvolver(); rev.buffer = musicaImpulso(2.6);
  const revG = AC.createGain(); revG.gain.value = 0.9;
  rev.connect(revG); revG.connect(pre);
  const bus = (v, paraRev) => {
    const g = AC.createGain(); g.gain.value = v; g.connect(pre);
    if (paraRev) { const s = AC.createGain(); s.gain.value = paraRev; g.connect(s); s.connect(rev); }
    return g;
  };
  // o piano e os sinos nunca passam de 2,4 kHz
  const pianoLp = AC.createBiquadFilter(); pianoLp.type = "lowpass"; pianoLp.frequency.value = 2400;
  mus = {
    pre, lp, comp, saida, rev, cena: "abertura", pedido: "abertura", pedidoT: 0, abafado: false,
    bus: { fund: bus(0), ar: bus(0), piano: bus(0, 0.45), pulso: bus(0), tens: bus(0, 0.22), sinos: bus(0, 0.6) },
    pianoLp,
    paleta: "escura", acorde: [0, 3, 7], proxAcorde: t + 3,
    vozes: [], filtroBase: 380, tensaoJogo: 0,
    respira: { fase: Math.random() * 6.28, periodo: 70, pausaAte: 0, proxPausa: t + 90 + Math.random() * 60 },
    proxAr: t + 2, proxPiano: t + 7, proxPulso: t + 1, proxSwell: t + 2, proxSino: t + 3,
    arq: { lista: {}, a: null, b: null, g: null, cena: null },
  };
  pianoLp.connect(mus.bus.piano);
  musicaArFonte();
  musicaCordasFonte();
  musicaAplicaCena("abertura", true);
  musicaArquivosProcura();
  setInterval(musicaTick, 200);       // o relógio da trilha (anda mesmo com a aba de fundo)
}

// resposta ao impulso: reflexões cedo + cauda de ruído que escurece ao decair
function musicaImpulso(seg) {
  const sr = AC.sampleRate, n = Math.round(sr * seg);
  const b = AC.createBuffer(2, n, sr);
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c);
    let lp = 0;
    for (let i = 0; i < n; i++) {
      const tt = i / sr;
      let v = (Math.random() * 2 - 1) * Math.exp(-tt / 0.72);
      lp += (v - lp) * 0.28;                 // um polo: a cauda perde o agudo
      d[i] = lp * (tt < 0.004 ? tt / 0.004 : 1);
    }
    for (const [ms, a] of [[11, 0.5], [23, 0.35], [37, 0.25], [52, 0.18]]) {   // reflexões das paredes
      const k = Math.round(sr * ms / 1000 + c * 7);
      if (k < n) d[k] += a * (c ? -1 : 1);
    }
  }
  return b;
}

// ------------------------------------------------------------------
// o DIRETOR: lê o jogo e escolhe a cena (com histerese, para não tremer)
// ------------------------------------------------------------------
function musicaCenaAlvo() {
  if (!world || ["lang", "boot", "title", "cine", "vinheta"].includes(state)) return "abertura";
  if (state === "ritual" || state === "dead") return "queda";
  if (state === "win") return "alvorada";
  if (typeof loucura !== "undefined" && loucura) return "loucura";
  const bw = world.flags.souls && world.flags.souls.blackwood;
  if (bw && bw.state === "awake" && world.cur === NFLOORS - 1) return "boss";
  if (typeof lampAcesa === "function" && lampAcesa() &&
      Math.hypot(world.lamp.x - player.x, world.lamp.y - player.y) < LAMP_RAIO) return "refugio";
  let perto = 999, caca = typeof bossWarnT !== "undefined" && bossWarnT > 0;
  for (const g of fl().ghosts) {
    if (g.respawn > 0) continue;
    const d = Math.hypot(g.x - player.x, g.y - player.y);
    perto = Math.min(perto, d);
    if (g.bote || (g.chase && d < 10)) caca = true;
  }
  if (typeof soulEnts !== "undefined")
    for (const e of soulEnts) if (e.floor === world.cur)
      perto = Math.min(perto, Math.hypot(e.x - player.x, e.y - player.y));
  if (caca) return "caca";
  if (perto < 20) return "tensao";
  return "calma";
}
function musicaUpdate(dt) {
  if (!mus) return;
  const alvo = musicaCenaAlvo();
  if (alvo !== mus.pedido) { mus.pedido = alvo; mus.pedidoT = 0; }
  else mus.pedidoT += dt;
  // subir a tensão é imediato; acalmar pede 2,5 s de calma de verdade
  const sobe = ["caca", "boss", "queda", "alvorada", "loucura"].includes(alvo);
  if (alvo !== mus.cena && (sobe || mus.pedidoT > 2.5)) musicaAplicaCena(alvo, false);
  const abafa = ["safe", "fusebox", "darkroom", "elevator", "chat", "album", "diario"].includes(state);
  if (abafa !== mus.abafado) {
    mus.abafado = abafa;
    const t = AC.currentTime;
    mus.lp.frequency.setTargetAtTime(abafa ? MUS.abafa : 16000, t, 0.5);
    mus.saida.gain.setTargetAtTime(abafa ? MUS.vol * 0.65 : MUS.vol, t, 0.8);
  }
}
function musicaAplicaCena(nome, agora) {
  const c = MUS.cenas[nome]; if (!c) return;
  mus.cena = nome;
  const t = AC.currentTime, tau = agora ? 0.01 : 2.6;
  const temArq = !!(mus.arq.lista[nome] && mus.arq.lista[nome].length);
  const k = temArq ? 0.35 : 1;                        // com música de arquivo, o gerado vira cama
  mus.k = k;
  for (const nomeBus in mus.bus)
    if (nomeBus !== "fund") mus.bus[nomeBus].gain.setTargetAtTime(c[nomeBus] * k, t, tau);
  if (c.paleta !== mus.paleta) {                      // a paleta troca no próximo acorde
    mus.paleta = c.paleta;
    mus.proxAcorde = Math.min(mus.proxAcorde, t + 3);
  }
  musicaArquivosCena(nome);
}
// a casa te notou (game.js): o filtro da fundação abre um pouco
function musicaTensao(k) { if (mus) mus.tensaoJogo = Math.max(0, Math.min(1, k)); }

// ------------------------------------------------------------------
// o RELÓGIO: agenda o que vem a seguir em cada camada
// ------------------------------------------------------------------
function musicaTick() {
  if (!mus || !AC || AC.state !== "running") return;
  const t = AC.currentTime, LA = 0.35;              // agenda com 350 ms de antecedência
  musicaRespira(t);
  if (t > mus.proxAcorde - LA) musicaNovoAcorde(mus.proxAcorde);
  if (t > mus.proxAr - LA) musicaAr(mus.proxAr);
  if (t > mus.proxPiano - LA) musicaPiano(mus.proxPiano);
  if (t > mus.proxPulso - LA) musicaPulso(mus.proxPulso);
  if (t > mus.proxSwell - LA) musicaSwell(mus.proxSwell);
  if (t > mus.proxSino - LA) musicaSino(mus.proxSino);
}
const musRnd = (a, b) => a + Math.random() * (b - a);
const musHz = (semi) => MUS.raizHz * Math.pow(2, semi / 12);

// a FUNDAÇÃO respira: ciclos de 55–95 s entre 35% e 100% do nível da cena,
// e, nas cenas calmas, uma pausa de verdade de vez em quando
function musicaRespira(t) {
  const R = mus.respira, c = MUS.cenas[mus.cena];
  let k = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(R.fase + 6.2832 * t / R.periodo));
  if ((mus.cena === "calma" || mus.cena === "abertura") && t > R.proxPausa) {
    R.pausaAte = t + musRnd(10, 18); R.proxPausa = t + musRnd(80, 150);
  }
  if (t < R.pausaAte) k = 0.12;
  mus.bus.fund.gain.setTargetAtTime(c.fund * (mus.k || 1) * k, t, 1.6);
  // o filtro das vozes abre com a tensão do jogo (audioTensao) — devagar
  const corte = mus.filtroBase + 240 * mus.tensaoJogo;
  for (const v of mus.vozes) v.flt.frequency.setTargetAtTime(corte * v.kf, t, 1.2);
}

// FUNDAÇÃO: raiz em ré2 (73 Hz) e as outras vozes entre 110 e 300 Hz; seno +
// um pouco de triângulo, filtro próprio por voz com um balanço lento; sem
// desafino fixo (o que batia o tempo todo na v1) — só um vibrato de 6 cents
function musicaNovoAcorde(t0) {
  const pal = MUS.paletas[mus.paleta];
  let ac = pal[Math.random() * pal.length | 0];
  if (ac === mus.acorde && pal.length > 1) ac = pal[(pal.indexOf(ac) + 1) % pal.length];
  mus.acorde = ac;
  for (const v of mus.vozes) {                      // as vozes velhas se despedem
    v.g.gain.setTargetAtTime(0.0001, t0, 2.2);
    for (const o of v.os) o.stop(t0 + 11);
  }
  mus.vozes = [];
  ac.forEach((semi, i) => {
    let f = musHz(semi);
    if (i > 0) { while (f < 150) f *= 2; while (f > 440) f /= 2; }   // as vozes de cima no registro médio (150–440 Hz)
    const g = AC.createGain(); g.gain.setValueAtTime(0.0001, t0);
    g.gain.setTargetAtTime(i === 0 ? 0.06 : 0.07, t0, 2.6);     // a raiz é sentida, não pesa
    const flt = AC.createBiquadFilter(); flt.type = "lowpass"; flt.Q.value = 0.8;
    const kf = 0.85 + Math.random() * 0.4;
    flt.frequency.value = mus.filtroBase * kf;
    const o1 = AC.createOscillator(); o1.type = "sine"; o1.frequency.value = f;
    const o2 = AC.createOscillator(); o2.type = "triangle"; o2.frequency.value = f;
    const g2 = AC.createGain(); g2.gain.value = 0.3;
    o1.connect(flt); o2.connect(g2); g2.connect(flt); flt.connect(g); g.connect(mus.bus.fund);
    const os = [o1, o2];
    if (i > 0) {                                      // vibrato lento e raso (chorus, não batimento)
      const lfo = AC.createOscillator(); lfo.frequency.value = musRnd(0.05, 0.12);
      const lg = AC.createGain(); lg.gain.value = 6;  // cents
      lfo.connect(lg); lg.connect(o1.detune); lg.connect(o2.detune); lfo.start(t0); os.push(lfo);
    }
    o1.start(t0); o2.start(t0);
    mus.vozes.push({ g, os, flt, kf });
  });
  mus.proxAcorde = t0 + musRnd(22, 45);
}

// AR: tom de sala quase inaudível + lufadas de vento filtrado (150–650 Hz)
function musicaArFonte() {
  const sala = AC.createBufferSource(); sala.buffer = noiseBuf(4); sala.loop = true;
  const slp = AC.createBiquadFilter(); slp.type = "lowpass"; slp.frequency.value = 320;
  const sg = AC.createGain(); sg.gain.value = 0.05;
  sala.connect(slp); slp.connect(sg); sg.connect(mus.bus.ar); sala.start();
  const n = AC.createBufferSource(); n.buffer = noiseBuf(4); n.loop = true;
  const bp = AC.createBiquadFilter(); bp.type = "bandpass"; bp.Q.value = 0.8; bp.frequency.value = 300;
  const env = AC.createGain(); env.gain.value = 0.0001;
  const pan = AC.createStereoPanner ? AC.createStereoPanner() : null;
  n.connect(bp); bp.connect(env);
  if (pan) { env.connect(pan); pan.connect(mus.bus.ar); } else env.connect(mus.bus.ar);
  n.start();
  mus.ar = { bp, env, pan };
}
function musicaAr(t0) {
  const r = mus.ar, sobe = musRnd(2.5, 5), desce = musRnd(3, 7);
  r.env.gain.setTargetAtTime(musRnd(0.24, 0.54), t0, sobe / 3);
  r.env.gain.setTargetAtTime(0.0001, t0 + sobe, desce / 3);
  r.bp.frequency.setValueAtTime(musRnd(150, 320), t0);
  r.bp.frequency.linearRampToValueAtTime(musRnd(380, 650), t0 + sobe + desce);
  if (r.pan) r.pan.pan.setTargetAtTime(musRnd(-0.7, 0.7), t0, 1.5);
  mus.proxAr = t0 + sobe + desce + musRnd(4, 14);
}

// PIANO DISTANTE: o motivo do Tomás em frases de 2–5 notas, raras; cada nota
// é seno + 2º e 3º parciais curtos (feltro), 10 ms de ataque, 2,5–4 s de cauda
function musicaPiano(t0) {
  const nivel = MUS.cenas[mus.cena].piano;
  if (nivel < 0.05) { mus.proxPiano = t0 + 4; return; }
  const mot = mus.paleta === "clara" || mus.paleta === "morna" ? MUS.motivoClaro : MUS.motivo;
  const n = 2 + (Math.random() * 4 | 0), ini = Math.random() * (mot.length - 1) | 0;
  const oitava = (mus.paleta === "clara" && Math.random() < 0.5) ? 36 : 24;   // ré4 (293 Hz) ou ré5
  const quebrada = mus.cena === "loucura";
  const pan = AC.createStereoPanner ? AC.createStereoPanner() : null;
  if (pan) { pan.pan.value = musRnd(-0.5, 0.5); pan.connect(mus.pianoLp); }
  const dest = pan || mus.pianoLp;
  let tt = t0;
  for (let i = 0; i < n; i++) {
    const semi = mot[(ini + i) % mot.length] + oitava + (Math.random() < 0.12 ? 12 : 0);
    let f = musHz(semi);
    if (quebrada) f *= Math.pow(2, musRnd(-45, 45) / 1200);        // a caixinha está quebrada
    const vel = musRnd(0.55, 1) * 0.22, dur = musRnd(2.5, 4.2);
    for (const [mult, v, kd] of [[1, 1, 1], [2, 0.22, 0.5], [3, 0.07, 0.33]]) {
      const o = AC.createOscillator(); o.type = "sine"; o.frequency.value = f * mult;
      const g = AC.createGain(); g.gain.setValueAtTime(0.0001, tt);
      g.gain.exponentialRampToValueAtTime(vel * v, tt + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, tt + dur * kd);
      o.connect(g); g.connect(dest); o.start(tt); o.stop(tt + dur * kd + 0.05);
    }
    tt += musRnd(0.55, 1.1) * (Math.random() < 0.2 ? 2 : 1);    // às vezes uma pausa no meio
  }
  mus.proxPiano = tt + musRnd(18, 50) / Math.max(0.3, nivel);
}

// PULSO: batimento surdo (56→36 Hz), mais rápido e duplo quando a caça aperta
function musicaPulso(t0) {
  const nivel = MUS.cenas[mus.cena].pulso;
  if (nivel < 0.05) { mus.proxPulso = t0 + 1; return; }
  const bate = (t, v) => {
    const o = AC.createOscillator(); o.type = "sine";
    o.frequency.setValueAtTime(56, t); o.frequency.exponentialRampToValueAtTime(36, t + 0.16);
    const g = AC.createGain(); g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.025); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
    o.connect(g); g.connect(mus.bus.pulso); o.start(t); o.stop(t + 0.45);
  };
  bate(t0, 0.3);
  if (nivel > 0.6) bate(t0 + 0.22, 0.17);
  const bpm = 44 + 30 * nivel;
  mus.proxPulso = t0 + 60 / bpm + musRnd(-0.05, 0.08);
}

// TENSÃO (contínua): ré3 + lá3 em triângulo filtrado — uma quinta vazia que
// respira; a terceira voz (si♭3, um semitom acima do lá) só entra quando a
// cena aperta: o atrito nasce no registro médio, nunca estridente
function musicaCordasFonte() {
  const lp = AC.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 900; lp.Q.value = 0.9;
  const trem = AC.createGain(); trem.gain.value = 0.75;
  const lfo = AC.createOscillator(); lfo.frequency.value = 3.2;
  const lfoG = AC.createGain(); lfoG.gain.value = 0.22;
  lfo.connect(lfoG); lfoG.connect(trem.gain); lfo.start();
  lp.connect(trem); trem.connect(mus.bus.tens);
  const voz = (semi, gan) => {
    const o = AC.createOscillator(); o.type = "triangle"; o.frequency.value = musHz(semi);
    const vib = AC.createOscillator(); vib.frequency.value = musRnd(0.1, 0.2);
    const vg = AC.createGain(); vg.gain.value = 5;      // cents
    vib.connect(vg); vg.connect(o.detune); vib.start();
    const g = AC.createGain(); g.gain.value = gan;
    o.connect(g); g.connect(lp); o.start();
    return g;
  };
  voz(12, 0.055); voz(19, 0.045);                     // ré3, lá3
  mus.atrito = voz(20, 0.0001);                       // si♭3: entra pelo nível da cena
  mus.atritoNivel = 0;
}
// SWELL: ruído filtrado subindo (180 → 1400 Hz) por 7–11 s e sumindo antes de
// chegar; o próximo começa antes do fim — "subir sem chegar"
function musicaSwell(t0) {
  const nivel = MUS.cenas[mus.cena].tens;
  // o atrito (si♭) acompanha a cena: aparece acima de 0,5 de tensão
  const alvoAtrito = nivel > 0.5 ? 0.04 * (nivel - 0.5) * 2 : 0.0001;
  if (alvoAtrito !== mus.atritoNivel) { mus.atrito.gain.setTargetAtTime(alvoAtrito, t0, 3); mus.atritoNivel = alvoAtrito; }
  if (nivel < 0.05) { mus.proxSwell = t0 + 2; return; }
  const dur = musRnd(7, 11);
  const n = AC.createBufferSource(); n.buffer = noiseBuf(4); n.loop = true;
  const bp = AC.createBiquadFilter(); bp.type = "bandpass"; bp.Q.value = 1.4;
  bp.frequency.setValueAtTime(180, t0); bp.frequency.exponentialRampToValueAtTime(1400, t0 + dur);
  const g = AC.createGain(); g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.12 * Math.max(0.4, nivel), t0 + dur * 0.65);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  const pan = AC.createStereoPanner ? AC.createStereoPanner() : null;
  n.connect(bp); bp.connect(g);
  if (pan) { pan.pan.value = musRnd(-0.6, 0.6); g.connect(pan); pan.connect(mus.bus.tens); } else g.connect(mus.bus.tens);
  n.start(t0); n.stop(t0 + dur + 0.1);
  // na caça os swells se encadeiam; na tensão vêm espaçados
  mus.proxSwell = t0 + (nivel > 0.7 ? dur * 0.6 : dur + musRnd(6, 20));
}

// SINOS: parciais harmônicos (1, 2, 3), cauda longa, reverberação; nas notas do acorde
function musicaSino(t0) {
  const nivel = MUS.cenas[mus.cena].sinos;
  if (nivel < 0.05) { mus.proxSino = t0 + 2; return; }
  const semi = mus.acorde[Math.random() * mus.acorde.length | 0] + 36 + (Math.random() < 0.3 ? 12 : 0);
  const f = musHz(semi);
  const pan = AC.createStereoPanner ? AC.createStereoPanner() : null;
  if (pan) { pan.pan.value = musRnd(-0.5, 0.5); pan.connect(mus.bus.sinos); }
  for (const [mult, v, dur] of [[1, 0.16, 4.5], [2, 0.045, 2.2], [3, 0.016, 1.1]]) {
    const o = AC.createOscillator(); o.type = "sine"; o.frequency.value = f * mult;
    const g = AC.createGain(); g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(v, t0 + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(pan || mus.bus.sinos); o.start(t0); o.stop(t0 + dur + 0.05);
  }
  mus.proxSino = t0 + musRnd(2.5, 6) / Math.max(0.3, nivel);
}

// ------------------------------------------------------------------
// ACERVO: Assets/Musica/<cena>-01.ogg, -02.ogg… toca em rodízio com crossfade
// ------------------------------------------------------------------
function musicaArquivosProcura() {
  for (const cena in MUS.cenas) {
    mus.arq.lista[cena] = [];
    const tenta = (n) => {
      const url = "Assets/Musica/" + cena + "-" + String(n).padStart(2, "0") + ".ogg";
      fetch(url, { method: "HEAD" }).then(r => {
        if (!r.ok) return;
        mus.arq.lista[cena].push(url);
        if (cena === mus.cena && mus.arq.lista[cena].length === 1) musicaAplicaCena(cena, false);
        if (n < 12) tenta(n + 1);
      }).catch(() => {});
    };
    tenta(1);
  }
}
function musicaArquivosCena(cena) {
  const A = mus.arq, lista = A.lista[cena] || [];
  if (!A.g) { A.g = AC.createGain(); A.g.gain.value = 0; A.g.connect(mus.lp); }
  const t = AC.currentTime;
  if (!lista.length) {                               // esta cena não tem arquivo: some devagar
    A.g.gain.setTargetAtTime(0.0001, t, 1.5);
    A.cena = null;
    setTimeout(() => { if (!A.cena) for (const el of [A.a, A.b]) if (el && el.el) el.el.pause(); }, 6000);
    return;
  }
  if (A.cena === cena) return;
  A.cena = cena;
  musicaArquivoToca(cena);
  A.g.gain.setTargetAtTime(0.8, t, 2);
}
function musicaArquivoToca(cena) {
  const A = mus.arq, lista = A.lista[cena];
  const url = lista[Math.random() * lista.length | 0];
  const slot = (!A.a || A.a.ocupado === false) ? "a" : "b";
  if (!A[slot]) {
    const el = new Audio(); el.crossOrigin = "anonymous"; el.preload = "auto";
    const src = AC.createMediaElementSource(el);
    const g = AC.createGain(); g.gain.value = 0; src.connect(g); g.connect(A.g);
    A[slot] = { el, g, ocupado: false };
  }
  const S = A[slot], outro = A[slot === "a" ? "b" : "a"];
  const t = AC.currentTime;
  S.el.src = url; S.el.currentTime = 0; S.ocupado = true;
  S.el.play().catch(() => {});
  S.g.gain.setTargetAtTime(1, t, 1.2);
  if (outro && outro.ocupado) {                      // crossfade de 3 s com a faixa anterior
    outro.g.gain.setTargetAtTime(0.0001, t, 1);
    const velho = outro.el; setTimeout(() => { velho.pause(); outro.ocupado = false; }, 4000);
  }
  S.el.onended = () => { S.ocupado = false; if (A.cena === cena) musicaArquivoToca(cena); };
  S.el.ontimeupdate = () => {                        // emenda antes do fim, sem buraco
    if (S.el.duration && S.el.duration - S.el.currentTime < 3 && S.ocupado && A.cena === cena && !S.emendou) {
      S.emendou = true; S.ocupado = false; musicaArquivoToca(cena); setTimeout(() => { S.emendou = false; }, 5000);
    }
  };
}

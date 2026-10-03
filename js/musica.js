"use strict";
// ==================================================================
// A TRILHA — música de fundo leve, gerada ao vivo, que nunca se repete igual.
//
// Seis CAMADAS tocam o tempo todo (pad grave, respiro de vento, caixinha de
// música, pulso, cordas tensas, sinos) e cada CENA do jogo é só um vetor de
// níveis para elas. Trocar de cena é um crossfade de alguns segundos
// (setTargetAtTime), nunca um corte. A harmonia anda sozinha: acordes
// sorteados numa paleta modal, cada um durando 15–35 s, com entrada e saída
// lentas — por isso a mesma cena não vira loop.
//
// Acervo opcional: Assets/Musica/<cena>-01.ogg, -02.ogg… (ver MUS_ARQ). Quando
// existe, toca em rodízio com crossfade e as camadas geradas viram cama baixa.
// ==================================================================
const MUS = {
  vol: 0.30,                       // nível geral da música (a casa fala baixo)
  abafa: 900,                      // passa-baixas (Hz) com painel/álbum/chat aberto
  raizHz: 73.42,                   // Ré2: a casa está em ré menor
  cenas: {
    abertura: { pad: 0.55, respiro: 0.35, caixa: 0.55, pulso: 0.00, cordas: 0.00, sinos: 0.00, paleta: "escura" },
    calma:    { pad: 0.60, respiro: 0.50, caixa: 0.22, pulso: 0.00, cordas: 0.00, sinos: 0.00, paleta: "escura" },
    tensao:   { pad: 0.50, respiro: 0.60, caixa: 0.10, pulso: 0.45, cordas: 0.30, sinos: 0.00, paleta: "escura" },
    caca:     { pad: 0.30, respiro: 0.45, caixa: 0.00, pulso: 1.00, cordas: 0.90, sinos: 0.00, paleta: "escura" },
    refugio:  { pad: 0.70, respiro: 0.20, caixa: 0.45, pulso: 0.00, cordas: 0.00, sinos: 0.15, paleta: "morna" },
    boss:     { pad: 0.40, respiro: 0.30, caixa: 0.30, pulso: 0.80, cordas: 1.00, sinos: 0.00, paleta: "escura" },
    queda:    { pad: 0.80, respiro: 0.30, caixa: 0.00, pulso: 0.25, cordas: 0.60, sinos: 0.00, paleta: "fundo" },
    alvorada: { pad: 0.60, respiro: 0.10, caixa: 0.20, pulso: 0.00, cordas: 0.00, sinos: 1.00, paleta: "clara" },
  },
  // acordes em semitons a partir da raiz (ré); cada paleta tem seu clima
  paletas: {
    escura: [[0, 3, 7], [0, 3, 7, 10], [5, 8, 12], [8, 12, 15], [1, 5, 8], [7, 10, 14], [0, 3, 8], [3, 7, 10]],
    morna:  [[0, 4, 7], [5, 9, 12], [0, 4, 7, 11], [7, 11, 14], [0, 2, 7], [5, 9, 12, 16]],
    fundo:  [[0, 1, 7], [0, 6, 7], [0, 3, 6], [0, 1, 6], [0, 3, 7, 13]],
    clara:  [[0, 4, 7], [5, 9, 12], [7, 11, 14], [0, 4, 7, 12], [0, 4, 9]],
  },
  escalas: {                        // para a caixinha e os sinos
    escura: [0, 2, 3, 5, 7, 8, 10], morna: [0, 2, 3, 5, 7, 9, 10],
    fundo: [0, 1, 3, 6, 7, 8], clara: [0, 2, 4, 5, 7, 9, 11],
  },
};

let mus = null;                     // o estado vivo da trilha (null até o áudio existir)

function musicaInit() {
  if (mus || !AC) return;
  const t = AC.currentTime;
  const saida = AC.createGain(); saida.gain.value = 0;        // entra devagar
  const lp = AC.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 16000;
  lp.connect(saida); saida.connect(master);
  saida.gain.setTargetAtTime(MUS.vol, t + 0.5, 3);
  const bus = (v) => { const g = AC.createGain(); g.gain.value = v; g.connect(lp); return g; };
  mus = {
    saida, lp, cena: "abertura", pedido: "abertura", pedidoT: 0, abafado: false,
    bus: { pad: bus(0), respiro: bus(0), caixa: bus(0), pulso: bus(0), cordas: bus(0), sinos: bus(0) },
    paleta: "escura", acorde: [0, 3, 7], proxAcorde: t + 4,
    padVozes: [], proxRespiro: t + 2, proxCaixa: t + 6, proxPulso: t + 1, proxSino: t + 3,
    arq: { lista: {}, a: null, b: null, g: null, cena: null },
  };
  // as cordas tensas e o respiro são contínuos: nascem uma vez
  musicaCordas();
  musicaRespiroFonte();
  musicaAplicaCena("abertura", true);
  musicaArquivosProcura();
  setInterval(musicaTick, 200);       // o relógio da trilha (anda mesmo com a aba de fundo)
}

// ------------------------------------------------------------------
// o DIRETOR: lê o jogo e escolhe a cena (com histerese, para não tremer)
// ------------------------------------------------------------------
function musicaCenaAlvo() {
  if (!world || ["lang", "boot", "title", "cine", "vinheta"].includes(state)) return "abertura";
  if (state === "ritual" || state === "dead") return "queda";
  if (state === "win") return "alvorada";
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
  const sobe = ["caca", "boss", "queda", "alvorada"].includes(alvo);
  if (alvo !== mus.cena && (sobe || mus.pedidoT > 2.5)) musicaAplicaCena(alvo, false);
  const abafa = ["safe", "fusebox", "darkroom", "elevator", "chat", "album"].includes(state);
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
  for (const nomeBus in mus.bus) mus.bus[nomeBus].gain.setTargetAtTime(c[nomeBus] * k, t, tau);
  if (c.paleta !== mus.paleta) {                      // a paleta troca no próximo acorde
    mus.paleta = c.paleta;
    mus.proxAcorde = Math.min(mus.proxAcorde, t + 3);
  }
  musicaArquivosCena(nome);
}

// ------------------------------------------------------------------
// o RELÓGIO: agenda o que vem a seguir em cada camada
// ------------------------------------------------------------------
function musicaTick() {
  if (!mus || !AC || AC.state !== "running") return;
  const t = AC.currentTime, LA = 0.35;              // agenda com 350 ms de antecedência
  if (t > mus.proxAcorde - LA) musicaNovoAcorde(mus.proxAcorde);
  if (t > mus.proxRespiro - LA) musicaRespiro(mus.proxRespiro);
  if (t > mus.proxCaixa - LA) musicaCaixinha(mus.proxCaixa);
  if (t > mus.proxPulso - LA) musicaPulso(mus.proxPulso);
  if (t > mus.proxSino - LA) musicaSino(mus.proxSino);
}
const musRnd = (a, b) => a + Math.random() * (b - a);
const musHz = (semi) => MUS.raizHz * Math.pow(2, semi / 12);

// PAD: três ou quatro vozes graves, cada acorde entra em 6 s e sai em 5 s
function musicaNovoAcorde(t0) {
  const pal = MUS.paletas[mus.paleta];
  let ac = pal[Math.random() * pal.length | 0];
  if (ac === mus.acorde && pal.length > 1) ac = pal[(pal.indexOf(ac) + 1) % pal.length];
  mus.acorde = ac;
  for (const v of mus.padVozes) {                   // as vozes velhas se despedem
    v.g.gain.setTargetAtTime(0.0001, t0, 1.8);
    for (const o of v.os) o.stop(t0 + 9);
  }
  mus.padVozes = [];
  ac.forEach((semi, i) => {
    const oit = i === 0 ? 0 : (Math.random() < 0.5 ? 12 : 0);   // a fundamental fica embaixo
    const f = musHz(semi + oit);
    const g = AC.createGain(); g.gain.setValueAtTime(0.0001, t0);
    g.gain.setTargetAtTime(0.11 / (1 + i * 0.35), t0, 2.4);
    const flt = AC.createBiquadFilter(); flt.type = "lowpass"; flt.frequency.value = 520 + Math.random() * 200;
    const o1 = AC.createOscillator(); o1.type = "triangle"; o1.frequency.value = f;
    const o2 = AC.createOscillator(); o2.type = "sine"; o2.frequency.value = f * (1 + (Math.random() - 0.5) * 0.006);
    o1.connect(flt); o2.connect(flt); flt.connect(g); g.connect(mus.bus.pad);
    o1.start(t0); o2.start(t0);
    mus.padVozes.push({ g, os: [o1, o2] });
  });
  mus.proxAcorde = t0 + musRnd(15, 35);
}

// RESPIRO: vento filtrado que cresce e some, sempre num lugar diferente do estéreo
function musicaRespiroFonte() {
  const n = AC.createBufferSource(); n.buffer = noiseBuf(4); n.loop = true;
  const bp = AC.createBiquadFilter(); bp.type = "bandpass"; bp.Q.value = 0.9; bp.frequency.value = 400;
  const env = AC.createGain(); env.gain.value = 0.0001;
  const pan = AC.createStereoPanner ? AC.createStereoPanner() : null;
  n.connect(bp); bp.connect(env);
  if (pan) { env.connect(pan); pan.connect(mus.bus.respiro); } else env.connect(mus.bus.respiro);
  n.start();
  mus.respiro = { bp, env, pan };
}
function musicaRespiro(t0) {
  const r = mus.respiro, sobe = musRnd(2, 4.5), desce = musRnd(3, 6);
  r.env.gain.setTargetAtTime(musRnd(0.05, 0.11), t0, sobe / 3);
  r.env.gain.setTargetAtTime(0.0001, t0 + sobe, desce / 3);
  r.bp.frequency.setValueAtTime(musRnd(220, 420), t0);
  r.bp.frequency.linearRampToValueAtTime(musRnd(600, 1100), t0 + sobe + desce);
  if (r.pan) r.pan.pan.setTargetAtTime(musRnd(-0.7, 0.7), t0, 1.5);
  mus.proxRespiro = t0 + sobe + desce + musRnd(3, 12);
}

// CAIXINHA DE MÚSICA: frases curtas, agudas, com eco de corredor; longas pausas
function musicaCaixinha(t0) {
  const nivel = MUS.cenas[mus.cena].caixa;
  if (nivel < 0.05) { mus.proxCaixa = t0 + 4; return; }
  if (!mus.eco) {                                    // o eco do corredor
    const d = AC.createDelay(1.5); d.delayTime.value = 0.41;
    const fb = AC.createGain(); fb.gain.value = 0.32;
    const lp = AC.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 2400;
    d.connect(fb); fb.connect(lp); lp.connect(d); d.connect(mus.bus.caixa);
    mus.eco = d;
  }
  const esc = MUS.escalas[mus.paleta], n = 1 + (Math.random() * 3 | 0);
  const pan = AC.createStereoPanner ? AC.createStereoPanner() : null;
  if (pan) { pan.pan.value = musRnd(-0.6, 0.6); pan.connect(mus.bus.caixa); pan.connect(mus.eco); }
  let tt = t0, grau = Math.random() * esc.length | 0;
  for (let i = 0; i < n; i++) {
    grau = Math.max(0, Math.min(esc.length - 1, grau + (Math.random() < 0.5 ? -1 : 1) * (1 + (Math.random() < 0.3 ? 1 : 0))));
    const f = musHz(esc[grau] + 36 + (Math.random() < 0.3 ? 12 : 0));   // oitavas 5–6
    const g = AC.createGain(); g.gain.setValueAtTime(0.0001, tt);
    g.gain.exponentialRampToValueAtTime(0.09, tt + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, tt + musRnd(1.6, 2.8));
    const o = AC.createOscillator(); o.type = "sine"; o.frequency.value = f;
    const h = AC.createOscillator(); h.type = "sine"; h.frequency.value = f * 4.01;
    const hg = AC.createGain(); hg.gain.setValueAtTime(0.25, tt); hg.gain.exponentialRampToValueAtTime(0.001, tt + 0.5);
    o.connect(g); h.connect(hg); hg.connect(g);
    g.connect(pan || mus.bus.caixa); if (!pan) g.connect(mus.eco);
    o.start(tt); h.start(tt); o.stop(tt + 3); h.stop(tt + 0.6);
    tt += musRnd(0.32, 0.75);
  }
  mus.proxCaixa = tt + musRnd(5, 14) / Math.max(0.3, nivel);
}

// PULSO: um baque surdo, quase batimento; mais rápido e duplo quando a caça aperta
function musicaPulso(t0) {
  const nivel = MUS.cenas[mus.cena].pulso;
  if (nivel < 0.05) { mus.proxPulso = t0 + 1; return; }
  const bate = (t, v) => {
    const o = AC.createOscillator(); o.type = "sine";
    o.frequency.setValueAtTime(78, t); o.frequency.exponentialRampToValueAtTime(44, t + 0.14);
    const g = AC.createGain(); g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);
    o.connect(g); g.connect(mus.bus.pulso); o.start(t); o.stop(t + 0.4);
  };
  bate(t0, 0.5);
  if (nivel > 0.6) bate(t0 + 0.21, 0.3);
  const bpm = 46 + 26 * nivel;
  mus.proxPulso = t0 + 60 / bpm + musRnd(-0.05, 0.08);
}

// CORDAS TENSAS: duas serras a um semitom de distância, tremendo, com vibrato lento
function musicaCordas() {
  const bp = AC.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 980; bp.Q.value = 1.6;
  const trem = AC.createGain(); trem.gain.value = 0.5;
  const lfo = AC.createOscillator(); lfo.frequency.value = 5.3;
  const lfoG = AC.createGain(); lfoG.gain.value = 0.45;
  lfo.connect(lfoG); lfoG.connect(trem.gain); lfo.start();
  bp.connect(trem); trem.connect(mus.bus.cordas);
  for (const semi of [24, 25]) {                     // ré4 e mi♭4
    const o = AC.createOscillator(); o.type = "sawtooth"; o.frequency.value = musHz(semi);
    const vib = AC.createOscillator(); vib.frequency.value = musRnd(0.08, 0.16);
    const vg = AC.createGain(); vg.gain.value = musHz(semi) * 0.012;
    vib.connect(vg); vg.connect(o.frequency); vib.start();
    const g = AC.createGain(); g.gain.value = 0.07;
    o.connect(g); g.connect(bp); o.start();
  }
}

// SINOS: só na alvorada (e um resto no refúgio): badaladas nas notas do acorde
function musicaSino(t0) {
  const nivel = MUS.cenas[mus.cena].sinos;
  if (nivel < 0.05) { mus.proxSino = t0 + 2; return; }
  const semi = mus.acorde[Math.random() * mus.acorde.length | 0] + 36;
  const f = musHz(semi);
  const pan = AC.createStereoPanner ? AC.createStereoPanner() : null;
  if (pan) { pan.pan.value = musRnd(-0.5, 0.5); pan.connect(mus.bus.sinos); }
  for (const [mult, v, dur] of [[1, 0.12, 4.5], [2.76, 0.05, 1.6], [5.4, 0.025, 0.7]]) {
    const o = AC.createOscillator(); o.type = "sine"; o.frequency.value = f * mult;
    const g = AC.createGain(); g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(v, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(pan || mus.bus.sinos); o.start(t0); o.stop(t0 + dur + 0.05);
  }
  mus.proxSino = t0 + musRnd(1.8, 5) / Math.max(0.3, nivel);
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

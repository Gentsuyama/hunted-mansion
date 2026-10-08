"use strict";
// ==================================================================
// SANIDADE ZERO — o que acontece quando a cabeça cede (antes da queda):
//  · TOMÁS ACODE: uma vez por live, enquanto o menino ainda está na casa
//    (nem preso, nem livre, nem queimado), ele aparece ao seu lado, conta
//    até cem e você levanta. A casa cobra: a página do diário avisa que
//    não haverá segunda vez.
//  · LOUCURA: a casa entra na sua cabeça. Você ainda joga, mas a imagem
//    dobra, olhos e vultos que não existem aparecem, o chat fala com as
//    vozes das almas e a sua alma é sugada por LOUCURA.dur segundos (cada
//    alma da ampola é comida antes e compra tempo). A LUZ te segura: velas
//    acesas e a lamparina recuperam, cada clarão do flash devolve um pouco.
//    Sanidade de volta a LOUCURA.sai = você respira (fica uma ferida).
//    O tempo acabou = casaPega() — a queda e o ritual de sempre.
// ==================================================================

// chamada quando sanity <= 0 em plena partida; true se alguém segurou a queda
function sanidadeZerou() {
  if (loucura) { loucuraDano(-sanity); sanity = 0; return true; }   // golpe na loucura: a alma vai mais depressa
  if (tomasPodeAcudir()) { tomasAcode(); return true; }
  loucuraComeca();
  return true;
}

// ------------------------------------------------------------------
// TOMÁS ACODE
// ------------------------------------------------------------------
let tomasEvt = null;        // { t, dur, x, y, bob, falas }
const TOMAS_FALAS = [[1.3, "…noventa e sete…"], [2.5, "…noventa e oito…"], [3.7, "…noventa e nove…"],
                     [5.0, "cem."], [6.2, "achei você."]];
function tomasPodeAcudir() {
  if (!world || world.flags.tomasAcudiu) return false;
  const s = world.flags.souls && world.flags.souls.tomas;
  return !!s && (s.state === "dormant" || s.state === "awake");
}
function tomasAcode() {
  world.flags.tomasAcudiu = true;
  conquista("tomas_acudiu");
  let x = player.x + 1.4, y = player.y + 0.5;
  for (let k = 0; k < 16 && isSolid(x | 0, y | 0); k++) {
    const a = Math.random() * 6.283; x = player.x + Math.cos(a) * 1.5; y = player.y + Math.sin(a) * 1.5;
  }
  tomasEvt = { t: 0, dur: 8.4, x, y, bob: 0, falas: 0 };
  sanity = 1; tremor = 0; limpaEntradas(); pvx = 0; pvy = 0; movendo = false;
  for (const g of fl().ghosts) {                 // os ecos recuam para o escuro enquanto ele conta
    g.bote = null; g.chase = false; g.gasto = 25;
    const d = Math.hypot(g.x - player.x, g.y - player.y) || 1;
    g.wx = g.x + (g.x - player.x) / d * 9; g.wy = g.y + (g.y - player.y) / d * 9;
  }
  boteLivreT = 4;
  audioTensao(0); sfxWhisper();
  livePush(liveRandUser(), "a tela ficou PRETA. você caiu?? VOCÊ CAIU??");
}
function tomasEvtUpdate(dt) {
  const e = tomasEvt;
  e.t += dt; e.bob += dt * 2;
  if (e.t > 2.5) sanity = Math.min(LOUCURA.tomasSan, 1 + (e.t - 2.5) / 3.7 * (LOUCURA.tomasSan - 1));
  while (e.falas < TOMAS_FALAS.length && e.t >= TOMAS_FALAS[e.falas][0]) {
    e.falas++;
    if (e.falas === 4) sfxSting(); else sfxWhisper();
  }
  if (e.t >= e.dur) tomasEvtFim();
}
function tomasEvtFim() {
  tomasEvt = null;
  sanity = LOUCURA.tomasSan; tremor = 1; floorFadeT = 0.6;
  toast("O MENINO CONTOU ATÉ CEM. VOCÊ LEVANTOU.", 6);
  let dly = 900;
  for (const [u, l] of [[null, "o MENINO… ele tava do seu lado o tempo todo"],
                        [null, "ele contou até cem e você LEVANTOU. eu tô tremendo"],
                        [null, "pensei que tinha acabado. ele te ACHOU primeiro"],
                        [FIXO, "ele não devia se apegar."]]) {
    setTimeout(() => { if (world) livePush(u || liveRandUser(), l); }, dly);
    dly += 2300;
  }
  live.viewers += 90;
  if (typeof diarioEvento === "function") diarioEvento("tomas_ajuda");
  // o menino se mostrou: a história dele começa aqui (depois que o chat terminar de falar do susto)
  if (soulDormant("tomas")) { const f0 = world.cur; setTimeout(() => { if (world && soulDormant("tomas")) soulAwaken("tomas", f0); }, 11000); }
  saveRun();
}
// o menino, no mundo (desenhado junto com os ecos): agachado ao seu lado, contando
function drawTomasMundo() {
  const e = tomasEvt;
  if (!e) return;
  const k = Math.min(1, e.t / 0.8);
  ctx.save();
  ctx.globalAlpha = k;
  mapaVulto(e.x * CELL, e.y * CELL, 1, e.bob, 4.2 * (0.85 + 0.15 * k), "214,232,240", false, false, false, { alma: "tomas" });
  ctx.restore();
}
// a tela: o breu em volta, a contagem à mão, o clarão do "cem"
function drawTomasTela() {
  const e = tomasEvt;
  if (!e) return;
  const W = canvas.width, H = canvas.height;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const entra = Math.min(1, e.t / 0.8), sai = Math.min(1, (e.dur - e.t) / 1.2);
  const a = Math.min(entra, sai);
  const sx = W / 2 + (player.x * CELL - cam.x) * camZoom, sy = H / 2 + (player.y * CELL - cam.y) * camZoom;
  const vg = ctx.createRadialGradient(sx, sy, 40, sx, sy, 260);
  vg.addColorStop(0, `rgba(0,0,0,${(0.25 * a).toFixed(3)})`);
  vg.addColorStop(1, `rgba(0,0,0,${(0.93 * a).toFixed(3)})`);
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  if (e.falas > 0) {
    const [t0, txt] = TOMAS_FALAS[e.falas - 1];
    const dt0 = e.t - t0, al = Math.min(1, dt0 / 0.25) * a;
    const grande = e.falas >= 4;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = `italic ${grande ? 44 : 30}px 'HM Script', 'HM Script CJK', 'HM CJK', 'Segoe Script', 'Comic Sans MS', cursive`;
    ctx.fillStyle = `rgba(236,232,220,${al.toFixed(2)})`;
    ctx.fillText(txt, sx + Math.sin(time * 9) * 1.2, Math.max(70, sy - 120) + Math.cos(time * 7) * 1.2);
    if (e.falas === 4 && dt0 < 0.6) {                      // o "cem": um clarão branco e macio
      ctx.fillStyle = `rgba(255,252,240,${(0.55 * (1 - dt0 / 0.6)).toFixed(3)})`;
      ctx.fillRect(0, 0, W, H);
    }
  }
}

// ------------------------------------------------------------------
// LOUCURA
// ------------------------------------------------------------------
let loucura = null;         // { t, dur, almaT, falsoT, vultos, vozT, tropecoT, bateT, rasgoT }
const LOUCURA_VOZES = [
  ["tomas_1951", "um… dois… três… você não se escondeu direito"],
  ["cecilia_1948", "você olhou. agora não desvia"],
  ["seu.bento", "a ronda passa por você. sempre passou"],
  ["olivia_44", "o compasso abriu. corre"],
  ["o_hospede", "me empresta o seu rosto. só um pouco"],
  ["aurora", "por quê? por quê? por quê?"],
  ["você", "sai da minha cabeça sai da minha cabeça sai da minha"],
  ["tomas_1951", "quando eu me escondia, fechava os olhos até passar"],
  ["cecilia_1948", "não olha o espelho. ou quebra antes que ele te olhe"],
  ["estudio54", "o sangue na parede. agora você vê."],
];
function loucuraComeca() {
  // cada atalho usado antes (olhos, espelho, vela sem alma) encurta a próxima loucura em 10 s (piso 30 s)
  const dur = Math.max(30, LOUCURA.dur - 10 * (world.flags.loucuraAtalhos || 0));
  const gotas = []; for (let i = 0; i < 14; i++) gotas.push([Math.random(), 0.4 + Math.random() * 0.9, Math.random() * 6.28]);
  loucura = { t: 0, dur, almaT: LOUCURA.alma, falsoT: 1.2, vultos: [], vozT: 3.5,
              tropecoT: 2.5, bateT: 0, rasgoT: 0, vozes: LOUCURA_VOZES.slice(), olhos: 0, gotas };
  sanity = 0; tremor = 1; shake = 1.5;
  sfxCarga(); sfxWhisper(); audioTensao(1);
  toast("A CASA ENTROU NA SUA CABEÇA — enquanto houver LUZ, você ainda é você", 7);
  livePush(liveRandUser(), "a imagem tá… DOBRANDO? você tá bem??");
  liveFixo("agora você ouve direito.");
  saveRun();
}
function loucuraUpdate(dt) {
  const L = loucura;
  L.t += dt;
  // a alma guardada é comida primeiro — e cada uma compra tempo
  L.almaT -= dt;
  if (L.almaT <= 0) {
    L.almaT = LOUCURA.alma;
    if (world.flags.almas > 0) {
      world.flags.almas--; L.dur += LOUCURA.alma;
      sfxDry(); toast("A AMPOLA ESVAZIA SOZINHA — a loucura come o que você guardou", 3.5);
    }
  }
  // a luz segura: velas acesas, a lamparina
  if (luzQueSegura()) sanity = Math.min(100, sanity + LOUCURA.vela * dt);
  // olhos e vultos que não estão lá
  L.falsoT -= dt;
  if (L.falsoT <= 0) { L.falsoT = 1.2 + Math.random() * 2.2; loucuraVulto(); }
  for (const v of L.vultos) v.t += dt;
  L.vultos = L.vultos.filter(v => v.t < v.dur);
  // as vozes no chat (e a live esvaziando)
  L.vozT -= dt;
  if (L.vozT <= 0) {
    L.vozT = 5 + Math.random() * 5;
    if (!L.vozes.length) L.vozes = LOUCURA_VOZES.slice();
    const v = L.vozes.splice(Math.random() * L.vozes.length | 0, 1)[0];
    livePush(v[0], v[1]);
    live.viewers = Math.max(3, Math.round(live.viewers * 0.94));
  }
  // o corpo tropeça
  L.tropecoT -= dt;
  if (L.tropecoT <= 0) {
    L.tropecoT = 1.8 + Math.random() * 2.2;
    const a = Math.random() * 6.283; pvx += Math.cos(a) * 3.5; pvy += Math.sin(a) * 3.5;
    flickDip = 0.4;
  }
  L.bateT -= dt;
  if (L.bateT <= 0) { L.bateT = 0.46; sfxHeart(0.32); }
  // FECHAR OS OLHOS: parado, no escuro, sem flash nem golpe, por 10 s — a casa perde o interesse
  // (lê a ENTRADA, não a velocidade: os tropeços da loucura empurram o corpo sozinhos)
  const quieto = semEntrada && !luzQueSegura() && flashT <= 0 && danoT <= 0;
  L.olhos = quieto ? L.olhos + dt : Math.max(0, L.olhos - dt * 3);
  if (L.olhos > 1) { pvx *= 0.9; pvy *= 0.9; }         // de olhos fechados o corpo para de tropeçar
  if (L.olhos >= 10) { L.olhos = 0; loucuraAtalho("olhos"); }
  if (sanity >= LOUCURA.sai) { loucuraTermina(true); return; }
  if (L.t >= L.dur) loucuraTermina(false);
}
// golpe em plena loucura: a alma vai mais depressa
function loucuraDano(x) { if (loucura && x > 0) loucura.t += x * 0.5; }
// o clarão do flash te devolve a você por um instante
function loucuraClarao() {
  if (!loucura) return;
  sanity = Math.min(100, sanity + LOUCURA.flash);
  if (!live.hinted.has("louFlash")) {
    live.hinted.add("louFlash");
    livePush(liveRandUser(), "o flash… a imagem PAROU de dobrar por um segundo");
  }
}
function luzQueSegura() {
  for (const cd of fl().candelabros || []) {
    const n = world.flags.velas[cd.id] || 0;
    if (n && Math.hypot(cd.x - player.x, cd.y - player.y) < velaRaio(n)) return true;
  }
  return lampAcesa() && Math.hypot(world.lamp.x - player.x, world.lamp.y - player.y) < LAMP_RAIO;
}
function loucuraTermina(viva) {
  loucura = null;
  if (!viva) { casaPega(); return; }
  conquista("loucura_sobreviveu");
  ferida(); tremor = 1; floorFadeT = 0.5; sfxSting();
  toast("VOCÊ RESPIRA. A CASA RECUA — POR ENQUANTO", 6);
  livePush(liveRandUser(), "voltou?? você ficou um minuto falando sozinho");
  liveFixo("quase.");
  if (typeof diarioEvento === "function") diarioEvento("loucura");
  saveRun();
}
// um vulto (ou um par de olhos) no escuro, à vista — que não está lá
function loucuraVulto() {
  for (let k = 0; k < 24; k++) {
    const a = Math.random() * 6.283, rr = 4 + Math.random() * 9;
    const x = player.x + Math.cos(a) * rr, y = player.y + Math.sin(a) * rr * 0.7;
    if (isSolid(x | 0, y | 0) || isOpaque(x | 0, y | 0)) continue;
    if (lightAt(x, y) > 0.35 || !hasLOS(player.x, player.y, x, y)) continue;
    if (Math.random() < 0.45) olhosFalsos = { x, y, t: 0, dur: 1.2 + Math.random() };
    else loucura.vultos.push({ x, y, t: 0, dur: 1.4 + Math.random() * 1.6, bob: Math.random() * 6 });
    if (Math.random() < 0.5) sfxWhisper();
    return;
  }
}
function drawLoucuraMundo() {
  if (!loucura) return;
  for (const v of loucura.vultos) {
    const a = Math.min(1, v.t / 0.3) * Math.min(1, (v.dur - v.t) / 0.4);
    ctx.save(); ctx.globalAlpha = a;
    mapaVulto(v.x * CELL, v.y * CELL, 0.6, v.bob + time * 2, 6.2, "205,220,246", true, false, false, null);
    ctx.restore();
  }
}
// a tela dobra, rasga e pulsa
function drawLoucuraTela() {
  const L = loucura;
  if (!L) return;
  const W = canvas.width, H = canvas.height;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const falta = 1 - L.t / L.dur;                       // 1 → 0: quanto resta de você
  // a imagem dobrada (um eco deslocado de você mesmo)
  const dx = Math.sin(time * 1.7) * 7 + Math.sin(time * 11) * 2, dy = Math.cos(time * 1.3) * 3;
  ctx.save();
  ctx.globalAlpha = 0.22 + 0.16 * (1 - falta) + 0.08 * Math.sin(time * 6);
  ctx.drawImage(canvas, dx, dy);
  ctx.restore();
  // rasgos horizontais
  L.rasgoT -= frameDt;
  if (L.rasgoT <= 0) { L.rasgoT = 0.25 + Math.random() * 0.9; L.rasgos = [];
    for (let i = 0; i < 4; i++) L.rasgos.push([Math.random() * H, 6 + Math.random() * 30, (Math.random() - 0.5) * 40]); }
  for (const [y, h, off] of L.rasgos || []) ctx.drawImage(canvas, 0, y, W, h, off, y, W, h);
  // a BORDA VERMELHA: respira com o coração e AVANÇA para dentro conforme a loucura cresce
  const bat = 0.5 + 0.5 * Math.max(0, Math.sin(time * 13.6));
  const p = Math.min(1, 1 - falta);
  const rIn = H * (0.74 - 0.5 * p) - bat * H * 0.03, rOut = H * 0.98;
  const vg = ctx.createRadialGradient(W / 2, H / 2, Math.max(10, rIn), W / 2, H / 2, rOut);
  vg.addColorStop(0, "rgba(90,4,6,0)");
  vg.addColorStop(0.55, `rgba(110,6,8,${(0.25 + 0.35 * p + 0.12 * bat).toFixed(3)})`);
  vg.addColorStop(1, `rgba(70,2,4,${(0.65 + 0.3 * p).toFixed(3)})`);
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  // sangue escorrendo das bordas, mais comprido quanto pior
  ctx.save(); ctx.lineCap = "round"; ctx.strokeStyle = `rgba(120,8,10,${(0.35 + 0.45 * p).toFixed(3)})`;
  for (const [u, k, fase] of L.gotas) {
    const len = H * (0.05 + 0.42 * p) * k * (0.85 + 0.15 * Math.sin(time * 0.9 + fase));
    ctx.lineWidth = 3 + 5 * k * p;
    if (u < 0.6) { const x = W * (u / 0.6); ctx.beginPath(); ctx.moveTo(x, -4); ctx.lineTo(x + Math.sin(fase) * 6, len); ctx.stroke(); }
    else if (u < 0.8) { const y = H * ((u - 0.6) / 0.2); ctx.beginPath(); ctx.moveTo(-4, y); ctx.lineTo(len * 0.8, y + Math.sin(fase) * 6); ctx.stroke(); }
    else { const y = H * ((u - 0.8) / 0.2); ctx.beginPath(); ctx.moveTo(W + 4, y); ctx.lineTo(W - len * 0.8, y + Math.sin(fase) * 6); ctx.stroke(); }
  }
  ctx.restore();
  // as PÁLPEBRAS: parado no escuro, os olhos vão fechando (10 s)
  if (L.olhos > 0.4) {
    const k = Math.pow(Math.min(1, L.olhos / 10), 1.4), hh = H * 0.5 * k;
    ctx.fillStyle = "rgba(0,0,0,0.96)";
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W, 0); ctx.lineTo(W, hh * 0.85);
    ctx.quadraticCurveTo(W / 2, hh * 1.25, 0, hh * 0.85); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(W, H); ctx.lineTo(W, H - hh * 0.85);
    ctx.quadraticCurveTo(W / 2, H - hh * 1.25, 0, H - hh * 0.85); ctx.closePath(); ctx.fill();
  }
}
// a barra: o que resta de você (vermelha) e a luz que já te devolveu (clara)
function drawLoucuraBarra(x, y, w, h, M) {
  const L = loucura;
  const falta = Math.max(0, 1 - L.t / L.dur);
  const j = Math.sin(time * 31) * 1.2;
  ctx.font = M ? "bold 19px 'HM Mono', 'HM CJK', 'Courier New', monospace" : "bold 13px 'HM Mono', 'HM CJK', 'Courier New', monospace";
  ctx.textAlign = "left"; ctx.textBaseline = "middle";
  ctx.fillStyle = `rgba(240,60,50,${(0.7 + 0.3 * Math.sin(time * 9)).toFixed(2)})`;
  ctx.fillText("LOUCURA", M ? 12 : 12, y);
  ctx.strokeStyle = "rgba(240,80,70,0.6)"; ctx.lineWidth = 1;
  ctx.strokeRect(x + j, y - h / 2 - 1, w, h + 2);
  ctx.fillStyle = "rgba(120,10,14,0.9)";
  ctx.fillRect(x + 1 + j, y - h / 2, (w - 2) * falta, h);
  ctx.fillStyle = "rgba(230,224,200,0.85)";                       // a luz que te segura
  ctx.fillRect(x + 1 + j, y + h / 2 - 3, (w - 2) * Math.min(1, Math.max(0, sanity) / LOUCURA.sai), 3);
  ctx.font = M ? "bold 14px 'HM Mono', 'HM CJK', 'Courier New', monospace" : "bold 10px 'HM Mono', 'HM CJK', 'Courier New', monospace";
  ctx.fillStyle = "rgba(240,200,190,0.75)";
  ctx.fillText("a casa suga a sua alma — a luz te segura", x + w + 10, y);
}

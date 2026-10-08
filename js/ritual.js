"use strict";
// ==================================================================
// A CASA GUARDA
//  · a LAMPARINA do hall: o único refúgio — e ele cobra
//  · a PRIMEIRA QUEDA: você acorda no hall; ele já tem um negativo seu
//  · o RITUAL da morte: o Fotógrafo te fotografa, a foto revela devagar
//    e você escreve a legenda do próprio retrato
//  · o ARQUIVO do canal: as lives que caíram viram quadro na parede e
//    presença na live seguinte (só dados do próprio jogo)
// ==================================================================

// ------------------------------------------------------------------
// ARQUIVO DO CANAL (localStorage): como cada live terminou
// ------------------------------------------------------------------
const ARQ_KEY = "hm_arquivo";
function arquivoLe() {
  if (SEM_ARQUIVO) return [];
  try {
    const a = JSON.parse(localStorage.getItem(ARQ_KEY) || "[]");
    return Array.isArray(a) ? a : [];
  } catch (e) { return []; }
}
function arquivoSalva(a) {
  if (SEM_ARQUIVO) return;
  try { localStorage.setItem(ARQ_KEY, JSON.stringify(a.slice(0, 8))); } catch (e) {}
}
function arquivoGrava(fim) {
  if (SEM_ARQUIVO || !world) return null;
  let livres = 0, queimadas = 0;
  for (const id in world.flags.souls) {
    const s = world.flags.souls[id].state;
    if (s === "freed") livres++; else if (s === "burned") queimadas++;
  }
  const a = arquivoLe();
  const e = { n: world.flags.liveN || (a[0] ? a[0].n + 1 : 1), fim, andar: world.cur,
              t: world.timeSec | 0, livres, queimadas, legenda: "" };
  a.unshift(e);
  arquivoSalva(a);
  return e;
}
function arquivoLegenda(txt) {
  const a = arquivoLe();
  if (!a[0]) return;
  a[0].legenda = txt;
  arquivoSalva(a);
}
function fmtRelogio(seg) {
  return String((seg / 60) | 0).padStart(2, "0") + ":" + String((seg | 0) % 60).padStart(2, "0");
}

// ------------------------------------------------------------------
// O que vem das flags e precisa existir no mundo (live nova OU retomada)
// ------------------------------------------------------------------
function casaNovaRun() {
  const a = arquivoLe();
  world.flags.liveN = (a[0] ? a[0].n : 0) + 1;
  world.flags.anteriores = a.filter(e => e.fim === "morte").slice(0, 3)
    .map(e => ({ n: e.n, andar: e.andar, t: e.t, legenda: e.legenda || "" }));
  casaMonta();
}
function casaMonta() {
  world.lamp = { x: ENTRY_HALL.x + ENTRY_HALL.w - 4.5, y: ENTRY_HALL.y + 3.5 };
  // os que ficaram: um quadro para cada, na parede norte do hall (só a FOTO mostra)
  world.quadros = [];
  const ants = world.flags.anteriores || [];
  if (ants.length) {
    // pontos de parede de verdade em volta do hall (um corredor pode ter aberto um lado)
    const g1 = world.floors[1].grid, H = ENTRY_HALL, vagas = [];
    const par = (x, y) => g1[y * COLS + x] === T_WALL;
    for (let x = H.x + 2; x < H.x + H.w - 3; x++)
      if (par(x, H.y - 1) && par(x + 1, H.y - 1)) vagas.push({ x: x + 1, y: H.y + 0.55 });
    for (let y = H.y + 2; y < H.y + H.h - 4; y++) {
      if (par(H.x - 1, y) && par(H.x - 1, y + 1)) vagas.push({ x: H.x + 0.55, y: y + 1 });
      if (par(H.x + H.w, y) && par(H.x + H.w, y + 1)) vagas.push({ x: H.x + H.w - 0.55, y: y + 1 });
    }
    for (const ant of ants) {
      const v = vagas.find(p => Math.hypot(p.x - world.lamp.x, p.y - world.lamp.y) > 3 &&
        world.quadros.every(q => Math.hypot(q.x - p.x, q.y - p.y) >= 5));
      if (!v) break;
      world.quadros.push({ id: "ant" + ant.n, x: v.x, y: v.y, ant });
    }
  }
  // …e o vulto de moletom, no andar onde a última live caiu
  if (ants[0] && world.floors[ants[0].andar]) {
    const gs = world.floors[ants[0].andar].ghosts;
    if (gs[0]) gs[0].streamer = true;
  }
  // ecos que a casa acordou enquanto você descansava
  for (const f of world.flags.ecosExtras || []) addEco(f);
}
function addEco(f) {
  const flo = world.floors[f];
  if (!flo || !flo.freeSpot) return;
  if (typeof noGhosts !== "undefined" && noGhosts) return;
  const p = flo.freeSpot();
  flo.ghosts.push({ x: p.x, y: p.y, wx: p.x, wy: p.y, chase: false, respawn: 0,
                    bob: Math.random() * 6.28, artSeed: Math.random(), sprCv: null });
}

// ------------------------------------------------------------------
// A LAMPARINA
// ------------------------------------------------------------------
function lampAcesa() {
  return !!world && world.cur === 1 && !!world.lamp && !world.flags.lampApagada;
}
function lampDescansa() {
  if (!lampAcesa() || world.flags.lampOleo <= 0) return;
  world.flags.lampOleo--;
  world.flags.feridas = 0;
  sanity = 100; tremor = 0;
  bateria = Math.min(BAT.max, bateria + BAT.lamparina);   // o calor dela também acorda as pilhas
  sfxLamparina(); floorFadeT = 0.5;
  // o preço: enquanto você descansa, a casa acorda mais um
  const cands = [2, 3, 4, 0].filter(f => !world.floors[f].pacified);
  const f = cands.length ? cands[Math.random() * cands.length | 0] : 2;
  addEco(f);
  world.flags.ecosExtras.push(f);
  toast(tf("VOCÊ DESCANSOU. A CASA NÃO — algo acordou no {0}", tr(FLOOR_NAMES[f])), 6);
  liveFixo("descansa. eu espero.");
  saveRun();
}
function lampApaga() {
  if (!world || world.flags.lampApagada) return;
  world.flags.lampApagada = true;
  livePush(liveRandUser(), "a lamparina do hall APAGOU sozinha. eu vi no canto da tela");
}

// ------------------------------------------------------------------
// A QUEDA: a sanidade zerou
// ------------------------------------------------------------------
let ritual = null;        // { t, morte, flash, fim }
let deadInfo = null;      // o que a tela de morte mostra
function casaPega() {
  const morte = !!world.flags.quase;
  ritual = { t: 0, morte, flash: false, fim: false };
  sanity = 0;
  state = "ritual";
  limpaEntradas();
  audioTensao(0); sfxCarga();
  livePush(liveRandUser(), morte ? "NÃO NÃO NÃO NÃO" : "LEVANTA!! LEVANTA DAÍ");
}
function ritualUpdate(dt) {
  const r = ritual;
  if (!r) { state = "play"; return; }
  r.t += dt;
  if (!r.flash && r.t >= 1.5) { r.flash = true; sfxCamera(); sfxSlam(); }
  if (r.fim) return;
  if (r.morte) { if (r.t >= 2.3) ritualMorre(); }
  else if (r.t >= 4.6) ritualAcorda();
}
// (robôs de teste: resolve a queda na hora, sem assistir)
function ritualPula() {
  if (!ritual || ritual.fim) return;
  if (ritual.morte) ritualMorre(); else ritualAcorda();
}
function ritualAcorda() {
  ritual.fim = true;
  world.flags.quase = true;
  // a casa devolve você ao hall — com metade do filme e um negativo seu com ELE
  if (world.cur !== 1) setFloor(1);
  const c = roomCenter(ENTRY_HALL);
  player.x = c.x; player.y = ENTRY_HALL.y + ENTRY_HALL.h - 3;
  cam.x = player.x * CELL; cam.y = player.y * CELL;
  world.flags.feridas = 0;
  sanity = SAN_TETO; film = Math.floor(film / 2);
  corpoReset(); tremor = 1; flashT = 0; flashCd = 0; attractT = 0;
  for (const g of fl().ghosts) { g.bote = null; g.gasto = 8; g.chase = false; }
  world.timeSec += 40;
  floorFadeT = 1.4;
  ritual = null;
  state = "play";
  toast("VOCÊ ACORDOU NO HALL. ELE JÁ TEM UM NEGATIVO SEU — O PRÓXIMO É O ÚLTIMO", 9);
  liveFixo("essa não ficou boa. de novo.");
  const u = liveRandUser();
  setTimeout(() => { if (world) livePush(u, "voltou?? a live ficou PRETA quase um minuto"); }, 1500);
  setTimeout(() => { if (world) livePush(liveRandUser(), "você ficou de pé no escuro. PARADO. olhando pra câmera"); }, 3800);
  saveRun();
}
function ritualMorre() {
  ritual.fim = true;
  const e = arquivoGrava("morte");
  const pool = LEGENDAS.slice();
  const ops = [];
  while (ops.length < 3 && pool.length)
    ops.push(pool.splice(Math.random() * pool.length | 0, 1)[0]);
  deadInfo = {
    t: 0, n: e ? e.n : (world.flags.liveN || 1), andar: world.cur, seg: world.timeSec | 0,
    livres: e ? e.livres : 0, ops, escolhida: -1, cv: null,
  };
  deadInfo.cv = retratoStreamer(deadInfo, "");
  liveFixo("essa ficou boa.");
  sfxDeath();
  clearRun();
  ritual = null;
  state = "dead";
}

// o visor do Fotógrafo se fecha sobre você; depois, o clarão
function drawRitual() {
  const r = ritual;
  if (!r) return;
  const W = canvas.width, H = canvas.height, t = r.t;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (t < 1.5) {
    const k = t / 1.5, e = k * k * (3 - 2 * k);
    const sx = W / 2 + (player.x * CELL - cam.x) * camZoom;
    const sy = H / 2 + (player.y * CELL - cam.y) * camZoom;
    const rw = W - (W - 230) * e, rh = H - (H - 190) * e;
    const rx = Math.max(0, Math.min(W - rw, sx - rw / 2)) * e;
    const ry = Math.max(0, Math.min(H - rh, sy - rh / 2)) * e;
    ctx.fillStyle = `rgba(0,0,0,${(0.3 + 0.62 * e).toFixed(3)})`;
    ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.rect(rx, ry, rw, rh); ctx.fill("evenodd");
    ctx.strokeStyle = `rgba(226,44,32,${(0.45 + 0.5 * Math.abs(Math.sin(t * 15))).toFixed(2)})`;
    ctx.lineWidth = 4;
    const L2 = 30;
    for (const [cx2, cy2, ax, ay] of [[rx, ry, 1, 1], [rx + rw, ry, -1, 1],
                                      [rx, ry + rh, 1, -1], [rx + rw, ry + rh, -1, -1]]) {
      ctx.beginPath();
      ctx.moveTo(cx2 + ax * L2, cy2); ctx.lineTo(cx2, cy2); ctx.lineTo(cx2, cy2 + ay * L2);
      ctx.stroke();
    }
    // a cruz do foco, no centro do visor
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(rx + rw / 2 - 9, ry + rh / 2); ctx.lineTo(rx + rw / 2 + 9, ry + rh / 2);
    ctx.moveTo(rx + rw / 2, ry + rh / 2 - 9); ctx.lineTo(rx + rw / 2, ry + rh / 2 + 9);
    ctx.stroke();
    return;
  }
  const k = Math.min(1, (t - 1.5) / 0.8);
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = `rgba(255,252,240,${(1 - k).toFixed(3)})`;      // o clarão
  ctx.fillRect(0, 0, W, H);
  if (!r.morte && t > 2.7) {            // no breu, só ELE escreve
    const a = Math.min(1, (t - 2.7) / 0.5) * Math.min(1, (4.6 - t) / 0.4);
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = "bold 17px 'HM Mono', 'HM CJK', 'Courier New', monospace";
    ctx.fillStyle = `rgba(214,150,140,${Math.max(0, a).toFixed(2)})`;
    ctx.fillText(FIXO + ": " + tr("essa não ficou boa. de novo."), W / 2, H / 2);
  }
}

// ------------------------------------------------------------------
// O STREAMER em retrato: o busto a nanquim da folha de referência
// ------------------------------------------------------------------
let STREAMER_IMG = null;
(function () {
  const im = new Image();
  im.onload = () => { STREAMER_IMG = im; };
  im.onerror = () => {};
  im.src = "Assets/Refs/protagonista.jpg";
})();
const STREAMER_CROP = { x: 0.590, y: 0.035, w: 0.400, h: 0.930 };
const LEGENDAS = [
  "eu só queria um vídeo bom",
  "não era roteiro",
  "alguém desliga essa live",
  "a câmera já estava olhando pra mim",
  "foi mal, chat",
  "eu devia ter parado no portão",
];

// a polaroid que ELE tirou de você (mesmo papel das suas fotos)
function retratoStreamer(info, legenda) {
  const PW = 576, PH = 406, FR = 22, BOT = 66;
  const cv = document.createElement("canvas");
  cv.width = PW + FR * 2; cv.height = PH + FR + BOT;
  const c = cv.getContext("2d");
  const pap = c.createLinearGradient(0, 0, 0, cv.height);
  pap.addColorStop(0, "#efe9db"); pap.addColorStop(1, "#e2dac6");
  c.fillStyle = pap; c.fillRect(0, 0, cv.width, cv.height);
  c.strokeStyle = "rgba(90,80,60,0.25)"; c.lineWidth = 1.5;
  c.strokeRect(0.75, 0.75, cv.width - 1.5, cv.height - 1.5);
  c.fillStyle = "#040404"; c.fillRect(FR, FR, PW, PH);
  c.save();
  c.beginPath(); c.rect(FR, FR, PW, PH); c.clip();
  streamerBusto(c, FR + PW / 2, FR + PH * 0.52, PH * 1.16, 1);
  c.restore();
  if (typeof filmePass === "function" && !FOTO.rapido) filmePass(cv, FR, FR, PW, PH, false);
  c.strokeStyle = "rgba(60,52,40,0.5)"; c.lineWidth = 1;
  c.strokeRect(FR - 0.5, FR - 0.5, PW + 1, PH + 1);
  // legenda à mão no rodapé
  c.save();
  c.translate(FR + 4, cv.height - 42);
  c.rotate(-0.015);
  c.textAlign = "left"; c.textBaseline = "middle";
  c.font = "italic 20px 'HM Script', 'HM Script CJK', 'HM CJK', 'Segoe Script', 'Comic Sans MS', cursive";
  c.fillStyle = "rgba(68,60,52,0.9)";
  c.fillText(tf("live nº {0} — {1}", info.n, tr(FLOOR_NAMES[info.andar]).toLowerCase()), 0, 0);
  if (legenda) {
    c.font = "italic 17px 'HM Script', 'HM Script CJK', 'HM CJK', 'Segoe Script', 'Comic Sans MS', cursive";
    c.fillStyle = "rgba(96,40,34,0.92)";
    c.fillText("“" + tr(legenda) + "”", 2, 24, PW - 12);
  }
  c.restore();
  return cv;
}
// desenha o busto (altura h, centrado em x,y); k = quanto de breu em volta
function streamerBusto(c, x, y, h, k) {
  const im = STREAMER_IMG;
  if (im) {
    const K = STREAMER_CROP;
    const sw = im.naturalWidth * K.w, sh = im.naturalHeight * K.h;
    const w = h * sw / sh;
    c.drawImage(im, im.naturalWidth * K.x, im.naturalHeight * K.y, sw, sh,
                x - w / 2, y - h / 2, w, h);
    const vg = c.createRadialGradient(x, y - h * 0.04, h * 0.26, x, y - h * 0.04, h * 0.62);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(0.55, `rgba(0,0,0,${0.55 * k})`);
    vg.addColorStop(1, `rgba(0,0,0,${0.98 * k})`);
    c.fillStyle = vg;
    c.fillRect(x - w, y - h, w * 2, h * 2);
    return;
  }
  // sem a arte: capuz e rosto em silhueta
  c.fillStyle = "rgba(96,34,44,0.95)";
  c.beginPath(); c.ellipse(x, y + h * 0.36, h * 0.34, h * 0.26, 0, 0, 7); c.fill();
  c.beginPath(); c.arc(x, y - h * 0.04, h * 0.21, 0, 7); c.fill();
  c.fillStyle = "rgba(226,204,180,0.95)";
  c.beginPath(); c.ellipse(x, y - h * 0.02, h * 0.13, h * 0.16, 0, 0, 7); c.fill();
  c.fillStyle = "rgba(10,8,8,0.95)";
  c.beginPath(); c.arc(x - h * 0.05, y - h * 0.04, h * 0.018, 0, 7);
  c.arc(x + h * 0.05, y - h * 0.04, h * 0.018, 0, 7); c.fill();
}

// o QUADRO de quem ficou (parede do hall, só na foto): moldura + busto em sépia
let QUADRO_ANT = null, QUADRO_ANT_ARTE = false;
function quadroAntSprite() {
  if (QUADRO_ANT && QUADRO_ANT_ARTE === !!STREAMER_IMG) return QUADRO_ANT;
  const cv = document.createElement("canvas");
  cv.width = 150; cv.height = 190;
  const g = cv.getContext("2d");
  g.fillStyle = "#2a1c12"; g.fillRect(0, 0, 150, 190);
  g.strokeStyle = "rgba(150,116,70,0.9)"; g.lineWidth = 4; g.strokeRect(5, 5, 140, 180);
  g.strokeStyle = "rgba(20,12,6,0.9)"; g.lineWidth = 2; g.strokeRect(12, 12, 126, 166);
  g.fillStyle = "#0a0806"; g.fillRect(15, 15, 120, 160);
  g.save();
  g.beginPath(); g.rect(15, 15, 120, 160); g.clip();
  streamerBusto(g, 75, 100, 176, 0.75);
  g.globalCompositeOperation = "multiply";            // banho de sépia
  g.fillStyle = "rgb(214,182,128)"; g.fillRect(15, 15, 120, 160);
  g.restore();
  QUADRO_ANT_ARTE = !!STREAMER_IMG;
  return (QUADRO_ANT = cv);
}

// a foto pegou um dos quadros do hall: o chat reconhece, e algo cai de trás
function quadroAntVisto(q) {
  const a = q.ant;
  livePush(liveRandUser(), tf("PERA. esse quadro na parede… é o cara da live nº {0}", a.n));
  livePush(liveRandUser(), tf("a live dele caiu no {0}, com {1} no ar",
           tr(FLOOR_NAMES[a.andar] || FLOOR_NAMES[1]), fmtRelogio(a.t)));
  if (a.legenda)
    livePush(liveRandUser(), tf("alguém escreveu embaixo: “{0}”", tr(a.legenda)));
  fl().films.push({ id: `1:${fl().films.length}`, x: q.x, y: q.y + 1.5, taken: false });
  livePush(liveRandUser(), "caiu um ROLO de trás da moldura!! pega");
  liveFixo("ele também ficou bom.");
  live.viewers += 60;
  sfxSting();
}

// ------------------------------------------------------------------
// TELA DE MORTE: a foto dele revela devagar; você escreve a legenda
// ------------------------------------------------------------------
const DEAD_OPS = { x: 610, y: 316, w: 500, h: 40, gap: 46 };
function drawDead() {
  const D = deadInfo, W = canvas.width, H = canvas.height;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  if (D) {
    D.t += frameDt;
    // a polaroid, ainda leitosa
    const pw = 440, ph = pw * D.cv.height / D.cv.width;
    const px2 = 90, py2 = 110;
    ctx.save();
    ctx.translate(px2 + pw / 2, py2 + ph / 2);
    ctx.rotate(-0.03);
    ctx.shadowColor = "rgba(0,0,0,0.7)"; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8;
    ctx.drawImage(D.cv, -pw / 2, -ph / 2, pw, ph);
    ctx.shadowColor = "rgba(0,0,0,0)"; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    let s = Math.max(0, Math.min(1, (D.t - 0.4) / 4.2));
    s = s * s * (3 - 2 * s);
    const veu = Math.pow(1 - s, 1.25);
    if (veu > 0.01) {
      ctx.fillStyle = `rgba(172,180,166,${veu.toFixed(3)})`;
      ctx.fillRect(-pw / 2 + pw * 0.0355, -ph / 2 + ph * 0.0445, pw * 0.929, ph * 0.822);
    }
    ctx.restore();
  }
  const cx = 860;
  ctx.font = "bold 32px 'HM Mono', 'HM CJK', 'Courier New', monospace";
  ctx.fillStyle = "rgba(200,50,45,0.92)";
  ctx.fillText("A CASA FICOU COM VOCÊ", cx, 136, 620);
  ctx.font = "bold 14px 'HM Mono', 'HM CJK', 'Courier New', monospace";
  ctx.fillStyle = "rgba(180,180,180,0.8)";
  const andar = D ? D.andar : (world ? world.cur : 1);
  ctx.fillText(tf("a live caiu no {0}", tr(FLOOR_NAMES[andar])), cx, 176);
  if (D) {
    ctx.fillStyle = "rgba(150,150,150,0.8)";
    ctx.fillText(tf("live nº {0} · {1} no ar · {2} libertadas", D.n, fmtRelogio(D.seg), D.livres),
                 cx, 200, 600);
    // ELE aprova
    if (D.t > 2.4) {
      ctx.font = "bold 15px 'HM Mono', 'HM CJK', 'Courier New', monospace";
      ctx.fillStyle = `rgba(214,150,140,${Math.min(1, (D.t - 2.4) / 0.8).toFixed(2)})`;
      ctx.fillText(FIXO + ": " + tr("essa ficou boa."), cx, 244);
    }
    // a legenda: três frases à mão
    const O = DEAD_OPS;
    ctx.font = "bold 12px 'HM Mono', 'HM CJK', 'Courier New', monospace";
    ctx.fillStyle = "rgba(150,140,120,0.75)";
    ctx.fillText(D.escolhida < 0 ? "ESCREVA A LEGENDA DO SEU RETRATO" : "LEGENDA GRAVADA", cx, O.y - 22);
    for (let i = 0; i < D.ops.length; i++) {
      const y = O.y + i * O.gap;
      const hov = D.escolhida < 0 && mouse.x >= O.x && mouse.x <= O.x + O.w &&
                  mouse.y >= y && mouse.y <= y + O.h;
      const sel = D.escolhida === i;
      if (D.escolhida >= 0 && !sel) continue;
      ctx.fillStyle = sel ? "rgba(60,20,16,0.6)" : hov ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.04)";
      ctx.fillRect(O.x, y, O.w, O.h);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = sel ? "rgba(214,150,140,0.8)" : hov ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.25)";
      ctx.strokeRect(O.x, y, O.w, O.h);
      ctx.font = "italic 19px 'HM Script', 'HM Script CJK', 'HM CJK', 'Segoe Script', 'Comic Sans MS', cursive";
      ctx.fillStyle = "rgba(232,222,200,0.95)";
      ctx.fillText("“" + tr(D.ops[i]) + "”", O.x + O.w / 2, y + O.h / 2 + 1, O.w - 20);
    }
  }
  ctx.font = "bold 13px 'HM Mono', 'HM CJK', 'Courier New', monospace";
  ctx.fillStyle = "rgba(150,150,150,0.75)";
  ctx.fillText("as fotos reveladas se perdem com você", cx, 478, 600);

  for (const b of DEAD_BTNS) {
    const hov = mouse.x >= b.x && mouse.x <= b.x + b.w &&
                mouse.y >= b.y && mouse.y <= b.y + b.h;
    ctx.fillStyle = "rgba(255,255,255,0.07)";
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.lineWidth = (hov || b.id === "jogar") ? 3 : 2;
    ctx.strokeStyle = hov ? "rgba(255,255,255,0.95)"
                          : b.id === "jogar"
                            ? `rgba(255,255,255,${0.6 + 0.25 * Math.sin(time * 3)})`
                            : "rgba(255,255,255,0.45)";
    ctx.strokeRect(b.x, b.y, b.w, b.h);
    ctx.font = "bold 23px 'HM Mono', 'HM CJK', 'Courier New', monospace";
    ctx.fillStyle = b.id === "jogar" ? "rgba(255,255,255,0.95)" : "rgba(215,215,215,0.9)";
    ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2 + 1, b.w - 14);
  }
  if (!touchUI.seen) {
    ctx.font = "bold 12px 'HM Mono', 'HM CJK', 'Courier New', monospace";
    ctx.fillStyle = "rgba(140,140,140,0.7)";
    ctx.fillText("F fotos · ENTER nova live · ESC menu", W / 2, H - 22);
  }
}
function deadEscolhe(i) {
  const D = deadInfo;
  if (!D || D.escolhida >= 0 || !D.ops[i]) return;
  D.escolhida = i;
  D.cv = retratoStreamer(D, D.ops[i]);
  D.t = Math.max(D.t, 5);
  arquivoLegenda(D.ops[i]);
  sfxPage();
}
function deadHit(px2, py2) {
  const D = deadInfo, O = DEAD_OPS;
  if (D && D.escolhida < 0)
    for (let i = 0; i < D.ops.length; i++) {
      const y = O.y + i * O.gap;
      if (px2 >= O.x && px2 <= O.x + O.w && py2 >= y && py2 <= y + O.h) { deadEscolhe(i); return; }
    }
  for (const b of DEAD_BTNS)
    if (px2 >= b.x && px2 <= b.x + b.w && py2 >= b.y && py2 <= b.y + b.h) {
      if (b.id === "fotos") openAlbum("dead");
      else if (b.id === "jogar") newRun();
      else state = "title";
      return;
    }
}

// ------------------------------------------------------------------
// TÍTULO: as lives arquivadas do canal (o menu é a página da live)
// ------------------------------------------------------------------
function drawArquivoTitulo() {
  const a = arquivoLe();
  if (!a.length) return;
  const x = 44, y0 = 418;
  ctx.textAlign = "left"; ctx.textBaseline = "middle";
  ctx.font = "bold 12px 'HM Mono', 'HM CJK', 'Courier New', monospace";
  ctx.fillStyle = "rgba(190,180,160,0.7)";
  ctx.fillText("LIVES ARQUIVADAS DO CANAL", x, y0, 380);
  ctx.strokeStyle = "rgba(190,180,160,0.25)"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x, y0 + 12); ctx.lineTo(x + 380, y0 + 12); ctx.stroke();
  ctx.font = "bold 13px 'HM Mono', 'HM CJK', 'Courier New', monospace";
  a.slice(0, 5).forEach((e, i) => {
    const y = y0 + 32 + i * 24;
    const morte = e.fim === "morte";
    ctx.fillStyle = morte ? "rgba(214,120,110,0.85)" : "rgba(170,210,170,0.85)";
    ctx.fillText("#" + e.n, x, y);
    ctx.fillStyle = "rgba(200,200,200,0.8)";
    const fim = morte ? tf("caiu no {0}", tr(FLOOR_NAMES[e.andar] || FLOOR_NAMES[1]))
                      : tr(ENDINGS[e.fim] ? ENDINGS[e.fim].titulo : "ALVORADA");
    ctx.fillText(fim + " · " + fmtRelogio(e.t), x + 40, y, 340);
  });
  ctx.textAlign = "center";
}

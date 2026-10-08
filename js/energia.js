"use strict";
// ==================================================================
// A ENERGIA DAS ALMAS
//  · BATERIA do flash: cada disparo gasta uma carga. Sem carga a foto sai
//    NO ESCURO (só o que a lanterna alcança; não espanta, não corta bote).
//  · ARMAZENAR: no álbum, a alma fotografada pode ser guardada na câmera.
//    Alma guardada recarrega a bateria (tecla B / toque na bateria)…
//  · …ou acende uma vela de CANDELABRO: fogo azul. Uma vela acende só o
//    castiçal; cinco alcançam metade da lanterna.
//  · A casa repõe o rolo de filme pego, mas só depois de um minuto.
// ==================================================================

// a casa repõe o rolo — com atraso
function agendaFilme(f) {
  world.flags.filmePend.push({ f, t: world.timeSec + FILME_RESPAWN });
}
function filmePendentes() {
  const P = world.flags.filmePend;
  while (P.length && world.timeSec >= P[0].t) spawnFilm(P.shift().f);
}

// --- BATERIA ----------------------------------------------------------
function bateriaAcabou() {
  toast(world.flags.almas > 0 ? "BATERIA ACABOU — a ampola tem alma: [B] recarrega"
                              : "BATERIA ACABOU — a foto sai no escuro", 6);
  if (!live.hinted.has("bat0")) {
    live.hinted.add("bat0");
    livePush(liveRandUser(), "o flash MORREU?? a última saiu preta");
    if (!world.flags.cam.ampola) livePush(liveRandUser(), "não tem pilha nessa casa? alguma coisa que guarde energia?");
  }
}
function recarregar() {
  if (state !== "play" && state !== "album") return false;
  if (world.flags.almas <= 0) {
    toast(world.flags.cam.ampola ? "A AMPOLA ESTÁ VAZIA" : "NADA PARA RECARREGAR", 2.5);
    sfxDry(); return false;
  }
  if (bateria >= BAT.max) { toast("BATERIA CHEIA", 2); return false; }
  world.flags.almas--;
  bateria = Math.min(BAT.max, bateria + BAT.porAlma);
  sfxRecarga();
  toast(tf("BATERIA {0}/{1} — uma alma a menos", bateria, BAT.max), 2.5);
  if (!live.hinted.has("recarga1")) {
    live.hinted.add("recarga1");
    liveFixo("elas servem para alguma coisa, afinal.");
  }
  saveRun();
  return true;
}

// --- ARMAZENAR: a alma sai da foto e entra na câmera --------------------
function almasSoltas(e) { return Math.max(0, (e.almas || 0) - (e.armazenadas || 0)); }
// converte a alma da FOTO: todos os vultos saem dela e a ampola ganha UMA carga
// (regra do Rodolfo: uma foto, uma carga, mesmo com vários fantasmas)
function armazenarAlma(e) {
  if (!e || almasSoltas(e) <= 0) return false;
  if (!world.flags.cam.ampola) return false;        // sem a ampola, não existe conversão
  if (world.flags.almas >= BAT.almasMax) {
    toast("A AMPOLA ESTÁ CHEIA — gaste almas antes", 3.5); sfxDry(); return false;
  }
  const soltas = (e.marcas || []).filter(q => !q.guardada);
  for (const m of soltas) m.guardada = true;      // primeiro todos marcados: nenhum é reposto
  for (const m of soltas) if (!fotoSomeVulto(e, m)) fotoQueimaVulto(e.cv, m);
  e.armazenadas = e.almas || 0;
  world.flags.almas += 1;
  sfxGuarda();
  toast(soltas.length > 1 ? "ALMA CONVERTIDA — os vultos saíram da foto; +1 carga na ampola"
                          : "ALMA CONVERTIDA — o vulto saiu da foto; +1 carga na ampola", 3.5);
  if (!live.hinted.has("guardou1")) {
    live.hinted.add("guardou1");
    livePush(liveRandUser(), "O VULTO SUMIU DA FOTO. pra onde ele foi??");
    livePush(liveRandUser(), "o frasco da câmera acendeu azul. tem alguma coisa dentro dele agora");
    liveFixo("colecionador.");
  }
  saveRun();
  return true;
}
// o vulto some da foto: a emulsão em volta "escorre" por cima dele (as colunas
// das bordas são esticadas pelo meio, com borda macia) e fica um clarão
// desbotado onde ele estava — a foto continua inteira, mas sem ninguém nela
function fotoQueimaVulto(cv, m) {
  const FR = FOTO_MOLDURA.FR, gx0 = FR, gy0 = FR;
  const gx1 = cv.width - FR, gy1 = cv.height - FOTO_MOLDURA.BOT;
  const x0 = Math.max(gx0 + 4, Math.round(m.x - m.w * 0.78)), x1 = Math.min(gx1 - 4, Math.round(m.x + m.w * 0.78));
  const y0 = Math.max(gy0 + 4, Math.round(m.y - m.h * 0.16)), y1 = Math.min(gy1 - 4, Math.round(m.y + m.h * 1.22));
  const w = x1 - x0, h = y1 - y0;
  if (w < 4 || h < 4) return;
  // 1) a mancha: as colunas dos lados escorrem pelo meio…
  const tmp = document.createElement("canvas");
  tmp.width = w; tmp.height = h;
  const t = tmp.getContext("2d");
  for (let i = 0; i < w; i++) {
    const a = i / (w - 1);
    const jit = ((hash(i, x0, y0) - 0.5) * 3) | 0;      // tremidinho, para não ficar liso
    t.globalAlpha = 1;
    t.drawImage(cv, x0 - 3 + jit, y0, 1, h, i, 0, 1, h);
    t.globalAlpha = a;
    t.drawImage(cv, x1 + 2 + jit, y0, 1, h, i, 0, 1, h);
  }
  // …e as linhas de cima e de baixo também, para a mancha não virar listra
  const tmp2 = document.createElement("canvas");
  tmp2.width = w; tmp2.height = h;
  const t2 = tmp2.getContext("2d");
  for (let j = 0; j < h; j++) {
    const a = j / (h - 1);
    const jit = ((hash(j, y0, x0) - 0.5) * 3) | 0;
    t2.globalAlpha = 1;
    t2.drawImage(cv, x0, y0 - 3 + jit, w, 1, 0, j, w, 1);
    t2.globalAlpha = a;
    t2.drawImage(cv, x0, y1 + 2 + jit, w, 1, 0, j, w, 1);
  }
  t.globalAlpha = 0.5; t.drawImage(tmp2, 0, 0); t.globalAlpha = 1;
  // borda macia (retângulo arredondado por dois degradês): o miolo cobre de verdade
  t.globalCompositeOperation = "destination-in";
  // (vulto minúsculo: a borda não pode passar da metade, senão o degradê estoura [0,1]
  //  e a conversão da alma morria num IndexSizeError — achado pelo robô em 2026-10-08)
  const fx = Math.min(w / 2, Math.max(6, w * 0.14)), fy = Math.min(h / 2, Math.max(6, h * 0.12));
  const mh = t.createLinearGradient(0, 0, w, 0);
  mh.addColorStop(0, "rgba(0,0,0,0)"); mh.addColorStop(fx / w, "rgba(0,0,0,1)");
  mh.addColorStop(1 - fx / w, "rgba(0,0,0,1)"); mh.addColorStop(1, "rgba(0,0,0,0)");
  t.fillStyle = mh; t.fillRect(0, 0, w, h);
  const mv = t.createLinearGradient(0, 0, 0, h);
  mv.addColorStop(0, "rgba(0,0,0,0)"); mv.addColorStop(fy / h, "rgba(0,0,0,1)");
  mv.addColorStop(1 - fy / h, "rgba(0,0,0,1)"); mv.addColorStop(1, "rgba(0,0,0,0)");
  t.fillStyle = mv; t.fillRect(0, 0, w, h);
  t.globalCompositeOperation = "source-over";
  const c = cv.getContext("2d");
  c.save();
  c.beginPath(); c.rect(gx0, gy0, gx1 - gx0, gy1 - gy0); c.clip();
  c.drawImage(tmp, x0, y0);
  // 2) o clarão: emulsão desbotada onde a alma estava
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const g = c.createRadialGradient(cx, cy, 2, cx, cy, Math.max(w, h) * 0.5);
  g.addColorStop(0, "rgba(236,226,206,0.34)");
  g.addColorStop(0.5, "rgba(236,226,206,0.14)");
  g.addColorStop(1, "rgba(236,226,206,0)");
  c.fillStyle = g; c.fillRect(x0 - 10, y0 - 10, w + 20, h + 20);
  // 3) grão queimado
  c.fillStyle = "rgba(40,30,22,0.35)";
  for (let k = 0; k < 90; k++) {
    const px = x0 + Math.random() * w, py = y0 + Math.random() * h;
    c.fillRect(px, py, 1 + Math.random() * 1.5, 1 + Math.random() * 1.5);
  }
  c.restore();
}
// todas as almas de uma foto
function armazenarFoto(e) {
  let n = 0;
  while (almasSoltas(e) > 0 && armazenarAlma(e)) n++;
  return n > 0;
}
// (robôs de teste: guarda tudo o que o álbum tem)
function armazenarTodas() {
  let t = 0;
  for (const e of album) if (almasSoltas(e) > 0 && armazenarFoto(e)) t++;
  return t;
}

// --- CANDELABROS -------------------------------------------------------
function velaRaio(n) { return n <= 0 ? 0 : VELAS.raio0 + (n - 1) * VELAS.passo; }
function acenderVela(cd) {
  const n = world.flags.velas[cd.id] || 0;
  if (n >= VELAS.max || world.flags.almas <= 0) return false;
  world.flags.almas--;
  world.flags.velas[cd.id] = n + 1;
  sfxVela();
  if (!live.hinted.has("vela1")) {
    live.hinted.add("vela1");
    livePush(liveRandUser(), "FOGO AZUL?? isso não é fogo normal… e não apaga");
    liveFixo("luz bonita. desperdício.");
  }
  saveRun();
  return true;
}
// a luz dos candelabros acesos deste andar (chamada no render)
function luzDosCandelabros() {
  for (const cd of fl().candelabros || []) {
    const n = world.flags.velas[cd.id] || 0;
    if (!n) continue;
    const tr2 = 0.93 + 0.07 * hash(cd.x | 0, cd.y | 0, Math.floor(time * 7));
    addGlow(cd.x, cd.y, velaRaio(n) * tr2, 0.28 + 0.1 * n);
  }
}

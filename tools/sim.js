"use strict";
// ==================================================================
// SIMULADOR DE RUNS v2 — jogo completo das 7 Correntes
// Políticas: REVELADOR (liberta tudo → Alvorada)
//            CRUEL     (queima tudo → Cinzas; chefe exige 7 fotos)
//            DONO      (captura o chefe e senta na cadeira → secreto)
// Único atalho permitido: avançar o relógio no minigame do quarto
// escuro (o navegador sem foco congelaria a agulha); os cliques são os
// mesmos do jogador.
// ==================================================================

function simBFS(sx, sy, tx, ty2) {
  sx |= 0; sy |= 0; tx |= 0; ty2 |= 0;
  const prev = new Int32Array(COLS * ROWS).fill(-1);
  const q = [sy * COLS + sx];
  prev[sy * COLS + sx] = sy * COLS + sx;
  while (q.length) {
    const cur = q.shift();
    if (cur === ty2 * COLS + tx) break;
    const cx = cur % COLS, cy = (cur / COLS) | 0;
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const nx = cx + dx, ny = cy + dy;
      if (nx < 1 || ny < 1 || nx >= COLS - 1 || ny >= ROWS - 1) continue;
      const ni = ny * COLS + nx;
      if (prev[ni] !== -1) continue;
      if (isSolid(nx, ny)) continue;
      prev[ni] = cur;
      q.push(ni);
    }
  }
  const goal = ty2 * COLS + tx;
  if (prev[goal] === -1) return null;
  const path = [];
  let cur = goal;
  while (cur !== prev[cur]) {
    path.push([cur % COLS + 0.5, ((cur / COLS) | 0) + 0.5]);
    cur = prev[cur];
  }
  path.reverse();
  return path;
}

function simWalk(path, st, maxSteps) {
  let pi = 0;
  const dt = 1 / 30;
  for (let s = 0; s < maxSteps; s++) {
    // quadrinho de história no meio do caminho: o robô "clica" e segue andando
    if (state === "vinheta") vinhetaAdvance();
    if (state !== "play") return "stateChange";
    if (pi >= path.length) return "arrived";
    const [tx, ty2] = path[pi];
    const dx = tx - player.x, dy = ty2 - player.y;
    const d = Math.hypot(dx, dy);
    if (d < 0.3) { pi++; continue; }
    const step = Math.min(d, MOV.andar * dt);
    const nx = player.x + dx / d * step, ny = player.y + dy / d * step;
    if (!collides(nx, player.y)) player.x = nx;
    if (!collides(player.x, ny)) player.y = ny;
    simTick(st, dt);
    if (state === "vinheta") vinhetaAdvance();
    if (state !== "play") return "stateChange";
    if (st.caiu) { st.caiu = false; return "caiu"; }   // acordou no hall: a rota morreu
  }
  return "timeout";
}

function simTick(st, dt) {
  if (state === "vinheta") vinhetaAdvance();   // o robô "clica" nos quadrinhos
  if (world.cur !== st.lastFloor) {
    st.trace.push("f" + st.lastFloor + ">" + world.cur);
    st.lastFloor = world.cur;
  }
  const gs = fl().ghosts;
  let nearest = 999;
  for (let i = 0; i < gs.length; i++) {
    const g = gs[i];
    if (g.respawn <= 0)
      nearest = Math.min(nearest, Math.hypot(g.x - player.x, g.y - player.y));
  }
  if (nearest < 6) { if (!st.inEnc) { st.encounters++; st.inEnc = true; } }
  else if (nearest > 9) st.inEnc = false;
  if (sanity < st.lastSanity - 0.01) st.damageTicks++;
  st.lastSanity = sanity;
  st.sanityMin = Math.min(st.sanityMin, sanity);
  // DEFESA (como um jogador): qualquer coisa hostil em cima → flash na
  // cara (eco é capturado — e conta p/ a Olívia; alma é repelida, ou
  // capturada se o retrato+obturador já estiverem na mão)
  if (flashCd <= 0) {
    let alvo = null, melhor = 2.6;
    // eco PUXANDO O AR: flash nele, onde estiver (é a contra-jogada do bote)
    for (const g of gs)
      if (g.respawn <= 0 && g.bote && g.bote.fase === "inspira" &&
          hasLOS(player.x, player.y, g.x, g.y)) { alvo = g; melhor = 0; }
    if (typeof soulEnts !== "undefined")
      for (const e of soulEnts) {
        if (e.floor !== world.cur || e.id === "tomas") continue;
        const d2 = Math.hypot(e.x - player.x, e.y - player.y);
        if (d2 < melhor) { melhor = d2; alvo = e; }
      }
    for (const g of gs) {
      if (g.respawn > 0) continue;
      const d2 = Math.hypot(g.x - player.x, g.y - player.y);
      if (d2 < melhor) { melhor = d2; alvo = g; }
    }
    if (alvo) {
      aimSource = "stick";
      aimDirStick = Math.atan2(alvo.y - player.y, alvo.x - player.x);
      // eco depois dos 7 contados: EJETA o filme — flash de espantar é grátis
      const ehEco = !alvo.id;
      const pouparFilme = ehEco && (world.flags.ecosFotografados || 0) >= 7;
      const estava = world.flags.filmLoaded;
      if (pouparFilme && estava && world.flags.cam.tampa) toggleFilm();
      takePhoto();
      if (pouparFilme && estava && !world.flags.filmLoaded) toggleFilm();
    }
  }
  update(dt);
  if (state === "ritual") {              // a queda: o robô não assiste, só sofre o efeito
    ritualPula();
    st.quedas = (st.quedas || 0) + 1; st.caiu = true;
  }
}

// descansa na lamparina quando a cabeça está baixa (ela cobra um eco a mais)
function simDescansa(st) {
  if (state !== "play" || (sanity >= 45 && sanTeto() > 36)) return;
  if (world.flags.lampOleo <= 0 || world.flags.lampApagada) return;
  if (!simGotoFloor(st, 1, 6000)) return;
  if (!simGotoPoint(st, world.lamp.x, world.lamp.y + 1.2, 6000)) return;
  updatePrompt();
  if (prompt && prompt.action) { prompt.action(); st.descansos = (st.descansos || 0) + 1; }
}

function simGotoFloor(st, target, budget) {
  // escadas cobrem 0..NFLOORS-2; o último andar é SÓ elevador
  if (target >= NFLOORS - 1 || world.cur >= NFLOORS - 1)
    return simElevatorTo(st, target);
  let guard = 14;
  while (world.cur !== target && guard-- > 0 && state === "play") {
    if (world.timeSec > st.deadline) { st.trace.push("deadline"); return false; }
    const up = world.cur < target;
    const r = up ? STAIR_UP_RECT : STAIR_DOWN_RECT;
    const mouthY = up ? r.y + r.h + 1.5 : r.y - 1.5;
    if (!simGotoPoint(st, r.x + 1, mouthY, budget)) {
      st.trace.push("semEscada f" + world.cur); return false;
    }
    if (state !== "play") return false;
    const before = world.cur;
    for (let i = 0; i < 300 && world.cur === before && state === "play"; i++) {
      // centra no vão antes de entrar (chegando de lado, o ombro batia no batente)
      const cxN = r.x + 1;
      const nx = player.x + Math.max(-0.2, Math.min(0.2, cxN - player.x));
      if (!collides(nx, player.y)) player.x = nx;
      const ny = player.y + (up ? -1 : 1) * MOV.andar / 30;
      if (!collides(player.x, ny)) player.y = ny;
      simTick(st, 1 / 30);
    }
    if (world.cur === before) {
      st.trace.push("nichoFalhou f" + before + "@" + player.x.toFixed(1) + "," + player.y.toFixed(1) +
        " cd" + stairCd.toFixed(1) + " t" + tileAt(player.x | 0, player.y | 0) + " " + state +
        " boca" + (r.x + 1) + "," + mouthY);
      return false;
    }
    for (let i = 0; i < 45 && state === "play"; i++) simTick(st, 1 / 30);
  }
  return world.cur === target;
}

function simElevatorTo(st, target) {
  if (world.cur === target) return true;
  if (!world.flags.elevatorOn) { st.trace.push("elevDesligado"); return false; }
  // vai até o poço do andar atual (se estiver no topo, já nasce perto)
  const ec = roomCenter(ELEV_ROOM);
  if (!simGotoPoint(st, ec.x, ec.y, 6000)) {
    st.trace.push("semCaminhoElev f" + world.cur); return false;
  }
  updatePrompt();
  if (!prompt || !prompt.action) { st.trace.push("semPromptElev"); return false; }
  prompt.action();                        // abre o overlay
  if (state !== "elevator") { st.trace.push("overlayElevNaoAbriu"); return false; }
  const bp = elevBtnPos(target);
  elevatorHit(bp.x, bp.y);                // aperta o botão do andar
  if (state === "vinheta") vinhetaAdvance();
  for (let i = 0; i < 40 && state === "play"; i++) simTick(st, 1 / 30);
  return world.cur === target;
}

function simGotoPoint(st, x, y, budget) {
  if (world.timeSec > st.deadline) { st.trace.push("deadline"); return false; }
  simUnstick();
  const p = simBFS(player.x, player.y, x, y);
  if (!p) { st.trace.push("semCaminho " + (x | 0) + "," + (y | 0)); return false; }
  const r = simWalk(p, st, budget);
  return r === "arrived" || state !== "play";
}

function simUnstick() {
  if (!isSolid(player.x | 0, player.y | 0)) return;
  for (let rad = 1; rad < 8; rad++)
    for (let dy = -rad; dy <= rad; dy++)
      for (let dx = -rad; dx <= rad; dx++)
        if (!isSolid((player.x | 0) + dx, (player.y | 0) + dy)) {
          player.x = (player.x | 0) + dx + 0.5;
          player.y = (player.y | 0) + dy + 0.5;
          return;
        }
}

// fotografa um ALVO fixo (marca/espelho/sinal/retrato): acha ponto com visão
function simPhotoAt(st, tx, ty2, pronto) {
  for (const [ox, oy] of [[0,4],[0,-4],[4,0],[-4,0],[0,6],[3,3],[-3,3],[0,-6]]) {
    if (pronto && pronto()) return true;
    const px2 = tx + ox, py2 = ty2 + oy;
    if (isSolid(px2 | 0, py2 | 0)) continue;
    if (!simGotoPoint(st, px2, py2, 4000)) continue;
    if (state !== "play") return false;
    if (!hasLOS(player.x, player.y, tx, ty2)) continue;
    aimSource = "stick";
    aimDirStick = Math.atan2(ty2 - player.y, tx - player.x);
    flashCd = 0;
    if (film <= 0) film = 1;            // reposição anotada nas métricas
    if (!world.flags.filmLoaded) toggleFilm();
    takePhoto();
    if (state === "vinheta") vinhetaAdvance();
  }
  return pronto ? !!pronto() : true;
}

function simCollectFilms(st) {
  const films = fl().films.filter(f => !f.taken)
    .sort((a, b) => Math.hypot(a.x - player.x, a.y - player.y) -
                    Math.hypot(b.x - player.x, b.y - player.y))
    .slice(0, 3);
  for (const f of films) {
    if (state !== "play") return;
    simGotoPoint(st, f.x, f.y, 4000);
  }
}

function simPegaItem(st, id) {
  const it = world.items.find(i => i.id === id && !i.taken);
  if (!it) return world.items.some(i => i.id === id && i.taken);
  if (!simGotoFloor(st, it.floor, 6000)) return false;
  simGotoPoint(st, it.x, it.y, 6000);
  for (let i = 0; i < 10; i++) simTick(st, 1 / 30);
  return it.taken;
}

// o minigame do quarto escuro (clock avançado na mão; cliques reais)
function simDarkroom(st, modo) {
  const cw = canvas.width;
  if (state !== "darkroom") return false;
  if (modo === "queimar") {
    darkroomHit(cw / 2 + 150, 413);
    darkroomHit(cw / 2 + 150, 413);
    return state === "play";
  }
  darkroomHit(cw / 2 - 150, 413);
  let g2 = 0;
  while (state === "darkroom" && g2++ < 15) {
    for (let i = 0; i < 4000; i++) {
      time += 0.004;
      if (Math.abs(darkNeedle() - darkUI.zc) < darkUI.zw * 0.25) break;
    }
    darkroomHit(cw / 2, 488);
  }
  return state === "play";
}

// caçada de uma alma: re-rota a cada 40 passos rumo à posição ATUAL dela;
// fotografa sempre que perto com visão (é assim que um jogador joga)
function simCaca(st, id) {
  let guard = 2600;                     // ~85s de caçada no máximo
  while (world.flags.souls[id].state === "awake" && guard > 0 &&
         state === "play") {
    const e = soulEnts.find(q => q.id === id);
    if (!e) break;
    if (world.cur !== e.floor) {
      if (!simGotoFloor(st, e.floor, 6000)) return false;
      continue;
    }
    const d = Math.hypot(e.x - player.x, e.y - player.y);
    // o flash alcança ~49 células no cone; atirar de LONGE poupa sanidade
    if (d < 24 && hasLOS(player.x, player.y, e.x, e.y)) {
      aimSource = "stick";
      aimDirStick = Math.atan2(e.y - player.y, e.x - player.x);
      if (flashCd <= 0) {
        if (film <= 0) film = 1;        // reposição anotada nas métricas
        if (!world.flags.filmLoaded) toggleFilm();
        takePhoto(); st.fotosDeAlma++;
        if (state === "vinheta") vinhetaAdvance();
      } else simTick(st, 1 / 30);
      guard--;
      continue;
    }
    const p = simBFS(player.x, player.y, e.x, e.y);
    if (!p) { simTick(st, 1 / 30); guard--; continue; }
    simWalk(p, st, 40);                 // só 40 passos; re-mira em seguida
    guard -= 40;
  }
  return world.flags.souls[id].state === "captured" ||
         world.flags.souls[id].state === "freed" ||
         world.flags.souls[id].state === "burned";
}

// retrato → caçada → quarto escuro
function simResolveAlma(st, id, modo) {
  const s = world.flags.souls[id];
  if (!s || s.state === "dormant") { st.trace.push(id + ":dorme"); return false; }
  if (s.state === "freed" || s.state === "burned") return true;
  if (s.state === "awake") {
    // 1. retrato
    const r = world.retratos.find(q => q.soul === id);
    if (!world.taken.has(r.id)) {
      if (!simGotoFloor(st, r.floor, 6000)) return false;
      simPhotoAt(st, r.x, r.y, () => world.flags.retSeen.includes(r.id));
      if (world.flags.retSeen.includes(r.id)) {
        simGotoPoint(st, r.x, r.y, 4000);
        updatePrompt();
        if (prompt && prompt.action && prompt.text.includes("RETRATO"))
          prompt.action();
        if (state === "vinheta") vinhetaAdvance();
      }
      if (!world.taken.has(r.id)) { st.trace.push(id + ":semRetrato"); return false; }
    }
    // 2. caçada: perseguição com re-rota curta (o Tomás FOGE)
    if (!simCaca(st, id)) { st.trace.push(id + ":fugiu"); return false; }
  }
  // 3. quarto escuro
  if (!simGotoFloor(st, 0, 6000)) return false;
  const b = world.floors[0].bench;
  if (!simGotoPoint(st, b.x, b.y + 0.5, 6000)) return false;
  updatePrompt();
  if (!prompt || !prompt.action) { st.trace.push(id + ":semBancada"); return false; }
  prompt.action();
  if (!simDarkroom(st, modo)) { st.trace.push(id + ":darkroomTravou"); return false; }
  const fim = world.flags.souls[id].state;
  return fim === "freed" || fim === "burned";
}

// fotografa 7 ecos (com fantasmas) p/ despertar a Olívia
function simCacaEcos(st) {
  let guard = 90;
  while ((world.flags.ecosFotografados || 0) < 7 && guard-- > 0 && state === "play") {
    const gs = fl().ghosts.filter(g => g.respawn <= 0);
    if (!gs.length) {
      // muda de andar atrás de ecos
      const f2 = (world.cur + 1) % (NFLOORS - 1);
      if (!simGotoFloor(st, f2 === 0 ? 1 : f2, 6000)) return false;
      continue;
    }
    gs.sort((a, b) => Math.hypot(a.x - player.x, a.y - player.y) -
                      Math.hypot(b.x - player.x, b.y - player.y));
    const g = gs[0];
    // o eco atravessa parede: procura um ponto de CHÃO alcançável perto dele
    let foi = false;
    for (const [ox, oy] of [[0, 3], [3, 0], [-3, 0], [0, -3], [0, 0], [0, 6], [6, 0], [-6, 0]]) {
      const tx = g.x + ox, ty2 = g.y + oy;
      if (isSolid(tx | 0, ty2 | 0) || !simBFS(player.x, player.y, tx, ty2)) continue;
      simGotoPoint(st, tx, ty2, 2500); foi = true; break;
    }
    if (state !== "play") return false;
    if (!foi) { for (let i = 0; i < 45 && state === "play"; i++) simTick(st, 1 / 30); continue; }
    if (g.respawn > 0 || Math.hypot(g.x - player.x, g.y - player.y) > 22 ||
        !hasLOS(player.x, player.y, g.x, g.y)) continue;
    aimSource = "stick";
    aimDirStick = Math.atan2(g.y - player.y, g.x - player.x);
    flashCd = 0; if (film <= 0) film = 1;
    if (!world.flags.filmLoaded) toggleFilm();
    takePhoto();
  }
  return (world.flags.ecosFotografados || 0) >= 7;
}

// ------------------------------------------------------------------
function simRun(policy, useNoGhosts) {
  const prevNo = (typeof noGhosts !== "undefined") ? noGhosts : false;
  noGhosts = !!useNoGhosts;
  SEM_ARQUIVO = true;                    // as mortes do robô não entram no arquivo do canal
  newRun();
  noGhosts = prevNo;
  simAnda = "andar";                     // o robô move o jogador por fora: ele FAZ barulho de passo

  const st = {
    policy, encounters: 0, damageTicks: 0, fotosDeAlma: 0,
    inEnc: false, lastSanity: 100, sanityMin: 100, lastFloor: 1,
    trace: [], deadline: 3000,            // teto: 50 min de jogo
  };
  const B = 6000;
  const modo = policy === "CRUEL" ? "queimar" : "revelar";

  // cada passo confere o que já foi feito: dá para chamar de novo sem estragar nada
  const marcasECofre = () => {
    for (const mf of [1, 2, 4]) {
      if (state !== "play") return;
      const mk = world.floors[mf].marks[0];
      if (!mk || mk.seen) continue;
      if (!simGotoFloor(st, mf, B)) continue;
      simCollectFilms(st);
      simPhotoAt(st, mk.x, mk.y, () => mk.seen);
    }
    if (state !== "play" || world.flags.safeOpen || world.flags.marksSeen.length < 3) return;
    if (!simGotoFloor(st, 3, B)) return;
    const s = fl().safe;
    if (!s) return;
    for (const [ox, oy] of [[0, 1.5], [1.5, 0], [-1.5, 0], [0, -1.5]]) {
      if (world.flags.safeOpen || state !== "play") break;
      if (!simGotoPoint(st, s.x + ox, s.y + oy, B)) continue;
      updatePrompt();
      if (!prompt || !prompt.action || !prompt.text.includes("COFRE")) continue;
      prompt.action();
      safeUI.guess = [...world.code];
      const sg = (typeof safeGeom === "function") ? safeGeom() : null;
      if (sg) safeHit(sg.alav.x, sg.alav.y);
      else safeHit(600, canvas.height - 120);
      if (state === "safe") state = "play";
    }
  };
  const energia = () => {
    if (world.flags.elevatorOn) return;
    if (state === "play" && world.items.find(i => i.id === "fuse0" && !i.taken)) simPegaItem(st, "fuse0");
    if (state !== "play" || !simGotoFloor(st, 0, B)) return;
    simCollectFilms(st);
    simPegaItem(st, "fuse1");
    const fb = fl().fusebox;
    if (fb && simGotoPoint(st, fb.x, fb.y + 1.2, B)) {
      updatePrompt(); if (prompt && prompt.action) prompt.action();
      if (state === "fusebox") {
        // painel novo: clica nos soquetes vazios e puxa a alavanca
        const fg = fbGeom();
        if (fg) {
          for (const s of fg.soq) fuseboxHit(s.x, s.y);
          fuseboxHit(fg.alav.x, fg.alav.y);
        }
        if (state === "fusebox")
          fuseboxHit(ALB_CLOSE.x + ALB_CLOSE.w / 2, ALB_CLOSE.y + ALB_CLOSE.h / 2);
      } else {
        updatePrompt(); if (prompt && prompt.action) prompt.action(); // liga (antigo)
      }
    }
  };
  const aberta = (id) => {
    const e = world.flags.souls[id].state;
    return e === "freed" || e === "burned";
  };
  const almas = () => {
    const aurora = () => {   // a Aurora acorda sozinha no meio; resolve já
      if (state === "play" && world.flags.souls.aurora.state === "awake")
        simResolveAlma(st, "aurora", modo);
    };
    for (const id of ["tomas", "bento"]) {
      if (state === "play" && !aberta(id)) simResolveAlma(st, id, modo);
      simDescansa(st);
    }
    if (state === "play" && !aberta("cecilia") && world.espelhoCecilia) {
      const em = world.espelhoCecilia;
      if (world.flags.souls.cecilia.state === "dormant" && simGotoFloor(st, em.floor, B))
        simPhotoAt(st, em.furn.x, em.furn.y,
          () => world.flags.souls.cecilia.state !== "dormant");
      simResolveAlma(st, "cecilia", modo);
    }
    aurora();
    simDescansa(st);
    if (state === "play" && !aberta("olivia")) {
      if (world.flags.souls.olivia.state === "dormant") {
        if (useNoGhosts) {
          const p = world.pianoOlivia;
          if (p && simGotoFloor(st, p.floor, B))
            simPhotoAt(st, p.x, p.y,
              () => world.flags.souls.olivia.state !== "dormant");
        } else simCacaEcos(st);
      }
      simResolveAlma(st, "olivia", modo);
    }
    aurora();
    simDescansa(st);
    if (state === "play" && !aberta("hospede") && world.sinal && world.flags.cam.lente) {
      if (world.flags.souls.hospede.state === "dormant" && simGotoFloor(st, world.sinal.floor, B))
        simPhotoAt(st, world.sinal.x, world.sinal.y,
          () => world.flags.souls.hospede.state !== "dormant");
      simResolveAlma(st, "hospede", modo);
    }
    aurora();
  };

  try {
    // ATO 1: tampa, sala secreta do térreo (Tomás + lente), marcas, cofre
    simPegaItem(st, "tampa");
    const ss1 = world.floors[1].secretRooms[0];
    if (ss1 && state === "play") {
      simGotoPoint(st, ss1.x + ss1.w / 2, ss1.y + ss1.h / 2, B);
      simPegaItem(st, "lente");
    }
    marcasECofre();
    // ATO 2: porão (fusíveis, Bento, obturador, chave) — ANTES de acordar
    // mais almas, para já poder capturar cada uma assim que despertar
    energia();
    if (state === "play") { simPegaItem(st, "obturador"); simPegaItem(st, "key"); }
    // ATO 3: uma alma de cada vez — desperta, captura, revela/queima
    almas();
    // REPESCAGEM: o que falhou na primeira passada (uma marca que só saiu numa
    // foto posterior, o 7º eco que veio tarde…) ganha mais duas chances
    for (let rep = 0; rep < 2 && state === "play"; rep++) {
      const falta = ["tomas", "cecilia", "bento", "olivia", "hospede", "aurora"].some(id => !aberta(id));
      if (!falta && world.flags.elevatorOn) break;
      st.trace.push("repescagem" + (rep + 1));
      if (!world.flags.cam.lente) simPegaItem(st, "lente");
      marcasECofre();
      energia();
      if (state === "play") { simPegaItem(st, "obturador"); simPegaItem(st, "key"); }
      almas();
    }

    if (state === "play" &&
        world.flags.souls.blackwood.state !== "dormant") {
      if (simElevatorTo(st, NFLOORS - 1)) {
        if (policy === "DONO") {
          // captura e senta na cadeira
          const r = world.retratos.find(q => q.soul === "blackwood");
          simPhotoAt(st, r.x, r.y, () => world.flags.retSeen.includes(r.id));
          simGotoPoint(st, r.x, r.y, 4000);
          updatePrompt();
          if (prompt && prompt.action && prompt.text.includes("RETRATO")) prompt.action();
          if (state === "vinheta") vinhetaAdvance();
          simCaca(st, "blackwood");
          if (world.flags.souls.blackwood.state === "captured") {
            simGotoPoint(st, ATELIER_CADEIRA.x, ATELIER_CADEIRA.y + 0.5, 4000);
            updatePrompt();
            if (prompt && prompt.action) prompt.action();   // senta
          }
        } else {
          simResolveAlma(st, "blackwood", modo);   // sobe, caça, desce, revela
        }
      }
    }

    // porta (REVELADOR/CRUEL)
    if (state === "play" && policy !== "DONO" && simGotoFloor(st, 1, B)) {
      const d = fl().door;
      if (simGotoPoint(st, d.x, d.y - 1.6, B)) {
        updatePrompt(); if (prompt && prompt.action) prompt.action();
      }
    }
  } catch (e) {
    st.error = String(e).slice(0, 140);
  }
  simAnda = "";

  let livres = 0, queimadas = 0;
  for (const id in world.flags.souls) {
    const s2 = world.flags.souls[id];
    if (s2.state === "freed") livres++;
    if (s2.state === "burned") queimadas++;
  }
  return {
    policy, noGhosts: !!useNoGhosts,
    outcome: state === "win" ? "VITÓRIA" : state === "dead" ? "MORTE"
             : "INCOMPLETA(" + state + ")",
    final: world.endType || "",
    timeMin: +(world.timeSec / 60).toFixed(1),
    livres, queimadas, correntes: chainsBroken(),
    ecos: world.flags.ecosFotografados || 0,
    fotos: photoCount, fotosDeAlma: st.fotosDeAlma, filmeFinal: film,
    encounters: st.encounters, damageTicks: st.damageTicks,
    sanityMin: st.sanityMin | 0, quedas: st.quedas || 0, descansos: st.descansos || 0,
    nPecas: Object.keys(world.flags.cam).filter(k => world.flags.cam[k]).length,
    error: st.error || "",
    diag: state === "win" ? "" : JSON.stringify({
      cam: world.flags.cam, fus: world.flags.fuses, fusIn: world.flags.fusesIn,
      cofre: world.flags.safeOpen, marcas: world.flags.marksSeen, elev: world.flags.elevatorOn,
      chave: world.flags.key, itens: world.items.filter(i => !i.taken).map(i => i.id + "@f" + i.floor),
      ecos: world.flags.ecosFotografados || 0, andar: world.cur, san: sanity | 0, filme: film,
      t: (world.timeSec / 60).toFixed(1),
    }),
    andaresVisitados: st.trace.filter(x => x.startsWith("f")).length,
    trace: st.trace.filter(x => !x.startsWith("f")).slice(0, 8).join(";").slice(0, 400),
  };
}

function simBatch(policy, n, useNoGhosts) {
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push(simRun(policy, useNoGhosts));
    state = "title";
  }
  return out;
}
window.simRun = simRun;
window.simBatch = simBatch;

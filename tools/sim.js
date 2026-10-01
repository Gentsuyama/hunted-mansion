"use strict";
// ==================================================================
// SIMULADOR DE RUNS — robô jogador para estatísticas de balanceamento
// Políticas: SPEEDRUN (chave→porta) · EXPLORER (todos os objetivos)
//            HUNTER (explorer + fotografa fantasmas)
// ==================================================================

// BFS na grade do andar atual (células andáveis; parede falsa é andável)
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

// anda ao longo de um caminho chamando update() (sistemas reais do jogo rodam)
function simWalk(path, st, maxSteps) {
  let pi = 0;
  const dt = 1 / 30;
  for (let s = 0; s < maxSteps; s++) {
    if (state !== "play") return "stateChange";
    if (pi >= path.length) return "arrived";
    const [tx, ty2] = path[pi];
    const dx = tx - player.x, dy = ty2 - player.y;
    const d = Math.hypot(dx, dy);
    if (d < 0.3) { pi++; continue; }
    const step = Math.min(d, PLAYER_SPEED * dt);
    const nx = player.x + dx / d * step, ny = player.y + dy / d * step;
    if (!collides(nx, player.y)) player.x = nx;
    if (!collides(player.x, ny)) player.y = ny;
    simTick(st, dt);
    if (state !== "play") return "stateChange";
  }
  return "timeout";
}

function simTick(st, dt) {
  // rastreia mudança de andar (escada, elevador, bug…)
  if (world.cur !== st.lastFloor) {
    st.trace.push("f" + st.lastFloor + ">" + world.cur + "@" + (player.x | 0) + "," + (player.y | 0));
    st.lastFloor = world.cur;
  }
  // métricas por tick
  const gs = fl().ghosts;
  let nearest = 999;
  for (let i = 0; i < gs.length; i++) {
    const g = gs[i];
    const was = st.gRespawn.get(g) || 0;
    if (g.respawn > 0 && was <= 0) st.captures++;       // dissolvido agora
    st.gRespawn.set(g, g.respawn);
    if (g.respawn <= 0) nearest = Math.min(nearest, Math.hypot(g.x - player.x, g.y - player.y));
  }
  if (nearest < 6) { if (!st.inEnc) { st.encounters++; st.inEnc = true; } }
  else if (nearest > 9) st.inEnc = false;
  if (sanity < st.lastSanity - 0.01) st.damageTicks++;
  st.lastSanity = sanity;

  // política HUNTER: fotografa fantasma visível no alcance
  if (st.policy === "HUNTER" && film > 0 && flashCd <= 0 && nearest < 13) {
    let alvo = null, best = 99;
    for (const g of gs) {
      if (g.respawn > 0) continue;
      const d = Math.hypot(g.x - player.x, g.y - player.y);
      if (d < best && hasLOS(player.x, player.y, g.x, g.y)) { best = d; alvo = g; }
    }
    if (alvo && best < 13) {
      aimSource = "stick";
      aimDirStick = Math.atan2(alvo.y - player.y, alvo.x - player.x);
      takePhoto();
      st.ghostPhotos++;
    }
  }
  update(dt);
}

function simGotoFloor(st, target, budget) {
  // sobe/desce um andar por vez pelos nichos de escada
  let guard = 14;
  while (world.cur !== target && guard-- > 0 && state === "play") {
    if (world.timeSec > st.deadline) { st.trace.push("deadline@gotoFloor"); return false; }
    const up = world.cur < target;
    const r = up ? STAIR_UP_RECT : STAIR_DOWN_RECT;
    const mouthY = up ? r.y + r.h + 1.5 : r.y - 1.5;
    if (!simGotoPoint(st, r.x + 1, mouthY, budget)) {
      st.trace.push("semCaminhoEscada f" + world.cur); return false;
    }
    if (state !== "play") return false;
    const before = world.cur;
    // empurra para DENTRO do nicho até o andar mudar (gatilho automático)
    for (let i = 0; i < 300 && world.cur === before && state === "play"; i++) {
      const ny = player.y + (up ? -1 : 1) * PLAYER_SPEED / 30;
      if (!collides(player.x, ny)) player.y = ny;
      simTick(st, 1 / 30);
    }
    if (world.cur === before) { st.trace.push("nichoNaoDisparou f" + before); return false; }
    // espera o cooldown parado, FORA do gatilho (spawn já é fora)
    for (let i = 0; i < 45 && state === "play"; i++) simTick(st, 1 / 30);
  }
  return world.cur === target;
}

function simGotoPoint(st, x, y, budget) {
  if (world.timeSec > st.deadline) { st.trace.push("deadline@gotoPoint"); return false; }
  const p = simBFS(player.x, player.y, x, y);
  if (!p) { st.trace.push("semCaminho " + (x | 0) + "," + (y | 0)); return false; }
  const r = simWalk(p, st, budget);
  return r === "arrived" || state !== "play";
}

function simInteract(st) {
  updatePrompt();
  if (prompt && prompt.action) {
    if (st) st.trace.push("act:" + (prompt.label || "?").slice(0, 18));
    prompt.action();
  }
}

// se o robô acabar num tile sólido (borda de transição), desencalha
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

function simPhotoMark(st, mk) {
  // tenta vários pontos de observação ao redor da marca
  for (const [ox, oy] of [[0, 5], [0, -5], [5, 0], [-5, 0], [0, 7], [4, 4]]) {
    simUnstick();
    if (!simGotoPoint(st, mk.x + ox, mk.y + oy, 4000)) continue;
    if (state !== "play") return;
    aimSource = "stick";
    aimDirStick = Math.atan2(mk.y - player.y, mk.x - player.x);
    flashCd = 0;
    if (film > 0) takePhoto();
    if (mk.seen) return;
  }
}

// coleta os refis de filme do andar atual (mais próximos primeiro, máx 3)
function simCollectFilms(st) {
  const films = fl().films.filter(f => !f.taken)
    .sort((a, b) => Math.hypot(a.x - player.x, a.y - player.y) -
                    Math.hypot(b.x - player.x, b.y - player.y))
    .slice(0, 3);
  for (const f of films) {
    if (state !== "play") return;
    simUnstick();
    simGotoPoint(st, f.x, f.y, 4000);
  }
}

// uma run completa com a política dada; retorna métricas
function simRun(policy, useNoGhosts) {
  const prevNo = (typeof noGhosts !== "undefined") ? noGhosts : false;
  noGhosts = !!useNoGhosts;
  newRun();
  noGhosts = prevNo;
  live.hinted.clear();

  const st = {
    policy, encounters: 0, captures: 0, ghostPhotos: 0, damageTicks: 0,
    inEnc: false, lastSanity: 100, gRespawn: new Map(),
    lastFloor: 1,
    trace: [], deadline: 900,          // teto: 15 min de jogo por run
  };
  const B = 6000;    // orçamento de passos por trecho

  try {
    if (policy !== "SPEEDRUN") {
      // marcas dos dígitos (térreo, 1º, 3º)
      for (const mf of [1, 2, 4]) {
        if (state !== "play") break;
        simUnstick();
        if (!simGotoFloor(st, mf, B)) break;
        simCollectFilms(st);
        const mk = fl().marks[0];
        if (mk) simPhotoMark(st, mk);
      }
      // cofre (2º andar)
      if (state === "play" && simGotoFloor(st, 3, B)) {
        const s = fl().safe;
        if (s && simGotoPoint(st, s.x, s.y + 1.5, B)) {
          updatePrompt();
          if (prompt && prompt.action) {
            prompt.action();              // abre overlay do cofre
            safeUI.guess = [...world.code];
            safeHit(600, canvas.height - 120);
          }
        }
      }
      // fusível da sala secreta (andar aleatório) — pega se houver
      const f0 = world.items.find(i => i.id === "fuse0" && !i.taken);
      if (state === "play" && f0 && simGotoFloor(st, f0.floor, B))
        simGotoPoint(st, f0.x, f0.y, B);
    }

    // porão: fusível 2, quadro, chave
    if (state === "play" && simGotoFloor(st, 0, B)) {
      simCollectFilms(st);
      const f1 = world.items.find(i => i.id === "fuse1" && !i.taken);
      if (f1) simGotoPoint(st, f1.x, f1.y, B);
      if (policy !== "SPEEDRUN" && state === "play") {
        const fb = fl().fusebox;
        if (fb && simGotoPoint(st, fb.x, fb.y + 1.2, B)) {
          simInteract(st);                // encaixa
          simInteract(st);                // liga (se 3/3)
        }
      }
      const key = world.items.find(i => i.id === "key" && !i.taken);
      if (key && state === "play") simGotoPoint(st, key.x, key.y, B);
    }

    // volta ao térreo e abre a porta
    if (state === "play" && simGotoFloor(st, 1, B)) {
      const d = fl().door;
      if (simGotoPoint(st, d.x, d.y - 1.6, B)) simInteract(st);
    }
  } catch (e) {
    st.error = String(e).slice(0, 120);
  }

  const filmsFound = [...world.taken].filter(id => /^\d+:\d+$/.test(id)).length;
  return {
    policy, noGhosts: !!useNoGhosts,
    outcome: state === "win" ? "VITÓRIA" : state === "dead" ? "MORTE" : "INCOMPLETA(" + state + ")",
    timeMin: +(world.timeSec / 60).toFixed(1),
    filmsFound, photos: photoCount, filmLeft: film,
    safeOpen: world.flags.safeOpen, elevatorOn: world.flags.elevatorOn,
    key: world.flags.key, marksSeen: world.flags.marksSeen.length,
    secrets: world.flags.secretsFound.length,
    encounters: st.encounters, captures: st.captures,
    ghostPhotos: st.ghostPhotos, damageTicks: st.damageTicks,
    sanityEnd: Math.max(0, sanity | 0),
    deathFloor: state === "dead" ? FLOOR_NAMES[world.cur] : "",
    error: st.error || "",
    trace: st.trace.slice(0, 16).join(";"),
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

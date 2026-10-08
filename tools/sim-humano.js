"use strict";
// ==================================================================
// ROBÔ HUMANO v1 — joga como uma PESSOA que não conhece a casa.
//
// O robô antigo (tools/sim.js) é um speedrunner onisciente: lê a posição
// de tudo na memória do jogo e anda pelo caminho ótimo. Serve para provar
// que o jogo FECHA, não para estimar como uma pessoa se sai. Este aqui
// obedece a um contrato de informação:
//
//   PODE usar      o que a lanterna/flash iluminam DENTRO da tela agora;
//                  o HUD e o texto do prompt; as dicas que o chat mostrou
//                  (via liveNag) e o que a própria FOTO denunciou
//                  (retSeen, marksSeen, vão de parede falsa no cone).
//   NÃO PODE usar  posição de item, retrato, alma, marca, sala secreta ou
//                  parede que ele ainda não viu; nem o código do cofre.
//
// Ele joga pelas MESMAS entradas do jogador (teclas + mira) e tem
// limitações de gente: tempo de reação, erro de mira, parar para ler o
// chat e para ver a foto revelar, ignorar dicas, se perder, errar o
// tempo dos banhos do quarto escuro.
//
// Uso (console):  humInicia("novato"|"medio"|"veterano")  e depois
//                 humPasso(30000) repetidas vezes até terminar; ou
//                 humLote("medio", 6) + humLotePasso(30000).
// ==================================================================
(function () {
const DT = 1 / 30;
const DX = [1, -1, 0, 0], DY = [0, 0, 1, -1];
const rnd = Math.random, hyp = Math.hypot;
function gauss() {
  let u = 0, v = 0;
  while (!u) u = rnd();
  while (!v) v = rnd();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.283185 * v);
}

const PERFIS = {
  // primeira vez no jogo: reage devagar, erra a mira, ignora o chat,
  // para pra ver a foto revelar e gasta filme em tudo
  novato: { nome: "NOVATO", reacao: 0.55, erroMira: 0.28, panico: 0.45, notar: 0.25,
            chat: [0.30, 0.60, 0.92], leitura: 4.5, verFoto: 3.4, curiosa: 0.20,
            perdido: 0.20, ejeta: false, banho: 0.11, fotosDica: 2, olhada: 0.5,
            sabeLente: false, distFlash: 7.5, lamp: 25, soBote: false, atento: 0.72,
            guarda: 0.35, bateriaMin: 0, luz: 0.25 },
  medio:  { nome: "MÉDIO", reacao: 0.38, erroMira: 0.17, panico: 0.20, notar: 0.40,
            chat: [0.55, 0.85, 0.98], leitura: 3.0, verFoto: 2.4, curiosa: 0.10,
            perdido: 0.10, ejeta: true, banho: 0.08, fotosDica: 3, olhada: 0.75,
            sabeLente: false, distFlash: 5, lamp: 35, soBote: false, atento: 0.86,
            guarda: 0.70, bateriaMin: 1, luz: 0.65 },
  // já zerou: sabe as REGRAS (não a planta, que muda a cada run)
  veterano: { nome: "VETERANO", reacao: 0.26, erroMira: 0.10, panico: 0.06, notar: 0.60,
            chat: [0.92, 0.98, 1.0], leitura: 1.2, verFoto: 0.8, curiosa: 0.03,
            perdido: 0.04, ejeta: true, banho: 0.055, fotosDica: 4, olhada: 0.95,
            // sabe que o eco só fere no BOTE: não gasta flash em vulto que só ronda
            sabeLente: true, distFlash: 4, lamp: 45, soBote: true, atento: 0.95,
            guarda: 0.95, bateriaMin: 2, luz: 0.92 },
};

let H = null;

function L(msg) {
  if (H.log.length >= 1200) H.log.splice(0, 300);      // guarda sempre o FIM da run
  H.log.push((H.tReal / 60).toFixed(1) + "m f" + world.cur + " " + msg);
}

function novo(perfil, opts) {
  const o = opts || {};
  H = {
    p: PERFIS[perfil] || PERFIS.medio, perfil,
    tReal: 0, tick: 0, fim: null, pausado: false, estadoSalvo: "play",
    K: [], P: [], itens: new Map(), moveis: [],
    pt: { cofre: null, quadro: null, bancada: null, porta: null, elev: [], elevPos: null },
    nagLvl: new Map(), dicas: [], marcasPend: [],
    alma: {}, almaEstado: {}, fotografados: new Set(),
    rota: null, ri: 0, rotaKey: "", rotaExp: false, dirMov: 0, mira: -Math.PI / 2,
    tarefa: null, tDecide: 0, espera: 0, olhar: null, ultOlhada: -99, novasCels: 0,
    reacaoT: -1, parado: 0, ux: 0, uy: 0, nicho: null, andarAntes: -1,
    alerta: -1, alinhar: 0, queimar: false, proxOlhada: 0, fugaT: 0, fugaDe: null,
    encarando: -1, danoLog: 0, dicaDirs: new Map(),
    fugaDir: null, fugaDirT: 0, fugaK: -1, fugaRuim: -1,
    voltas: new Array(NFLOORS).fill(0), rondaCd: 0,
    enrosco: new Map(), ancora: { x: 0, y: 0, f: -1, t: 0 },
    sabeHall: false, feito: new Array(NFLOORS).fill(false), prefExp: null,
    ovT: 0, banhoErros: 0, elevAlvo: -1, ronda: null, vagar: null,
    prev: new Int32Array(COLS * ROWS), fila: new Int32Array(COLS * ROWS),
    st: { fotos: 0, flashes: 0, sustos: 0, dano: 0, errosBanho: 0, dicasVistas: 0,
          dicasIgnoradas: 0, perdidas: 0, sanMin: 100, filmeZerou: 0, tSemFilme: 0,
          rondas: 0, quedas: 0, descansos: 0, botes: 0, botesCortados: 0,
          tOverlay: 0, tLendo: 0, marcos: {}, causa: "" },
    log: [], limite: (o.limiteMin || 90) * 60,
    saveAntes: null,
  };
  for (let f = 0; f < NFLOORS; f++) {
    H.K.push(new Uint8Array(COLS * ROWS));     // 0 ? · 1 chão · 2 parede · 3 móvel
    H.P.push(new Uint8Array(COLS * ROWS));     // 1 = já ANDOU por perto (não só viu de longe)
    H.moveis.push(new Map());
  }
}

// ------------------------------------------------------------------
// PERCEPÇÃO: só o que está iluminado e dentro da tela
// ------------------------------------------------------------------
function naTela(x, y) {
  return Math.abs(x - player.x) < 35 && Math.abs(y - player.y) < 20;
}
function vejo(x, y) { return naTela(x, y) && lightAt(x, y) > 0.1; }
// vulto aparece no mapa já com pouca luz (o jogo desenha a partir de ~0,03)
function vejoEnte(x, y) { return naTela(x, y) && lightAt(x, y) > 0.035; }

function perceber() {
  const f = world.cur, K = H.K[f], fg = fl().furnGrid;
  light.fill(0);
  luzDoJogador(H.mira, 1);               // a MESMA luz que o jogo desenha
  if (flashT > 0.25)
    castLight(player.x, player.y, flashDir, FLASH.halfAngle, FLASH.range,
              FLASH.power * flashT * flashT, 150);
  const x0 = Math.max(0, (player.x - 35) | 0), x1 = Math.min(COLS - 1, (player.x + 35) | 0);
  const y0 = Math.max(0, (player.y - 20) | 0), y1 = Math.min(ROWS - 1, (player.y + 20) | 0);
  for (let cy = y0; cy <= y1; cy++)
    for (let cx = x0; cx <= x1; cx++) {
      const idx = cy * COLS + cx;
      if (light[idx] <= 0.05) continue;
      const t = grid[idx];
      const antes = K[idx];
      if (t === T_WALL || t === T_DOOR) K[idx] = 2;
      else if (t === T_FAKE) { if (antes !== 1) K[idx] = 2; }   // PARECE parede
      else K[idx] = fg[idx] ? 3 : 1;
      if (!antes) H.novasCels++;
      if (t === T_DOOR && !H.pt.porta && fl().door)
        H.pt.porta = { x: fl().door.x, y: fl().door.y, f };
      if (t === T_ELEV && !H.pt.elev[f]) {
        H.pt.elev[f] = { x: cx + 0.5, y: cy + 0.5 };
        if (!H.pt.elevPos) H.pt.elevPos = { x: cx + 0.5, y: cy + 0.5 };
      }
    }
  { const P = H.P[f];                     // por onde ele de fato PASSOU (raio 6)
    const ax = Math.max(1, (player.x - 6) | 0), bx = Math.min(COLS - 2, (player.x + 6) | 0);
    const ay = Math.max(1, (player.y - 6) | 0), by = Math.min(ROWS - 2, (player.y + 6) | 0);
    for (let cy = ay; cy <= by; cy++) for (let cx = ax; cx <= bx; cx++) P[cy * COLS + cx] = 1; }
  const p = H.p.notar;
  for (const it of world.items)
    if (!it.taken && it.floor === f && !H.itens.has(it.id) && vejo(it.x, it.y) && rnd() < p)
      H.itens.set(it.id, { id: it.id, x: it.x, y: it.y, f, kind: it.kind });
  for (const fm of fl().films) {
    const id = "film" + f + ":" + fm.id;
    if (!fm.taken && !H.itens.has(id) && vejo(fm.x, fm.y) && rnd() < p)
      H.itens.set(id, { id, x: fm.x, y: fm.y, f, kind: "film", ref: fm });
  }
  const M = H.moveis[f];
  for (const fu of fl().furn) {
    const k = fu.type + "@" + fu.x + "," + fu.y;
    if (!M.has(k) && vejo(fu.x, fu.y)) M.set(k, { k: f + ":" + k, type: fu.type, x: fu.x, y: fu.y, f });
  }
  if (fl().safe && !H.pt.cofre && vejo(fl().safe.x, fl().safe.y))
    H.pt.cofre = { x: fl().safe.x, y: fl().safe.y, f };
  if (fl().fusebox && !H.pt.quadro && vejo(fl().fusebox.x, fl().fusebox.y))
    H.pt.quadro = { x: fl().fusebox.x, y: fl().fusebox.y, f };
  if (fl().bench && !H.pt.bancada && vejo(fl().bench.x, fl().bench.y))
    H.pt.bancada = { x: fl().bench.x, y: fl().bench.y, f };
  for (const e of soulEnts)
    if (e.floor === f && vejoEnte(e.x, e.y))
      H.alma[e.id] = { x: e.x, y: e.y, f, t: H.tReal };
  if ((world.flags.stairsSeen || []).length) H.sabeHall = true;
  // PEGADAS no chão levando a uma parede: gente repara (nem sempre de primeira)
  for (const sr of fl().secretRooms) {
    if (!sr.frente || !sr.dn || world.flags.secretsFound.includes(sr.id)) continue;
    const id = "w" + f + sr.id;
    if ((H.pegadas || (H.pegadas = new Set())).has(id)) continue;
    const px = sr.frente.x + sr.dn[0] * 2.5, py = sr.frente.y + sr.dn[1] * 2.5;
    if (!vejo(px, py) || hyp(px - player.x, py - player.y) > 12 || rnd() > p * 0.25) continue;
    H.pegadas.add(id);
    L("reparou nas PEGADAS que entram na parede");
    const lado = Math.atan2(-sr.dn[1], -sr.dn[0]);
    const velha = H.dicas.find(d => d.id === id);
    if (velha) { velha.lado = lado; velha.lvl = Math.max(velha.lvl, 1); velha.x = px; velha.y = py; }
    else H.dicas.push({ id, cat: "wall", x: px, y: py, f, t: H.tReal, lvl: 1, lado });
  }
}

// ------------------------------------------------------------------
// MAPA MENTAL: busca em largura só pelo que ele JÁ VIU
// ------------------------------------------------------------------
function bfs(goalFn, maxN) {
  const K = H.K[world.cur], prev = H.prev, q = H.fila;
  const s = (player.y | 0) * COLS + (player.x | 0);
  prev.fill(-1);
  let qh = 0, qt = 0, n = 0, achou = -1;
  q[qt++] = s; prev[s] = s;
  const lim = maxN || 40000;
  while (qh < qt) {
    const cur = q[qh++];
    const cx = cur % COLS, cy = (cur / COLS) | 0;
    if (cur !== s && goalFn(cur, cx, cy)) { achou = cur; break; }
    if (++n > lim) break;
    for (let k = 0; k < 4; k++) {
      const nx = cx + DX[k], ny = cy + DY[k];
      if (nx < 1 || ny < 1 || nx >= COLS - 1 || ny >= ROWS - 1) continue;
      const ni = ny * COLS + nx;
      if (prev[ni] !== -1 || K[ni] !== 1) continue;
      prev[ni] = cur; q[qt++] = ni;
    }
  }
  return achou;
}
function caminho(c) {
  const prev = H.prev, s = (player.y | 0) * COLS + (player.x | 0), path = [];
  let guard = 0;
  while (c !== s && c >= 0 && guard++ < 20000) { path.push(c); c = prev[c]; }
  path.reverse();
  return path;
}
function rotaPerto(x, y, raio) {
  const c = bfs((cur, cx, cy) => hyp(cx + 0.5 - x, cy + 0.5 - y) <= raio);
  return c < 0 ? null : caminho(c);
}
function fronteiras(maxC) {
  const K = H.K[world.cur], cand = [];
  bfs((c) => {
    if (K[c - 1] === 0 || K[c + 1] === 0 || K[c - COLS] === 0 || K[c + COLS] === 0) {
      cand.push(c);
      return cand.length >= maxC;
    }
    return false;
  });
  return cand;
}
function escolherFronteira(pref) {
  const cand = fronteiras(pref ? 90 : 14);
  if (!cand.length) return -1;
  if (pref) {
    let best = cand[0], bd = 1e9;
    for (let i = 0; i < cand.length; i++) {
      const cx = cand[i] % COLS, cy = (cand[i] / COLS) | 0;
      const d = hyp(cx - pref.x, cy - pref.y) + i * 0.12;
      if (d < bd) { bd = d; best = cand[i]; }
    }
    return best;
  }
  // gente não escolhe sempre a mais perto
  return cand[rnd() < 0.7 ? 0 : (rnd() * Math.min(cand.length, 8)) | 0];
}
function desconhecidoPerto() {
  const K = H.K[world.cur];
  let n = 0, tot = 0;
  for (let dy = -8; dy <= 8; dy++)
    for (let dx = -8; dx <= 8; dx++) {
      const x = (player.x | 0) + dx, y = (player.y | 0) + dy;
      if (x < 1 || y < 1 || x >= COLS - 1 || y >= ROWS - 1) continue;
      tot++;
      if (!K[y * COLS + x]) n++;
    }
  return tot ? n / tot : 0;
}

// ------------------------------------------------------------------
// CORPO: teclas, mira, seguir rota
// ------------------------------------------------------------------
function parar() {
  keys.delete("KeyW"); keys.delete("KeyA"); keys.delete("KeyS"); keys.delete("KeyD");
  keys.delete("ShiftLeft");
}
function mover(dx, dy, correr) {
  parar();
  const ax = Math.abs(dx), ay = Math.abs(dy);
  if (ax > 0.1 && ax > ay * 0.35) keys.add(dx > 0 ? "KeyD" : "KeyA");
  if (ay > 0.1 && ay > ax * 0.35) keys.add(dy > 0 ? "KeyS" : "KeyW");
  if (correr) keys.add("ShiftLeft");
}
function apontar(ang) {
  let da = ang - H.mira;
  while (da > Math.PI) da -= 2 * Math.PI;
  while (da < -Math.PI) da += 2 * Math.PI;
  H.mira += Math.max(-9 * DT, Math.min(9 * DT, da));
}
function olhada(dur) {
  H.olhar = { t: dur, w: (rnd() < 0.5 ? -1 : 1) * 6.283 / dur };
  H.ultOlhada = H.tReal;
  parar();
}
function seguir(correr) {
  const r = H.rota;
  if (!r || !r.length) { parar(); return "chegou"; }
  if (H.ri >= r.length) H.ri = r.length - 1;
  let c = r[H.ri], tx = c % COLS + 0.5, ty = ((c / COLS) | 0) + 0.5;
  while (H.ri < r.length - 1 && hyp(tx - player.x, ty - player.y) < 0.6) {
    H.ri++; c = r[H.ri]; tx = c % COLS + 0.5; ty = ((c / COLS) | 0) + 0.5;
  }
  if (H.ri >= r.length - 1 && hyp(tx - player.x, ty - player.y) < 0.45) {
    parar(); H.rota = null; return "chegou";
  }
  mover(tx - player.x, ty - player.y, correr);
  H.dirMov = Math.atan2(ty - player.y, tx - player.x);
  const andou = hyp(player.x - H.ux, player.y - H.uy);
  H.ux = player.x; H.uy = player.y;
  H.parado = andou < 0.015 ? H.parado + DT : 0;
  if (H.parado > 0.8) {                 // esbarrou em algo que não tinha notado
    H.parado = 0;
    const cx = c % COLS, cy = (c / COLS) | 0;
    if (isSolid(cx, cy)) H.K[world.cur][c] = fl().furnGrid[c] ? 3 : 2;
    else {
      H.alinhar = 0.4;                  // enroscou numa quina: recentra e tenta de novo
      // terceira vez no mesmo ponto: desiste dessa passagem (dá a volta)
      const k = world.cur * 20000 + c, n = (H.enrosco.get(k) || 0) + 1;
      H.enrosco.set(k, n);
      if (n >= 3) H.K[world.cur][c] = 3;
    }
    H.rota = null; parar();
    return "bloqueado";
  }
  return "andando";
}

// navegação NO ANDAR: rota conhecida, ou explora na direção do alvo
function irLocal(x, y, raio, tag) {
  if (hyp(x - player.x, y - player.y) <= raio) { parar(); H.rota = null; return "chegou"; }
  const key = (tag || "") + ((x * 2) | 0) + "," + ((y * 2) | 0) + "@" + world.cur;
  if (!H.rota || H.rotaKey !== key) {
    H.rotaKey = key;
    // (0,75: item no canto entre 4 células fica a 0,71 do centro mais próximo)
    const p = rotaPerto(x, y, Math.max(0.75, raio * 0.8));
    if (p) {
      H.rota = p; H.ri = 0; H.rotaExp = false;
      // gente se perde: às vezes pega um desvio antes do caminho certo
      if (p.length > 40 && rnd() < H.p.perdido) { H.st.perdidas++; H.espera += 2 + rnd() * 4; }
    } else {
      const fr = escolherFronteira({ x, y });
      if (fr < 0) return "impossivel";
      H.rota = caminho(fr); H.ri = 0; H.rotaExp = true;
      if (!H.rota.length) { H.rota = null; olhada(1.3 + rnd()); return "explorando"; }
    }
  }
  const r = seguir(false);
  apontar(H.dirMov + (H.rotaExp ? 0.6 : 0.3) * Math.sin(H.tReal * 1.7));
  if (r !== "andando") {
    H.rota = null;
    if (H.rotaExp && r === "chegou" && rnd() < H.p.olhada) olhada(1.2 + rnd());
  }
  return H.rotaExp ? "explorando" : "indo";
}

// troca de ANDAR: escada (se já viu uma) ou elevador (se tem energia)
function viajar(alvoF) {
  const f = world.cur;
  if (f === alvoF) return "aqui";
  const topo = NFLOORS - 1;
  const soElev = alvoF === topo || f === topo;
  const temElev = world.flags.elevatorOn && H.pt.elevPos;
  if (temElev && (soElev || Math.abs(alvoF - f) >= 2)) {
    const e = H.pt.elev[f] || H.pt.elevPos;
    const r = irLocal(e.x, e.y, 0.7, "elev");
    if (tileAt(player.x | 0, player.y | 0) === T_ELEV) {
      updatePrompt();
      if (prompt && prompt.action) { H.elevAlvo = alvoF; parar(); prompt.action(); }
    }
    return r === "impossivel" ? "impossivel" : "indo";
  }
  if (soElev) return "impossivel";
  const sobe = alvoF > f;
  if ((sobe && f >= NFLOORS - 2) || (!sobe && f <= 0)) return "impossivel";
  const key = f + (sobe ? ":up" : ":down");
  const vistas = world.flags.stairsSeen || [];
  if (!vistas.includes(key) && !H.sabeHall) return "impossivel";
  const r = sobe ? STAIR_UP_RECT : STAIR_DOWN_RECT;
  const bx = r.x + 1, by = sobe ? r.y + r.h + 1.2 : r.y - 1.2;
  if (H.nicho) {                        // entrando no nicho da escada
    H.nicho.t += DT;
    mover(bx - player.x, sobe ? -1 : 1, false);
    apontar(sobe ? -Math.PI / 2 : Math.PI / 2);
    if (H.nicho.t > 3.5) H.nicho = null;
    return "indo";
  }
  const st = irLocal(bx, by, 0.7, "esc");
  if (st === "chegou") H.nicho = { t: 0 };
  return st === "impossivel" ? "impossivel" : "indo";
}
function irAte(x, y, f, raio, tag) {
  if (world.cur !== f) {
    const v = viajar(f);
    if (v === "impossivel") return explorarPasso(null) === "fim" ? "impossivel" : "explorando";
    return "indo";
  }
  return irLocal(x, y, raio, tag);
}

// um passo de exploração do andar atual (devolve "fim" se não há mais o que ver)
function explorarPasso(pref) {
  if (!H.rota || !H.rotaExp) {
    if (H.tReal - H.ultOlhada > 4.5 && desconhecidoPerto() > 0.22 && rnd() < H.p.olhada) {
      olhada(1.5 + rnd()); return "ok";
    }
    let alvo = escolherFronteira(pref || H.prefExp);
    if (alvo < 0) {
      // nada novo para ILUMINAR: agora entra nos cômodos que só olhou da porta
      // (gente anda por dentro da sala; é assim que o chat tem chance de avisar)
      const P = H.P[world.cur];
      alvo = bfs((c) => P[c] === 0);
      if (alvo < 0) { H.feito[world.cur] = true; return "fim"; }
    }
    H.rota = caminho(alvo); H.ri = 0; H.rotaExp = true; H.rotaKey = "exp";
    if (!H.rota.length) { H.rota = null; olhada(1.4); return "ok"; }
  }
  const r = seguir(false);
  apontar(H.dirMov + 0.6 * Math.sin(H.tReal * 1.7));
  if (r !== "andando") {
    H.rota = null;
    if (H.prefExp && hyp(H.prefExp.x - player.x, H.prefExp.y - player.y) < 3.5) H.prefExp = null;
    if (r === "chegou" && rnd() < H.p.olhada) olhada(1.1 + rnd());
  }
  return "ok";
}

// ------------------------------------------------------------------
// CÂMERA
// ------------------------------------------------------------------
function podeFotoReal() { return world.flags.cam.tampa && film > 0; }
function tirarFoto(dir, real) {
  if (flashCd > 0) return false;
  if (real) {
    if (!podeFotoReal()) return false;
    if (!world.flags.filmLoaded) toggleFilm();
  } else if (world.flags.cam.tampa && world.flags.filmLoaded && H.p.ejeta) toggleFilm();
  H.mira = dir; aimSource = "stick"; aimDirStick = dir;
  const antes = film, batAntes = bateria;
  takePhoto();
  if (film < antes) {
    H.st.fotos++; revelaFalsas(dir);
    if (batAntes <= 0) H.st.fotosEscuras = (H.st.fotosEscuras || 0) + 1;
    // a foto pegou um vulto: com a ampola, ele guarda a alma (olhando a foto no álbum)
    const e = album[album.length - 1];
    if (e && almasSoltas(e) > 0 && world.flags.cam.ampola && rnd() < H.p.guarda) {
      armazenarFoto(e); H.st.almasGuardadas = (H.st.almasGuardadas || 0) + 1;
      H.espera += H.p.verFoto; L("guardou alma da foto");
    }
  } else H.st.flashes++;
  return true;
}
// bateria baixa: alma guardada vira carga (B); sem alma, converte o que o álbum tem
function humEnergia() {
  if (state !== "play" || bateria > H.p.bateriaMin) return;
  if (world.flags.almas <= 0 && world.flags.cam.ampola && album.some(e => almasSoltas(e) > 0)) {
    armazenarTodas(); H.espera += H.p.verFoto; L("converteu almas do álbum");
  }
  if (world.flags.almas > 0 && recarregar()) { H.st.recargas = (H.st.recargas || 0) + 1; L("recarregou"); }
}
// a foto mostra o VÃO onde o mapa mostra parede: ele passa a saber
function revelaFalsas(dir) {
  const K = H.K[world.cur];
  let n = 0;
  const half = FOTO.FOV / 2 * 0.92;
  for (let cy = Math.max(1, (player.y - 20) | 0); cy <= Math.min(ROWS - 2, (player.y + 20) | 0); cy++)
    for (let cx = Math.max(1, (player.x - 20) | 0); cx <= Math.min(COLS - 2, (player.x + 20) | 0); cx++) {
      const idx = cy * COLS + cx;
      if (grid[idx] !== T_FAKE || K[idx] === 1) continue;
      // o que se fotografa é a FACE do vão (o lado que dá para o chão aberto),
      // não o miolo da parede: testa o ponto logo à frente de cada face livre
      let visto = false;
      for (let k = 0; k < 4 && !visto; k++) {
        const nx = cx + DX[k], ny = cy + DY[k];
        if (isOpaque(nx, ny)) continue;
        const fx = cx + 0.5 + DX[k] * 0.56, fy = cy + 0.5 + DY[k] * 0.56;
        const dx = fx - player.x, dy = fy - player.y, d = hyp(dx, dy);
        if (d > 19) continue;
        let da = Math.atan2(dy, dx) - dir;
        while (da > Math.PI) da -= 2 * Math.PI;
        while (da < -Math.PI) da += 2 * Math.PI;
        if (Math.abs(da) > half) continue;
        if (d < 0.8 || hasLOS(player.x, player.y, fx, fy)) visto = true;
      }
      if (!visto) continue;
      K[idx] = 1; n++;
      H.prefExp = { x: cx + 0.5, y: cy + 0.5 };
    }
  if (n) { H.feito[world.cur] = false; L("a foto mostrou um VÃO na parede (" + n + " células)"); }
  return n;
}
// direções das paredes conhecidas mais próximas (para "fotografa essa parede")
function dirsParede(maxN) {
  const K = H.K[world.cur], out = [];
  for (let k = 0; k < 8; k++) {
    const a = k * Math.PI / 4;
    for (let d = 1; d <= 14; d += 0.5) {
      const c = ((player.y + Math.sin(a) * d) | 0) * COLS + ((player.x + Math.cos(a) * d) | 0);
      if (K[c] === 2) { out.push({ a, d }); break; }
      if (K[c] === 0) break;
    }
  }
  out.sort((p, q) => p.d - q.d);
  const dirs = out.slice(0, maxN).map(o => o.a);
  while (dirs.length < Math.min(maxN, 4)) dirs.push(dirs.length * Math.PI / 2);
  return dirs;
}

// ------------------------------------------------------------------
// CHAT: as dicas que o jogo mostrou (com a atenção de gente)
// ------------------------------------------------------------------
function catDe(id) {
  if (id === "safe") return "safe";
  if (id === "fbox") return "fbox";
  if (id === "espCeci") return "mirror";
  if (id === "sinalHosp") return "sinal";
  if (id.startsWith("ret_")) return "ret";
  if (id.startsWith("pc")) return "peca";
  if (id.startsWith("w")) return "wall";
  if (id.startsWith("m")) return "mark";
  return "";
}
function ouvirEmpurrao() {
  const e = live.empurrao;
  if (!e || e === H.empVisto) return;
  H.empVisto = e;
  if (e.f < 0 || rnd() > H.p.chat[1]) return;           // nem todo mundo lê
  if (e.f === NFLOORS - 1 && !(world.flags.elevatorOn && H.pt.elevPos)) return;
  H.st.empurroes = (H.st.empurroes || 0) + 1;
  const ult = (H.empZerou || (H.empZerou = {}))[e.f];
  if (ult === undefined || H.tReal - ult > 600) {
    H.empZerou[e.f] = H.tReal;
    H.P[e.f].fill(0); H.feito[e.f] = false; H.voltas[e.f]++;
  }
  L("EMPURRÃO do chat: andar " + e.f);
  if (e.f !== world.cur) { H.tarefa = { tipo: "andar", prio: 40, f: e.f }; H.rota = null; H.tDecide = H.tReal + 6; }
}
function lerChat() {
  ouvirEmpurrao();
  for (const [id, n] of live.nag) {
    const antes = H.nagLvl.get(id) || 0;
    if (n.lvl <= antes) continue;
    H.nagLvl.set(id, n.lvl);
    const lvl = Math.min(2, n.lvl - 1), cat = catDe(id);
    if (!cat) continue;
    H.st.dicasVistas++;
    if (rnd() >= H.p.chat[lvl]) { H.st.dicasIgnoradas++; continue; }
    if (cat === "safe") { H.pt.cofre = { x: fl().safe.x, y: fl().safe.y, f: world.cur }; continue; }
    if (cat === "fbox") { H.pt.quadro = { x: fl().fusebox.x, y: fl().fusebox.y, f: world.cur }; continue; }
    if (cat === "peca") { if (!H.olhar) olhada(2.2); continue; }
    if (cat === "ret") continue;         // o retrato revelado já vira tarefa sozinho
    // da 2ª bronca em diante o chat diz o LADO (direita/esquerda/cima/baixo)
    let lado = null;
    if (lvl >= 1) {
      let alvo = null;
      if (cat === "wall") {
        const sr = fl().secretRooms.find(q => "w" + world.cur + q.id === id);
        alvo = sr && sr.frente;
      } else if (cat === "mark") {
        const mk = fl().marks.find(q => "m" + world.cur + q.ord === id);
        alvo = mk && { x: mk.x, y: mk.y - 1.6 };
      } else if (cat === "sinal" && world.sinal) alvo = { x: world.sinal.x, y: world.sinal.y - 1.6 };
      if (alvo) {
        const dx = alvo.x - player.x, dy = alvo.y - player.y;
        lado = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 0 : Math.PI)
                                           : (dy > 0 ? Math.PI / 2 : -Math.PI / 2);
      }
    }
    const velha = H.dicas.find(d => d.id === id);
    if (velha) { velha.lado = lado; velha.lvl = lvl; velha.x = player.x; velha.y = player.y; continue; }
    H.dicas.push({ id, cat, x: player.x, y: player.y, f: world.cur, t: H.tReal, lvl, lado });
  }
  // história de alma despertando: a pessoa PARA para ler
  for (const id in world.flags.souls) {
    const s = world.flags.souls[id].state;
    if (H.almaEstado[id] !== s) {
      if (s === "awake" && H.almaEstado[id] !== undefined) {
        H.espera += H.p.leitura; H.st.tLendo += H.p.leitura;
        L("lendo a história de " + id);
      }
      H.almaEstado[id] = s;
    }
  }
}

// ------------------------------------------------------------------
// PERIGO: vê, demora a reagir, mira torto, dispara ou foge
// ------------------------------------------------------------------
function prontoPara(id) {
  return world.taken.has("ret_" + id) && world.flags.cam.obturador && podeFotoReal();
}
function perigo() {
  let alvo = null, bd = 1e9, ehAlma = false;
  // o aviso sonoro de "fui visto" deixa a pessoa em alerta e ela vira a lanterna
  if (typeof vistoCd !== "undefined" && vistoCd > 7.7 && H.alerta < H.tReal) {
    H.alerta = H.tReal + 6;
    if (!H.olhar) olhada(1.2);
  }
  let bote = null;                       // eco puxando o ar: ele se acende sozinho
  if (!fl().pacified)
    for (const g of fl().ghosts) {
      if (g.respawn > 0) continue;
      const d = hyp(g.x - player.x, g.y - player.y);
      if (g.bote && naTela(g.x, g.y)) { if (g.bote.fase === "inspira") bote = g; }
      else if (d > 16 || !vejoEnte(g.x, g.y)) continue;
      if (d < bd) { bd = d; alvo = g; ehAlma = false; }
    }
  if (bote) {                            // o aviso manda em tudo
    if (H.boteRef !== bote.bote) {       // um bote NOVO: susto novo
      H.boteRef = bote.bote; H.st.botes++;
      // gente nem sempre percebe a tempo (olhando o chat, a foto, o outro lado)
      H.boteCego = rnd() > H.p.atento ? bote.bote : null;
      H.reacaoT = H.p.reacao * (0.8 + rnd() * 0.5) * (H.alerta > H.tReal ? 0.7 : 1);
      H.st.sustos++;
    }
    if (H.boteCego === bote.bote) return false;          // não viu: segue o que fazia
    H.olhar = null; H.encarando = H.tReal + 4;
    if (H.reacaoT > 0) { H.reacaoT -= DT; if (H.reacaoT > 0) return false; }
    H.reacaoT = 0;
    const angB = Math.atan2(bote.y - player.y, bote.x - player.x);
    if (flashCd <= 0) {
      const erro = gauss() * H.p.erroMira * (rnd() < H.p.panico ? 2.2 : 1);
      const real = !(H.p.ejeta && (film <= 4 ||
        ((world.flags.ecosFotografados || 0) >= 7 && film <= 7)));
      if (!tirarFoto(angB + erro, real && podeFotoReal())) tirarFoto(angB + erro, false);
      if (!bote.bote) H.st.botesCortados++;
      H.rota = null;
    }
    // com ou sem flash: sai da frente (de lado), que é o que salva
    H.fugaT = 0.9 + rnd() * 0.5;
    H.fugaDe = { x: bote.x, y: bote.y };
    fugir(H.fugaDe);
    return true;
  }
  for (const e of soulEnts) {
    if (e.floor !== world.cur || e.id === "tomas") continue;
    const d = hyp(e.x - player.x, e.y - player.y);
    if (d > 15 || !vejoEnte(e.x, e.y)) continue;
    if (d < bd) { bd = d; alvo = e; ehAlma = true; }
  }
  if (!alvo || (bd > 9 && !alvo.chase && !ehAlma)) {
    H.reacaoT = -1;
    // o coração acelera (algo a menos de 9 células) e nada à vista: a pessoa
    // vira a lanterna para procurar — o som diz "perto", não diz "onde"
    if (!alvo && H.tReal > H.proxOlhada && !H.olhar && !fl().pacified) {
      let perto = 99;
      for (const g of fl().ghosts)
        if (g.respawn <= 0) perto = Math.min(perto, hyp(g.x - player.x, g.y - player.y));
      if (perto < 9) { olhada(1.0); H.proxOlhada = H.tReal + 2.6; }
    }
    if (H.fugaT > 0) { H.fugaT -= DT; fugir(H.fugaDe); return true; }
    return false;
  }
  // SUSTO só existe quando a ameaça é NOVA; quem ele já está encarando
  // (viu nos últimos 4 s) não exige "reagir de novo"
  if (H.reacaoT < 0 && H.tReal > H.encarando) {
    H.reacaoT = H.p.reacao * (0.8 + rnd() * 0.5) * (H.alerta > H.tReal ? 0.6 : 1);
    H.st.sustos++;
  }
  H.encarando = H.tReal + 4;
  H.olhar = null;                        // parou de olhar em volta: achou
  if (H.reacaoT > 0) {
    H.reacaoT -= DT;
    if (H.reacaoT > 0) return false;                     // ainda processando o susto
  }
  H.reacaoT = 0;
  const ang = Math.atan2(alvo.y - player.y, alvo.x - player.x);
  if (!ehAlma && H.p.soBote) return false;    // vulto que só ronda não merece flash
  if (flashCd <= 0 && bd < H.p.distFlash) {
    const erro = gauss() * H.p.erroMira * (rnd() < H.p.panico ? 2.2 : 1);
    // alma que dá para PRENDER leva foto de verdade; eco: quem sabe ejetar
    // poupa filme quando ele está curto (o flash vazio só empurra)
    const real = ehAlma ? prontoPara(alvo.id)
      : !(H.p.ejeta && (film <= 4 ||
          ((world.flags.ecosFotografados || 0) >= 7 && film <= 7)));
    if (!tirarFoto(ang + erro, real && podeFotoReal())) tirarFoto(ang + erro, false);
    H.rota = null;
    // depois do clarão ninguém fica parado ao lado do vulto: abre distância
    H.fugaT = (sanity < 55 ? 1.8 : 1.0) + rnd() * 0.6;
    H.fugaDe = { x: alvo.x, y: alvo.y };
    return true;
  }
  if (bd < 3.6) {                        // perto demais e sem flash: abre distância
    H.fugaDe = { x: alvo.x, y: alvo.y };
    fugir(H.fugaDe);
    apontar(ang);
    return true;
  }
  return false;
}
// foge pela direção ABERTA que mais afasta (não corre de cara na parede)
function fugir(de) {
  // gente escolhe um lado e CORRE: mantém a direção por um tempo em vez de
  // ziguezaguear a cada quadro (o vulto colado muda de lado o tempo todo)
  if (H.fugaDir && H.fugaDirT > 0) {
    H.fugaDirT -= DT;
    const travou = H.fugaDirT < 0.45 && hyp(pvx, pvy) < 1.2;
    if (!travou) { mover(H.fugaDir[0], H.fugaDir[1], true); H.rota = null; return; }
    H.fugaRuim = H.fugaK;                // essa direção está bloqueada: outra
  }
  const K = H.K[world.cur];
  const px = player.x | 0, py = player.y | 0;
  const ax = player.x - de.x, ay = player.y - de.y, ad = hyp(ax, ay) || 1;
  let bx = ax / ad, by = ay / ad, bs = -1e9, bk = -1;
  for (let k = 0; k < 8; k++) {
    if (k === H.fugaRuim) continue;
    const cx = Math.round(Math.cos(k * Math.PI / 4)), sy = Math.round(Math.sin(k * Math.PI / 4));
    let livre = 0;
    for (let d = 1; d <= 6; d++) {
      const x = px + cx * d, y = py + sy * d;
      if (x < 1 || y < 1 || x >= COLS - 1 || y >= ROWS - 1) break;
      if (K[y * COLS + x] !== 1) break;
      // na diagonal o corpo precisa das duas células vizinhas livres
      if (cx && sy && (K[y * COLS + x - cx] !== 1 || K[(y - sy) * COLS + x] !== 1)) break;
      livre = d;
    }
    if (!livre) continue;
    const n = hyp(cx, sy);
    const s = (cx * ax + sy * ay) / (ad * n) * 2 + livre * 0.5;
    if (s > bs) { bs = s; bx = cx; by = sy; bk = k; }
  }
  H.fugaDir = [bx, by]; H.fugaDirT = 0.7; H.fugaK = bk; H.fugaRuim = -1;
  mover(bx, by, true);
  H.rota = null;
}

// ------------------------------------------------------------------
// TAREFAS
// ------------------------------------------------------------------
const MOVEL_DICA = {           // o que o chat manda procurar para cada retrato
  tomas: ["berco", "cama"], hospede: ["relogio", "escrivaninha", "espelho"],
  aurora: ["poltrona", "cadeira", "cama"], olivia: ["piano"],
};
function alvosRetrato(id) {
  if (id === "bento")
    return [{ k: "bento", x: ELEV_ROOM.x + 2.5, y: ELEV_ROOM.y + ELEV_ROOM.h - 3, f: 0, fixo: true }];
  if (id === "blackwood")
    return [{ k: "bw", x: ATELIER_CAVALETE.x, y: ATELIER_CAVALETE.y, f: NFLOORS - 1, fixo: true }];
  if (id === "cecilia" && world.espelhoCecilia)   // o espelho que ELE fotografou
    return [{ k: "ceci", x: world.espelhoCecilia.furn.x, y: world.espelhoCecilia.furn.y,
              f: world.espelhoCecilia.floor, fixo: true }];
  const tipos = MOVEL_DICA[id] || [];
  const out = [];
  // enquanto houver andar por ver, só o móvel que a dica NOMEOU; os
  // parecidos (cadeira no lugar de poltrona) só quando a casa acabou
  const tudoVisto = H.feito.slice(1, NFLOORS - 1).every(Boolean);
  for (const t of tipos) {
    for (let f = 1; f < NFLOORS; f++) {
      if (id === "olivia" && f !== world.flags.souls.olivia.floor) continue;
      for (const m of H.moveis[f].values())
        if (m.type === t && !H.fotografados.has(id + "|" + m.k)) out.push(m);
    }
    if (out.length || !tudoVisto) break;
  }
  return out;
}

function decidir() {
  const cam = world.flags.cam, souls = world.flags.souls, f = world.cur;
  if (soulCaptured()) return { tipo: "revelar", prio: 90 };
  // a lamparina do hall: quando a cabeça está no chão, vale o preço
  if ((sanity < H.p.lamp + (world.flags.quase ? 15 : 0) || sanTeto() <= 30) &&
      sanity < 95 && world.flags.lampOleo > 0 && !world.flags.lampApagada)
    return { tipo: "descansar", prio: 78 };

  // coisa de pegar à vista neste andar
  let best = null, bd = 1e9;
  for (const it of H.itens.values()) {
    if (it.f !== f) continue;
    const real = it.ref || world.items.find(i => i.id === it.id);
    if (!real || real.taken) { H.itens.delete(it.id); continue; }
    if (it.kind === "film" && film >= filmMax()) continue;
    if (it.semRota && H.tReal - it.semRota < 40) continue;
    const d = hyp(it.x - player.x, it.y - player.y);
    if (d < bd) { bd = d; best = it; }
  }
  if (best) return { tipo: "pegar", prio: 70, it: best };

  // retrato que a foto revelou, neste andar
  const retAqui = world.retratos.find(r => r.floor === f && !world.taken.has(r.id) &&
                                          world.flags.retSeen.includes(r.id));
  if (retAqui) return { tipo: "pegarRetrato", prio: 68, r: retAqui };

  // dica do chat (a mais recente deste andar)
  for (let i = H.dicas.length - 1; i >= 0; i--) {
    const d = H.dicas[i];
    if (d.f !== f) continue;
    return { tipo: "dica", prio: 60, d };
  }

  // porta final
  if (world.flags.key && chainsBroken() >= CHAINS_NEEDED && H.pt.porta)
    return { tipo: "porta", prio: 85 };
  // cofre e quadro, quando dá para resolver
  if (H.pt.cofre && !world.flags.safeOpen && world.flags.marksSeen.length >= 3)
    return { tipo: "cofre", prio: 66 };
  if (H.pt.quadro && !world.flags.elevatorOn &&
      (world.flags.fuses > 0 || world.flags.fusesIn >= 3))
    return { tipo: "quadro", prio: 64 };

  // caçar uma alma que já dá para prender
  let caca = null;
  for (const id in souls)
    if (souls[id].state === "awake" && prontoPara(id) &&
        (!caca || souls[id].floor === f)) caca = id;
  if (caca) return { tipo: "cacar", prio: 55, id: caca };

  // retrato revelado em outro andar
  const retFora = world.retratos.find(r => !world.taken.has(r.id) &&
                                           world.flags.retSeen.includes(r.id));
  if (retFora) return { tipo: "pegarRetrato", prio: 52, r: retFora };

  // procurar o retrato de uma alma desperta (o chat disse em que móvel)
  if (podeFotoReal())
    for (const id in souls) {
      if (souls[id].state !== "awake" || world.taken.has("ret_" + id)) continue;
      if (world.flags.retSeen.includes("ret_" + id)) continue;
      const al = alvosRetrato(id);
      if (al.length) return { tipo: "fotoMovel", prio: 50, id };
    }

  // voltar às marcas que a lente rachada não leu
  if (cam.lente && podeFotoReal() && H.marcasPend.length)
    return { tipo: "marcaPend", prio: 48, m: H.marcasPend[H.marcasPend.length - 1] };

  // explorar: este andar, depois os outros
  if (!H.feito[f]) return { tipo: "explorar", prio: 10, f };
  let alvoF = -1, bdF = 99;
  for (let g = 0; g < NFLOORS; g++) {
    if (H.feito[g] || g === f) continue;
    if (g === NFLOORS - 1 && !world.flags.elevatorOn) continue;
    const d = Math.abs(g - f) + (g === 0 ? 0.3 : 0);
    if (d < bdF) { bdF = d; alvoF = g; }
  }
  if (alvoF >= 0) return { tipo: "andar", prio: 12, f: alvoF };
  // a casa "toda vista" e ainda falta coisa: gente REFAZ a ronda, andar por
  // andar, entrando de novo em cada cômodo (é quando o chat volta a insistir,
  // agora dizendo o lado da parede)
  if (H.tReal < H.rondaCd) return { tipo: "vagar", prio: 5 };
  H.rondaCd = H.tReal + 25;
  let g = -1, menos = 1e9;
  for (let k = 0; k < NFLOORS; k++) {
    if (k === NFLOORS - 1 && !(world.flags.elevatorOn && H.pt.elevPos)) continue;
    if (H.voltas[k] < menos) { menos = H.voltas[k]; g = k; }
  }
  H.voltas[g]++; H.P[g].fill(0); H.feito[g] = false; H.st.rondas++;
  L("refazendo a ronda do andar " + g + " (volta " + H.voltas[g] + ")");
  return g === f ? { tipo: "explorar", prio: 10, f } : { tipo: "andar", prio: 12, f: g };
}

const EXEC = {
  descansar(T) {
    const lp = world.lamp;
    const st = irAte(lp.x, lp.y, 1, 1.7, "lamp");
    if (st === "impossivel") return "falha";
    if (st === "chegou") {
      updatePrompt();
      if (prompt && prompt.action) {
        prompt.action(); H.st.descansos++;
        L("DESCANSOU na lamparina (óleo restante " + world.flags.lampOleo + ")");
      }
      return "fim";
    }
    return "ok";
  },
  explorar(T) {
    if (world.cur !== T.f) return "fim";
    return explorarPasso(null) === "fim" ? "fim" : "ok";
  },
  andar(T) {
    if (world.cur === T.f) return "fim";
    const v = viajar(T.f);
    if (v === "impossivel") {
      if (explorarPasso(null) === "fim") { H.feito[T.f] = true; return "falha"; }
    }
    return "ok";
  },
  // nada novo para ver: refaz caminhos (é quando o chat volta a insistir)
  vagar(T) {
    if (!H.vagar || H.vagar.f !== world.cur ||
        hyp(H.vagar.x - player.x, H.vagar.y - player.y) < 3 || H.tReal > H.vagar.ate) {
      if (rnd() < 0.25) {                // troca de andar de vez em quando
        const g = (rnd() * (NFLOORS - 1)) | 0;
        if (g !== world.cur) { H.vagar = { f: g, x: 75, y: 48, ate: H.tReal + 90 }; }
      }
      if (!H.vagar || H.vagar.f === world.cur) {
        const K = H.K[world.cur];
        for (let t = 0; t < 60; t++) {
          const x = 3 + rnd() * (COLS - 6), y = 3 + rnd() * (ROWS - 6);
          if (K[(y | 0) * COLS + (x | 0)] === 1) { H.vagar = { f: world.cur, x, y, ate: H.tReal + 60 }; break; }
        }
      }
      if (!H.vagar) return "fim";
    }
    const r = irAte(H.vagar.x, H.vagar.y, H.vagar.f, 2.5, "vag");
    if (r === "impossivel") H.vagar = null;
    return T.t0 === undefined ? (T.t0 = H.tReal, "ok") : (H.tReal - T.t0 > 25 ? "fim" : "ok");
  },
  pegar(T) {
    const it = T.it;
    const real = it.ref || world.items.find(i => i.id === it.id);
    if (!real || real.taken) { H.itens.delete(it.id); return "fim"; }
    const r = irLocal(it.x, it.y, 0.5, "it" + it.id);
    if (r === "impossivel" || r === "explorando") {
      it.semRota = H.tReal;
      // vê o item mas não há caminho: está ATRÁS de uma parede — suspeita dela
      const dx = it.x - player.x, dy = it.y - player.y;
      if (hyp(dx, dy) < 9 && !H.dicas.some(d => d.id === "atras" + it.id))
        H.dicas.push({ id: "atras" + it.id, cat: "wall", x: player.x, y: player.y,
                       f: world.cur, t: H.tReal, lvl: 2,
                       lado: Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 0 : Math.PI)
                                                         : (dy > 0 ? Math.PI / 2 : -Math.PI / 2) });
      return "falha";
    }
    if (r === "chegou") mover(it.x - player.x, it.y - player.y, false);
    return "ok";
  },
  pegarRetrato(T) {
    const r = T.r;
    if (world.taken.has(r.id)) return "fim";
    const st = irAte(r.x, r.y, r.floor, 1.5, "ret");
    if (st === "impossivel") return "falha";
    if (st === "chegou") {
      updatePrompt();
      if (prompt && prompt.action && prompt.text.indexOf("RETRATO") >= 0) {
        prompt.action(); L("pegou o retrato " + r.soul); return "fim";
      }
      mover(r.x - player.x, r.y - player.y, false);
    }
    return "ok";
  },
  revelar(T) {
    if (!soulCaptured()) return "fim";
    if (!H.pt.bancada) {                 // "leva pro quarto escuro no porão"
      if (world.cur !== 0) {
        if (viajar(0) === "impossivel" && explorarPasso(null) === "fim") return "falha";
        return "ok";
      }
      if (explorarPasso(null) === "fim") return "falha";
      return "ok";
    }
    const b = H.pt.bancada;
    const st = irAte(b.x, b.y, b.f, 1.9, "banc");
    if (st === "impossivel") return "falha";
    if (st === "chegou") {
      updatePrompt();
      if (prompt && prompt.action) { parar(); prompt.action(); H.ovT = 0; return "ok"; }
      mover(b.x - player.x, b.y - player.y, false);
    }
    return "ok";
  },
  porta(T) {
    const d = H.pt.porta;
    const st = irAte(d.x, d.y - 1.4, d.f, 0.9, "porta");
    if (st === "impossivel") return "falha";
    if (st === "chegou") {
      updatePrompt();
      if (prompt && prompt.action) { prompt.action(); return "fim"; }
      mover(d.x - player.x, 1, false);
    }
    return "ok";
  },
  cofre(T) {
    if (world.flags.safeOpen) return "fim";
    const s = H.pt.cofre;
    const st = irAte(s.x, s.y, s.f, 1.9, "cofre");
    if (st === "impossivel") return "falha";
    if (st === "chegou") {
      updatePrompt();
      if (prompt && prompt.action) { parar(); prompt.action(); H.ovT = 0; return "ok"; }
      mover(s.x - player.x, s.y - player.y, false);
    }
    return "ok";
  },
  quadro(T) {
    if (world.flags.elevatorOn) return "fim";
    if (world.flags.fuses <= 0 && world.flags.fusesIn < 3) return "fim";
    const q = H.pt.quadro;
    const st = irAte(q.x, q.y, q.f, 2.0, "quadro");
    if (st === "impossivel") return "falha";
    if (st === "chegou") {
      updatePrompt();
      if (prompt && prompt.action) { parar(); prompt.action(); H.ovT = 0; return "ok"; }
      mover(q.x - player.x, q.y - player.y, false);
    }
    return "ok";
  },
  // "fotografa essa parede / esse espelho": chuta as paredes mais próximas
  dica(T) {
    const d = T.d;
    const tira = () => { const i = H.dicas.indexOf(d); if (i >= 0) H.dicas.splice(i, 1); };
    if (world.cur !== d.f) return "fim";
    // já resolvido por outro caminho?
    const resolvida =
      (d.cat === "mirror" && world.flags.souls.cecilia.state !== "dormant") ||
      (d.cat === "sinal" && world.flags.souls.hospede.state !== "dormant") ||
      (d.cat === "mark" && fl().marks.every(m => m.seen)) ||
      (d.cat === "wall" && fl().secretRooms.every(s => world.flags.secretsFound.includes(s.id)));
    if (resolvida) { tira(); return "fim"; }
    if (!podeFotoReal()) { tira(); return "falha"; }     // sem tampa/filme não há o que fazer
    if (d.cat === "mark" && !world.flags.cam.lente && (H.p.sabeLente || T.tentou)) {
      H.marcasPend.push({ x: d.x, y: d.y, f: d.f }); tira();
      L("marca ilegível sem a lente: volta depois");
      return "fim";
    }
    if (!T.chegou) {
      const st = irLocal(d.x, d.y, 2.5, "dica");
      if (st === "impossivel") { tira(); return "falha"; }
      if (st !== "chegou") return "ok";
      T.chegou = true;
      if (d.cat === "mirror") {
        let esp = null, bdd = 12;
        for (const m of H.moveis[d.f].values())
          if (m.type === "espelho") {
            const dd = hyp(m.x - player.x, m.y - player.y);
            if (dd < bdd) { bdd = dd; esp = m; }
          }
        if (!esp && !T.olhou) { T.olhou = true; T.chegou = false; olhada(2.2); return "ok"; }
        T.dirs = esp ? [Math.atan2(esp.y - player.y, esp.x - player.x)] : dirsParede(H.p.fotosDica);
      } else {
        // a cada nova bronca do chat ele tenta ângulos que AINDA não fotografou
        const todas = dirsParede(8);
        const ja = H.dicaDirs.get(d.id) || 0;
        T.dirs = [];
        if (d.lado !== null && d.lado !== undefined) {
          // o chat disse o lado: fotografa PARA lá (e um pouco para cada lado)
          T.dirs.push(d.lado);
          if (H.p.fotosDica > 1) T.dirs.push(d.lado + 0.55);
          if (H.p.fotosDica > 2) T.dirs.push(d.lado - 0.55);
        } else {
          for (let i = 0; i < H.p.fotosDica; i++) T.dirs.push(todas[(ja + i) % todas.length]);
          H.dicaDirs.set(d.id, ja + H.p.fotosDica);
        }
      }
      T.k = 0; T.miraT = 0;
    }
    if (T.k >= T.dirs.length) { tira(); return "fim"; }   // desistiu desta vez
    parar();
    apontar(T.dirs[T.k]);
    T.miraT += DT;
    if (T.miraT < 0.45 || flashCd > 0) return "ok";
    if (!tirarFoto(T.dirs[T.k], true)) { tira(); return "falha"; }
    T.k++; T.miraT = 0; T.tentou = true;
    H.espera = H.p.verFoto;                               // fica vendo a foto revelar
    return "ok";
  },
  marcaPend(T) {
    const m = T.m;
    const st = irAte(m.x, m.y, m.f, 2.5, "mpend");
    if (st === "impossivel") { H.marcasPend.splice(H.marcasPend.indexOf(m), 1); return "falha"; }
    if (st !== "chegou") return "ok";
    H.marcasPend.splice(H.marcasPend.indexOf(m), 1);
    H.dicas.push({ id: "pend" + H.tReal, cat: "mark", x: m.x, y: m.y, f: m.f, t: H.tReal, lvl: 2 });
    return "fim";
  },
  // procura o retrato no móvel que o chat nomeou
  fotoMovel(T) {
    const id = T.id;
    if (world.flags.retSeen.includes("ret_" + id) || world.taken.has("ret_" + id)) return "fim";
    if (!podeFotoReal()) return "falha";
    if (!T.alvo) {
      const al = alvosRetrato(id);
      if (!al.length) return "fim";
      al.sort((a, b) => (Math.abs(a.f - world.cur) * 200 + hyp(a.x - player.x, a.y - player.y)) -
                        (Math.abs(b.f - world.cur) * 200 + hyp(b.x - player.x, b.y - player.y)));
      T.alvo = al[0]; T.miraT = 0;
    }
    const a = T.alvo;
    const st = irAte(a.x, a.y, a.f, 5.5, "fm");
    if (st === "impossivel") { H.fotografados.add(id + "|" + a.k); T.alvo = null; return "falha"; }
    if (st !== "chegou") return "ok";
    if (!hasLOS(player.x, player.y, a.x, a.y)) {          // chega mais perto
      if (irLocal(a.x, a.y, 2.2, "fm2") === "impossivel") {
        H.fotografados.add(id + "|" + a.k); T.alvo = null; return "falha";
      }
      return "ok";
    }
    parar();
    const ang = Math.atan2(a.y - player.y, a.x - player.x);
    apontar(ang);
    T.miraT += DT;
    if (T.miraT < 0.5 || flashCd > 0) return "ok";
    if (!tirarFoto(ang + gauss() * H.p.erroMira * 0.4, true)) return "falha";
    T.n = (T.n || 0) + 1;
    // ponto fixo (poço do elevador, cavalete): tenta de mais de um ângulo
    if (!a.fixo || T.n >= 3) { H.fotografados.add(id + "|" + a.k); T.alvo = null; }
    else { a.x += (rnd() - 0.5) * 3; a.y += (rnd() - 0.5) * 3; }
    T.miraT = 0;
    H.espera = H.p.verFoto;
    return "ok";
  },
  cacar(T) {
    const id = T.id, s = world.flags.souls[id];
    if (s.state !== "awake" || !prontoPara(id)) return "fim";
    if (world.cur !== s.floor) {
      const v = viajar(s.floor);
      if (v === "impossivel" && explorarPasso(null) === "fim") return "falha";
      return "ok";
    }
    const e = soulEnts.find(q => q.id === id && q.floor === world.cur);
    if (e && vejo(e.x, e.y) && hasLOS(player.x, player.y, e.x, e.y)) {
      parar();
      const ang = Math.atan2(e.y - player.y, e.x - player.x);
      apontar(ang);
      T.miraT = (T.miraT || 0) + DT;
      if (T.miraT > H.p.reacao && flashCd <= 0) {
        tirarFoto(ang + gauss() * H.p.erroMira * 0.6, true);
        T.miraT = 0;
      }
      return "ok";
    }
    T.miraT = 0;
    const v = H.alma[id];
    if (v && v.f === world.cur && H.tReal - v.t < 15) { irLocal(v.x, v.y, 3, "alma"); return "ok"; }
    if (id === "olivia") {               // ela volta sempre ao piano
      for (const m of H.moveis[world.cur].values())
        if (m.type === "piano") { irLocal(m.x, m.y, 6, "piano"); return "ok"; }
    }
    // ronda: anda pelo andar varrendo a lanterna
    if (!H.ronda || H.ronda.f !== world.cur || H.tReal > H.ronda.ate ||
        hyp(H.ronda.x - player.x, H.ronda.y - player.y) < 3.5) {
      const K = H.K[world.cur];
      H.ronda = null;
      for (let t = 0; t < 60; t++) {
        const a = rnd() * 6.283, d = 10 + rnd() * 26;
        const x = player.x + Math.cos(a) * d, y = player.y + Math.sin(a) * d;
        if (x > 2 && y > 2 && x < COLS - 2 && y < ROWS - 2 && K[(y | 0) * COLS + (x | 0)] === 1) {
          H.ronda = { f: world.cur, x, y, ate: H.tReal + 30 }; break;
        }
      }
      if (!H.ronda) { explorarPasso(null); return "ok"; }
    }
    if (irLocal(H.ronda.x, H.ronda.y, 3, "ronda") === "impossivel") H.ronda = null;
    apontar(H.dirMov + 1.0 * Math.sin(H.tReal * 1.3));
    return "ok";
  },
};

// LOUCURA (sanidade zero): a casa suga a alma; a luz devolve. O jogador que
// entendeu o aviso ("enquanto houver LUZ") dispara o flash (+10 por clarão) — cada
// perfil entende com uma probabilidade; sem bateria, converte alma e recarrega
function humLoucura() {
  if (typeof loucura === "undefined" || !loucura || state !== "play") return false;
  if (H.loucuraDecidiu === undefined || H.loucuraDecidiu !== loucura) {
    H.loucuraDecidiu = loucura; H.loucuraSabe = Math.random() < (H.p.luz || 0);
    L(H.loucuraSabe ? "loucura: vai para a luz (flash)" : "loucura: não entendeu");
    H.st.loucuras = (H.st.loucuras || 0) + 1;
  }
  if (!H.loucuraSabe) return false;
  if (bateria <= 0) humEnergia();
  if (bateria <= 0) return false;                 // sem carga não há luz: segue como der
  if (flashCd <= 0) {
    if (!world.flags.filmLoaded && world.flags.cam.tampa) toggleFilm();
    takePhoto(); H.st.flashesLoucura = (H.st.flashesLoucura || 0) + 1;
  }
  return true;
}
function agir() {
  if (humLoucura()) { parar(); return; }
  if (!H.tarefa || H.tReal >= H.tDecide) {
    H.tDecide = H.tReal + 0.8;
    humEnergia();
    const nova = decidir();
    const T = H.tarefa;
    if (!T || nova.prio > T.prio + 4 || (nova.tipo !== T.tipo && T.prio <= 12)) {
      if (!T || nova.tipo !== T.tipo || nova.id !== T.id)
        L("→ " + nova.tipo + (nova.id ? " " + nova.id : "") + (nova.it ? " " + nova.it.kind : "") +
          (nova.d ? " " + nova.d.cat : "") + (nova.f !== undefined ? " f" + nova.f : ""));
      H.tarefa = nova; H.rota = null; H.nicho = null;
    }
  }
  const T = H.tarefa;
  const r = EXEC[T.tipo](T);
  if (r === "fim" || r === "falha") { H.tarefa = null; H.rota = null; H.tDecide = 0; }
}

// ------------------------------------------------------------------
// OVERLAYS: quadrinhos, cofre, quadro, elevador, quarto escuro
// ------------------------------------------------------------------
function overlay() {
  H.ovT += DT; H.st.tOverlay += DT;
  const cw = canvas.width;
  if (state === "vinheta") {
    if (H.ovT > H.p.leitura * 0.6) { vinhetaAdvance(); H.ovT = 0; }
    return;
  }
  if (state === "elevator") {
    if (H.ovT > 1.0) {
      const alvo = H.elevAlvo >= 0 ? H.elevAlvo : 1;
      const bp = elevBtnPos(alvo);
      elevatorHit(bp.x, bp.y);
      if (state === "elevator") state = "play";
      H.ovT = 0; H.rota = null; H.elevAlvo = -1;
    }
    return;
  }
  if (state === "safe") {
    if (H.ovT > 3.5) {                   // gira os três dígitos e puxa a alavanca
      const marks = [];
      for (const flo of world.floors) for (const m of flo.marks) if (m.seen) marks.push(m);
      if (marks.length >= 3) {
        for (const m of marks) safeUI.guess[m.ord - 1] = m.digit;
        const sg = typeof safeGeom === "function" ? safeGeom() : null;
        if (sg) safeHit(sg.alav.x, sg.alav.y); else safeHit(600, canvas.height - 120);
      }
      if (state === "safe") { state = "play"; L("cofre: código não abriu"); }
      H.ovT = 0;
    }
    return;
  }
  if (state === "fusebox") {
    if (H.ovT > 2.2) {
      const fg = fbGeom();
      if (fg) { for (const s of fg.soq) fuseboxHit(s.x, s.y); fuseboxHit(fg.alav.x, fg.alav.y); }
      if (state === "fusebox") state = "play";
      H.ovT = 0;
    }
    return;
  }
  if (state === "darkroom") {
    if (darkUI.fase === -1) {
      if (H.ovT > 1.6) {
        if (H.queimar) {                 // desistiu de revelar: queima (dois cliques)
          darkroomHit(cw / 2 + 150, 413); darkroomHit(cw / 2 + 150, 413);
          H.queimar = false; H.banhoErros = 0;
          L("QUEIMOU o retrato (desistiu do banho)");
        } else darkroomHit(cw / 2 - 150, 413);
        H.ovT = 0;
      }
      return;
    }
    if (H.ovT < 0.7) return;             // olha a agulha antes de tentar
    // espera a agulha chegar na zona e aperta — com o erro de tempo de gente
    let tAlvo = time;
    for (let i = 0; i < 4000; i++) {
      tAlvo += 0.004;
      const sp = DARK_VEL[Math.max(0, darkUI.fase)];
      const pp = (tAlvo * sp) % 2, n = pp < 1 ? pp : 2 - pp;
      if (Math.abs(n - darkUI.zc) < 0.012 && tAlvo - time > 0.35) break;
    }
    const clique = tAlvo + gauss() * H.p.banho;
    H.tReal += Math.max(0, clique - time); H.st.tOverlay += Math.max(0, clique - time);
    time = clique;
    const faseAntes = darkUI.fase;
    darkroomHit(cw / 2, 488);
    if (state === "darkroom" && darkUI.fase === faseAntes) {
      H.st.errosBanho++; H.banhoErros++;
      if (H.banhoErros > 30) {           // desistiu: fecha e, na volta, queima
        darkroomHit(ALB_CLOSE.x + 10, ALB_CLOSE.y + 10);
        H.queimar = true;
        L("desistiu de revelar depois de 30 erros");
      }
    }
    H.ovT = 0;
    if (state !== "darkroom" && !H.queimar) H.banhoErros = 0;
    return;
  }
  if (state === "album" || state === "chat") { state = "play"; return; }
}

// ------------------------------------------------------------------
// MARCOS e relatório
// ------------------------------------------------------------------
function marco(n) {
  if (H.st.marcos[n] === undefined) { H.st.marcos[n] = +(H.tReal / 60).toFixed(1); L("MARCO " + n); }
}
function marcos() {
  const c = world.flags.cam;
  if (c.tampa) marco("tampa");
  if (world.flags.secretsFound.length) marco("salaSecreta");
  if (c.lente) marco("lente");
  if (world.flags.marksSeen.length >= 3) marco("3marcas");
  if (world.flags.safeOpen) marco("cofre");
  if (world.flags.elevatorOn) marco("energia");
  if (world.flags.key) marco("chave");
  if (c.obturador) marco("obturador");
  let cap = 0, res = 0;
  for (const id in world.flags.souls) {
    const s = world.flags.souls[id].state;
    if (s === "captured") cap++;
    if (s === "freed" || s === "burned") res++;
  }
  if (cap || res) marco("captura1");
  if (res >= 1) marco("alma1");
  if (res >= 3) marco("alma3");
  if (res >= 6) marco("alma6");
  if (res >= 7) marco("alma7");
}
const ORDEM = ["tampa", "salaSecreta", "lente", "3marcas", "cofre", "energia", "chave",
               "obturador", "captura1", "alma1", "alma3", "alma6", "alma7"];
function resumo() {
  const expl = [];
  for (let f = 0; f < NFLOORS; f++) {
    let ab = 0, vis = 0;
    const g = world.floors[f].grid, K = H.K[f];
    for (let i = 0; i < g.length; i++)
      if (g[i] !== T_WALL && g[i] !== T_FAKE && g[i] !== T_DOOR) { ab++; if (K[i] === 1 || K[i] === 3) vis++; }
    expl.push(Math.round(100 * vis / ab));
  }
  let livres = 0, queimadas = 0, despertas = 0;
  for (const id in world.flags.souls) {
    const s = world.flags.souls[id].state;
    if (s === "freed") livres++;
    if (s === "burned") queimadas++;
    if (s !== "dormant") despertas++;
  }
  return {
    perfil: H.p.nome, fim: H.fim || "EM CURSO", final: world.endType || "",
    min: +(H.tReal / 60).toFixed(1), minJogo: +(world.timeSec / 60).toFixed(1),
    travou: H.fim === "VITÓRIA" ? "" : (ORDEM.find(m => H.st.marcos[m] === undefined) || "porta"),
    marcos: H.st.marcos, despertas, livres, queimadas,
    fotos: H.st.fotos, flashes: H.st.flashes, filme: film, sustos: H.st.sustos,
    dano: Math.round(H.st.dano), sanMin: Math.round(H.st.sanMin),
    errosBanho: H.st.errosBanho, dicasVistas: H.st.dicasVistas, loucuras: H.st.loucuras || 0, flashesLoucura: H.st.flashesLoucura || 0,
    dicasIgnoradas: H.st.dicasIgnoradas, perdidas: H.st.perdidas,
    minSemFilme: +(H.st.tSemFilme / 60).toFixed(1),
    minOverlay: +(H.st.tOverlay / 60).toFixed(1), explorado: expl,
    tarefa: H.tarefa ? H.tarefa.tipo : "",
    causa: H.fim === "MORTE" ? H.st.causa : "", andar: world.cur,
    almas: Object.keys(world.flags.souls).map(id => {
      const s = world.flags.souls[id];
      return id.slice(0, 4) + ":" + s.state.slice(0, 4) +
        (s.state === "awake" ? "@f" + s.floor +
          (world.taken.has("ret_" + id) ? "+ret" :
           world.flags.retSeen.includes("ret_" + id) ? "+visto" : "") : "");
    }).join(" "),
    ecos: world.flags.ecosFotografados || 0, rondas: H.st.rondas,
    quedas: H.st.quedas, descansos: H.st.descansos, botes: H.st.botes,
    destravaPor: H.st.destravaPor || {}, empurroes: H.st.empurroes || 0,
    oleo: world.flags.lampOleo,
    destravou: H.st.destravou || 0,
  };
}

// ------------------------------------------------------------------
// TIQUE
// ------------------------------------------------------------------
function tique() {
  H.tReal += DT; H.tick++; time += DT;
  if (state === "win") { H.fim = "VITÓRIA"; return; }
  if (state === "dead") { H.fim = "MORTE"; return; }
  if (H.tReal > H.limite) { H.fim = "TEMPO"; return; }
  if (state === "ritual") {              // a queda: sofre o efeito sem assistir
    const era = !!ritual && ritual.morte;
    ritualPula();
    if (!era) {
      H.st.quedas++; H.tReal += 6;
      L("QUEDA: acordou no hall (filme " + film + ")");
      H.rota = null; H.tarefa = null; H.andarAntes = -1; H.fugaT = 0; parar();
    }
    return;
  }
  if (state !== "play") { overlay(); return; }
  if (world.cur !== H.andarAntes) {
    H.andarAntes = world.cur; H.rota = null; H.nicho = null; H.ronda = null;
    H.ultOlhada = -99;
  }
  if (H.tick % 3 === 0) perceber();
  if (H.tick % 6 === 0) lerChat();
  if (H.tick % 15 === 0) marcos();
  if (film <= 0 && world.flags.cam.tampa) H.st.tSemFilme += DT;
  // cão de guarda: ninguém fica 70 s rodando no mesmo canto
  { const a = H.ancora;
    if (a.f !== world.cur || hyp(a.x - player.x, a.y - player.y) > 5) {
      a.x = player.x; a.y = player.y; a.f = world.cur; a.t = H.tReal;
    } else if (H.tReal - a.t > 70) {
      a.t = H.tReal; H.st.destravou = (H.st.destravou || 0) + 1;
      { const tp = H.tarefa ? H.tarefa.tipo : "-";
        const dp = H.st.destravaPor || (H.st.destravaPor = {});
        const chave = tp + (H.olhar ? "+olhando" : "") + (H.espera > 0 ? "+espera" : "") +
          (H.fugaT > 0 ? "+fuga" : "") + (H.rota ? (H.rotaExp ? "+rotaExp" : "+rota") : "+semRota") +
          (H.alinhar > 0 ? "+alinha" : "");
        dp[chave] = (dp[chave] || 0) + 1; }
      L("DESTRAVA: 70 s no mesmo canto (" + (H.tarefa ? H.tarefa.tipo : "-") + ") rota=" +
        (H.rota ? H.rota.length + "/" + H.ri : "-") + " exp=" + H.rotaExp + " olhar=" + !!H.olhar +
        " espera=" + H.espera.toFixed(1) + " fuga=" + H.fugaT.toFixed(1) + " reac=" + H.reacaoT.toFixed(2) +
        " pos=" + player.x.toFixed(1) + "," + player.y.toFixed(1));
      const K = H.K[world.cur];
      if (H.rota && H.rota.length) K[H.rota[Math.min(H.ri, H.rota.length - 1)]] = 3;
      H.tarefa = null; H.rota = null; H.vagar = null; H.dicas.length = 0;
      for (let t = 0; t < 80; t++) {
        const x = 3 + rnd() * (COLS - 6), y = 3 + rnd() * (ROWS - 6);
        if (K[(y | 0) * COLS + (x | 0)] === 1 && hyp(x - player.x, y - player.y) > 18) {
          H.vagar = { f: world.cur, x, y, ate: H.tReal + 40 };
          H.tarefa = { tipo: "vagar", prio: 80 }; H.tDecide = H.tReal + 12;
          break;
        }
      }
    } }

  if (!perigo()) {
    if (H.alinhar > 0) {
      H.alinhar -= DT;
      mover((player.x | 0) + 0.5 - player.x, (player.y | 0) + 0.5 - player.y, false);
    } else if (H.espera > 0) { H.espera -= DT; parar(); }
    else if (H.olhar) {
      H.olhar.t -= DT; H.mira += H.olhar.w * DT; parar();
      if (H.olhar.t <= 0) {
        H.olhar = null;
        // sala nova: às vezes bate uma foto só por curiosidade
        if (H.novasCels > 260 && podeFotoReal() && film > 2 && rnd() < H.p.curiosa) {
          tirarFoto(H.mira, true); H.espera = H.p.verFoto;
        }
        H.novasCels = 0;
      }
    } else agir();
  }
  aimSource = "stick"; aimDirStick = H.mira;
  const s0 = sanity;
  update(DT);
  if (sanity < s0 - 0.01) {
    H.st.dano += s0 - sanity;
    // quem está encostado? (para o relatório de causa da morte)
    let quem = "flash do Blackwood", bd = 1.6;
    for (const g of fl().ghosts) {
      const d = hyp(g.x - player.x, g.y - player.y);
      if (g.respawn <= 0 && d < bd) { bd = d; quem = "eco"; }
    }
    for (const e of soulEnts) {
      const d = hyp(e.x - player.x, e.y - player.y);
      if (e.floor === world.cur && d < bd) { bd = d; quem = e.id; }
    }
    if (state === "darkroom") quem = "banho errado";
    H.st.causa = quem;
    if (H.tReal > (H.danoLog || 0)) {    // rastro para entender as mortes
      H.danoLog = H.tReal + 0.5;
      L("DANO san=" + (sanity | 0) + " por " + quem + " d=" + bd.toFixed(1) +
        " flashCd=" + flashCd.toFixed(1) + " reac=" + H.reacaoT.toFixed(2) +
        " fuga=" + H.fugaT.toFixed(1) + " filme=" + film + (world.flags.filmLoaded ? "D" : "F") +
        " teclas=" + [...keys].join("+") + " vel=" + hyp(pvx, pvy).toFixed(1) +
        " tarefa=" + (H.tarefa ? H.tarefa.tipo : "-") + (H.olhar ? " OLHANDO" : "") +
        (H.espera > 0 ? " ESPERA" : ""));
    }
  }
  if (sanity < H.st.sanMin) H.st.sanMin = sanity;
}

// ------------------------------------------------------------------
// API
// ------------------------------------------------------------------
window.humInicia = function (perfil, opts) {
  const saveAntes = localStorage.getItem(SAVE_KEY);
  if (typeof noGhosts !== "undefined") noGhosts = false;
  FOTO.rapido = true;
  SEM_ARQUIVO = true;                    // as mortes do robô não entram no arquivo do canal
  keys.clear();
  newRun();
  novo(perfil, opts);
  H.saveAntes = saveAntes;
  H.andarAntes = -1;
  return "run iniciada: " + H.p.nome;
};
window.humPasso = function (maxMs) {
  if (!H) return "sem run";
  const t0 = performance.now();
  if (H.pausado) { state = H.estadoSalvo; H.pausado = false; }
  while (!H.fim && performance.now() - t0 < (maxMs || 20000))
    for (let i = 0; i < 300 && !H.fim; i++) tique();
  if (!H.fim) { H.estadoSalvo = state; H.pausado = true; state = "title"; }
  else {
    keys.clear(); FOTO.rapido = false;
    try {
      if (H.saveAntes === null) localStorage.removeItem(SAVE_KEY);
      else localStorage.setItem(SAVE_KEY, H.saveAntes);
    } catch (e) {}
    if (state !== "title") state = "title";
  }
  return resumo();
};
window.humLog = function (n, filtro) {
  let l = H ? H.log : [];
  if (filtro) l = l.filter(x => x.indexOf(filtro) >= 0);
  return l.slice(-(n || 40));
};
window.humEstado = function () { return H; };
// lote: várias runs em sequência, avançadas por fatias de tempo
let LOTE = null;
window.humLote = function (perfil, n, opts) {
  LOTE = { perfil, n, opts, res: [], logs: [] };
  window.humInicia(perfil, opts);
  return "lote de " + n + " (" + perfil + ")";
};
window.humLotePasso = function (maxMs) {
  if (!LOTE) return "sem lote";
  const t0 = performance.now(), lim = maxMs || 25000;
  while (LOTE.res.length < LOTE.n && performance.now() - t0 < lim) {
    const r = window.humPasso(lim - (performance.now() - t0));
    if (r.fim !== "EM CURSO") {
      LOTE.res.push(r); LOTE.logs.push(H.log.slice(-25));
      if (LOTE.res.length < LOTE.n) window.humInicia(LOTE.perfil, LOTE.opts);
    }
  }
  return { feitas: LOTE.res.length, de: LOTE.n,
           emCurso: LOTE.res.length < LOTE.n ? resumo() : null, res: LOTE.res };
};
window.humLoteLogs = function () { return LOTE ? LOTE.logs : []; };
})();
"sim-humano ok";

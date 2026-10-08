"use strict";
// ==================================================================
// SANGUE NAS PAREDES — as setas que a casa escreve.
//
// Regra da casa: o mapa não mostra o que há nas paredes; só a FOTO lê. As
// setas seguem a regra: em sã consciência existem só na foto (como os
// dígitos), raras, só em pontos de decisão (porta, esquina, cruzamento) do
// andar onde está o PRÓXIMO PASSO da história. Na LOUCURA o jogador passa a
// ver o que não deveria: as setas a até 14 células brilham no mapa e deixam
// de apontar para a história — apontam para a LUZ mais perto (candelabro,
// lamparina): chegou nela antes de a loucura acabar, volta. Na loucura a casa
// aceita acender uma vela sem alma guardada — cobra uma ferida.
//
// Saídas da loucura e o que custam:
//   luz (flash, vela, lamparina)   → 1 ferida (teto da sanidade −10), como sempre
//   fechar os olhos (10 s parado, no escuro) → 2 feridas e a próxima loucura 10 s mais curta
//   quebrar um espelho (perto dele)         → 2 feridas e a próxima loucura 10 s mais curta
// Repetir os atalhos encurta o tempo são e o tempo para escapar: é o preço.
// ==================================================================
const SETAS = { max: 5, espaco: 8, raioLoucura: 14, recalc: 2.0, luzPerto: 2.2 };
let setas = { andar: -1, chave: null, lista: [], t: 0, modo: "sa", ini: null };

// ------------------------------------------------------------------
// O PRÓXIMO PASSO da história: {id, floor, x, y} ou null
// ------------------------------------------------------------------
function objetivoAtual() {
  if (!world) return null;
  const F = world.flags, item = (id) => world.items.find(i => i.id === id && !i.taken);
  const pos = (id, it) => it ? { id, floor: it.floor, x: it.x, y: it.y } : null;
  if (!F.cam.tampa) return pos("tampa", item("tampa")) || null;
  if (!F.cam.lente) { const l = item("lente"); if (l) return pos("lente", l); }
  // os três dígitos (precisam da lente nova)
  for (const mf of [1, 2, 4]) {
    const mk = world.floors[mf].marks[0];
    if (mk && !mk.seen && F.cam.lente) return { id: "marca" + mk.ord, floor: mf, x: mk.x, y: mk.y };
  }
  if (!F.safeOpen && F.marksSeen.length >= 3 && world.floors[3].safe)
    return { id: "cofre", floor: 3, x: world.floors[3].safe.x, y: world.floors[3].safe.y };
  if (!F.cam.obturador) { const o = item("obturador"); if (o) return pos("obturador", o); }
  if (!F.cam.ampola) { const a = item("ampola"); if (a) return pos("ampola", a); }
  // uma alma capturada vai para a bancada; um retrato revelado é para pegar
  if (typeof soulCaptured === "function" && soulCaptured() && world.floors[0].bench)
    return { id: "bancada", floor: 0, x: world.floors[0].bench.x, y: world.floors[0].bench.y };
  for (const r of world.retratos)
    if (!world.taken.has(r.id) && F.retSeen.includes(r.id) && F.souls[r.soul] && F.souls[r.soul].state === "awake")
      return { id: "ret_" + r.soul, floor: r.floor, x: r.x, y: r.y };
  for (const r of world.retratos)
    if (!world.taken.has(r.id) && F.souls[r.soul] && F.souls[r.soul].state === "awake" && r.soul !== "blackwood")
      return { id: "ret_" + r.soul, floor: r.floor, x: r.x, y: r.y };
  // energia: fusíveis e o quadro
  if (!F.elevatorOn) {
    const f0 = item("fuse0"), f1 = item("fuse1");
    if (f0) return pos("fuse0", f0);
    if (f1) return pos("fuse1", f1);
    if (world.floors[0].fusebox) return { id: "fusebox", floor: 0, x: world.floors[0].fusebox.x, y: world.floors[0].fusebox.y };
  }
  if (!F.key) { const k = item("key"); if (k) return pos("key", k); }
  // despertares que dependem de uma peça da casa
  const S = F.souls;
  if (S.cecilia && S.cecilia.state === "dormant" && world.espelhoCecilia)
    return { id: "espelho", floor: world.espelhoCecilia.floor, x: world.espelhoCecilia.furn.x, y: world.espelhoCecilia.furn.y };
  if (S.hospede && S.hospede.state === "dormant" && world.sinal)
    return { id: "sinal", floor: world.sinal.floor, x: world.sinal.x, y: world.sinal.y };
  if (S.blackwood && S.blackwood.state !== "dormant" && S.blackwood.state !== "captured" && F.elevatorOn)
    return { id: "atelie", floor: NFLOORS - 1, x: ATELIER_CAVALETE.x, y: ATELIER_CAVALETE.y };
  if (F.key && typeof chainsBroken === "function" && chainsBroken() >= CHAINS_NEEDED && world.floors[1].door)
    return { id: "porta", floor: 1, x: world.floors[1].door.x, y: world.floors[1].door.y };
  return null;
}
// o objetivo visto DESTE andar: ele mesmo, ou a escada/elevador que leva até ele
function setasAlvoNoAndar(obj) {
  if (!obj) return null;
  const f = world.cur;
  if (obj.floor === f) return { x: obj.x, y: obj.y, id: obj.id };
  const flo = fl();
  if ((obj.floor === NFLOORS - 1 || f === NFLOORS - 1) && world.flags.elevatorOn && flo.elev)
    return { x: flo.elev.tile.x + 0.5, y: flo.elev.tile.y + 0.5, id: obj.id + "/elev" };
  if (obj.floor > f && f < NFLOORS - 2) return { x: STAIR_UP_RECT.x + 1, y: STAIR_ROOM.y + 0.5, id: obj.id + "/sobe" };
  if (obj.floor < f && f > 0) return { x: STAIR_DOWN_RECT.x + 1, y: STAIR_ROOM.y + STAIR_ROOM.h - 0.5, id: obj.id + "/desce" };
  if (flo.elev && world.flags.elevatorOn) return { x: flo.elev.tile.x + 0.5, y: flo.elev.tile.y + 0.5, id: obj.id + "/elev" };
  return null;
}
// a luz mais perto (loucura): candelabro deste andar (aceso vale mais) ou a lamparina
function setasLuzMaisPerto(dist) {
  let melhor = null, bd = 1e9;
  for (const cd of fl().candelabros || []) {
    const d = dist[(cd.y | 0) * COLS + (cd.x | 0)];
    if (d < 0) continue;
    const aceso = (world.flags.velas[cd.id] || 0) > 0;
    const custo = d - (aceso ? 12 : 0);
    if (custo < bd) { bd = custo; melhor = { x: cd.x, y: cd.y, id: "luz:" + cd.id }; }
  }
  if (lampAcesa()) {
    const d = dist[(world.lamp.y | 0) * COLS + (world.lamp.x | 0)];
    if (d >= 0 && d - 12 < bd) melhor = { x: world.lamp.x, y: world.lamp.y, id: "luz:lamp" };
  }
  return melhor;
}

// ------------------------------------------------------------------
// caminho e pontos de decisão
// ------------------------------------------------------------------
function setasDist(sx, sy) {
  const dist = new Int32Array(COLS * ROWS).fill(-1), prev = new Int32Array(COLS * ROWS).fill(-1);
  const s0 = (sy | 0) * COLS + (sx | 0);
  if (isSolid(sx | 0, sy | 0)) return { dist, prev };
  dist[s0] = 0; const q = [s0]; let qi = 0;
  while (qi < q.length) {
    const cu = q[qi++], cx = cu % COLS, cy = (cu / COLS) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx, ny = cy + dy;
      if (nx < 1 || ny < 1 || nx >= COLS - 1 || ny >= ROWS - 1) continue;
      const ni = ny * COLS + nx;
      if (dist[ni] >= 0 || isSolid(nx, ny)) continue;
      dist[ni] = dist[cu] + 1; prev[ni] = cu; q.push(ni);
    }
  }
  return { dist, prev };
}
function setasCaminho(prev, tx, ty) {
  let cu = (ty | 0) * COLS + (tx | 0);
  if (prev[cu] < 0 && cu !== prev[cu]) { /* alvo pode estar em cima de móvel: pega vizinho */
    let ach = -1;
    for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      const ni = ((ty | 0) + dy) * COLS + (tx | 0) + dx;
      if (prev[ni] >= 0) { ach = ni; break; }
    }
    if (ach < 0) return null; cu = ach;
  }
  const cam = [];
  for (let g = 0; g < COLS * ROWS && cu >= 0; g++) { cam.push(cu); if (prev[cu] === cu) break; cu = prev[cu]; }
  return cam.reverse();                       // do início ao alvo
}
const SETA_DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];
function setasPassavelN(x, y) {
  let n = 0;
  for (const [dx, dy] of SETA_DIRS) if (!isSolid(x + dx, y + dy)) n++;
  return n;
}
// monta a lista para um caminho: nos pontos de decisão, uma parede ao lado
function setasDeCaminho(cam, max) {
  const lista = [];
  if (!cam || cam.length < 4) return lista;
  let ultimo = -SETAS.espaco;
  const g = grid;
  for (let i = 1; i < cam.length - 1 && lista.length < max; i++) {
    const c = cam[i], cx = c % COLS, cy = (c / COLS) | 0;
    const px = cam[i - 1] % COLS, py = (cam[i - 1] / COLS) | 0;
    const nx = cam[i + 1] % COLS, ny = (cam[i + 1] / COLS) | 0;
    const d0 = [cx - px, cy - py], d1 = [nx - cx, ny - cy];
    const vira = d0[0] !== d1[0] || d0[1] !== d1[1];
    const cruza = setasPassavelN(cx, cy) >= 3;
    if (!vira && !cruza) continue;
    if (i - ultimo < SETAS.espaco) continue;
    // a parede ao lado da direção de SAÍDA (esquerda ou direita); tenta até 3 células à frente
    let feita = null;
    for (let k = 0; k < 3 && !feita; k++) {
      const j = i + k; if (j >= cam.length - 1) break;
      const qx = cam[j] % COLS, qy = (cam[j] / COLS) | 0;
      const d = [(cam[j + 1] % COLS) - qx, ((cam[j + 1] / COLS) | 0) - qy];
      for (const lado of [[-d[1], d[0]], [d[1], -d[0]]]) {       // perpendiculares
        const wx = qx + lado[0], wy = qy + lado[1];
        if (g[wy * COLS + wx] !== T_WALL) continue;
        feita = { wx, wy, n: [-lado[0], -lado[1]], d, cx: qx, cy: qy };
        break;
      }
    }
    if (!feita) continue;
    // lado para onde a seta aponta, para quem olha a parede de frente (f = -n; direita = (-f.y, f.x))
    const f = [-feita.n[0], -feita.n[1]], dir = [-f[1], f[0]];
    feita.tela = (feita.d[0] * dir[0] + feita.d[1] * dir[1]) > 0 ? "dir" : "esq";
    feita.x = feita.wx + 0.5 + feita.n[0] * 0.75;        // onde a foto desenha (na frente da parede)
    feita.y = feita.wy + 0.5 + feita.n[1] * 0.75;
    feita.vista = false;
    lista.push(feita);
    ultimo = i;
  }
  return lista;
}
function setasConstroi(modo) {
  setas.lista = []; setas.modo = modo; setas.andar = world.cur;
  if (modo === "loucura") {
    const { dist, prev } = setasDist(player.x, player.y);
    const luz = setasLuzMaisPerto(dist);
    setas.chave = luz ? luz.id : null;
    if (!luz) return;
    setas.lista = setasDeCaminho(setasCaminho(prev, luz.x, luz.y), 6);
    return;
  }
  const obj = objetivoAtual(), alvo = setasAlvoNoAndar(obj);
  setas.chave = alvo ? alvo.id : null;
  if (!alvo) return;
  // o caminho sai de onde o jogador CHEGA no andar: a escada (ou o elevador, no último)
  const c0 = world.cur === NFLOORS - 1 && fl().elev
    ? { x: fl().elev.tile.x + 0.5, y: fl().elev.tile.y + 0.5 } : roomCenter(STAIR_ROOM);
  const { prev } = setasDist(c0.x, c0.y);
  setas.lista = setasDeCaminho(setasCaminho(prev, alvo.x, alvo.y), SETAS.max);
}
function setasUpdate(dt) {
  if (!world || state !== "play") return;
  setas.t -= dt;
  const modo = loucura ? "loucura" : "sa";
  if (modo !== setas.modo || setas.andar !== world.cur) { setasConstroi(modo); setas.t = SETAS.recalc; return; }
  if (setas.t > 0) return;
  setas.t = modo === "loucura" ? SETAS.recalc : 1.0;
  if (modo === "loucura") { setasConstroi("loucura"); return; }
  const alvo = setasAlvoNoAndar(objetivoAtual());
  if ((alvo ? alvo.id : null) !== setas.chave) setasConstroi("sa");
}
// as setas que a FOTO vê (só em sã consciência: na loucura elas já estão no mapa)
function setasFoto() { return setas.andar === world.cur && setas.modo === "sa" ? setas.lista : []; }

// ------------------------------------------------------------------
// o desenho: seta de sangue escorrido (foto) e o brilho da loucura (mapa)
// ------------------------------------------------------------------
const SETA_SPRS = {};
function setaSprite(tela) {
  if (SETA_SPRS[tela]) return SETA_SPRS[tela];
  const W = 160, H = 110, cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const g = cv.getContext("2d"), r = mulberry32(tela === "dir" ? 311 : 733);
  g.save();
  if (tela === "esq") { g.translate(W, 0); g.scale(-1, 1); }
  g.lineCap = "round"; g.lineJoin = "round";
  // o traço: um dedo molhado de sangue, irregular
  g.strokeStyle = "rgba(118,8,10,0.92)"; g.lineWidth = 13;
  g.beginPath(); g.moveTo(22, 52);
  for (let x = 22; x <= 112; x += 15) g.lineTo(x + 7, 52 + (r() - 0.5) * 7);
  g.stroke();
  g.lineWidth = 12;
  g.beginPath(); g.moveTo(118, 54); g.lineTo(86, 24); g.stroke();
  g.beginPath(); g.moveTo(118, 54); g.lineTo(88, 82); g.stroke();
  // escorridos
  g.lineWidth = 4; g.strokeStyle = "rgba(96,6,8,0.85)";
  for (const x of [40, 70, 100, 116]) {
    const len = 14 + r() * 26;
    g.beginPath(); g.moveTo(x, 58); g.lineTo(x + (r() - 0.5) * 4, 58 + len); g.stroke();
    g.beginPath(); g.arc(x + (r() - 0.5) * 4, 58 + len, 3.2, 0, 7); g.fillStyle = "rgba(96,6,8,0.9)"; g.fill();
  }
  // a mão que escreveu: respingos
  g.fillStyle = "rgba(118,8,10,0.6)";
  for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(20 + r() * 120, 20 + r() * 70, 1 + r() * 2.2, 0, 7); g.fill(); }
  g.restore();
  return (SETA_SPRS[tela] = cv);
}
// no mapa, só na loucura: brilho vermelho pulsando na parede, com a seta (coordenadas do mundo, em px)
function drawSetasMapa() {
  if (!loucura || setas.modo !== "loucura" || setas.andar !== world.cur) return;
  const bat = 0.6 + 0.4 * Math.max(0, Math.sin(time * 13.6));
  for (const s of setas.lista) {
    const d = Math.hypot(s.wx + 0.5 - player.x, s.wy + 0.5 - player.y);
    if (d > SETAS.raioLoucura) continue;
    const a = Math.min(1, (SETAS.raioLoucura - d) / 5) * (0.55 + 0.45 * bat);
    const px = (s.wx + 0.5) * CELL, py = (s.wy + 0.5) * CELL;
    ctx.save();
    const gl = ctx.createRadialGradient(px, py, 2, px, py, CELL * 1.6);
    gl.addColorStop(0, `rgba(255,40,30,${(0.55 * a).toFixed(3)})`);
    gl.addColorStop(1, "rgba(255,40,30,0)");
    ctx.fillStyle = gl; ctx.fillRect(px - CELL * 1.6, py - CELL * 1.6, CELL * 3.2, CELL * 3.2);
    ctx.translate(px + s.n[0] * CELL * 0.55, py + s.n[1] * CELL * 0.55);
    ctx.rotate(Math.atan2(s.d[1], s.d[0]));
    ctx.globalAlpha = a;
    ctx.strokeStyle = "rgba(255,150,140,0.98)"; ctx.lineWidth = 3; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(-CELL * 0.65, 0); ctx.lineTo(CELL * 0.65, 0);
    ctx.moveTo(CELL * 0.65, 0); ctx.lineTo(CELL * 0.25, -CELL * 0.4);
    ctx.moveTo(CELL * 0.65, 0); ctx.lineTo(CELL * 0.25, CELL * 0.4); ctx.stroke();
    ctx.restore();
  }
}

// ------------------------------------------------------------------
// as saídas da loucura que a casa cobra mais caro
// ------------------------------------------------------------------
function loucuraAtalho(tipo) {
  if (!loucura) return;
  world.flags.loucuraAtalhos = (world.flags.loucuraAtalhos || 0) + 1;
  // o preço: a ferida de sempre (vem em loucuraTermina) + a PRÓXIMA loucura 10 s mais curta.
  // (duas feridas por atalho levavam o teto 60 ao piso 20 em dois usos — penhasco, não ladeira;
  //  medido em 2026-10-08: lote 8, médio com 5 atalhos e 24 feridas, 7 loucuras em 77 min)
  sanity = LOUCURA.sai;                          // o próximo quadro encerra a loucura
  if (tipo === "olhos") {
    toast("VOCÊ FECHOU OS OLHOS ATÉ PASSAR — mas ficou menos de você", 6);
    livePush(liveRandUser(), "ficou PARADO no escuro de olho fechado?? e… funcionou??");
    // passou: quem estava em cima de você se afasta para o escuro, gasto, sem interesse
    for (const g of fl().ghosts) {
      const d = Math.hypot(g.x - player.x, g.y - player.y) || 0.001;
      if (g.respawn > 0 || d > 9) continue;
      g.bote = null; g.chase = false; g.gasto = BOTE.gasto;
      g.wx = g.x + (g.x - player.x) / d * 8; g.wy = g.y + (g.y - player.y) / d * 8;
    }
  } else if (tipo === "espelho") {
    toast("O ESPELHO QUEBROU — e levou um pedaço de você", 6);
    livePush(liveRandUser(), "QUEBROU O ESPELHO. sete anos de azar numa casa dessas, boa sorte");
  } else if (tipo === "vela") {
    toast("A VELA ACENDEU COM O QUE RESTA DE VOCÊ", 6);
    livePush(liveRandUser(), "acendeu com O QUÊ?? não tinha alma nenhuma na ampola");
  }
  if (world.flags.loucuraAtalhos >= 2) liveFixo("cada atalho encurta o corredor.");
}
// o espelho mais perto (para quebrar)
function espelhoPerto() {
  for (const fu of fl().furn)
    if (fu.type === "espelho" && !fu.quebrado && Math.hypot(fu.x - player.x, fu.y - player.y) < 2.2) return fu;
  return null;
}

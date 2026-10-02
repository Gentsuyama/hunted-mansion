"use strict";
// ==================================================================
// AS 7 CORRENTES — almas nomeadas, despertar por condição, captura
// com retrato + filme, e libertação no quarto escuro.
// A porta da frente tem 7 correntes espectrais (visíveis SÓ na foto);
// cada alma resolvida (libertada OU queimada) quebra uma.
// ==================================================================

const CHAINS_TOTAL = 7;

// Dados estáticos das 7 almas. As ainda não implementadas ficam com
// impl:false — contam no visual das correntes, não no necessário.
const SOUL_DEFS = {
  tomas: {
    impl: true, nome: "TOMÁS", titulo: "o menino do esconde-esconde",
    artSeed: 0.137, escala: 0.62,
    // desperta: entrar na PRIMEIRA sala secreta (qualquer andar)
    hist: [
      "gente… esse aí é o TOMÁS. o menino que sumiu na casa em 1951",
      "ele brincava de esconde-esconde nos vãos das paredes",
      "o Blackwood fotografou o esconderijo dele. o menino nunca mais saiu",
      "dizem que ele ainda acha que é brincadeira. NÃO assusta ele",
    ],
    dicaRetrato: "procura o BERÇO. criança esconde tesouro onde dorme",
  },
  cecilia:  { impl: false, nome: "CECÍLIA",  titulo: "a noiva" },
  bento:    { impl: false, nome: "SEU BENTO", titulo: "o zelador" },
  olivia:   { impl: false, nome: "OLÍVIA",   titulo: "a pianista" },
  hospede:  { impl: false, nome: "O HÓSPEDE", titulo: "sem rosto" },
  aurora:   { impl: false, nome: "MADAME AURORA", titulo: "a mãe" },
  blackwood:{ impl: false, nome: "BLACKWOOD", titulo: "o fotógrafo" },
};
const SOUL_IDS_ACTIVE = Object.keys(SOUL_DEFS).filter(k => SOUL_DEFS[k].impl);
// quantas correntes precisam quebrar p/ abrir a porta (cresce a cada fatia)
const CHAINS_NEEDED = SOUL_IDS_ACTIVE.length;

// entidades vivas no mundo (recriadas do estado salvo; posição não persiste)
let soulEnts = [];

function soulFlags() { return world.flags.souls; }
function chainsBroken() {
  let n = 0;
  for (const id in soulFlags()) {
    const s = soulFlags()[id];
    if (s.state === "freed" || s.state === "burned") n++;
  }
  return n;
}
function soulCaptured() {
  for (const id in soulFlags())
    if (soulFlags()[id].state === "captured") return id;
  return null;
}

// chamada no fim de genWorld/continueRun: defaults + respawn de entes
function soulsInit() {
  if (!world.flags.souls) world.flags.souls = {};
  if (!world.flags.retSeen) world.flags.retSeen = [];
  if (!world.flags.cam)
    world.flags.cam = { tampa: false, lente: false, obturador: false };
  if (world.flags.filmLoaded === undefined) world.flags.filmLoaded = true;
  if (world.flags.filmBonus === undefined) world.flags.filmBonus = 0;
  for (const id of SOUL_IDS_ACTIVE)
    if (!world.flags.souls[id])
      world.flags.souls[id] = { state: "dormant", floor: -1 };
  soulEnts = [];
  for (const id of SOUL_IDS_ACTIVE) {
    const s = world.flags.souls[id];
    if (s.state === "awake") soulSpawnEnt(id, s.floor);
    // alma LIBERTADA apazigua o andar onde vagava (queimada NÃO)
    if (s.state === "freed" && s.floor >= 0)
      world.floors[s.floor].pacified = true;
  }
}

function soulSpawnEnt(id, floorIdx) {
  const flo = world.floors[floorIdx];
  const p = flo.freeSpot ? flo.freeSpot()
    : { x: COLS / 2, y: ROWS / 2 };
  soulEnts.push({ id, floor: floorIdx, x: p.x, y: p.y,
                  wx: p.x, wy: p.y, bob: 0, giggleT: 3 });
}

// --- DESPERTAR -----------------------------------------------------
function soulAwaken(id, floorIdx) {
  const s = soulFlags()[id];
  if (!s || s.state !== "dormant") return;
  s.state = "awake"; s.floor = floorIdx;
  soulSpawnEnt(id, floorIdx);
  sfxSting(); shake = 1;
  const def = SOUL_DEFS[id];
  // a história chega em conta-gotas pelo chat
  let dly = 0;
  for (const linha of def.hist) {
    setTimeout(() => { if (world) livePush(liveRandUser(), linha); },
               (dly += 2600));
  }
  if (def.dicaRetrato)
    setTimeout(() => { if (world) livePush(liveRandUser(),
      "o RETRATO dele deve prender ele aqui… " + def.dicaRetrato); },
      dly + 2600);
  live.viewers += 60;
  saveRun();
}

// condição do Tomás: primeira sala secreta descoberta
function soulsOnSecretFound(floorIdx) {
  if (soulFlags().tomas && soulFlags().tomas.state === "dormant")
    soulAwaken("tomas", floorIdx);
}

// --- UPDATE (só entes do andar atual) ------------------------------
function soulsUpdate(dt) {
  for (const e of soulEnts) {
    if (e.floor !== world.cur) continue;
    e.bob += dt * 2.0;
    const d = Math.hypot(player.x - e.x, player.y - e.y);
    if (e.id === "tomas") {
      // FOGE do jogador; nunca ataca; ri quando escapa
      if (d < 14) {
        const ux = (e.x - player.x) / (d || 1), uy = (e.y - player.y) / (d || 1);
        const nx = e.x + ux * GHOST_SPEED * 1.1 * dt;
        const ny = e.y + uy * GHOST_SPEED * 1.1 * dt;
        // fantasma atravessa paredes, mas não sai do mapa
        e.x = Math.max(2, Math.min(COLS - 2, nx));
        e.y = Math.max(2, Math.min(ROWS - 2, ny));
        e.giggleT -= dt;
        if (e.giggleT <= 0) { e.giggleT = 4 + Math.random() * 5; sfxWhisper(); }
      } else if (Math.hypot(e.wx - e.x, e.wy - e.y) < 2) {
        // vagueia devagar perto do jogador (quer ser achado… de longe);
        // destino nunca é parede, senão ele estaciona invisível
        for (let t = 0; t < 8; t++) {
          const wx = player.x + (Math.random() - 0.5) * 30;
          const wy = player.y + (Math.random() - 0.5) * 30;
          if (!isOpaque(wx | 0, wy | 0)) { e.wx = wx; e.wy = wy; break; }
        }
      } else {
        const dd = Math.hypot(e.wx - e.x, e.wy - e.y) || 1;
        e.x += (e.wx - e.x) / dd * GHOST_SPEED * 0.4 * dt;
        e.y += (e.wy - e.y) / dd * GHOST_SPEED * 0.4 * dt;
      }
    }
  }
}

// --- FLASH sobre uma alma ------------------------------------------
// Retorna true se alguma alma estava no cone (p/ feedback).
function soulsOnFlash(dir, fotoReal) {
  let hit = false;
  for (let i = soulEnts.length - 1; i >= 0; i--) {
    const e = soulEnts[i];
    if (e.floor !== world.cur) continue;
    if (!inFlashCone(e.x, e.y, dir)) continue;
    hit = true;
    const temRetrato = world.taken.has("ret_" + e.id);
    if (fotoReal && temRetrato && world.flags.cam.obturador) {
      // CAPTURA: a alma é sugada para o próprio retrato
      soulFlags()[e.id].state = "captured";
      soulEnts.splice(i, 1);
      sfxDissolve(); shake = 1.2;
      livePush(liveRandUser(), "VOCÊ PRENDEU " + SOUL_DEFS[e.id].nome + " NO RETRATO??");
      livePush(liveRandUser(), "mano… isso é o que o BLACKWOOD fazia");
      livePush(liveRandUser(), "leva pro quarto escuro no porão. LIBERTA ele");
      live.viewers += 80;
      saveRun();
    } else {
      // só ARREMESSA para trás (sem retrato/obturador/filme não prende);
      // recua o empurrão até NÃO terminar dentro de parede (senão a alma
      // fica sem linha de visão e vira incapturável)
      const d = Math.hypot(e.x - player.x, e.y - player.y) || 1;
      const ux = (e.x - player.x) / d, uy = (e.y - player.y) / d;
      let nx = e.x, ny = e.y;
      for (let k = 9; k >= 2; k--) {
        const tx2 = Math.max(2, Math.min(COLS - 2, e.x + ux * k));
        const ty2 = Math.max(2, Math.min(ROWS - 2, e.y + uy * k));
        if (!isOpaque(tx2 | 0, ty2 | 0)) { nx = tx2; ny = ty2; break; }
      }
      e.x = nx; e.y = ny;
      e.wx = e.x; e.wy = e.y;
      if (!live.hinted.has("soulrepel")) {
        live.hinted.add("soulrepel");
        if (!temRetrato)
          livePush(liveRandUser(), "o flash só EMPURROU ele… acho que falta o RETRATO dele");
        else if (!world.flags.cam.obturador)
          livePush(liveRandUser(), "essa câmera não prende nada sem o OBTURADOR. procura a peça");
        else
          livePush(liveRandUser(), "SEM FILME não prende! põe um rolo na câmera (R)");
      }
    }
  }
  return hit;
}

// --- QUARTO ESCURO: desfechos ---------------------------------------
function soulFree(id) {
  const s = soulFlags()[id];
  s.state = "freed";
  if (s.floor >= 0) world.floors[s.floor].pacified = true;
  world.flags.filmBonus += 1;          // a casa "respira": +1 de filme máx
  film = Math.min(filmMax(), film + 1);
  sfxSting(); shake = 0.8;
  const def = SOUL_DEFS[id];
  livePush(liveRandUser(), def.nome + " TÁ LIVRE!! eu tô CHORANDO");
  livePush(liveRandUser(), "uma das correntes da porta QUEBROU, fotografa lá!");
  if (def.dicaRetrato2) livePush(liveRandUser(), def.dicaRetrato2);
  live.viewers += 150;
  liveEvent("freed");
  saveRun();
}
function soulBurn(id) {
  soulFlags()[id].state = "burned";    // corrente quebra, mas sem bênção
  sfxSlam(); shake = 1.4;
  const def = SOUL_DEFS[id];
  livePush(liveRandUser(), "VOCÊ QUEIMOU O RETRATO DE " + def.nome + "???");
  livePush(liveRandUser(), "a corrente quebrou mas isso foi CRUEL demais");
  livePush(liveRandUser(), "os vultos daquele andar ficaram inquietos…");
  live.viewers -= 40;
  saveRun();
}

// filme máximo cresce com almas libertadas
function filmMax() { return FILM_MAX + (world.flags.filmBonus || 0); }

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
  cecilia: {
    impl: true, nome: "CECÍLIA", titulo: "a noiva",
    artSeed: 0.311, escala: 0.95, dano: 0.8,
    // desperta: fotografar O espelho — ela aparece primeiro no REFLEXO
    hist: [
      "CECÍLIA?? a noiva de 1948??",
      "ela veio fazer o retrato de noivado. o noivo esperou na porta a noite inteira",
      "o buquê dela ainda tava na mão quando acharam… só o buquê",
      "ela não gosta de ser OLHADA. mas odeia ser esquecida",
    ],
    dicaRetrato: "atrás do ESPELHO onde você viu ela. onde mais seria?",
  },
  bento: {
    impl: true, nome: "SEU BENTO", titulo: "o zelador",
    artSeed: 0.473, escala: 1.08, dano: 1.0,
    // desperta: ligar a chave geral (3/3 fusíveis)
    hist: [
      "SEU BENTO!! o zelador que mantinha o gerador da casa",
      "ele caiu no poço do elevador em 53. o Blackwood só… fotografou",
      "dizem que ele ainda faz a ronda quando a energia volta",
      "ele anda PESADO. e vai atrás de luz de flash",
    ],
    dicaRetrato: "o retrato dele caiu JUNTO. procura no poço do elevador, no porão",
  },
  olivia: {
    impl: true, nome: "OLÍVIA", titulo: "a pianista",
    artSeed: 0.629, escala: 0.98, dano: 1.0,
    // desperta: fotografar 7 ecos
    hist: [
      "OLÍVIA… a pianista que tocava nas 'sessões' dele",
      "ela tocava mais alto pra abafar o que acontecia no estúdio",
      "parou no meio de um compasso em 1952. o piano não",
      "ENQUANTO ELA TOCA, você tá seguro. é no SILÊNCIO que ela vem",
    ],
    dicaRetrato: "DENTRO do piano, embaixo da tampa. ela guardava tudo ali",
  },
  hospede: {
    impl: true, nome: "O HÓSPEDE", titulo: "sem rosto",
    artSeed: 0.751, escala: 1.02, dano: 1.2,
    // desperta: fotografar o SINAL na parede (olho riscado, só sai na foto)
    hist: [
      "gente… esse é O HÓSPEDE. o que COMPRAVA os retratos",
      "ele exigia nunca aparecer em foto nenhuma. raspava o próprio rosto da emulsão",
      "ninguém nunca soube o nome. só o símbolo que ele deixava nas paredes",
      "NÃO deixa ele te tocar. e… não olha a foto dele por muito tempo",
    ],
    dicaRetrato: "ele escondia o que sobrou dele atrás do RELÓGIO parado",
  },
  aurora: {
    impl: true, nome: "MADAME AURORA", titulo: "a mãe",
    artSeed: 0.883, escala: 1.0, dano: 0.9,
    // desperta: resolver 3 almas (ela vem perguntar POR QUÊ)
    hist: [
      "MADAME AURORA. a mãe do Blackwood. a PRIMEIRA",
      "quando ela morreu em 1946, ele não suportou. 'guardou' ela num retrato",
      "foi assim que tudo começou. ela foi o primeiro experimento",
      "ela aparece nos lugares que a SUA câmera já olhou…",
    ],
    dicaRetrato: "a POLTRONA dela. ninguém mais podia sentar ali",
  },
  blackwood: {
    impl: true, nome: "BLACKWOOD", titulo: "o fotógrafo",
    artSeed: 0.941, escala: 1.15, dano: 1.5,
    // desperta: as outras 6 correntes quebradas — ele espera no ateliê
    hist: [
      "ele acordou. BLACKWOOD ACORDOU",
      "a sétima corrente é a DELE. ele se prendeu no próprio autorretrato",
      "ele tá no ATELIÊ, no último andar. a escada de lá foi emparedada em 54",
      "só o ELEVADOR sobe até lá. e… ele sabe que você vai",
      "CUIDADO: lá em cima é ELE quem fotografa. não deixa ele te ENQUADRAR",
    ],
    dicaRetrato: "o AUTORRETRATO fica no cavalete do ateliê. fotografa o estúdio pra achar",
  },
};

// a lente do passado: cada lugar de alma guarda uma cena antiga
const PASSADO_TXT = {
  tomas:     "1951 — ele ainda conta até cem.",
  cecilia:   "1948 — o buquê nunca murchou.",
  bento:     "1953 — a ronda não terminou.",
  olivia:    "1952 — o compasso 44 segue aberto.",
  hospede:   "19·· — ele pagava em prata.",
  aurora:    "1946 — a primeira fotografia.",
  blackwood: "1954 — o estúdio nunca fechou.",
};
const SOUL_IDS_ACTIVE = Object.keys(SOUL_DEFS).filter(k => SOUL_DEFS[k].impl);
// quantas correntes precisam quebrar p/ abrir a porta (cresce a cada fatia)
const CHAINS_NEEDED = SOUL_IDS_ACTIVE.length;

// entidades vivas no mundo (recriadas do estado salvo; posição não persiste)
let soulEnts = [];
let bossWarnT = 0;   // >0: Blackwood está te ENQUADRANDO (vinheta de aviso)

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
    world.flags.cam = { tampa: false, lente: false, obturador: false, ampola: false };
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

function soulSpawnEnt(id, floorIdx, px, py) {
  const flo = world.floors[floorIdx];
  // valida contra o grid do andar DELA (não o andar atual do jogador)
  const solida = (x, y) => {
    const t = flo.grid[(y | 0) * COLS + (x | 0)];
    return t === T_WALL || t === T_FAKE || t === T_DOOR;
  };
  let p = { x: px, y: py };
  if (px === undefined || solida(px, py))
    p = flo.freeSpot ? flo.freeSpot() : { x: COLS / 2, y: ROWS / 2 };
  soulEnts.push({ id, floor: floorIdx, x: p.x, y: p.y,
                  wx: p.x, wy: p.y, bob: 0, giggleT: 3 });
}
// cada alma nasce no SEU lugar (a noiva sai do espelho, etc.)
function soulSpawnPos(id, floorIdx) {
  if (id === "cecilia" && world.espelhoCecilia &&
      world.espelhoCecilia.floor === floorIdx) {
    const f2 = world.espelhoCecilia.furn;
    return { x: f2.x, y: f2.y + 1.5 };
  }
  if (id === "olivia" && world.pianoOlivia &&
      world.pianoOlivia.floor === floorIdx)
    return { x: world.pianoOlivia.x, y: world.pianoOlivia.y + 1.5 };
  if (id === "bento") return { x: ELEV_ROOM.x + 3, y: ELEV_ROOM.y + 4 };
  if (id === "hospede" && world.sinal && world.sinal.floor === floorIdx)
    return { x: world.sinal.x, y: world.sinal.y + 3 };
  if (id === "blackwood")
    return { x: ATELIER.x + ATELIER.w / 2, y: ATELIER.y + ATELIER.h / 2 };
  return {};
}

// --- DESPERTAR -----------------------------------------------------
function soulAwaken(id, floorIdx) {
  const s = soulFlags()[id];
  if (!s || s.state !== "dormant") return;
  s.state = "awake"; s.floor = floorIdx;
  const sp = soulSpawnPos(id, floorIdx);
  soulSpawnEnt(id, floorIdx, sp.x, sp.y);
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
      tf("o RETRATO dele deve prender ele aqui… {0}", tr(def.dicaRetrato))); },
      dly + 2600);
  live.viewers += 60;
  saveRun();
}

// --- CONDIÇÕES DE DESPERTAR -----------------------------------------
function soulDormant(id) {
  return soulFlags()[id] && soulFlags()[id].state === "dormant";
}
// Tomás: primeira sala secreta descoberta
function soulsOnSecretFound(floorIdx) {
  if (soulDormant("tomas")) soulAwaken("tomas", floorIdx);
}
// Cecília: fotografou O espelho (apareceu no reflexo)
function soulsOnMirror(floorIdx) {
  if (soulDormant("cecilia")) {
    soulAwaken("cecilia", floorIdx);
    livePush(liveRandUser(), "TINHA ALGUÉM NO REFLEXO DO ESPELHO!!!");
    livePush(liveRandUser(), "um vestido de noiva. eu VI. olha a foto de novo");
  }
}
// Cecília (reserva, se a casa nasceu sem espelho): abrir o cofre
function soulsOnSafeOpened() {
  if (!world.espelhoCecilia && soulDormant("cecilia"))
    soulAwaken("cecilia", 3);
}
// Seu Bento: a chave geral ligou
function soulsOnFusebox() {
  if (soulDormant("bento")) soulAwaken("bento", 0);
}
// Olívia: 7 ecos fotografados
function soulsOnEcoCaptured() {
  world.flags.ecosFotografados = (world.flags.ecosFotografados || 0) + 1;
  const n = world.flags.ecosFotografados;
  if (n === 3 && soulDormant("olivia"))
    livePush(liveRandUser(), "terceiro espírito no seu filme… alguém na casa tá CONTANDO");
  if (n === 5 && soulDormant("olivia"))
    livePush(liveRandUser(), "cinco. ela contava os acordes assim também. faltam dois…");
  if (n >= 7 && soulDormant("olivia")) {
    const pf = world.pianoOlivia ? world.pianoOlivia.floor : 2;
    soulAwaken("olivia", pf);
    livePush(liveRandUser(), tf("PERA. tem um PIANO tocando SOZINHO no {0}!!", tr(FLOOR_NAMES[pf])));
    if (world.cur === pf) sfxPiano();
  }
}
// O Hóspede: o sinal na parede saiu na foto
function soulsOnSinal(floorIdx) {
  if (soulDormant("hospede")) {
    soulAwaken("hospede", floorIdx);
    livePush(liveRandUser(), "esse símbolo… EU JÁ VI ESSE SÍMBOLO. sai daí AGORA");
  }
}
// Blackwood: as outras 6 correntes caíram — o ateliê abre
function soulsCheckBlackwood() {
  if (!soulDormant("blackwood")) return;
  let n = 0;
  for (const id in soulFlags()) {
    if (id === "blackwood") continue;
    const s = soulFlags()[id];
    if (s.state === "freed" || s.state === "burned") n++;
  }
  if (n < 6) return;
  soulAwaken("blackwood", NFLOORS - 1);
  shake = 1.6; sfxSlam();
  lampApaga();             // o último ato não tem refúgio
}
// Madame Aurora: 3 almas resolvidas — ela aparece num andar que você já fotografou
function soulsCheckAurora() {
  if (!soulDormant("aurora")) return;
  let n = 0;
  for (const id in soulFlags()) {
    const s = soulFlags()[id];
    if (s.state === "freed" || s.state === "burned") n++;
  }
  if (n < 3) return;
  let pf = 2;
  if (album.length) {
    const cap = album[(Math.random() * album.length) | 0].caption || "";
    const nome = cap.split("· ")[1];
    const idx = FLOOR_NAMES.indexOf(nome);
    if (idx > 0) pf = idx;                 // nunca no porão (ela odeia lá)
  }
  soulAwaken("aurora", pf);
  livePush(liveRandUser(), tf("uma SENHORA apareceu no {0}… exatamente onde você tirou foto antes",
           tr(FLOOR_NAMES[pf])));
}

// --- UPDATE (só entes do andar atual) ------------------------------
function soulMoveTo(e, tx2, ty2, sp, dt) {
  const dd = Math.hypot(tx2 - e.x, ty2 - e.y) || 1;
  e.x = Math.max(2, Math.min(COLS - 2, e.x + (tx2 - e.x) / dd * sp * dt));
  e.y = Math.max(2, Math.min(ROWS - 2, e.y + (ty2 - e.y) / dd * sp * dt));
}
function soulWander(e, raio) {
  if (Math.hypot(e.wx - e.x, e.wy - e.y) >= 2) return;
  // destino nunca é parede, senão a alma estaciona invisível
  for (let t = 0; t < 8; t++) {
    const wx = player.x + (Math.random() - 0.5) * raio * 2;
    const wy = player.y + (Math.random() - 0.5) * raio * 2;
    if (!isOpaque(wx | 0, wy | 0)) { e.wx = wx; e.wy = wy; break; }
  }
}
// o jogador está MIRANDO nela? (Cecília congela sob o olhar da câmera)
function soulAimedAt(e) {
  const dx = e.x - player.x, dy = e.y - player.y;
  let da = Math.atan2(dy, dx) - aimAngle();
  while (da > Math.PI) da -= 2 * Math.PI;
  while (da < -Math.PI) da += 2 * Math.PI;
  return Math.abs(da) < FLASH.halfAngle &&
         hasLOS(player.x, player.y, e.x, e.y);
}

function soulsUpdate(dt) {
  bossWarnT = 0;
  for (const e of soulEnts) {
    if (e.floor !== world.cur) continue;
    e.bob += dt * 2.0;
    const d = Math.hypot(player.x - e.x, player.y - e.y);
    const def = SOUL_DEFS[e.id];
    let toca = false;                    // esta alma machuca por toque?
    // cada alma se anuncia pelo SOM dela, vindo do lado em que está
    if (d < 30) {
      e.motT = (e.motT === undefined ? 3 + Math.random() * 5 : e.motT) - dt;
      if (e.motT <= 0) {
        e.motT = 9 + Math.random() * 8;
        sfxMotivo(e.id, 1 - d / 34, Math.max(-1, Math.min(1, (e.x - player.x) / 12)));
      }
    }

    if (e.id === "tomas") {
      // FOGE do jogador; nunca ataca; ri quando escapa — mas é uma
      // CRIANÇA: depois de ~12s de correria ele CANSA e para ofegante.
      // Ele NÃO atravessa paredes ao fugir (desliza nelas): se escondesse
      // dentro da pedra, ficaria incapturável para sempre
      if (isOpaque(e.x | 0, e.y | 0)) {
        // saiu do mapa jogável por qualquer motivo: reaparece rindo
        for (let t2 = 0; t2 < 12; t2++) {
          const a = Math.random() * 6.28, rr3 = 3 + Math.random() * 4;
          const nx2 = e.x + Math.cos(a) * rr3, ny2 = e.y + Math.sin(a) * rr3;
          if (!isOpaque(nx2 | 0, ny2 | 0)) { e.x = nx2; e.y = ny2; break; }
        }
      }
      if (e.cansadoT > 0) {
        e.cansadoT -= dt;               // parado: a janela de captura
      } else if (d < 14) {
        const ux3 = (e.x - player.x) / (d || 1), uy3 = (e.y - player.y) / (d || 1);
        const sp3 = GHOST_SPEED * 1.1 * dt;
        const nx3 = e.x + ux3 * sp3, ny3 = e.y + uy3 * sp3;
        if (!isOpaque(nx3 | 0, ny3 | 0)) { e.x = nx3; e.y = ny3; }
        else if (!isOpaque(nx3 | 0, e.y | 0)) e.x = nx3;   // desliza na parede
        else if (!isOpaque(e.x | 0, ny3 | 0)) e.y = ny3;
        else e.fugaT = (e.fugaT || 0) + dt * 3;            // encurralado: cansa rápido
        e.x = Math.max(2, Math.min(COLS - 2, e.x));
        e.y = Math.max(2, Math.min(ROWS - 2, e.y));
        e.fugaT = (e.fugaT || 0) + dt;
        if (e.fugaT > 12) {
          e.fugaT = 0; e.cansadoT = 3.5;
          sfxWhisper();
          if (!live.hinted.has("tomasCansa")) {
            live.hinted.add("tomasCansa");
            livePush(liveRandUser(), "ele CANSOU de correr!! AGORA, fotografa AGORA");
          }
        }
        e.giggleT -= dt;
        if (e.giggleT <= 0) { e.giggleT = 4 + Math.random() * 5; sfxWhisper(); }
      } else {
        e.fugaT = Math.max(0, (e.fugaT || 0) - dt * 0.5);
        soulWander(e, 15); soulMoveTo(e, e.wx, e.wy, GHOST_SPEED * 0.4, dt);
      }

    } else if (e.id === "cecilia") {
      // congela quando ENQUADRADA; avança quando você desvia o olhar
      if (!soulAimedAt(e)) {
        soulMoveTo(e, player.x, player.y, GHOST_SPEED * 0.8, dt);
        toca = true;
      }

    } else if (e.id === "bento") {
      // ronda pesada; flash recente o enfurece (vai atrás da luz)
      if (e.rageT > 0) { e.rageT -= dt;
        soulMoveTo(e, player.x, player.y, GHOST_SPEED * 0.95, dt); }
      else if (d < 22) soulMoveTo(e, player.x, player.y, GHOST_SPEED * 0.5, dt);
      else { soulWander(e, 18); soulMoveTo(e, e.wx, e.wy, GHOST_SPEED * 0.45, dt); }
      e.stepT = (e.stepT || 0) - dt;
      if (e.stepT <= 0 && d < 30) { e.stepT = 1.1; sfxStep(); }
      toca = true;

    } else if (e.id === "olivia") {
      // ciclo: música (segura, volta ao piano) / silêncio (caça RÁPIDO)
      e.musT = (e.musT === undefined ? 0 : e.musT) - dt;
      if (e.musT <= 0) {
        e.tocando = !e.tocando;
        e.musT = e.tocando ? 5.5 : 3.5;
        if (e.tocando && world.cur === e.floor) sfxPiano();
      }
      const p = world.pianoOlivia || { x: e.x, y: e.y };
      if (e.tocando) soulMoveTo(e, p.x, p.y, GHOST_SPEED * 0.6, dt);
      else { soulMoveTo(e, player.x, player.y, GHOST_SPEED * 1.15, dt); toca = true; }

    } else if (e.id === "hospede") {
      // deriva lenta e constante na sua direção; nunca para
      soulMoveTo(e, player.x, player.y, GHOST_SPEED * 0.45, dt);
      toca = true;

    } else if (e.id === "blackwood") {
      // o caçador que enquadra: mantém distância de foto (8-13) e DISPARA
      if (d < 7)
        soulMoveTo(e, e.x + (e.x - player.x), e.y + (e.y - player.y),
                   GHOST_SPEED * 0.8, dt);
      else if (d > 13) soulMoveTo(e, player.x, player.y, GHOST_SPEED * 0.7, dt);
      else {
        const a = Math.atan2(e.y - player.y, e.x - player.x) + dt * 0.45;
        soulMoveTo(e, player.x + Math.cos(a) * d, player.y + Math.sin(a) * d,
                   GHOST_SPEED * 0.5, dt);
      }
      e.frameT = (e.frameT === undefined ? 5 : e.frameT) - dt;
      if (e.frameT <= 1.2 && e.frameT > 0 &&
          hasLOS(e.x, e.y, player.x, player.y)) {
        bossWarnT = e.frameT;
        if (!e.avisou) { e.avisou = true; sfxCarga(); }      // o flash DELE carregando
        if (!live.hinted.has("fixoPose")) { live.hinted.add("fixoPose"); liveFixo("não se mexa."); }
      }
      if (e.frameT <= 0) {
        e.frameT = 6 + Math.random() * 4; e.avisou = false;
        if (hasLOS(e.x, e.y, player.x, player.y) && d < 22) {
          // ele te fotografou: o flash DELE rouba sanidade
          sanity -= 15; shake = 1.5; ferida();
          flashT = Math.max(flashT, 0.7);
          sfxCamera(); sfxDamage();
          livePush(liveRandUser(), "ELE TE FOTOGRAFOU!!! quebra a linha de visão!!");
        } else if (!live.hinted.has("dodgeBW")) {
          live.hinted.add("dodgeBW");
          livePush(liveRandUser(), "ISSO!! parede entre vocês na hora do disparo!!");
        }
      }
      toca = true;

    } else if (e.id === "aurora") {
      // some e REAPARECE perto de você (onde a câmera já olhou)
      e.teleT = (e.teleT === undefined ? 12 : e.teleT) - dt;
      if (e.teleT <= 0) {
        e.teleT = 14 + Math.random() * 8;
        for (let t = 0; t < 12; t++) {
          const a = Math.random() * 6.28, rr2 = 8 + Math.random() * 4;
          const nx = player.x + Math.cos(a) * rr2, ny = player.y + Math.sin(a) * rr2;
          if (!isOpaque(nx | 0, ny | 0)) {
            e.x = nx; e.y = ny; sfxWhisper(); shake = Math.max(shake, 0.4);
            break;
          }
        }
      }
      soulMoveTo(e, player.x, player.y, GHOST_SPEED * 0.35, dt);
      toca = true;
    }

    // toque: drena sanidade (multiplicador por alma)
    if (toca && d < 1.15) {
      sanity -= GHOST_DMG * (def.dano || 1) * dt;
      shake = 1;
      if (dmgSfxT <= 0) { sfxDamage(); dmgSfxT = 0.5; }
    }
  }
}

// --- FLASH sobre uma alma ------------------------------------------
// Retorna true se alguma alma estava no cone (p/ feedback).
function soulsOnFlash(dir, fotoReal, comFlash) {
  if (comFlash === undefined) comFlash = true;
  let hit = false;
  // Seu Bento OUVE o flash no andar inteiro e vai atrás da luz
  if (comFlash)
    for (const e of soulEnts)
      if (e.id === "bento" && e.floor === world.cur) e.rageT = 6;
  for (let i = soulEnts.length - 1; i >= 0; i--) {
    const e = soulEnts[i];
    if (e.floor !== world.cur) continue;
    // sem flash, a foto só alcança perto
    if (!inFlashCone(e.x, e.y, dir, comFlash ? 1 : 0.2)) continue;
    hit = true;
    const temRetrato = world.taken.has("ret_" + e.id);
    if (fotoReal && temRetrato && world.flags.cam.obturador &&
        e.id === "blackwood") {
      // o CHEFE precisa de várias fotos — cada alma LIBERTADA empresta luz
      let livres = 0;
      for (const id2 in soulFlags())
        if (id2 !== "blackwood" && soulFlags()[id2].state === "freed") livres++;
      const need = 1 + Math.max(0, 6 - livres);
      e.hits = (e.hits || 0) + 1;
      hit = true;
      if (e.hits < need) {
        // ele recua, se recompõe e recomeça a caçada
        for (let t = 0; t < 14; t++) {
          const a = Math.random() * 6.28, rr2 = 13 + Math.random() * 7;
          const nx = player.x + Math.cos(a) * rr2, ny = player.y + Math.sin(a) * rr2;
          if (!isOpaque(nx | 0, ny | 0)) { e.x = nx; e.y = ny; break; }
        }
        e.frameT = 4;
        sfxDissolve(); shake = 1;
        livePush(liveRandUser(),
          tf("ACERTOU ELE!! {0}/{1} — as almas livres tão SEGURANDO ele!", e.hits, need));
        continue;
      }
      // último acerto cai na captura normal abaixo
    }
    if (fotoReal && temRetrato && world.flags.cam.obturador) {
      // CAPTURA: a alma é sugada para o próprio retrato
      soulFlags()[e.id].state = "captured";
      soulEnts.splice(i, 1);
      showVinheta("captura");          // quadrinho da 1ª alma presa
      sfxDissolve(); shake = 1.2;
      livePush(liveRandUser(), tf("VOCÊ PRENDEU {0} NO RETRATO??", tr(SOUL_DEFS[e.id].nome)));
      livePush(liveRandUser(), "mano… isso é o que o BLACKWOOD fazia");
      livePush(liveRandUser(), "leva pro quarto escuro no porão. LIBERTA ele");
      liveFixo("esse ficou bom.");
      live.viewers += 80;
      saveRun();
    } else {
      if (!comFlash) continue;         // no escuro não há clarão: nada é empurrado
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
  livePush(liveRandUser(), tf("{0} TÁ LIVRE!! eu tô CHORANDO", tr(def.nome)));
  livePush(liveRandUser(), "uma das correntes da porta QUEBROU, fotografa lá!");
  if (def.dicaRetrato2) livePush(liveRandUser(), def.dicaRetrato2);
  liveAlmaFim(id, true);
  liveFixo("esse era meu.");
  live.viewers += 150;
  liveEvent("freed");
  soulsCheckAurora();
  soulsCheckBlackwood();
  saveRun();
}
function soulBurn(id) {
  soulFlags()[id].state = "burned";    // corrente quebra, mas sem bênção
  sfxSlam(); shake = 1.4;
  const def = SOUL_DEFS[id];
  livePush(liveRandUser(), tf("VOCÊ QUEIMOU O RETRATO DE {0}???", tr(def.nome)));
  livePush(liveRandUser(), "a corrente quebrou mas isso foi CRUEL demais");
  livePush(liveRandUser(), "os vultos daquele andar ficaram inquietos…");
  liveAlmaFim(id, false);
  liveFixo("negativo queimado eu não esqueço.");
  live.viewers -= 40;
  soulsCheckAurora();
  soulsCheckBlackwood();
  saveRun();
}

// filme máximo cresce com almas libertadas
function filmMax() { return FILM_MAX + (world.flags.filmBonus || 0); }

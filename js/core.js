"use strict";
// ==================================================================
// HUNTED MANSION — núcleo: constantes, estado global, RNG, save
// ==================================================================
const CELL = 10;
const COLS = 150, ROWS = 96;                 // tamanho de UM andar (células)
const NFLOORS = 6;                           // 0=porão, 1=térreo, 2..5=andares
const FLOOR_NAMES = ["PORÃO", "TÉRREO", "1º ANDAR", "2º ANDAR", "3º ANDAR", "4º ANDAR"];
const RAMP = " .:-=+*#%@";

// tiles
const T_FLOOR = 0, T_WALL = 1, T_STAIR_UP = 2, T_STAIR_DOWN = 3, T_ELEV = 4,
      T_FAKE = 5, T_DOOR = 6;
// T_FAKE: parece parede e bloqueia LUZ, mas é atravessável — a FOTO denuncia

const LANTERNA = { halfAngle: 0.42, range: 34, rays: 180, power: 1.0,
  // luz PERIFÉRICA: abre bem para os lados, mas alcança pouco — dá para
  // perceber o que chega pelo flanco sem iluminar a sala inteira
  lado: { halfAngle: 1.25, range: 12, rays: 130, power: 0.6 } };
const FLASH    = { halfAngle: 0.85, range: 58, rays: 320, power: 2.6,
                   duration: 1.0, cooldown: 1.6 };

const PLAYER_SPEED  = 10;
const PLAYER_RADIUS = 0.42;
// a câmera é achada SEM TAMPA, mas o bolso já tem UM rolo
const FILM_START = 1, FILM_MAX = 12, FILM_REFILL = 3;
const FILME_RESPAWN = 60;                    // segundos até a casa repor um rolo pego
// BATERIA do flash: cada disparo gasta uma carga; sem carga a foto sai NO ESCURO.
// Alma guardada na câmera recarrega (porAlma); a câmera guarda até almasMax
const BAT = { max: 10, inicio: 10, porAlma: 5, almasMax: 12, pilha: 4, lamparina: 4 };
// CANDELABROS: até 5 almas viram fogo azul; 1 vela acende só o castiçal,
// 5 alcançam metade do facho da lanterna
const VELAS = { max: 5, raio0: 2.5, passo: 3.6, porAndar: 6 };
const ALBUM_MAX  = 24;
const GHOST_SPEED = 2.4, GHOST_DMG = 40;
// pressão dos ecos (ajustável para testes de balanceamento):
//   atraiFlash = segundos que TODO o andar persegue depois de qualquer flash
//   deriva     = fração da velocidade com que o eco se arrasta até você enquanto
//                você faz BARULHO (parado ou pé ante pé, ele não deriva)
//   volta      = segundos [mín, extra] até um eco fotografado reaparecer
//   atraiRaio  = até onde o clarão é visto (antes era o andar inteiro)
//   ouve       = raio em que ele percebe você: parado/pé ante pé, andando, correndo
const ECO = { vem: 0.45,   // sem ouvir nem ver você, o eco ainda vem: fração da velocidade de caça
              ve: 16,      // VENDO você (linha de visada) até esta distância, ele vem direto
              atraiFlash: 4, atraiRaio: 34, volta: [50, 30],
              ouve: [6, 14, 22] };
// O GOLPE: o eco não fere por encostar. Ele chega colado, INSPIRA (os olhos
// acendem, o som cresce) e golpeia no lugar — sem salto. Flash durante a
// inspiração cancela; dar dois passos para trás também. Um de cada vez.
const BOTE = { dist: 1.9, inspira: 0.9, alcance: 2.4, dano: 24, gasto: 14, pausa: 0.5, desiste: 4 }
// SANIDADE: sozinha ela só volta até o TETO; acima disso, só a lamparina do hall
// …e cada GOLPE (bote de eco, flash do Blackwood) deixa uma ferida que baixa esse teto
const SAN_TETO = 60, SAN_VOLTA = 2.5, SAN_FERIDA = 10, SAN_PISO = 20;
const LAMP_OLEO = 3, LAMP_RAIO = 7.5;
// robôs de teste ligam isto: nada de gravar mortes no arquivo do canal
let SEM_ARQUIVO = false;

// ------------------------------------------------------------------
// RNG determinístico
// ------------------------------------------------------------------
function mulberry32(a) {
  return function() {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function hash(x, y, t) {
  let n = x * 374761393 + y * 668265263 + t * 2246822519;
  n = (n ^ (n >> 13)) * 1274126177;
  return ((n ^ (n >> 16)) >>> 0) / 4294967295;
}

// ------------------------------------------------------------------
// Estado global
// ------------------------------------------------------------------
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const IS_TOUCH = ("ontouchstart" in window) || navigator.maxTouchPoints > 0;

let state = "boot";          // lang | cine | title | play | album | chat | safe | elevator |
                             // fusebox | darkroom | vinheta | ritual | dead | win
let world = null;            // { seed, cur, floors[] }
let grid  = null;            // alias: grade do andar ATUAL (código portado usa)

const player = { x: 75, y: 80 };
const mouse  = { x: 600, y: 340 };
const cam    = { x: 750, y: 480 };
let camZoom  = IS_TOUCH ? 2.0 : 1.7;
const keys   = new Set();

let film = FILM_START, sanity = 100, bateria = BAT.inicio;
let flashT = 0, flashDir = 0, flashCd = 0;
let attractT = 0, shake = 0, flickDip = 0, eventT = 14, hbT = 0, dmgSfxT = 0;
let particles = [];

let album = [], albumIdx = 0, photoCount = 0;
let albumReturn = "play";

let time = 0;
let frameDt = 1 / 60;        // duração do último quadro (telas que contam tempo no desenho)

const light = new Float32Array(COLS * ROWS);

// ------------------------------------------------------------------
// Acesso ao andar atual
// ------------------------------------------------------------------
function fl() { return world.floors[world.cur]; }

function setFloor(f) {
  world.cur = f;
  grid = fl().grid;
}

function isWall(cx, cy) {
  if (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS) return true;
  return grid[cy * COLS + cx] === T_WALL;
}
// sólido para COLISÃO (parede, porta ou móvel) — T_FAKE é atravessável!
function isSolid(cx, cy) {
  if (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS) return true;
  const t = grid[cy * COLS + cx];
  if (t === T_WALL || t === T_DOOR) return true;
  return fl().furnGrid[cy * COLS + cx] !== 0;
}
// opaco para LUZ e linha de visão (inclui parede FALSA — ela esconde no jogo)
function isOpaque(cx, cy) {
  if (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS) return true;
  const t = grid[cy * COLS + cx];
  return t === T_WALL || t === T_FAKE || t === T_DOOR;
}
function tileAt(cx, cy) {
  if (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS) return T_WALL;
  return grid[cy * COLS + cx];
}

// ------------------------------------------------------------------
// Linha de visão (célula a célula, só paredes)
// ------------------------------------------------------------------
function hasLOS(x0, y0, x1, y1) {
  const d = Math.hypot(x1 - x0, y1 - y0);
  const steps = Math.ceil(d * 2);
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (isOpaque((x0 + (x1 - x0) * t) | 0, (y0 + (y1 - y0) * t) | 0)) return false;
  }
  return true;
}

// ------------------------------------------------------------------
// Save da run (seed + diffs; os andares regeneram da seed)
// ------------------------------------------------------------------
const SAVE_KEY = "hm_run";
// muda quando a GERAÇÃO da casa muda: a mesma seed passa a dar outra mobília,
// então um save antigo recolocaria o jogador dentro de um móvel
const SAVE_V = 6;

function saveRun() {
  if (!world) return;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      v: SAVE_V, seed: world.seed, cur: world.cur,
      px: player.x, py: player.y,
      film, sanity, bateria, photoCount,
      taken: [...world.taken],
      flags: world.flags,
      timeSec: world.timeSec,
    }));
  } catch (e) {}
}
function loadRunData() {
  try {
    const s = localStorage.getItem(SAVE_KEY);
    const d = s ? JSON.parse(s) : null;
    return d && d.v === SAVE_V ? d : null;
  } catch (e) { return null; }
}
function clearRun() {
  try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
}

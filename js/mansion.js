"use strict";
// ==================================================================
// MANSÃO — geração procedural: 6 andares persistentes por seed
// ==================================================================

// posições FIXAS verticais (iguais em todos os andares)
const STAIR_ROOM = { x: 68, y: 40, w: 14, h: 12 };   // hall da escadaria
const ELEV_ROOM  = { x: 86, y: 42, w: 6,  h: 8 };    // poço do elevador
const ENTRY_HALL = { x: 60, y: 74, w: 28, h: 16 };   // hall de entrada (térreo)

const STAIR_UP_CELL   = { x: STAIR_ROOM.x + 3,  y: STAIR_ROOM.y + 5 };
const STAIR_DOWN_CELL = { x: STAIR_ROOM.x + 10, y: STAIR_ROOM.y + 5 };

function roomCenter(r) { return { x: r.x + r.w / 2, y: r.y + r.h / 2 }; }
function overlaps(a, b, m) {
  return a.x - m < b.x + b.w && a.x + a.w + m > b.x &&
         a.y - m < b.y + b.h && a.y + a.h + m > b.y;
}

function genWorld(seed) {
  world = { seed, cur: 1, floors: [], taken: new Set() };
  for (let f = 0; f < NFLOORS; f++) world.floors.push(genFloor(seed, f));
  setFloor(1);
  // jogador nasce no hall de entrada, de costas para a porta que trancou
  const c = roomCenter(ENTRY_HALL);
  player.x = c.x; player.y = ENTRY_HALL.y + ENTRY_HALL.h - 3;
  cam.x = player.x * CELL; cam.y = player.y * CELL;
}

function genFloor(seed, f) {
  const rng = mulberry32((seed ^ 0x9e3779b9) + f * 7919);
  const g = new Uint8Array(COLS * ROWS).fill(T_WALL);
  const furnGrid = new Uint8Array(COLS * ROWS);
  const floor = { grid: g, furnGrid, rooms: [], furn: [], films: [], ghosts: [], idx: f };

  function carve(x, y, w, h) {
    for (let j = y; j < y + h; j++)
      for (let i = x; i < x + w; i++)
        if (i > 0 && j > 0 && i < COLS - 1 && j < ROWS - 1) g[j * COLS + i] = T_FLOOR;
  }
  function corridorH(x1, x2, y) { carve(Math.min(x1, x2) - 1, y - 1, Math.abs(x2 - x1) + 3, 3); }
  function corridorV(y1, y2, x) { carve(x - 1, Math.min(y1, y2) - 1, 3, Math.abs(y2 - y1) + 3); }
  function connect(a, b) {
    const ca = roomCenter(a), cb = roomCenter(b);
    const ax = ca.x | 0, ay = ca.y | 0, bx = cb.x | 0, by = cb.y | 0;
    if (rng() < 0.5) { corridorH(ax, bx, ay); corridorV(ay, by, bx); }
    else             { corridorV(ay, by, ax); corridorH(ax, bx, by); }
  }

  // --- salas fixas (verticais) ---
  const rooms = floor.rooms;
  carve(STAIR_ROOM.x, STAIR_ROOM.y, STAIR_ROOM.w, STAIR_ROOM.h);
  rooms.push({ ...STAIR_ROOM, fixed: "stair" });
  carve(ELEV_ROOM.x, ELEV_ROOM.y, ELEV_ROOM.w, ELEV_ROOM.h);
  rooms.push({ ...ELEV_ROOM, fixed: "elev" });
  if (f === 1) { carve(ENTRY_HALL.x, ENTRY_HALL.y, ENTRY_HALL.w, ENTRY_HALL.h);
                 rooms.push({ ...ENTRY_HALL, fixed: "entry" }); }

  // --- salas procedurais GRANDES ---
  const target = 11 + (rng() * 4 | 0);
  for (let tries = 0; tries < 300 && rooms.length < target; tries++) {
    const w = 14 + (rng() * 20 | 0), h = 10 + (rng() * 12 | 0);
    const x = 2 + (rng() * (COLS - w - 4) | 0);
    const y = 2 + (rng() * (ROWS - h - 4) | 0);
    const r = { x, y, w, h };
    if (rooms.some(o => overlaps(r, o, 3))) continue;
    carve(x, y, w, h);
    rooms.push(r);
  }

  // --- corredores: cadeia + atalhos ---
  for (let i = 1; i < rooms.length; i++) connect(rooms[i - 1], rooms[i]);
  for (let i = 0; i < 3; i++)
    connect(rooms[rng() * rooms.length | 0], rooms[rng() * rooms.length | 0]);

  // --- escadas e elevador (tiles) ---
  if (f < NFLOORS - 1) g[STAIR_UP_CELL.y * COLS + STAIR_UP_CELL.x] = T_STAIR_UP;
  if (f > 0)           g[STAIR_DOWN_CELL.y * COLS + STAIR_DOWN_CELL.x] = T_STAIR_DOWN;
  const ec = roomCenter(ELEV_ROOM);
  g[(ec.y | 0) * COLS + (ec.x | 0)] = T_ELEV;

  // --- móveis (não nas salas fixas) ---
  const typeNames = Object.keys(FURN_TYPES);
  for (const r of rooms) {
    if (r.fixed) continue;
    const n = Math.min(5, 1 + (r.w * r.h / 70 | 0) + (rng() * 2 | 0));
    for (let k = 0; k < n; k++) {
      const tn = typeNames[rng() * typeNames.length | 0];
      const ft = FURN_TYPES[tn];
      const fx = r.x + 2 + (rng() * (r.w - ft.w - 4) | 0);
      const fy = r.y + 2 + (rng() * (r.h - ft.h - 4) | 0);
      // não sobrepor outro móvel nem tile especial
      let ok = true;
      for (let j = fy; j < fy + ft.h && ok; j++)
        for (let i = fx; i < fx + ft.w && ok; i++)
          if (furnGrid[j * COLS + i] !== 0 || g[j * COLS + i] !== T_FLOOR) ok = false;
      if (!ok) continue;
      const cells = [];
      for (let j = fy; j < fy + ft.h; j++)
        for (let i = fx; i < fx + ft.w; i++) {
          furnGrid[j * COLS + i] = ft.id;
          cells.push([i, j]);
        }
      floor.furn.push({ type: tn, x: fx + ft.w / 2, y: fy + ft.h / 2, cells });
    }
  }

  // --- refis de filme ---
  const nFilm = f === 1 ? 3 : 2;
  for (let i = 0; i < nFilm; i++) {
    const r = rooms[2 + (rng() * (rooms.length - 2) | 0)];
    floor.films.push({
      id: `${f}:${i}`,
      x: r.x + 2 + rng() * (r.w - 4),
      y: r.y + 2 + rng() * (r.h - 4),
      taken: false,
    });
  }

  // --- fantasmas (porão é o pior lugar) ---
  const nGhost = f === 0 ? 5 : f === 1 ? 2 : 3;
  for (let i = 0; i < nGhost; i++) {
    const r = rooms[2 + (rng() * (rooms.length - 2) | 0)];
    const p = { x: r.x + 2 + rng() * (r.w - 4), y: r.y + 2 + rng() * (r.h - 4) };
    floor.ghosts.push({
      x: p.x, y: p.y, wx: p.x, wy: p.y, chase: false,
      respawn: 0, bob: rng() * 6.28, artSeed: rng(), sprCv: null,
    });
  }

  return floor;
}

// aplica os diffs salvos (itens já pegos)
function applyTaken() {
  for (const id of world.taken) {
    const [f, i] = id.split(":").map(Number);
    const film2 = world.floors[f].films[i];
    if (film2) film2.taken = true;
  }
}

// nova run ou continuação
function newRun() {
  const seed = (Date.now() % 1e9) | 0;
  genWorld(seed);
  film = FILM_START; sanity = 100;
  album = []; albumIdx = 0; photoCount = 0;
  albumReturn = "play";
  flashT = 0; flashCd = 0; attractT = 0; particles = [];
  saveRun();
  state = "play";
}

function continueRun() {
  const s = loadRunData();
  if (!s) { newRun(); return; }
  genWorld(s.seed);
  world.taken = new Set(s.taken || []);
  applyTaken();
  setFloor(s.cur);
  player.x = s.px; player.y = s.py;
  cam.x = player.x * CELL; cam.y = player.y * CELL;
  film = s.film; sanity = s.sanity; photoCount = s.photoCount || 0;
  album = []; albumIdx = 0;
  flashT = 0; flashCd = 0; attractT = 0; particles = [];
  state = "play";
}

// troca de andar pela escada
function useStairs(dirUp) {
  const nf = world.cur + (dirUp ? 1 : -1);
  if (nf < 0 || nf >= NFLOORS) return;
  setFloor(nf);
  // aparece ao lado da escada correspondente no andar novo
  const cell2 = dirUp ? STAIR_DOWN_CELL : STAIR_UP_CELL;
  player.x = cell2.x + 0.5; player.y = cell2.y + 1.6;
  cam.x = player.x * CELL; cam.y = player.y * CELL;
  sfxStairs();
  saveRun();
}

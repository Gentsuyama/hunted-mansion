"use strict";
// ==================================================================
// MANSÃO — geração procedural: 6 andares persistentes por seed
// ==================================================================

// posições FIXAS verticais (iguais em todos os andares)
const STAIR_ROOM = { x: 68, y: 40, w: 14, h: 12 };   // hall da escadaria
const ELEV_ROOM  = { x: 86, y: 42, w: 6,  h: 8 };    // poço do elevador
const ENTRY_HALL = { x: 60, y: 74, w: 28, h: 16 };   // hall de entrada (térreo)

// escadas como NICHOS ABERTOS NA PAREDE do hall: o vão fica na borda da sala
// e os degraus atravessam a parede para fora — nada obstrui a passagem.
// SOBE: buraco na parede NORTE · DESCE: buraco na parede SUL
const STAIR_UP_RECT   = { x: STAIR_ROOM.x + 2, y: STAIR_ROOM.y - 3, w: 2, h: 3 };
const STAIR_DOWN_RECT = { x: STAIR_ROOM.x + STAIR_ROOM.w - 4,
                          y: STAIR_ROOM.y + STAIR_ROOM.h, w: 2, h: 3 };

function roomCenter(r) { return { x: r.x + r.w / 2, y: r.y + r.h / 2 }; }
function overlaps(a, b, m) {
  return a.x - m < b.x + b.w && a.x + a.w + m > b.x &&
         a.y - m < b.y + b.h && a.y + a.h + m > b.y;
}

function genWorld(seed) {
  world = {
    seed, cur: 1, floors: [], taken: new Set(), timeSec: 0,
    flags: { elevatorOn: false, safeOpen: false, fuses: 0, fusesIn: 0,
             key: false, secretsFound: [], marksSeen: [] },
  };
  const rng = mulberry32(seed ^ 0x51f3a9);
  // código do cofre da run
  world.code = [1 + (rng() * 9 | 0), 1 + (rng() * 9 | 0), 1 + (rng() * 9 | 0)];

  for (let f = 0; f < NFLOORS; f++) world.floors.push(genFloor(seed, f));

  // --- conteúdo especial da run ---
  // marcas com os dígitos (invisíveis no jogo, saem na FOTO): térreo, 1º, 3º
  const markFloors = [1, 2, 4];
  for (let i = 0; i < 3; i++) {
    const flo = world.floors[markFloors[i]];
    const r = pickRoom(flo, rng);
    flo.marks.push({
      x: r.x + 2 + rng() * (r.w - 4), y: r.y + 1.6,
      digit: world.code[i], ord: i + 1, seen: false,
    });
  }
  // cofre no 2º andar
  { const flo = world.floors[3]; const r = pickRoom(flo, rng);
    const c = roomCenter(r); flo.safe = { x: c.x, y: c.y }; }
  // quadro de fusíveis no porão, dentro do poço do elevador
  { const ec = roomCenter(ELEV_ROOM);
    world.floors[0].fusebox = { x: ec.x - 1.5, y: ELEV_ROOM.y + 1.2 }; }
  // fusível 1: sala secreta de um andar aleatório (1..4); fusível 2: sala do porão
  world.items = [];
  const sf = 1 + (rng() * 4 | 0);
  const s1 = world.floors[sf].secretRooms[0];
  if (s1) world.items.push({ id: "fuse0", kind: "fuse", floor: sf,
    x: s1.x + s1.w / 2, y: s1.y + s1.h / 2, taken: false });
  { const r = pickRoom(world.floors[0], rng);
    world.items.push({ id: "fuse1", kind: "fuse", floor: 0,
      x: r.x + 2 + rng() * (r.w - 4), y: r.y + 2 + rng() * (r.h - 4), taken: false }); }
  // (fusível 3 está dentro do cofre)
  // CHAVE da porta: sala secreta do PORÃO
  const sk = world.floors[0].secretRooms[0];
  if (sk) world.items.push({ id: "key", kind: "key", floor: 0,
    x: sk.x + sk.w / 2, y: sk.y + sk.h / 2, taken: false });

  setFloor(1);
  const c = roomCenter(ENTRY_HALL);
  player.x = c.x; player.y = ENTRY_HALL.y + ENTRY_HALL.h - 3;
  cam.x = player.x * CELL; cam.y = player.y * CELL;
}

function pickRoom(flo, rng) {
  const free = flo.rooms.filter(r => !r.fixed);
  return free[rng() * free.length | 0];
}

function genFloor(seed, f) {
  const rng = mulberry32((seed ^ 0x9e3779b9) + f * 7919);
  const g = new Uint8Array(COLS * ROWS).fill(T_WALL);
  const furnGrid = new Uint8Array(COLS * ROWS);
  const floor = { grid: g, furnGrid, rooms: [], furn: [], films: [], ghosts: [],
                  secretRooms: [], marks: [], safe: null, fusebox: null, idx: f };

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

  // --- escadas (áreas nos cantos) e elevador ---
  if (f < NFLOORS - 1)
    for (let j = STAIR_UP_RECT.y; j < STAIR_UP_RECT.y + STAIR_UP_RECT.h; j++)
      for (let i = STAIR_UP_RECT.x; i < STAIR_UP_RECT.x + STAIR_UP_RECT.w; i++)
        g[j * COLS + i] = T_STAIR_UP;
  if (f > 0)
    for (let j = STAIR_DOWN_RECT.y; j < STAIR_DOWN_RECT.y + STAIR_DOWN_RECT.h; j++)
      for (let i = STAIR_DOWN_RECT.x; i < STAIR_DOWN_RECT.x + STAIR_DOWN_RECT.w; i++)
        g[j * COLS + i] = T_STAIR_DOWN;
  const ec = roomCenter(ELEV_ROOM);
  g[(ec.y | 0) * COLS + (ec.x | 0)] = T_ELEV;

  // --- porta da frente (só térreo): parede sul do hall de entrada ---
  if (f === 1) {
    const dy = ENTRY_HALL.y + ENTRY_HALL.h;
    const dx = ENTRY_HALL.x + (ENTRY_HALL.w / 2 | 0);
    for (let i = -1; i <= 1; i++) g[dy * COLS + dx + i] = T_DOOR;
    floor.door = { x: dx + 0.5, y: dy + 0.5 };
  }

  // --- SALAS SECRETAS: atrás de paredes FALSAS (a foto denuncia) ---
  const nSecret = f === 0 ? 2 : 1 + (rng() < 0.4 ? 1 : 0);
  for (let s = 0; s < nSecret; s++) {
    for (let tries = 0; tries < 60; tries++) {
      const host = rooms[2 + (rng() * (rooms.length - 2) | 0)];
      if (host.fixed) continue;
      const sw = 8 + (rng() * 5 | 0), sh = 6 + (rng() * 4 | 0);
      const side = rng() * 4 | 0;   // 0=dir 1=esq 2=baixo 3=cima
      let sx, sy, fakeCells;
      if (side === 0) { sx = host.x + host.w + 1; sy = host.y + 1 + (rng() * Math.max(1, host.h - sh - 2) | 0); }
      else if (side === 1) { sx = host.x - sw - 1; sy = host.y + 1 + (rng() * Math.max(1, host.h - sh - 2) | 0); }
      else if (side === 2) { sx = host.x + 1 + (rng() * Math.max(1, host.w - sw - 2) | 0); sy = host.y + host.h + 1; }
      else { sx = host.x + 1 + (rng() * Math.max(1, host.w - sw - 2) | 0); sy = host.y - sh - 1; }
      const sr = { x: sx, y: sy, w: sw, h: sh };
      if (sx < 2 || sy < 2 || sx + sw > COLS - 2 || sy + sh > ROWS - 2) continue;
      if (rooms.some(o => overlaps(sr, o, 1))) continue;
      if (floor.secretRooms.some(o => overlaps(sr, o, 1))) continue;
      // garante isolamento: a área + o anel em volta devem ser parede maciça
      let solid = true;
      for (let j = sy - 1; j <= sy + sh && solid; j++)
        for (let i = sx - 1; i <= sx + sw && solid; i++)
          if (g[j * COLS + i] !== T_WALL) solid = false;
      if (!solid) continue;
      carve(sx, sy, sw, sh);
      // 2 células de parede FALSA ligando host <-> secreta
      if (side === 0) { const wy = Math.max(host.y + 1, Math.min(sy + (sh / 2 | 0), host.y + host.h - 2));
        g[wy * COLS + (host.x + host.w)] = T_FAKE; g[(wy + 1) * COLS + (host.x + host.w)] = T_FAKE; }
      else if (side === 1) { const wy = Math.max(host.y + 1, Math.min(sy + (sh / 2 | 0), host.y + host.h - 2));
        g[wy * COLS + (host.x - 1)] = T_FAKE; g[(wy + 1) * COLS + (host.x - 1)] = T_FAKE; }
      else if (side === 2) { const wx = Math.max(host.x + 1, Math.min(sx + (sw / 2 | 0), host.x + host.w - 2));
        g[(host.y + host.h) * COLS + wx] = T_FAKE; g[(host.y + host.h) * COLS + wx + 1] = T_FAKE; }
      else { const wx = Math.max(host.x + 1, Math.min(sx + (sw / 2 | 0), host.x + host.w - 2));
        g[(host.y - 1) * COLS + wx] = T_FAKE; g[(host.y - 1) * COLS + wx + 1] = T_FAKE; }
      sr.id = `${f}:${s}`;
      floor.secretRooms.push(sr);
      break;
    }
  }

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
    const it = world.items.find(o => o.id === id);
    if (it) { it.taken = true; continue; }
    const [f, i] = id.split(":").map(Number);
    if (!isNaN(f) && world.floors[f] && world.floors[f].films[i])
      world.floors[f].films[i].taken = true;
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
  if (s.flags) world.flags = s.flags;
  world.timeSec = s.timeSec || 0;
  applyTaken();
  // marcas já fotografadas não geram dica de novo
  for (const flo of world.floors)
    for (const mk of flo.marks)
      if (world.flags.marksSeen.includes(mk.ord)) mk.seen = true;
  setFloor(s.cur);
  player.x = s.px; player.y = s.py;
  cam.x = player.x * CELL; cam.y = player.y * CELL;
  film = s.film; sanity = s.sanity; photoCount = s.photoCount || 0;
  album = []; albumIdx = 0;
  flashT = 0; flashCd = 0; attractT = 0; particles = [];
  state = "play";
}

// troca de andar pela escada (automática ao pisar; cooldown evita pingue-pongue)
function useStairs(dirUp) {
  const nf = world.cur + (dirUp ? 1 : -1);
  if (nf < 0 || nf >= NFLOORS) return;
  setFloor(nf);
  // quem sobe emerge na BOCA do nicho que desce do andar novo (e vice-versa),
  // já DENTRO da sala, fora do gatilho
  const r = dirUp ? STAIR_DOWN_RECT : STAIR_UP_RECT;
  player.x = r.x + 1;
  player.y = dirUp ? r.y - 1.5 : r.y + r.h + 1.5;
  cam.x = player.x * CELL; cam.y = player.y * CELL;
  stairCd = 1.0;
  floorFadeT = 0.6;
  sfxStairs();
  saveRun();
}

// Inspeção da queda, do ritual de morte e da lamparina — carregado pelo console
// (fetch + eval). NÃO faz parte do jogo. Desenha uma grade de quadros-chave.
window.dbgGrade = (cols, lin, W, Hh) => {
  let el = document.getElementById("dbgT");
  if (!el) {
    el = document.createElement("canvas"); el.id = "dbgT";
    el.style.cssText = "position:fixed;left:0;top:0;z-index:9;background:#111";
    document.body.appendChild(el);
  }
  el.width = W * cols; el.height = Hh * lin;
  // (a folha de estilo do jogo força proporção e tamanho em todo <canvas>)
  el.style.cssText = "position:fixed;left:0;top:0;z-index:9;background:#111;max-width:none;" +
    "max-height:none;aspect-ratio:auto;width:" + el.width + "px;height:" + el.height + "px";
  const g = el.getContext("2d");
  let n = 0;
  return { g, tira: (src) => { g.drawImage(src || canvas, (n % cols) * W, ((n / cols) | 0) * Hh, W, Hh); n++; } };
};
window.dbgOff = () => { const el = document.getElementById("dbgT"); if (el) el.remove(); };

// a queda (1ª: acorda no hall; 2ª: ritual de morte) em seis quadros
window.dbgRitual = () => {
  const G = dbgGrade(3, 2, 500, 283), out = [];
  const anda = (n, f) => { for (let i = 0; i < n; i++) { time += 1 / 60; f(1 / 60); } };
  noGhosts = false; SEM_ARQUIVO = true; newRun(); FOTO.rapido = false;
  const rr = fl().rooms.find(q => !q.fixed);
  player.x = rr.x + rr.w / 2; player.y = rr.y + rr.h / 2;
  cam.x = player.x * CELL; cam.y = player.y * CELL; film = 5;
  anda(30, update);
  sanity = -1; anda(1, update);
  out.push("1a queda: " + state + " morte=" + (ritual && ritual.morte));
  anda(54, ritualUpdate); render(); G.tira();
  anda(150, ritualUpdate); render(); G.tira();
  for (let i = 0; i < 200 && state === "ritual"; i++) { time += 1 / 60; ritualUpdate(1 / 60); }
  out.push("acordou: " + state + " andar=" + world.cur + " san=" + sanity + " filme=" + film +
           " quase=" + world.flags.quase);
  anda(100, update); render(); G.tira();
  sanity = -1; anda(1, update);
  out.push("2a queda: " + state + " morte=" + (ritual && ritual.morte));
  for (let i = 0; i < 200 && state === "ritual"; i++) { time += 1 / 60; ritualUpdate(1 / 60); }
  out.push("fim: " + state + " " + JSON.stringify(deadInfo && { n: deadInfo.n, andar: deadInfo.andar, ops: deadInfo.ops }));
  for (let i = 0; i < 60; i++) { time += 1 / 60; render(); } G.tira();
  for (let i = 0; i < 330; i++) { time += 1 / 60; render(); } G.tira();
  deadEscolhe(1); render(); G.tira();
  return out;
};
// as sete almas (corpo de foto) + o eco de moletom, sobre um fundo de cômodo
window.dbgAlmas = (ids, w, h) => {
  ids = ids || ["tomas", "cecilia", "bento", "olivia", "hospede", "aurora", "blackwood", "eco"];
  w = w || 186; h = h || 330;
  const G = dbgGrade(ids.length, 1, w, h), g = G.g;
  const gr = g.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, "#2c3028"); gr.addColorStop(0.72, "#3a3d33");
  gr.addColorStop(0.73, "#2a231a"); gr.addColorStop(1, "#3a3024");
  g.fillStyle = gr; g.fillRect(0, 0, w * ids.length, h);
  const out = [];
  ids.forEach((id, i) => {
    try {
      const s = id === "eco" ? ecoStreamerSprite() : soulSprite(id);
      const hh = h - 14, ww = hh * s.width / s.height;
      g.drawImage(s, i * w + (w - ww) / 2, 8, ww, hh);
    } catch (e) { out.push(id + " ERRO " + e.message); }
  });
  return out.length ? out : "ok";
};
// uma FOTO de verdade com as almas pedidas enfileiradas na frente do streamer
// (numa sala comum do andar dado); devolve o canvas da polaroid
window.dbgFotoAlmas = (ids, andar, dist) => {
  noGhosts = true; SEM_ARQUIVO = true; newRun(); noGhosts = false;
  FOTO.rapido = false;
  if (andar !== undefined && andar !== world.cur) setFloor(andar);
  const rr = fl().rooms.filter(q => !q.fixed).sort((a, b) => b.w * b.h - a.w * a.h)[0];
  player.x = rr.x + 3; player.y = rr.y + rr.h / 2;
  cam.x = player.x * CELL; cam.y = player.y * CELL;
  world.flags.cam = { tampa: true, lente: true, obturador: false, passado: false };
  world.flags.filmLoaded = true; film = 9;
  soulEnts = [];
  const d0 = dist || 7;
  ids.forEach((id, i) => {
    const n = ids.length, k = n > 1 ? i / (n - 1) - 0.5 : 0;
    if (id === "eco") {
      fl().ghosts.push({ x: player.x + d0, y: player.y + k * (rr.h - 6), wx: 0, wy: 0, chase: false,
                         respawn: 0, bob: 0, artSeed: 0.3, sprCv: null, streamer: true });
    } else {
      world.flags.souls[id].state = "awake"; world.flags.souls[id].floor = world.cur;
      soulEnts.push({ id, floor: world.cur, x: player.x + d0 + (i % 2) * 2.5, y: player.y + k * (rr.h - 6),
                      wx: 0, wy: 0, bob: 0, giggleT: 9 });
    }
  });
  world.flags.anteriores = [{ n: 3, andar: world.cur, t: 760, legenda: "foi mal, chat" }];
  aimSource = "stick"; aimDirStick = 0; flashCd = 0;
  const cv = renderPhoto(player.x, player.y, 0);
  aimSource = "mouse";
  return cv;
};
// CENÁRIOS ÚNICOS: mapa + foto de cada um, numa grade de 3×2
window.dbgCenarios = () => {
  const G = dbgGrade(3, 2, 500, 283), out = [];
  const prep = (f, x, y, dir) => {
    if (world.cur !== f) setFloor(f);
    player.x = x; player.y = y; cam.x = x * CELL; cam.y = y * CELL;
    aimSource = "stick"; aimDirStick = dir; aimVis = dir;
    for (let i = 0; i < 3; i++) { time += 1 / 60; update(1 / 60); }
    player.x = x; player.y = y; cam.x = x * CELL; cam.y = y * CELL;
  };
  const foto = () => { const cv = renderPhoto(player.x, player.y, aimDirStick); G.tira(cv); };
  noGhosts = true; SEM_ARQUIVO = true; newRun(); noGhosts = false; FOTO.rapido = false;
  world.flags.cam = { tampa: true, lente: true, obturador: true, passado: false };
  world.flags.filmLoaded = true; film = 9; world.flags.elevatorOn = true;
  const S = world.flags.souls;
  S.tomas.state = "freed"; S.cecilia.state = "burned"; S.bento.state = "awake"; S.bento.floor = 0;
  S.olivia.state = "captured";
  // 1) quarto escuro no MAPA (porão), visto do corredor/porta
  prep(0, DARKROOM.x + DARKROOM.w / 2, DARKROOM.y + DARKROOM.h - 1.5, -Math.PI / 2);
  render(); G.tira();
  // 2) quarto escuro na FOTO
  foto();
  // 3) ateliê: a parede de molduras
  prep(NFLOORS - 1, ATELIER.x + ATELIER.w / 2, ATELIER.y + ATELIER.h - 2.5, -Math.PI / 2);
  foto();
  // 4) a grade do elevador
  prep(2, ELEV_ROOM.x + ELEV_ROOM.w / 2, ELEV_ROOM.y + ELEV_ROOM.h - 1.2, -Math.PI / 2);
  foto();
  // 5) hall de entrada no MAPA (xadrez + lamparina)
  prep(1, ENTRY_HALL.x + ENTRY_HALL.w / 2, ENTRY_HALL.y + ENTRY_HALL.h - 4, -Math.PI / 2 + 0.5);
  render(); G.tira();
  // 6) sala secreta por dentro (tijolo nu)
  const sr = world.floors[1].secretRooms[0];
  if (sr) { prep(1, sr.x + 1.5, sr.y + sr.h / 2, 0); foto(); } else out.push("sem sala secreta no térreo");
  aimSource = "mouse"; state = "title";
  return out.length ? out : "ok";
};
// PEGADAS + MEMÓRIA DE PLANTA + OLHOS FALSOS + traço das almas no mapa (2 quadros)
window.dbgMapa = () => {
  const G = dbgGrade(2, 1, 744, 422), out = [];
  noGhosts = true; SEM_ARQUIVO = true; newRun(); noGhosts = false;
  const anda = (n) => { for (let i = 0; i < n; i++) { time += 1 / 60; update(1 / 60); } };
  // 1) diante da parede falsa do térreo: pegadas; antes, uma volta para criar memória
  const sr = world.floors[1].secretRooms[0];
  const px = sr.frente.x + sr.dn[0] * 7, py = sr.frente.y + sr.dn[1] * 7;
  aimSource = "stick";
  player.x = px; player.y = py; cam.x = px * CELL; cam.y = py * CELL;
  for (let k = 0; k < 8; k++) { aimDirStick = k * Math.PI / 4; aimVis = aimDirStick; anda(2); render(); }
  aimDirStick = Math.atan2(-sr.dn[1], -sr.dn[0]) + 1.2; aimVis = aimDirStick; anda(2);
  player.x = px; player.y = py; cam.x = px * CELL; cam.y = py * CELL;
  sanity = 20; olhosFalsos = { x: px - sr.dn[1] * 8 + sr.dn[0] * 3, y: py + sr.dn[0] * 8 + sr.dn[1] * 3, t: 0.4, dur: 1.2 };
  render(); G.tira();
  // 2) as almas em volta, iluminadas pela lamparina (traço de cada uma)
  sanity = 100; olhosFalsos = null;
  const lp = world.lamp;
  player.x = lp.x - 5; player.y = lp.y + 3; cam.x = player.x * CELL; cam.y = player.y * CELL;
  soulEnts = [];
  ["tomas", "cecilia", "bento", "olivia", "hospede", "aurora", "blackwood"].forEach((id, i) => {
    world.flags.souls[id].state = "awake"; world.flags.souls[id].floor = 1;
    soulEnts.push({ id, floor: 1, x: lp.x - 6 + i * 2.1, y: lp.y - 1 + (i % 2) * 2.4, wx: 0, wy: 0,
                    bob: i, giggleT: 9, tocando: true });
  });
  aimDirStick = -0.4; aimVis = -0.4;
  render(); G.tira();
  soulEnts = []; aimSource = "mouse"; state = "title";
  return out.length ? out : "ok";
};
// as TELAS NOVAS num idioma: título com arquivo, HUD na lamparina, aviso da queda,
// tela de morte, chat aberto com as falas novas, fim
window.dbgNovas = (id) => {
  setLang(id);
  const G = dbgGrade(3, 2, 500, 283);
  const antes = localStorage.getItem("hm_arquivo");
  SEM_ARQUIVO = false;
  localStorage.setItem("hm_arquivo", JSON.stringify([
    { n: 3, fim: "morte", andar: 0, t: 760, livres: 1, queimadas: 0, legenda: "foi mal, chat" },
    { n: 2, fim: "alvorada", andar: 1, t: 4875, livres: 7, queimadas: 0, legenda: "" },
    { n: 1, fim: "morte", andar: 2, t: 302, livres: 0, queimadas: 0, legenda: "não era roteiro" }]));
  mouse.x = 30; mouse.y = 300;
  state = "title"; render(); G.tira();
  noGhosts = true; newRun(); noGhosts = false; FOTO.rapido = false;
  SEM_ARQUIVO = true;
  world.flags.cam = { tampa: true, lente: true, obturador: true, passado: false };
  world.flags.quase = true; world.flags.feridas = 2; sanity = 31;
  live.hinted.add("chainsSeen");
  player.x = world.lamp.x - 1.2; player.y = world.lamp.y + 1; cam.x = player.x * CELL; cam.y = player.y * CELL;
  for (let i = 0; i < 3; i++) { time += 1 / 60; update(1 / 60); }
  toast("VOCÊ ACORDOU NO HALL. ELE JÁ TEM UM NEGATIVO SEU — O PRÓXIMO É O ÚLTIMO", 9);
  render(); G.tira();
  liveFixo("boa luz.");
  livePush(ALMA_USER.cecilia, "alguém viu o meu buquê?");
  livePush(liveRandUser(), "ele tá PUXANDO O AR… vai pular!! FLASH NELE ou sai da frente");
  live.progT = 999; live.progA = progAssinatura(); live.progS = 0; live.progProx = 1; liveEmpurra(1);
  livePush(liveRandUser(), tf("o usuário {0} saiu da live. pra sempre", ALMA_USER.tomas));
  livePush(liveRandUser(), "cada golpe deixa MARCA: a barra não volta mais até onde voltava. só a LAMPARINA do hall cura");
  state = "chat"; render(); G.tira();
  state = "play"; sanity = -1; time += 1 / 60; update(1 / 60);
  for (let i = 0; i < 200 && state === "ritual"; i++) { time += 1 / 60; ritualUpdate(1 / 60); }
  for (let i = 0; i < 400; i++) { time += 1 / 60; render(); }
  mouse.x = 800; mouse.y = 380; render(); G.tira();
  deadEscolhe(0); render(); G.tira();
  noGhosts = true; newRun(); noGhosts = false;
  world.endType = "alvorada"; state = "win"; render(); G.tira();
  if (antes === null) localStorage.removeItem("hm_arquivo"); else localStorage.setItem("hm_arquivo", antes);
  state = "lang";
  return id + " ok";
};
"dbg-casa ok";

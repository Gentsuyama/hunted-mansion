"use strict";
// ==================================================================
// JOGO — luz, movimento, fantasmas, render top-down, HUD, input
// ==================================================================

// ------------------------------------------------------------------
// Luz
// ------------------------------------------------------------------
function castLight(px, py, dir, halfAngle, range, power, rays) {
  const step = 0.5;
  for (let i = 0; i < rays; i++) {
    const rel = rays > 1 ? (i / (rays - 1)) * 2 - 1 : 0;
    const a = dir + rel * halfAngle;
    const angFall = 1 - rel * rel;
    const dx = Math.cos(a), dy = Math.sin(a);
    for (let d = 0; d < range; d += step) {
      const cx = (px + dx * d) | 0, cy = (py + dy * d) | 0;
      if (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS) break;
      const distFall = Math.pow(1 - d / range, 1.6);
      const v = power * angFall * distFall;
      const idx = cy * COLS + cx;
      if (v > light[idx]) light[idx] = v;
      const t = grid[idx];
      if (t === T_WALL || t === T_FAKE || t === T_DOOR) break;  // falsa esconde!
    }
  }
}
function addGlow(gx, gy, r, p) {
  const x0 = Math.max(0, (gx - r) | 0), x1 = Math.min(COLS - 1, (gx + r) | 0);
  const y0 = Math.max(0, (gy - r) | 0), y1 = Math.min(ROWS - 1, (gy + r) | 0);
  for (let cy = y0; cy <= y1; cy++)
    for (let cx = x0; cx <= x1; cx++) {
      const d = Math.hypot(cx + 0.5 - gx, cy + 0.5 - gy);
      if (d > r) continue;
      const v = p * (1 - d / r);
      const idx = cy * COLS + cx;
      if (v > light[idx]) light[idx] = v;
    }
}
function lightAt(x, y) {
  const cx = x | 0, cy = y | 0;
  if (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS) return 0;
  return light[cy * COLS + cx];
}

// ------------------------------------------------------------------
// Mira
// ------------------------------------------------------------------
let aimSource = "mouse", aimDirStick = 0;
function mouseWorld() {
  return {
    x: cam.x + (mouse.x - canvas.width / 2) / camZoom,
    y: cam.y + (mouse.y - canvas.height / 2) / camZoom,
  };
}
function aimAngle() {
  if (aimSource === "stick") return aimDirStick;
  const mw = mouseWorld();
  return Math.atan2(mw.y - player.y * CELL, mw.x - player.x * CELL);
}

// ------------------------------------------------------------------
// Colisão (paredes + móveis)
// ------------------------------------------------------------------
function collides(x, y) {
  const r = PLAYER_RADIUS;
  const minX = Math.floor(x - r), maxX = Math.floor(x + r);
  const minY = Math.floor(y - r), maxY = Math.floor(y + r);
  for (let cy = minY; cy <= maxY; cy++)
    for (let cx = minX; cx <= maxX; cx++)
      if (isSolid(cx, cy)) {
        const nx = Math.max(cx, Math.min(x, cx + 1));
        const ny = Math.max(cy, Math.min(y, cy + 1));
        if ((x - nx) ** 2 + (y - ny) ** 2 < r * r) return true;
      }
  return false;
}

// ------------------------------------------------------------------
// Interação contextual (escadas, elevador)
// ------------------------------------------------------------------
let prompt = null;   // { text, action }
let stairCd = 0;     // cooldown pós-escada (evita pingue-pongue)
let floorFadeT = 0;  // fade de transição de andar
function updatePrompt() {
  prompt = null;
  const t = tileAt(player.x | 0, player.y | 0);
  if (t === T_ELEV) {
    prompt = world.flags.elevatorOn
      ? { text: "ELEVADOR — ESCOLHER ANDAR", action: () => { state = "elevator"; } }
      : { text: "ELEVADOR SEM ENERGIA", action: null };
    return;
  }
  // porta da frente (térreo): chave + correntes espectrais quebradas
  if (world.cur === 1 && fl().door) {
    const d = fl().door;
    if (Math.hypot(d.x - player.x, d.y - player.y) < 2.4) {
      if (world.flags.key && chainsBroken() >= CHAINS_NEEDED)
        prompt = { text: "ABRIR A PORTA COM A CHAVE", action: winGame };
      else if (world.flags.key) {
        prompt = { text: "A CHAVE GIRA… MAS A PORTA NÃO SE MOVE", action: null };
        if (!live.hinted.has("seal")) {
          live.hinted.add("seal");
          livePush(liveRandUser(), "a chave tá certa e não abre?? FOTOGRAFA a porta");
        }
      } else {
        prompt = { text: "TRANCADA. PRECISA DE UMA CHAVE", action: null };
        if (!live.hinted.has("door")) { live.hinted.add("door"); liveEvent("doorlock"); }
      }
      return;
    }
  }
  // retrato aprisionador (depois que a foto o revelou)
  for (const r of world.retratos) {
    if (r.floor !== world.cur || world.taken.has(r.id)) continue;
    if (!world.flags.retSeen.includes(r.id)) continue;
    if (Math.hypot(r.x - player.x, r.y - player.y) < 2) {
      prompt = { text: "PEGAR O RETRATO ESCONDIDO", action: () => {
        world.taken.add(r.id);
        showVinheta("retrato");         // só na primeira vez (flag interna)
        sfxSting(); shake = 0.6;
        livePush(liveRandUser(), "pegou o retrato!! olha os OLHOS dele… tá vivo isso");
        livePush(liveRandUser(), "agora acha o " + SOUL_DEFS[r.soul].nome +
                 " e FOTOGRAFA ele segurando o retrato");
        saveRun();
      }};
      return;
    }
  }
  // a cadeira do Fotógrafo (ateliê): com Blackwood no negativo, a casa OFERECE
  if (world.cur === NFLOORS - 1 && world.flags.souls &&
      world.flags.souls.blackwood &&
      world.flags.souls.blackwood.state === "captured") {
    const ca = ATELIER_CADEIRA;
    if (Math.hypot(ca.x - player.x, ca.y - player.y) < 2) {
      prompt = { text: "SENTAR NA CADEIRA DO FOTÓGRAFO", action: () => {
        winGame("fotografo");
      }};
      return;
    }
  }
  // bancada de revelação (quarto escuro do porão)
  if (world.cur === 0 && fl().bench) {
    const b = fl().bench;
    if (Math.hypot(b.x - player.x, b.y - player.y) < 2.2) {
      if (soulCaptured())
        prompt = { text: "BANCADA — REVELAR O NEGATIVO", action: () => {
          darkUI.alvo = soulCaptured();
          darkUI.fase = -1; darkUI.msg = ""; darkUI.confirma = 0;
          state = "darkroom";
        }};
      else
        prompt = { text: "BANCADA DE REVELAÇÃO — sem negativos", action: null };
      return;
    }
  }
  // cofre
  if (fl().safe && !world.flags.safeOpen) {
    const s = fl().safe;
    if (Math.hypot(s.x - player.x, s.y - player.y) < 2.2) {
      prompt = { text: "COFRE — TENTAR O CÓDIGO", action: () => { state = "safe"; } };
      return;
    }
  }
  // quadro de fusíveis (porão): abre o PAINEL (foto + soquetes clicáveis)
  if (fl().fusebox && !world.flags.elevatorOn) {
    const fb = fl().fusebox;
    if (Math.hypot(fb.x - player.x, fb.y - player.y) < 2.4) {
      const total = world.flags.fusesIn;
      if (UI_IMGS.fusebox)
        prompt = { text: `QUADRO DE FUSÍVEIS (${total}/3)`,
                   action: () => { state = "fusebox"; } };
      else if (total >= 3)
        prompt = { text: "LIGAR A CHAVE GERAL", action: () => {
          world.flags.elevatorOn = true;
          sfxSting(); liveEvent("elevator");
          soulsOnFusebox();              // a energia voltou… e o zelador também
          saveRun();
        }};
      else if (world.flags.fuses > 0)
        prompt = { text: `ENCAIXAR FUSÍVEL (${total}/3)`, action: () => {
          world.flags.fusesIn += world.flags.fuses;
          world.flags.fuses = 0;
          sfxPickup(); saveRun();
        }};
      else
        prompt = { text: `QUADRO DE FUSÍVEIS (${total}/3) — faltam fusíveis`, action: null };
      return;
    }
  }
}

// ------------------------------------------------------------------
// Update
// ------------------------------------------------------------------
let eventTimer = 14;
function update(dt) {
  // movimento
  let vx = 0, vy = 0;
  if (keys.has("KeyW") || keys.has("ArrowUp"))    vy -= 1;
  if (keys.has("KeyS") || keys.has("ArrowDown"))  vy += 1;
  if (keys.has("KeyA") || keys.has("ArrowLeft"))  vx -= 1;
  if (keys.has("KeyD") || keys.has("ArrowRight")) vx += 1;
  if (Math.hypot(touchUI.jx, touchUI.jy) > 0.2) { vx += touchUI.jx; vy += touchUI.jy; }
  if (vx || vy) {
    const len = Math.hypot(vx, vy);
    vx = vx / len * PLAYER_SPEED * dt;
    vy = vy / len * PLAYER_SPEED * dt;
    if (!collides(player.x + vx, player.y)) player.x += vx;
    if (!collides(player.x, player.y + vy)) player.y += vy;
  }

  updatePrompt();

  // descoberta de escadas: o nicho só entra no MAPA depois de visto de perto
  if (!world.flags.stairsSeen) world.flags.stairsSeen = [];
  const vejaEscada = (key, cx3, cy3) => {
    if (world.flags.stairsSeen.includes(key)) return;
    if (Math.hypot(cx3 - player.x, cy3 - player.y) < 7.5) {
      world.flags.stairsSeen.push(key);
      if (!live.hinted.has("escada1")) {
        live.hinted.add("escada1");
        livePush(liveRandUser(), "PERA, tem DEGRAUS dentro da parede!! escada escondida");
      }
      saveRun();
    }
  };
  if (world.cur < NFLOORS - 2)
    vejaEscada(world.cur + ":up", STAIR_UP_RECT.x + 1,
               STAIR_UP_RECT.y + STAIR_UP_RECT.h + 0.5);
  if (world.cur > 0 && world.cur < NFLOORS - 1)
    vejaEscada(world.cur + ":down", STAIR_DOWN_RECT.x + 1,
               STAIR_DOWN_RECT.y - 0.5);

  // escadas automáticas: pisou, foi (com cooldown para não ricochetear)
  if (stairCd > 0) stairCd -= dt;
  else {
    const tUnder = tileAt(player.x | 0, player.y | 0);
    if (tUnder === T_STAIR_UP) useStairs(true);
    else if (tUnder === T_STAIR_DOWN) useStairs(false);
  }
  if (floorFadeT > 0) floorFadeT -= dt;

  // timers
  if (flashCd > 0) flashCd -= dt;
  if (toastT > 0) toastT -= dt;
  if (flashT > 0) flashT = Math.max(0, flashT - dt / FLASH.duration);
  if (attractT > 0) attractT -= dt;
  if (shake > 0) shake = Math.max(0, shake - dt * 3);
  if (flickDip > 0) flickDip -= dt;
  if (dmgSfxT > 0) dmgSfxT -= dt;

  // eventos de tensão
  eventTimer -= dt;
  if (eventTimer <= 0) {
    eventTimer = 16 + Math.random() * 20;
    if (Math.random() < 0.6) flickDip = 0.55;
    sfxWhisper();
  }

  // fantasmas do andar atual
  let nearest = 999;
  const gs = fl().ghosts;
  for (const g of gs) {
    if (g.respawn > 0) {
      g.respawn -= dt;
      if (g.respawn <= 0) {
        const rooms = fl().rooms;
        const r = rooms[2 + (Math.random() * (rooms.length - 2) | 0)];
        g.x = r.x + 2 + Math.random() * (r.w - 4);
        g.y = r.y + 2 + Math.random() * (r.h - 4);
        g.wx = g.x; g.wy = g.y; g.chase = false;
        g.artSeed = Math.random(); g.sprCv = null;
      }
      continue;
    }
    if (g.stun > 0) { g.stun -= dt; continue; }   // arremessado pelo flash vazio
    const d = Math.hypot(player.x - g.x, player.y - g.y);
    nearest = Math.min(nearest, d);
    const pac = !!fl().pacified;        // alma do andar libertada: ecos mansos
    g.chase = !pac && (d < 18 || attractT > 0);
    let tx, ty;
    if (g.chase) { tx = player.x; ty = player.y; }
    else {
      if (Math.hypot(g.wx - g.x, g.wy - g.y) < 1.5) {
        if (Math.random() < 0.5) {
          g.wx = player.x + (Math.random() - 0.5) * 22;
          g.wy = player.y + (Math.random() - 0.5) * 22;
        } else {
          const rooms = fl().rooms;
          const r = rooms[Math.random() * rooms.length | 0];
          g.wx = r.x + 2 + Math.random() * (r.w - 4);
          g.wy = r.y + 2 + Math.random() * (r.h - 4);
        }
      }
      tx = g.wx; ty = g.wy;
    }
    const dd = Math.hypot(tx - g.x, ty - g.y) || 1;
    const sp = g.chase ? GHOST_SPEED : GHOST_SPEED * 0.55;
    g.bob += dt * 2.2;
    g.x += (tx - g.x) / dd * sp * dt + Math.cos(g.bob) * 0.6 * dt;
    g.y += (ty - g.y) / dd * sp * dt + Math.sin(g.bob * 1.3) * 0.6 * dt;
    if (!g.chase && !pac) {
      g.x += (player.x - g.x) / d * GHOST_SPEED * 0.30 * dt;
      g.y += (player.y - g.y) / d * GHOST_SPEED * 0.30 * dt;
    }
    if (d < 1.15 && !pac) {
      sanity -= GHOST_DMG * dt;
      shake = 1;
      if (dmgSfxT <= 0) { sfxDamage(); dmgSfxT = 0.5; }
    }
  }
  soulsUpdate(dt);   // almas nomeadas (Tomás foge, etc.)
  if (nearest > 10 && sanity < 100) sanity = Math.min(100, sanity + 3.5 * dt);
  if (sanity <= 0) { state = "dead"; sfxDeath(); clearRun(); return; }

  // batimento
  hbT -= dt;
  if (nearest < 20 && hbT <= 0) {
    hbT = 0.32 + (nearest / 20) * 1.1;
    sfxHeart(0.22 * (1 - nearest / 22));
  }

  // refis de filme — a casa SEMPRE repõe: pegou um, outro nasce no andar
  for (const f of fl().films) {
    if (f.taken) continue;
    if (Math.hypot(f.x - player.x, f.y - player.y) < 1.1) {
      f.taken = true;
      world.taken.add(f.id);
      film = Math.min(filmMax(), film + FILM_REFILL);
      sfxPickup();
      spawnFilm(world.cur);
      saveRun();
    }
  }

  // itens especiais (fusíveis, chave) do andar atual
  for (const it of world.items) {
    if (it.taken || it.floor !== world.cur) continue;
    if (Math.hypot(it.x - player.x, it.y - player.y) < 1.2) {
      it.taken = true;
      world.taken.add(it.id);
      if (it.kind === "fuse") { world.flags.fuses++; liveEvent("fuse"); }
      else if (it.kind === "key") { world.flags.key = true; liveEvent("key"); }
      else if (it.kind === "campart") {
        world.flags.cam[it.part] = true;
        if (it.part === "tampa") {
          film = Math.min(filmMax(), film + 4);   // a tampa vem com rolos
          world.flags.filmLoaded = true;
          liveEvent("tampa");
          toast(touchUI.seen
            ? "TAMPA + FILME!  toque na câmera do canto para pôr/tirar o rolo"
            : "TAMPA + FILME!  [R] põe/tira o rolo — sem filme o flash só espanta", 8);
        } else if (it.part === "obturador") liveEvent("obturador");
        else if (it.part === "lente") liveEvent("lente");
        else if (it.part === "passado") {
          livePush(liveRandUser(), "essa lente é DIFERENTE… o vidro é mais velho que a casa");
          livePush(liveRandUser(), "A LENTE DO PASSADO!! fotografa os lugares deles e OLHA a legenda");
        }
        showVinheta(it.part);           // quadrinho do achado (se a arte existe)
      }
      sfxSting();
      saveRun();
    }
  }

  // descoberta de sala secreta (entrou nela pela 1ª vez)
  for (const sr of fl().secretRooms) {
    if (world.flags.secretsFound.includes(sr.id)) continue;
    if (player.x > sr.x && player.x < sr.x + sr.w &&
        player.y > sr.y && player.y < sr.y + sr.h) {
      world.flags.secretsFound.push(sr.id);
      sfxSting(); liveEvent("secret");
      soulsOnSecretFound(world.cur);   // 1ª sala secreta DESPERTA o Tomás
      saveRun();
    }
  }

  // relógio da run + live
  world.timeSec += dt;
  liveTick(dt);

  // partículas
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    if (p.life <= 0) { particles.splice(i, 1); continue; }
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vx *= 0.94; p.vy *= 0.94;
  }

  // câmera segue o jogador (desktop e celular)
  const zTarget = IS_TOUCH ? 2.0 : 1.7;
  camZoom += (zTarget - camZoom) * Math.min(1, dt * 4);
  const hw = canvas.width / (2 * camZoom), hh = canvas.height / (2 * camZoom);
  const cx2 = Math.max(hw, Math.min(COLS * CELL - hw, player.x * CELL));
  const cy2 = Math.max(hh, Math.min(ROWS * CELL - hh, player.y * CELL));
  cam.x += (cx2 - cam.x) * Math.min(1, dt * 6);
  cam.y += (cy2 - cam.y) * Math.min(1, dt * 6);
}

// ------------------------------------------------------------------
// Escadas desenhadas como DEGRAUS (subindo clareia, descendo afunda no breu)
// ------------------------------------------------------------------
function drawStairsTopDown() {
  const defs = [];
  // SOBE: nicho na parede norte (o penúltimo andar NÃO sobe — ateliê emparedado)
  // …e só aparece no mapa DEPOIS de descoberto de perto
  const vistas = world.flags.stairsSeen || [];
  if (world.cur < NFLOORS - 2 && vistas.includes(world.cur + ":up"))
    defs.push({ r: STAIR_UP_RECT, up: true, north: true });
  // DESCE: nicho na parede sul (o último andar só sai de elevador)
  if (world.cur > 0 && world.cur < NFLOORS - 1 &&
      vistas.includes(world.cur + ":down"))
    defs.push({ r: STAIR_DOWN_RECT, up: false, north: false });
  for (const d of defs) {
    // luz medida na boca do nicho (dentro da sala) e dentro dele
    const mouthY = d.north ? d.r.y + d.r.h + 0.5 : d.r.y - 0.5;
    const L0 = Math.max(lightAt(d.r.x + 1, mouthY), lightAt(d.r.x + 1, d.r.y + 1));
    if (L0 <= 0.03) continue;
    const cxm = (d.r.x + d.r.w / 2) * CELL;
    const steps = 5, stepH = d.r.h * CELL / steps;
    for (let s = 0; s < steps; s++) {
      const t = s / (steps - 1);               // 0 = boca, 1 = fundo do nicho
      const y = d.north
        ? (d.r.y + d.r.h) * CELL - (s + 1) * stepH
        : d.r.y * CELL + s * stepH;
      // subir = clareia e afunila ao fundo; descer = esmaece no breu
      const bright = d.up ? 0.30 + 0.70 * t : 0.85 - 0.80 * t;
      const w2 = d.r.w * CELL * (1 - t * (d.up ? 0.30 : 0.12));
      const a = Math.min(1, L0 * 1.7) * bright;
      ctx.fillStyle = `rgba(206,214,232,${(a * 0.9).toFixed(3)})`;
      ctx.fillRect(cxm - w2 / 2, y + 1.5, w2, stepH - 3);
    }
    ctx.font = "bold 8px 'Courier New', monospace";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillStyle = `rgba(200,214,240,${Math.min(1, L0 * 1.6).toFixed(3)})`;
    // rótulo DENTRO da sala, junto à boca do nicho
    ctx.fillText(d.up ? "SOBE" : "DESCE", cxm,
                 d.north ? (d.r.y + d.r.h) * CELL + 7 : d.r.y * CELL - 6);
  }
}

// ------------------------------------------------------------------
// Render top-down
// ------------------------------------------------------------------
// cursor desenhado pelo jogo (o CSS esconde o do sistema) — visível em TODA
// tela interativa; no gameplay a mira de jogo cumpre esse papel
function drawCursor() {
  if (IS_TOUCH) return;
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(mouse.x - 7, mouse.y); ctx.lineTo(mouse.x + 7, mouse.y);
  ctx.moveTo(mouse.x, mouse.y - 7); ctx.lineTo(mouse.x, mouse.y + 7);
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.fillRect(mouse.x - 1, mouse.y - 1, 2, 2);
}

function render() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (state === "cine")  { drawCinematic(); drawCursor(); return; }
  if (state === "title") { drawTitle(); drawCursor(); return; }

  const shx = shake > 0 ? (Math.random() - 0.5) * 7 * shake : 0;
  const shy = shake > 0 ? (Math.random() - 0.5) * 7 * shake : 0;
  ctx.setTransform(camZoom, 0, 0, camZoom,
                   canvas.width / 2 - cam.x * camZoom + shx,
                   canvas.height / 2 - cam.y * camZoom + shy);

  const dir = aimAngle();
  const tick = Math.floor(time * 12);

  // luz
  light.fill(0);
  let flick = 0.9 + 0.1 * hash(7, 13, tick);
  if (flickDip > 0) flick *= 0.3 + 0.35 * hash(3, 5, tick);
  const lHalf = LANTERNA.halfAngle * (IS_TOUCH ? 1.2 : 1);
  const lRays = IS_TOUCH ? (LANTERNA.rays * 1.2) | 0 : LANTERNA.rays;
  castLight(player.x, player.y, dir, lHalf, LANTERNA.range,
            LANTERNA.power * flick, lRays);
  if (flashT > 0) {
    const p = FLASH.power * flashT * flashT;
    castLight(player.x, player.y, flashDir, FLASH.halfAngle, FLASH.range, p, FLASH.rays);
  }
  addGlow(player.x, player.y, 3.5, 0.22);
  // escadas emitem um brilho fraco na boca do nicho (precisam ser encontráveis)
  if (world.cur < NFLOORS - 1)
    addGlow(STAIR_UP_RECT.x + 1, STAIR_UP_RECT.y + STAIR_UP_RECT.h + 0.5, 2.8, 0.13);
  if (world.cur > 0)
    addGlow(STAIR_DOWN_RECT.x + 1, STAIR_DOWN_RECT.y - 0.5, 2.8, 0.13);

  // células visíveis (culling pela câmera)
  const hw = canvas.width / (2 * camZoom), hh = canvas.height / (2 * camZoom);
  const c0 = Math.max(0, ((cam.x - hw) / CELL | 0) - 1);
  const c1 = Math.min(COLS - 1, ((cam.x + hw) / CELL | 0) + 1);
  const r0 = Math.max(0, ((cam.y - hh) / CELL | 0) - 1);
  const r1 = Math.min(ROWS - 1, ((cam.y + hh) / CELL | 0) + 1);

  ctx.font = "bold 11px 'Courier New', monospace";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const fg = fl().furnGrid;
  for (let cy = r0; cy <= r1; cy++) {
    for (let cx = c0; cx <= c1; cx++) {
      const idx = cy * COLS + cx;
      const raw = light[idx];
      if (raw <= 0.02) continue;
      const t = grid[idx];
      const px2 = cx * CELL + CELL / 2, py2 = cy * CELL + CELL / 2 + 1;

      if (t === T_FLOOR && fg[idx] === 0) {
        // CHÃO: luz suave contínua, sem caracteres (visual limpo)
        const L = Math.min(1, raw);
        ctx.fillStyle = `rgba(142,132,112,${(L * 0.30).toFixed(3)})`;
        ctx.fillRect(cx * CELL, cy * CELL, CELL, CELL);
        continue;
      }

      // elementos da casa continuam em caracteres, com leve vida
      const n = hash(cx, cy, tick);
      const clamped = Math.min(1, raw * (0.82 + 0.36 * n));
      const b = (60 + 195 * clamped) | 0;
      if (t === T_WALL || t === T_FAKE) {   // falsa = idêntica à parede no jogo
        ctx.fillStyle = `rgb(${b},${(b * 0.88) | 0},${(b * 0.66) | 0})`;
        ctx.fillText("#", px2, py2);
      } else if (t === T_DOOR) {
        ctx.fillStyle = `rgb(${b},${(b * 0.62) | 0},${(b * 0.34) | 0})`;
        ctx.fillText("▦", px2, py2);
      } else if (t === T_STAIR_UP || t === T_STAIR_DOWN) {
        // chão sob a escada; os degraus são desenhados por drawStairs()
        ctx.fillStyle = `rgba(142,132,112,${(Math.min(1, raw) * 0.30).toFixed(3)})`;
        ctx.fillRect(cx * CELL, cy * CELL, CELL, CELL);
      } else if (t === T_ELEV) {
        ctx.fillStyle = `rgb(${(b * 0.7) | 0},${(b * 0.7) | 0},${(b * 0.75) | 0})`;
        ctx.fillText("◫", px2, py2);
      } else if (fg[idx] !== 0) {
        // móvel: chão suave por baixo + caractere do móvel por cima
        ctx.fillStyle = `rgba(142,132,112,${(Math.min(1, raw) * 0.30).toFixed(3)})`;
        ctx.fillRect(cx * CELL, cy * CELL, CELL, CELL);
        ctx.fillStyle = `rgb(${b},${(b * 0.8) | 0},${(b * 0.4) | 0})`;
        ctx.fillText(FURN_BY_ID[fg[idx]].ch, px2, py2);
      }
    }
  }

  drawStairsTopDown();

  // refis
  ctx.font = "bold 12px 'Courier New', monospace";
  for (const f of fl().films) {
    if (f.taken) continue;
    const L = Math.min(1, lightAt(f.x, f.y) * 1.8);
    if (L <= 0.03) continue;
    ctx.fillStyle = `rgba(180,220,180,${L})`;
    ctx.fillText("¤", f.x * CELL, f.y * CELL);
  }
  // itens especiais (fusível F, chave K, peças da câmera ✦)
  ctx.font = "bold 14px 'Courier New', monospace";
  for (const it of world.items) {
    if (it.taken || it.floor !== world.cur) continue;
    const L = Math.min(1, lightAt(it.x, it.y) * 1.8);
    if (L <= 0.03) continue;
    ctx.fillStyle = it.kind === "key" ? `rgba(240,210,110,${L})`
      : it.kind === "campart" ? `rgba(150,220,235,${L})`
      : `rgba(255,170,90,${L})`;
    ctx.fillText(it.kind === "key" ? "K" : it.kind === "campart" ? "✦" : "F",
                 it.x * CELL, it.y * CELL);
  }
  // retrato aprisionador: só ganha um brilho no mundo DEPOIS da foto denunciar
  for (const r of world.retratos) {
    if (r.floor !== world.cur || world.taken.has(r.id)) continue;
    if (!world.flags.retSeen.includes(r.id)) continue;
    const L = Math.min(1, lightAt(r.x, r.y) * 1.8);
    if (L <= 0.03) continue;
    const tw = 0.5 + 0.5 * Math.sin(time * 5);
    ctx.fillStyle = `rgba(230,220,180,${L * (0.5 + tw * 0.5)})`;
    ctx.fillText("▧", r.x * CELL, r.y * CELL);
  }
  // bancada de revelação (quarto escuro)
  if (fl().bench) {
    const b = fl().bench;
    const L = Math.min(1, lightAt(b.x, b.y) * 1.8);
    if (L > 0.03) {
      ctx.fillStyle = `rgba(210,120,120,${L})`;   // luz vermelha de revelação
      ctx.fillText("◱", b.x * CELL, b.y * CELL);
    }
  }
  // o ateliê: cavalete e a cadeira do Fotógrafo (último andar)
  if (world.cur === NFLOORS - 1) {
    const cv2 = ATELIER_CAVALETE, ca2 = ATELIER_CADEIRA;
    const Lc = Math.min(1, lightAt(cv2.x, cv2.y) * 1.8);
    if (Lc > 0.03) {
      ctx.fillStyle = `rgba(190,180,160,${Lc})`;
      ctx.fillText("╽", cv2.x * CELL, cv2.y * CELL);   // o cavalete
    }
    const La = Math.min(1, lightAt(ca2.x, ca2.y) * 1.8);
    if (La > 0.03) {
      const pronta = world.flags.souls && world.flags.souls.blackwood &&
                     world.flags.souls.blackwood.state === "captured";
      ctx.fillStyle = pronta
        ? `rgba(240,210,110,${La})` : `rgba(170,165,155,${La})`;
      ctx.fillText("Π", ca2.x * CELL, ca2.y * CELL);   // a cadeira
    }
  }
  // cofre e quadro de fusíveis (visíveis sob luz)
  if (fl().safe) {
    const s = fl().safe;
    const L = Math.min(1, lightAt(s.x, s.y) * 1.8);
    if (L > 0.03) {
      ctx.font = "bold 15px 'Courier New', monospace";
      ctx.fillStyle = world.flags.safeOpen
        ? `rgba(120,120,120,${L * 0.6})` : `rgba(210,190,140,${L})`;
      ctx.fillText("▣", s.x * CELL, s.y * CELL);
    }
  }
  if (fl().fusebox) {
    const fb = fl().fusebox;
    const L = Math.min(1, lightAt(fb.x, fb.y) * 1.8);
    if (L > 0.03) {
      ctx.font = "bold 15px 'Courier New', monospace";
      ctx.fillStyle = world.flags.elevatorOn
        ? `rgba(130,220,130,${L})` : `rgba(230,200,90,${L})`;
      ctx.fillText("⚡", fb.x * CELL, fb.y * CELL);
    }
  }

  // fantasmas
  for (const g of fl().ghosts) {
    if (g.respawn > 0) continue;
    const L = Math.min(1, lightAt(g.x, g.y) * 1.9);
    if (L <= 0.04) continue;
    const gy = g.y * CELL + Math.sin(g.bob) * 2.5;
    ctx.font = "bold 20px 'Courier New', monospace";
    const b = (90 + 165 * L) | 0;
    ctx.fillStyle = `rgba(${(b * 0.82) | 0},${(b * 0.92) | 0},${b},${0.35 + 0.65 * L})`;
    ctx.fillText("Ψ", g.x * CELL, gy);
    if (L > 0.4) {
      ctx.fillStyle = `rgba(255,60,60,${L})`;
      ctx.fillRect(g.x * CELL - 4, gy - 4, 2, 2);
      ctx.fillRect(g.x * CELL + 2, gy - 4, 2, 2);
    }
  }
  // almas nomeadas (menores, tom pálido — o Tomás foge da luz)
  for (const e of soulEnts) {
    if (e.floor !== world.cur) continue;
    const L = Math.min(1, lightAt(e.x, e.y) * 1.9);
    if (L <= 0.04) continue;
    const ey = e.y * CELL + Math.sin(e.bob) * 2.5;
    ctx.font = "bold 15px 'Courier New', monospace";
    ctx.fillStyle = `rgba(200,225,235,${0.3 + 0.6 * L})`;
    ctx.fillText("ψ", e.x * CELL, ey);
  }

  // partículas
  ctx.font = "bold 11px 'Courier New', monospace";
  for (const p of particles) {
    ctx.fillStyle = `rgba(190,210,255,${p.life})`;
    ctx.fillText(p.ch, p.x * CELL, p.y * CELL);
  }

  // jogador
  const px = player.x * CELL, py = player.y * CELL;
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(dir + Math.PI / 2);
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.moveTo(0, -7); ctx.lineTo(5.5, 6); ctx.lineTo(-5.5, 6);
  ctx.closePath(); ctx.fill();
  ctx.restore();

  ctx.setTransform(1, 0, 0, 1, 0, 0);

  // fade de transição de andar
  if (floorFadeT > 0) {
    ctx.fillStyle = `rgba(0,0,0,${Math.min(1, floorFadeT * 2.2).toFixed(3)})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // clarão do flash
  if (flashT > 0) {
    ctx.fillStyle = `rgba(255,255,255,${(flashT * flashT * 0.18).toFixed(3)})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  // BLACKWOOD TE ENQUADRANDO: moldura vermelha pulsando — QUEBRE a visão dele
  if (state === "play" && bossWarnT > 0) {
    const a = 0.25 + 0.35 * Math.abs(Math.sin(time * 14));
    ctx.strokeStyle = `rgba(220,40,30,${a.toFixed(2)})`;
    ctx.lineWidth = 10;
    ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);
    // cantos de mira de câmera
    ctx.lineWidth = 4;
    const L2 = 46;
    for (const [cx2, cy2, sx2, sy2] of [[26, 26, 1, 1], [canvas.width - 26, 26, -1, 1],
        [26, canvas.height - 26, 1, -1], [canvas.width - 26, canvas.height - 26, -1, -1]]) {
      ctx.beginPath();
      ctx.moveTo(cx2 + sx2 * L2, cy2); ctx.lineTo(cx2, cy2);
      ctx.lineTo(cx2, cy2 + sy2 * L2);
      ctx.stroke();
    }
  }
  // estática
  if (sanity < 70) {
    const inten = (70 - sanity) / 70;
    const n = (inten * 350) | 0;
    for (let i = 0; i < n; i++) {
      const b = (Math.random() * 160) | 0;
      ctx.fillStyle = `rgba(${b},${b},${b},0.35)`;
      ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 2, 2);
    }
  }

  // mira (só mouse)
  if (state === "play" && aimSource === "mouse" && !IS_TOUCH) {
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(mouse.x - 5, mouse.y); ctx.lineTo(mouse.x + 5, mouse.y);
    ctx.moveTo(mouse.x, mouse.y - 5); ctx.lineTo(mouse.x, mouse.y + 5);
    ctx.stroke();
  }

  drawHUD();
  if (state === "album") drawAlbum();
  if (state === "dead") drawDead();
  if (state === "chat") drawChat();
  if (state === "safe") drawSafe();
  if (state === "elevator") drawElevator();
  if (state === "fusebox") drawFusebox();
  if (state === "darkroom") drawDarkroom();
  if (state === "vinheta") drawVinheta();
  if (state === "win") drawWin();
  if (state !== "play") drawCursor();   // overlays: cursor sempre visível
}

// ------------------------------------------------------------------
// HUD e telas
// ------------------------------------------------------------------
// FOTO/USAR afastados dos analógicos: a zona de toque de um não pode
// invadir a área de pega do outro (tocar o topo do analógico disparava foto)
const BTN_PHOTO  = { x: 1050, y: 318, r: 62 };
const BTN_ALBUM  = { x: 1118, y: 70,  r: 46 };
const BTN_FS     = { x: 1118, y: 182, r: 40 };
const BTN_USE    = { x: 150,  y: 314, r: 52 };
const MOVE_STICK = { x: 150,  y: 530, r: 90, travel: 56, knob: 30 };
const AIM_STICK  = { x: 1050, y: 530, r: 90, travel: 56, knob: 30 };
const DEAD_BTNS = [
  { id: "fotos", x: 210, y: 430, w: 240, h: 76, label: "VER FOTOS" },
  { id: "jogar", x: 480, y: 430, w: 240, h: 76, label: "NOVA RUN" },
  { id: "menu",  x: 750, y: 430, w: 240, h: 76, label: "MENU" },
];
const ALB_CLOSE = { x: 1040, y: 20, w: 140, h: 56 };

const touchUI = { seen: IS_TOUCH, joyId: null, jx: 0, jy: 0, jkx: 0, jky: 0,
                  aimId: null, akx: 0, aky: 0 };

// --- A CÂMERA NO CANTO: silhueta que se completa com as peças ---
function camHudRect() {
  // touch: coluna esquerda (direita está cheia de botões); desktop: canto
  // inf-dir — maior quando a arte do Gemini está montada
  if (touchUI.seen) return { x: 12, y: 140, w: 172, h: 104 };
  return CAM_IMGS.corpo
    ? { x: canvas.width - 226, y: canvas.height - 170, w: 214, h: 152 }
    : { x: canvas.width - 184, y: canvas.height - 122, w: 172, h: 104 };
}
function camHudHit(px2, py2) {
  const r = camHudRect();
  return px2 > r.x && px2 < r.x + r.w && py2 > r.y && py2 < r.y + r.h;
}
// aviso central temporário (ensina mecânica nova sem depender do chat)
let toastT = 0, toastText = "";
function toast(txt, seg) { toastText = txt; toastT = seg || 6; }

function toggleFilm() {
  if (!world.flags.cam.tampa) return;
  world.flags.filmLoaded = !world.flags.filmLoaded;
  toast(world.flags.filmLoaded
    ? "FILME NA CÂMERA — a foto registra e captura (gasta rolo)"
    : "FILME FORA — o flash só espanta, de graça", 2.8);
  sfxPickup();
  if (!live.hinted.has("filmtoggle")) {
    live.hinted.add("filmtoggle");
    livePush(liveRandUser(), world.flags.filmLoaded
      ? "filme DENTRO: a foto registra e captura (e gasta rolo)"
      : "tirou o filme: o flash vira espanta-fantasma de graça, mas não salva NADA");
  }
  saveRun();
}
function drawCamHUD() {
  const r = camHudRect(), cm = world.flags.cam;
  ctx.save();
  ctx.fillStyle = "rgba(10,10,12,0.55)";
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.strokeStyle = "rgba(160,160,170,0.45)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(r.x, r.y, r.w, r.h);

  ctx.font = "bold 11px 'Courier New', monospace";
  ctx.textAlign = "left"; ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(200,200,205,0.85)";
  ctx.fillText(cm.tampa ? (touchUI.seen ? "toque: filme"
                                        : "CÂMERA · [R] filme")
                        : "CÂMERA", r.x + 10, r.y + 13);
  if (cm.tampa) {
    ctx.textAlign = "right";
    ctx.font = "bold 10px 'Courier New', monospace";
    const curto = touchUI.seen;          // no celular o cartão é menor
    if (world.flags.filmLoaded && film > 0) {
      ctx.fillStyle = "rgba(150,230,150,0.95)";
      ctx.fillText(curto ? "DENTRO" : "FILME DENTRO", r.x + r.w - 8, r.y + 13);
    } else {
      ctx.fillStyle = "rgba(235,195,110,0.95)";
      ctx.fillText(film <= 0 ? (curto ? "S/ROLOS" : "SEM ROLOS")
                 : (curto ? "FORA" : "FILME FORA — SÓ ESPANTA"),
                   r.x + r.w - 8, r.y + 13);
    }
  }

  if (CAM_IMGS.corpo) {
    // MONTAGEM com a arte do Gemini: cada peça encaixa no corpo; a que
    // falta aparece como fantasma apagado (o jogador vê o que procurar)
    const area = { x: r.x + 10, y: r.y + 22, w: r.w - 20, h: r.h - 48 };
    const slots = [
      ["corpo",     0.50, 0.56, 0.66, true],
      ["lente",     0.40, 0.66, 0.25, cm.lente],
      ["tampa",     0.80, 0.62, 0.21, cm.tampa],
      ["flash",     0.19, 0.22, 0.19, true],
      ["obturador", 0.78, 0.17, 0.13, cm.obturador],
      ["passado",   0.15, 0.84, 0.14, cm.passado],
    ];
    ctx.save();
    ctx.beginPath();
    ctx.rect(r.x + 1, r.y + 16, r.w - 2, r.h - 32);
    ctx.clip();                          // nada vaza do cartão
    for (const [k, fx, fy, fw, tem] of slots) {
      const im = CAM_IMGS[k];
      if (!im) continue;
      const w2 = area.w * fw, h2 = w2 * im.height / im.width;
      ctx.globalAlpha = tem ? 1 : 0.22;  // peça que falta: fantasma visível
      ctx.drawImage(im, area.x + area.w * fx - w2 / 2,
                    area.y + area.h * fy - h2 / 2, w2, h2);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  } else {
  // corpo
  const bx = r.x + 12, by = r.y + 34, bw = r.w - 24, bh = 46;
  ctx.strokeStyle = "rgba(210,210,220,0.8)";
  ctx.lineWidth = 2;
  ctx.strokeRect(bx, by, bw, bh);
  // flash (aceso quando pronto)
  ctx.strokeRect(bx + 6, by - 10, 22, 10);
  ctx.fillStyle = flashCd <= 0 ? "rgba(255,255,200,0.85)" : "rgba(120,95,80,0.55)";
  ctx.fillRect(bx + 8, by - 8, 18, 6);
  // obturador de prata (botão de disparo)
  ctx.fillStyle = cm.obturador ? "rgba(205,215,255,0.9)" : "rgba(90,90,95,0.45)";
  ctx.beginPath(); ctx.arc(bx + bw - 12, by - 5, 4.5, 0, 7); ctx.fill();
  // lente
  const lx = bx + bw * 0.36, ly = by + bh / 2;
  ctx.beginPath(); ctx.arc(lx, ly, 15, 0, 7); ctx.stroke();
  ctx.beginPath(); ctx.arc(lx, ly, 8, 0, 7); ctx.stroke();
  if (!cm.lente) {
    ctx.strokeStyle = "rgba(255,120,110,0.85)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(lx - 12, ly - 8); ctx.lineTo(lx - 2, ly + 2);
    ctx.lineTo(lx + 6, ly - 4); ctx.lineTo(lx + 12, ly + 9);
    ctx.stroke();
    ctx.strokeStyle = "rgba(210,210,220,0.8)";
    ctx.lineWidth = 2;
  }
  // lente do passado acoplada (pequeno aro sépia)
  if (cm.passado) {
    ctx.strokeStyle = "rgba(205,170,110,0.9)";
    ctx.beginPath(); ctx.arc(lx - 20, ly + 12, 5, 0, 7); ctx.stroke();
    ctx.strokeStyle = "rgba(210,210,220,0.8)";
  }
  // compartimento do filme (direita)
  const fx = bx + bw - 46, fw = 38;
  ctx.font = "bold 9px 'Courier New', monospace";
  ctx.textAlign = "center";
  if (!cm.tampa) {
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(fx, by + 6, fw, bh - 12);
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(255,140,120,0.85)";
    ctx.fillText("SEM", fx + fw / 2, by + bh / 2 - 5);
    ctx.fillText("TAMPA", fx + fw / 2, by + bh / 2 + 6);
  } else {
    ctx.strokeRect(fx, by + 6, fw, bh - 12);
    if (world.flags.filmLoaded && film > 0) {
      ctx.fillStyle = "rgba(185,215,185,0.8)";
      ctx.fillRect(fx + 6, by + 12, fw - 12, bh - 24);
      ctx.fillStyle = "rgba(20,25,20,0.9)";
      ctx.fillText("" + film, fx + fw / 2, by + bh / 2 + 1);
    } else {
      ctx.fillStyle = "rgba(130,130,135,0.6)";
      ctx.fillText(film > 0 ? "VAZIA" : "S/ROLO", fx + fw / 2, by + bh / 2 + 1);
    }
  }
  }   // fim do fallback procedural

  // reserva de rolos + como pôr/tirar
  ctx.textAlign = "left";
  ctx.font = "bold 11px 'Courier New', monospace";
  ctx.fillStyle = film > 0 ? "rgba(185,215,185,0.9)" : "rgba(230,90,80,0.9)";
  ctx.fillText("ROLOS " + "▮".repeat(film) +
               "▯".repeat(Math.max(0, filmMax() - film)), r.x + 10, r.y + r.h - 10);
  ctx.restore();
  ctx.textAlign = "left";
}

function drawHUD() {
  const M = touchUI.seen;
  ctx.font = M ? "bold 19px 'Courier New', monospace" : "bold 13px 'Courier New', monospace";
  ctx.textAlign = "left"; ctx.textBaseline = "middle";

  const y1 = M ? 30 : 20;
  ctx.fillStyle = "rgba(190,190,190,0.8)";
  ctx.fillText(FLOOR_NAMES[world.cur], 12, y1);
  // correntes da porta (aparece depois que o chat explicou)
  if (live.hinted.has("chainsSeen")) {
    ctx.fillStyle = "rgba(170,195,230,0.85)";
    ctx.fillText(`CORRENTES ${chainsBroken()}/${CHAINS_TOTAL}`, M ? 180 : 130, y1);
  }

  const sc = sanity > 40 ? "rgba(200,200,200,0.7)" : "rgba(230,70,60,0.85)";
  if (M) {
    ctx.fillStyle = "rgba(150,150,150,0.75)";
    ctx.fillText("SANIDADE", 12, 64);
    ctx.strokeStyle = "rgba(150,150,150,0.5)";
    ctx.strokeRect(132, 53, 240, 22);
    ctx.fillStyle = sc;
    ctx.fillRect(134, 55, 236 * Math.max(0, sanity) / 100, 18);
  } else {
    ctx.fillStyle = "rgba(120,120,120,0.5)";
    ctx.fillText("SANIDADE", 12, canvas.height - 46);
    ctx.strokeStyle = "rgba(150,150,150,0.4)";
    ctx.strokeRect(95, canvas.height - 52, 140, 11);
    ctx.fillStyle = sc;
    ctx.fillRect(96, canvas.height - 51, 138 * Math.max(0, sanity) / 100, 9);
    ctx.fillStyle = "rgba(160,160,160,0.55)";
    ctx.fillText("WASD mover · mouse lanterna · botão direito FOTO · R filme · F álbum · E usar",
                 12, canvas.height - 14);
  }
  const cm = world.flags.cam;
  const fotoOk = cm.tampa && world.flags.filmLoaded && film > 0;
  ctx.fillStyle = flashCd > 0 ? "rgba(255,120,120,0.7)"
    : fotoOk ? "rgba(120,255,120,0.7)" : "rgba(230,200,120,0.75)";
  ctx.fillText(
    flashCd > 0        ? "CÂMERA [ RECARREGANDO ]" :
    !cm.tampa          ? "CÂMERA [ SEM TAMPA — SÓ FLASH ]" :
    !world.flags.filmLoaded ? "CÂMERA [ FILME FORA — SÓ ESPANTA ]" :
    film <= 0          ? "CÂMERA [ ROLOS ACABARAM ]" :
                         "CÂMERA [ PRONTA ]",
    M ? 400 : 12, M ? 64 : canvas.height - 30);

  // inventário especial
  let invY = M ? 96 : 44;
  ctx.font = M ? "bold 16px 'Courier New', monospace" : "bold 12px 'Courier New', monospace";
  if (world.flags.fuses > 0 || world.flags.fusesIn > 0) {
    ctx.fillStyle = "rgba(255,170,90,0.85)";
    ctx.fillText(`FUSÍVEIS: ${world.flags.fuses} na mão · ${world.flags.fusesIn}/3 no quadro`,
                 12, invY);
    invY += M ? 24 : 18;
  }
  if (world.flags.key) {
    ctx.fillStyle = "rgba(240,210,110,0.9)";
    ctx.fillText("CHAVE DA PORTA ✓ — vá até o hall de entrada", 12, invY);
  }

  // a câmera no canto (peças coletadas + filme dentro/fora)
  if (state === "play") drawCamHUD();

  // aviso central (mecânica nova / filme dentro-fora)
  if (state === "play" && toastT > 0) {
    const a = Math.min(1, toastT);
    ctx.textAlign = "center";
    ctx.font = "bold " + (M ? 20 : 16) + "px 'Courier New', monospace";
    const tw2 = ctx.measureText(toastText).width;
    ctx.fillStyle = `rgba(8,8,10,${(0.78 * a).toFixed(2)})`;
    ctx.fillRect(canvas.width / 2 - tw2 / 2 - 18, (M ? 118 : 96) - 20, tw2 + 36, 40);
    ctx.strokeStyle = `rgba(235,210,130,${(0.6 * a).toFixed(2)})`;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(canvas.width / 2 - tw2 / 2 - 18, (M ? 118 : 96) - 20, tw2 + 36, 40);
    ctx.fillStyle = `rgba(240,225,170,${a.toFixed(2)})`;
    ctx.fillText(toastText, canvas.width / 2, M ? 118 : 96);
    ctx.textAlign = "left";
  }

  // painel da live (clicar/tocar PAUSA e abre o chat)
  if (state === "play") drawLivePanel();

  // prompt contextual (escada/elevador)
  if (prompt && state === "play") {
    ctx.textAlign = "center";
    ctx.font = M ? "bold 22px 'Courier New', monospace" : "bold 16px 'Courier New', monospace";
    ctx.fillStyle = `rgba(230,240,255,${0.6 + 0.4 * Math.sin(time * 4)})`;
    ctx.fillText(prompt.action
      ? (M ? `${prompt.text} — botão USAR` : `${prompt.text} — tecle E`)
      : prompt.text, canvas.width / 2, canvas.height - (M ? 110 : 80));
    ctx.textAlign = "left";
  }

  // controles touch
  if (touchUI.seen && state === "play") {
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.beginPath(); ctx.arc(MOVE_STICK.x, MOVE_STICK.y, MOVE_STICK.r, 0, 7); ctx.stroke();
    ctx.fillStyle = touchUI.joyId !== null ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.22)";
    ctx.beginPath();
    ctx.arc(MOVE_STICK.x + touchUI.jkx, MOVE_STICK.y + touchUI.jky, MOVE_STICK.knob, 0, 7);
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.beginPath(); ctx.arc(AIM_STICK.x, AIM_STICK.y, AIM_STICK.r, 0, 7); ctx.stroke();
    const ad = aimAngle();
    ctx.strokeStyle = "rgba(255,255,220,0.45)";
    ctx.beginPath();
    ctx.moveTo(AIM_STICK.x + Math.cos(ad) * (AIM_STICK.r - 8),
               AIM_STICK.y + Math.sin(ad) * (AIM_STICK.r - 8));
    ctx.lineTo(AIM_STICK.x + Math.cos(ad) * (AIM_STICK.r + 8),
               AIM_STICK.y + Math.sin(ad) * (AIM_STICK.r + 8));
    ctx.stroke();
    ctx.fillStyle = touchUI.aimId !== null ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.22)";
    ctx.beginPath();
    ctx.arc(AIM_STICK.x + touchUI.akx, AIM_STICK.y + touchUI.aky, AIM_STICK.knob, 0, 7);
    ctx.fill();

    ctx.textAlign = "center";
    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.beginPath(); ctx.arc(BTN_PHOTO.x, BTN_PHOTO.y, BTN_PHOTO.r, 0, 7); ctx.stroke();
    ctx.fillStyle = flashCd <= 0 && film > 0 ? "rgba(255,255,255,0.8)" : "rgba(255,120,120,0.65)";
    ctx.font = "bold 21px 'Courier New', monospace";
    ctx.fillText("FOTO", BTN_PHOTO.x, BTN_PHOTO.y + 1);

    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.beginPath(); ctx.arc(BTN_ALBUM.x, BTN_ALBUM.y, BTN_ALBUM.r, 0, 7); ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.font = "bold 14px 'Courier New', monospace";
    ctx.fillText("ÁLBUM", BTN_ALBUM.x, BTN_ALBUM.y + 1);

    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.beginPath(); ctx.arc(BTN_FS.x, BTN_FS.y, BTN_FS.r, 0, 7); ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.65)";
    ctx.lineWidth = 2;
    const fsIn = !!document.fullscreenElement;
    const cs = 15, cl = 7, dirIco = fsIn ? -1 : 1;
    for (const [sx2, sy2] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const bx2 = BTN_FS.x + sx2 * cs, by2 = BTN_FS.y + sy2 * cs;
      ctx.beginPath();
      ctx.moveTo(bx2 - sx2 * cl * dirIco, by2);
      ctx.lineTo(bx2, by2);
      ctx.lineTo(bx2, by2 - sy2 * cl * dirIco);
      ctx.stroke();
    }

    if (prompt && prompt.action) {
      ctx.strokeStyle = "rgba(230,240,255,0.7)";
      ctx.beginPath(); ctx.arc(BTN_USE.x, BTN_USE.y, BTN_USE.r, 0, 7); ctx.stroke();
      ctx.fillStyle = "rgba(230,240,255,0.85)";
      ctx.font = "bold 18px 'Courier New', monospace";
      ctx.fillText("USAR", BTN_USE.x, BTN_USE.y + 1);
    }
    ctx.textAlign = "left";
  }
}

// --- ÁLBUM COMO LIVRO: páginas duplas com 4 polaroids, clique dá zoom ---
let albumPage = 0, albumZoom = -1;
function openAlbum(ret) {
  state = "album"; albumReturn = ret;
  albumZoom = -1;
  albumPage = Math.max(0, Math.ceil(album.length / 4) - 1);   // última página
}
function albumBookRect() {
  return { x: canvas.width / 2 - 505, y: 64, w: 1010, h: 578 };
}
function albumSlots() {
  const b = albumBookRect();
  const out = [];
  const tw = 300, th = tw * 0.80;
  for (let i = 0; i < 4; i++) {
    const col = i % 2, row = (i / 2) | 0;
    out.push({
      x: b.x + (col === 0 ? 92 : b.w / 2 + 102) + (row === 1 ? 10 - col * 16 : 0),
      y: b.y + 38 + row * 262,
      w: tw, h: th,
      rot: [-0.028, 0.024, 0.02, -0.023][i],
    });
  }
  return out;
}
function drawAlbum() {
  ctx.fillStyle = "rgba(0,0,0,0.9)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = "center"; ctx.textBaseline = "middle";

  const b = albumBookRect();
  const pages = Math.max(1, Math.ceil(album.length / 4));
  if (albumPage > pages - 1) albumPage = pages - 1;

  if (albumZoom < 0) {
    // o livro aberto
    if (ALBUM_IMG) {
      // a foto do livro de couro cobre a área com uma sangria generosa
      ctx.drawImage(ALBUM_IMG, b.x - 56, b.y - 42, b.w + 112, b.h + 84);
    } else {
      // capa de couro + páginas creme + vinco central
      ctx.fillStyle = "#241b13";
      ctx.fillRect(b.x - 16, b.y - 12, b.w + 32, b.h + 24);
      ctx.fillStyle = "#e6dec9";
      ctx.fillRect(b.x, b.y, b.w / 2 - 3, b.h);
      ctx.fillRect(b.x + b.w / 2 + 3, b.y, b.w / 2 - 3, b.h);
      const sp = ctx.createLinearGradient(b.x + b.w / 2 - 36, 0, b.x + b.w / 2 + 36, 0);
      sp.addColorStop(0, "rgba(60,45,30,0)");
      sp.addColorStop(0.5, "rgba(60,45,30,0.5)");
      sp.addColorStop(1, "rgba(60,45,30,0)");
      ctx.fillStyle = sp;
      ctx.fillRect(b.x + b.w / 2 - 36, b.y, 72, b.h);
    }

    if (album.length === 0) {
      ctx.font = "italic 24px 'Segoe Script', 'Comic Sans MS', cursive";
      ctx.fillStyle = "rgba(90,78,62,0.75)";
      ctx.fillText("nenhuma foto colada ainda…", canvas.width / 2, b.y + b.h / 2);
    }

    // as polaroids da página (com sombra e leve rotação)
    const slots = albumSlots();
    for (let i = 0; i < 4; i++) {
      const idx = albumPage * 4 + i;
      if (idx >= album.length) break;
      const s = slots[i], ph = album[idx].cv;
      const hov = albumZoom < 0 && mouse.x > s.x && mouse.x < s.x + s.w &&
                  mouse.y > s.y && mouse.y < s.y + s.h;
      ctx.save();
      ctx.translate(s.x + s.w / 2, s.y + s.h / 2);
      ctx.rotate(s.rot + (hov ? 0.012 : 0));
      ctx.shadowColor = "rgba(0,0,0,0.45)";
      ctx.shadowBlur = 14; ctx.shadowOffsetY = 5;
      const sc = (hov ? 1.045 : 1) * s.w / ph.width;
      ctx.drawImage(ph, -ph.width * sc / 2, -ph.height * sc / 2,
                    ph.width * sc, ph.height * sc);
      ctx.restore();
    }

    // virar páginas
    if (pages > 1) {
      ctx.font = "bold 70px 'Courier New', monospace";
      ctx.fillStyle = albumPage > 0
        ? `rgba(255,255,255,${0.5 + 0.25 * Math.sin(time * 4)})` : "rgba(255,255,255,0.1)";
      ctx.fillText("<", 56, canvas.height / 2);
      ctx.fillStyle = albumPage < pages - 1
        ? `rgba(255,255,255,${0.5 + 0.25 * Math.sin(time * 4)})` : "rgba(255,255,255,0.1)";
      ctx.fillText(">", canvas.width - 56, canvas.height / 2);
    }
    ctx.font = "italic 17px 'Segoe Script', 'Comic Sans MS', cursive";
    ctx.fillStyle = "rgba(200,190,170,0.8)";
    ctx.fillText(`página ${albumPage + 1} de ${pages}`,
                 canvas.width / 2, canvas.height - 16);
  } else {
    // ZOOM numa foto
    const ph = album[albumZoom].cv;
    const sc = Math.min(560 / ph.height, 980 / ph.width);
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 26; ctx.shadowOffsetY = 8;
    ctx.drawImage(ph, canvas.width / 2 - ph.width * sc / 2, 54,
                  ph.width * sc, ph.height * sc);
    ctx.restore();
    if (album.length > 1) {
      ctx.font = "bold 70px 'Courier New', monospace";
      ctx.fillStyle = albumZoom > 0 ? "rgba(255,255,255,0.65)" : "rgba(255,255,255,0.1)";
      ctx.fillText("<", 56, canvas.height / 2);
      ctx.fillStyle = albumZoom < album.length - 1
        ? "rgba(255,255,255,0.65)" : "rgba(255,255,255,0.1)";
      ctx.fillText(">", canvas.width - 56, canvas.height / 2);
    }
    ctx.font = "bold 13px 'Courier New', monospace";
    ctx.fillStyle = "rgba(170,170,170,0.8)";
    ctx.fillText(`${albumZoom + 1} / ${album.length}   ·   ` +
                 (touchUI.seen ? "toque fora para voltar ao álbum"
                               : "clique fora volta ao álbum · ← →"),
                 canvas.width / 2, canvas.height - 20);
  }

  const hovC = mouse.x >= ALB_CLOSE.x && mouse.x <= ALB_CLOSE.x + ALB_CLOSE.w &&
               mouse.y >= ALB_CLOSE.y && mouse.y <= ALB_CLOSE.y + ALB_CLOSE.h;
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(ALB_CLOSE.x, ALB_CLOSE.y, ALB_CLOSE.w, ALB_CLOSE.h);
  ctx.lineWidth = hovC ? 3 : 2;
  ctx.strokeStyle = hovC ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.5)";
  ctx.strokeRect(ALB_CLOSE.x, ALB_CLOSE.y, ALB_CLOSE.w, ALB_CLOSE.h);
  ctx.font = "bold 19px 'Courier New', monospace";
  ctx.fillStyle = "rgba(230,230,230,0.9)";
  ctx.fillText("FECHAR", ALB_CLOSE.x + ALB_CLOSE.w / 2, ALB_CLOSE.y + ALB_CLOSE.h / 2 + 1);
}

function drawDead() {
  ctx.fillStyle = "rgba(0,0,0,0.8)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.font = "bold 34px 'Courier New', monospace";
  ctx.fillStyle = "rgba(200,50,45,0.9)";
  ctx.fillText("A CASA FICOU COM VOCÊ", canvas.width / 2, canvas.height / 2 - 30);
  ctx.font = "bold 14px 'Courier New', monospace";
  ctx.fillStyle = "rgba(180,180,180,0.8)";
  ctx.fillText(`a live caiu no ${FLOOR_NAMES[world.cur]}`, canvas.width / 2, canvas.height / 2 + 16);
  ctx.fillStyle = "rgba(170,170,170,0.8)";
  ctx.fillText("as fotos reveladas se perdem com você",
               canvas.width / 2, canvas.height / 2 + 52);

  for (const b of DEAD_BTNS) {
    const hov = mouse.x >= b.x && mouse.x <= b.x + b.w &&
                mouse.y >= b.y && mouse.y <= b.y + b.h;
    ctx.fillStyle = "rgba(255,255,255,0.07)";
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.lineWidth = (hov || b.id === "jogar") ? 3 : 2;
    ctx.strokeStyle = hov ? "rgba(255,255,255,0.95)"
                          : b.id === "jogar"
                            ? `rgba(255,255,255,${0.6 + 0.25 * Math.sin(time * 3)})`
                            : "rgba(255,255,255,0.45)";
    ctx.strokeRect(b.x, b.y, b.w, b.h);
    ctx.font = "bold 25px 'Courier New', monospace";
    ctx.fillStyle = b.id === "jogar" ? "rgba(255,255,255,0.95)" : "rgba(215,215,215,0.9)";
    ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2 + 1);
  }
  if (!touchUI.seen) {
    ctx.font = "bold 12px 'Courier New', monospace";
    ctx.fillStyle = "rgba(140,140,140,0.7)";
    ctx.fillText("F fotos · ENTER nova run · ESC menu", canvas.width / 2, canvas.height / 2 + 200);
  }
}

// ------------------------------------------------------------------
// Input
// ------------------------------------------------------------------
function deadHit(px2, py2) {
  for (const b of DEAD_BTNS)
    if (px2 >= b.x && px2 <= b.x + b.w && py2 >= b.y && py2 <= b.y + b.h) {
      if (b.id === "fotos") openAlbum("dead");
      else if (b.id === "jogar") newRun();
      else state = "title";
      return;
    }
}
function albumHit(px2, py2) {
  if (px2 >= ALB_CLOSE.x && px2 <= ALB_CLOSE.x + ALB_CLOSE.w &&
      py2 >= ALB_CLOSE.y && py2 <= ALB_CLOSE.y + ALB_CLOSE.h) {
    if (albumZoom >= 0) albumZoom = -1;
    else state = albumReturn;
    return;
  }
  if (albumZoom >= 0) {
    // no zoom: laterais navegam, o resto volta ao livro
    if (px2 > canvas.width * 0.8 && albumZoom < album.length - 1) albumZoom++;
    else if (px2 < canvas.width * 0.2 && albumZoom > 0) albumZoom--;
    else albumZoom = -1;
    return;
  }
  // clicou numa polaroid? → zoom
  const slots = albumSlots();
  for (let i = 0; i < 4; i++) {
    const idx = albumPage * 4 + i;
    if (idx >= album.length) break;
    const s = slots[i];
    if (px2 > s.x - 8 && px2 < s.x + s.w + 8 &&
        py2 > s.y - 8 && py2 < s.y + s.h + 8) {
      albumZoom = idx; return;
    }
  }
  // laterais viram a página
  const pages = Math.max(1, Math.ceil(album.length / 4));
  if (px2 > canvas.width - 120) {
    if (albumPage < pages - 1) { albumPage++; sfxPage(); }
    return;
  }
  if (px2 < 120) {
    if (albumPage > 0) { albumPage--; sfxPage(); }
    return;
  }
  // fora do livro: fecha
  const b = albumBookRect();
  if (px2 < b.x || px2 > b.x + b.w || py2 < b.y || py2 > b.y + b.h)
    state = albumReturn;
}

function enterFullscreen() {
  try {
    if (!document.fullscreenElement && document.documentElement.requestFullscreen)
      document.documentElement.requestFullscreen().then(() => {
        try { screen.orientation.lock("landscape").catch(() => {}); } catch (e) {}
      }).catch(() => {});
  } catch (e) {}
}
function toggleFullscreen() {
  if (document.fullscreenElement) { try { document.exitFullscreen(); } catch (e) {} }
  else enterFullscreen();
}

window.addEventListener("keydown", e => {
  if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space"].includes(e.code))
    e.preventDefault();

  if (state === "cine")  { cineAdvance(); return; }
  if (state === "vinheta") { vinhetaAdvance(); return; }
  if (state === "title") { titleKey(e.code); return; }
  if (state === "chat" || state === "safe" || state === "elevator" ||
      state === "darkroom" || state === "fusebox") {
    if (e.code === "Escape") { state = "play"; live.scroll = 0; }
    return;
  }
  if (state === "win") {
    if (e.code === "Enter") newRun();
    else if (e.code === "Escape") state = "title";
    return;
  }

  if (state === "dead") {
    if (e.code === "Enter") { newRun(); return; }
    if (e.code === "Escape" || e.code === "KeyM") { state = "title"; return; }
    if (e.code === "KeyF") openAlbum("dead");
    return;
  }

  if (e.code === "KeyF") {
    if (state === "play") openAlbum("play");
    else if (state === "album") state = albumReturn;
    return;
  }
  if (state === "album") {
    const pages = Math.max(1, Math.ceil(album.length / 4));
    if (e.code === "Escape") {
      if (albumZoom >= 0) albumZoom = -1;
      else state = albumReturn;
    }
    if (albumZoom >= 0) {
      if (e.code === "ArrowLeft"  && albumZoom > 0) albumZoom--;
      if (e.code === "ArrowRight" && albumZoom < album.length - 1) albumZoom++;
    } else {
      if (e.code === "ArrowLeft"  && albumPage > 0) { albumPage--; sfxPage(); }
      if (e.code === "ArrowRight" && albumPage < pages - 1) { albumPage++; sfxPage(); }
    }
    return;
  }
  if (e.code === "KeyE" && state === "play" && prompt && prompt.action) {
    prompt.action(); return;
  }
  if (e.code === "KeyR" && state === "play") { toggleFilm(); return; }
  keys.add(e.code);
});
window.addEventListener("keyup", e => keys.delete(e.code));
// alt-tab com tecla pressionada: o keyup se perde e o jogador andaria sozinho
function limpaEntradas() {
  keys.clear();
  touchUI.joyId = null; touchUI.jx = 0; touchUI.jy = 0;
  touchUI.jkx = 0; touchUI.jky = 0;
  touchUI.aimId = null; touchUI.akx = 0; touchUI.aky = 0;
}
window.addEventListener("blur", limpaEntradas);
document.addEventListener("visibilitychange",
  () => { if (document.hidden) limpaEntradas(); });

canvas.addEventListener("mousemove", e => {
  const r = canvas.getBoundingClientRect();
  mouse.x = (e.clientX - r.left) * (canvas.width / r.width);
  mouse.y = (e.clientY - r.top) * (canvas.height / r.height);
  aimSource = "mouse";
});
canvas.addEventListener("contextmenu", e => e.preventDefault());
canvas.addEventListener("mousedown", e => {
  const rct = canvas.getBoundingClientRect();
  const mx = (e.clientX - rct.left) * (canvas.width / rct.width);
  const my = (e.clientY - rct.top) * (canvas.height / rct.height);
  if (state === "cine")  { cineAdvance(mx, my); return; }
  if (state === "vinheta") { vinhetaAdvance(); return; }
  if (state === "title") { titleHit(mx, my); return; }
  if (state === "dead")  { deadHit(mx, my); return; }
  if (state === "album") { albumHit(mx, my); return; }
  if (state === "chat")  { chatHit(mx, my); return; }
  if (state === "safe")  { safeHit(mx, my); return; }
  if (state === "elevator") { elevatorHit(mx, my); return; }
  if (state === "fusebox") { fuseboxHit(mx, my); return; }
  if (state === "darkroom") { darkroomHit(mx, my); return; }
  if (state === "win")   { winHit(mx, my); return; }
  if (state !== "play") return;
  if (e.button === 0 && liveInPanel(mx, my)) { state = "chat"; live.scroll = 0; return; }
  if (e.button === 0 && camHudHit(mx, my)) { toggleFilm(); return; }
  if (e.button === 2) takePhoto();
});

// rolagem do chat com a roda do mouse
window.addEventListener("wheel", e => {
  if (state !== "chat") return;
  const maxS = Math.max(0, live.msgs.length - 20);
  live.scroll = Math.max(0, Math.min(maxS, live.scroll + (e.deltaY < 0 ? 3 : -3)));
}, { passive: true });

// toque
function tcoord(t) {
  const rct = canvas.getBoundingClientRect();
  return {
    x: (t.clientX - rct.left) * (canvas.width / rct.width),
    y: (t.clientY - rct.top) * (canvas.height / rct.height),
  };
}
function updateMoveStick(p) {
  const dx = p.x - MOVE_STICK.x, dy = p.y - MOVE_STICK.y;
  const d = Math.hypot(dx, dy);
  const cl = Math.min(d, MOVE_STICK.travel) / (d || 1);
  touchUI.jkx = dx * cl; touchUI.jky = dy * cl;
  touchUI.jx = touchUI.jkx / MOVE_STICK.travel;
  touchUI.jy = touchUI.jky / MOVE_STICK.travel;
}
function updateAimStick(p) {
  const dx = p.x - AIM_STICK.x, dy = p.y - AIM_STICK.y;
  const d = Math.hypot(dx, dy);
  if (d > 8) { aimDirStick = Math.atan2(dy, dx); aimSource = "stick"; }
  const cl = Math.min(d, AIM_STICK.travel) / (d || 1);
  touchUI.akx = dx * cl; touchUI.aky = dy * cl;
}

canvas.addEventListener("touchstart", e => {
  e.preventDefault();
  touchUI.seen = true;
  for (const t of e.changedTouches) {
    const p = tcoord(t);
    if (state === "cine")  { cineAdvance(p.x, p.y); return; }
    if (state === "vinheta") { vinhetaAdvance(); return; }
    if (state === "title") { enterFullscreen(); titleHit(p.x, p.y); return; }
    if (state === "dead")  { deadHit(p.x, p.y); return; }
    if (state === "album") { albumHit(p.x, p.y); return; }
    if (state === "chat") {
      chatHit(p.x, p.y);
      if (state === "chat") { chatDragId = t.identifier; chatDragY = p.y; }
      return;
    }
    if (state === "safe")  { safeHit(p.x, p.y); return; }
    if (state === "elevator") { elevatorHit(p.x, p.y); return; }
    if (state === "fusebox") { fuseboxHit(p.x, p.y); return; }
    if (state === "darkroom") { darkroomHit(p.x, p.y); return; }
    if (state === "win")   { winHit(p.x, p.y); return; }
    if (liveInPanel(p.x, p.y)) { state = "chat"; live.scroll = 0; return; }
    if (camHudHit(p.x, p.y)) { toggleFilm(); continue; }
    if (Math.hypot(p.x - BTN_PHOTO.x, p.y - BTN_PHOTO.y) < BTN_PHOTO.r + 10) {
      takePhoto(); continue;
    }
    if (Math.hypot(p.x - BTN_ALBUM.x, p.y - BTN_ALBUM.y) < BTN_ALBUM.r + 16) {
      openAlbum("play"); continue;
    }
    if (Math.hypot(p.x - BTN_FS.x, p.y - BTN_FS.y) < BTN_FS.r + 14) {
      toggleFullscreen(); continue;
    }
    if (prompt && prompt.action &&
        Math.hypot(p.x - BTN_USE.x, p.y - BTN_USE.y) < BTN_USE.r + 10) {
      prompt.action(); continue;
    }
    if (touchUI.aimId === null &&
        Math.hypot(p.x - AIM_STICK.x, p.y - AIM_STICK.y) < AIM_STICK.r + 40) {
      touchUI.aimId = t.identifier;
      updateAimStick(p);
    } else if (touchUI.joyId === null &&
               Math.hypot(p.x - MOVE_STICK.x, p.y - MOVE_STICK.y) < MOVE_STICK.r + 50) {
      touchUI.joyId = t.identifier;
      updateMoveStick(p);
    }
  }
}, { passive: false });

let chatDragId = null, chatDragY = 0;
canvas.addEventListener("touchmove", e => {
  e.preventDefault();
  for (const t of e.changedTouches) {
    const p = tcoord(t);
    if (state === "chat" && t.identifier === chatDragId) {
      const maxS = Math.max(0, live.msgs.length - 20);
      live.scroll = Math.max(0, Math.min(maxS,
        live.scroll + (p.y - chatDragY) / 26));
      chatDragY = p.y;
      continue;
    }
    if (t.identifier === touchUI.joyId) updateMoveStick(p);
    else if (t.identifier === touchUI.aimId) updateAimStick(p);
  }
}, { passive: false });

function touchEnd(e) {
  e.preventDefault();
  for (const t of e.changedTouches) {
    if (t.identifier === touchUI.joyId) {
      touchUI.joyId = null;
      touchUI.jx = 0; touchUI.jy = 0; touchUI.jkx = 0; touchUI.jky = 0;
    }
    if (t.identifier === touchUI.aimId) {
      touchUI.aimId = null;
      touchUI.akx = 0; touchUI.aky = 0;
    }
    if (t.identifier === chatDragId) chatDragId = null;
  }
}
canvas.addEventListener("touchend", touchEnd, { passive: false });
canvas.addEventListener("touchcancel", touchEnd, { passive: false });

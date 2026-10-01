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
  // porta da frente (térreo)
  if (world.cur === 1 && fl().door) {
    const d = fl().door;
    if (Math.hypot(d.x - player.x, d.y - player.y) < 2.4) {
      if (world.flags.key)
        prompt = { text: "ABRIR A PORTA COM A CHAVE", action: winGame };
      else {
        prompt = { text: "TRANCADA. PRECISA DE UMA CHAVE", action: null };
        if (!live.hinted.has("door")) { live.hinted.add("door"); liveEvent("doorlock"); }
      }
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
  // quadro de fusíveis (porão)
  if (fl().fusebox && !world.flags.elevatorOn) {
    const fb = fl().fusebox;
    if (Math.hypot(fb.x - player.x, fb.y - player.y) < 2.4) {
      const total = world.flags.fusesIn;
      if (total >= 3)
        prompt = { text: "LIGAR A CHAVE GERAL", action: () => {
          world.flags.elevatorOn = true;
          sfxSting(); liveEvent("elevator"); saveRun();
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
    const d = Math.hypot(player.x - g.x, player.y - g.y);
    nearest = Math.min(nearest, d);
    g.chase = d < 18 || attractT > 0;
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
    if (!g.chase) {
      g.x += (player.x - g.x) / d * GHOST_SPEED * 0.30 * dt;
      g.y += (player.y - g.y) / d * GHOST_SPEED * 0.30 * dt;
    }
    if (d < 1.15) {
      sanity -= GHOST_DMG * dt;
      shake = 1;
      if (dmgSfxT <= 0) { sfxDamage(); dmgSfxT = 0.5; }
    }
  }
  if (nearest > 10 && sanity < 100) sanity = Math.min(100, sanity + 3.5 * dt);
  if (sanity <= 0) { state = "dead"; sfxDeath(); clearRun(); return; }

  // batimento
  hbT -= dt;
  if (nearest < 20 && hbT <= 0) {
    hbT = 0.32 + (nearest / 20) * 1.1;
    sfxHeart(0.22 * (1 - nearest / 22));
  }

  // refis de filme
  for (const f of fl().films) {
    if (f.taken) continue;
    if (Math.hypot(f.x - player.x, f.y - player.y) < 1.1) {
      f.taken = true;
      world.taken.add(f.id);
      film = Math.min(FILM_MAX, film + FILM_REFILL);
      sfxPickup();
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
  if (world.cur < NFLOORS - 1) defs.push({ r: STAIR_UP_RECT, up: true });
  if (world.cur > 0) defs.push({ r: STAIR_DOWN_RECT, up: false });
  for (const d of defs) {
    const L0 = Math.max(lightAt(d.r.x + 1, d.r.y + 1), lightAt(d.r.x + 1, d.r.y + 3));
    if (L0 <= 0.03) continue;
    const cxm = (d.r.x + d.r.w / 2) * CELL;
    const steps = 6, stepH = d.r.h * CELL / steps;
    for (let s = 0; s < steps; s++) {
      const t = s / (steps - 1);                       // 0 = pé (sul), 1 = fundo
      const y = (d.r.y + d.r.h) * CELL - (s + 1) * stepH;
      // subir = degraus clareiam ao fundo; descer = somem na escuridão
      const bright = d.up ? 0.30 + 0.70 * t : 0.85 - 0.80 * t;
      const w2 = d.r.w * CELL * (1 - t * (d.up ? 0.30 : 0.12));
      const a = Math.min(1, L0 * 1.7) * bright;
      ctx.fillStyle = `rgba(206,214,232,${(a * 0.9).toFixed(3)})`;
      ctx.fillRect(cxm - w2 / 2, y + 1.5, w2, stepH - 3);
    }
    ctx.font = "bold 8px 'Courier New', monospace";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillStyle = `rgba(200,214,240,${Math.min(1, L0 * 1.6).toFixed(3)})`;
    ctx.fillText(d.up ? "SOBE" : "DESCE", cxm, (d.r.y + d.r.h) * CELL + 6);
  }
}

// ------------------------------------------------------------------
// Render top-down
// ------------------------------------------------------------------
function render() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (state === "cine")  { drawCinematic(); return; }
  if (state === "title") { drawTitle(); return; }

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
  // escadas emitem um brilho fraco (precisam ser encontráveis)
  if (world.cur < NFLOORS - 1)
    addGlow(STAIR_UP_RECT.x + 1, STAIR_UP_RECT.y + 2, 2.8, 0.13);
  if (world.cur > 0)
    addGlow(STAIR_DOWN_RECT.x + 1, STAIR_DOWN_RECT.y + 2, 2.8, 0.13);

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
  // itens especiais (fusível F, chave K)
  ctx.font = "bold 14px 'Courier New', monospace";
  for (const it of world.items) {
    if (it.taken || it.floor !== world.cur) continue;
    const L = Math.min(1, lightAt(it.x, it.y) * 1.8);
    if (L <= 0.03) continue;
    ctx.fillStyle = it.kind === "key"
      ? `rgba(240,210,110,${L})` : `rgba(255,170,90,${L})`;
    ctx.fillText(it.kind === "key" ? "K" : "F", it.x * CELL, it.y * CELL);
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
  if (state === "win") drawWin();
}

// ------------------------------------------------------------------
// HUD e telas
// ------------------------------------------------------------------
const BTN_PHOTO  = { x: 1050, y: 360, r: 62 };
const BTN_ALBUM  = { x: 1118, y: 70,  r: 46 };
const BTN_FS     = { x: 1118, y: 182, r: 40 };
const BTN_USE    = { x: 150,  y: 370, r: 52 };
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

function drawHUD() {
  const M = touchUI.seen;
  ctx.font = M ? "bold 19px 'Courier New', monospace" : "bold 13px 'Courier New', monospace";
  ctx.textAlign = "left"; ctx.textBaseline = "middle";

  const y1 = M ? 30 : 20;
  ctx.fillStyle = "rgba(190,190,190,0.8)";
  ctx.fillText(FLOOR_NAMES[world.cur], 12, y1);
  ctx.fillStyle = film > 0 ? "rgba(190,190,190,0.8)" : "rgba(230,80,70,0.9)";
  ctx.fillText(`FILME ${"▮".repeat(film)}${"▯".repeat(Math.max(0, FILM_MAX - film))}`,
               M ? 180 : 130, y1);

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
    ctx.fillText("WASD mover · mouse lanterna · botão direito FOTO · F álbum · E usar",
                 12, canvas.height - 14);
  }
  ctx.fillStyle = flashCd <= 0 && film > 0 ? "rgba(120,255,120,0.7)" : "rgba(255,120,120,0.7)";
  ctx.fillText(film <= 0 ? "CAMERA [ SEM FILME ]" :
               flashCd <= 0 ? "CAMERA [ PRONTA ]" : "CAMERA [ RECARREGANDO ]",
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

function drawAlbum() {
  ctx.fillStyle = "rgba(0,0,0,0.86)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.font = "bold 18px 'Courier New', monospace";
  ctx.fillStyle = "rgba(200,200,200,0.9)";
  ctx.fillText("ÁLBUM DE FOTOS", canvas.width / 2, 36);

  if (album.length === 0) {
    ctx.font = "bold 14px 'Courier New', monospace";
    ctx.fillStyle = "rgba(150,150,150,0.7)";
    ctx.fillText("nenhuma foto revelada ainda", canvas.width / 2, canvas.height / 2);
  } else {
    const ph = album[albumIdx];
    const maxH = 520;
    const sc = Math.min(maxH / ph.cv.height, 900 / ph.cv.width);
    const w = ph.cv.width * sc, h = ph.cv.height * sc;
    ctx.drawImage(ph.cv, canvas.width / 2 - w / 2, 70, w, h);
    ctx.font = "bold 13px 'Courier New', monospace";
    ctx.fillStyle = "rgba(170,170,170,0.8)";
    ctx.fillText(`${albumIdx + 1} / ${album.length}`, canvas.width / 2, canvas.height - 56);
  }

  if (album.length > 1) {
    ctx.font = "bold 76px 'Courier New', monospace";
    ctx.fillStyle = albumIdx > 0
      ? `rgba(255,255,255,${0.55 + 0.25 * Math.sin(time * 4)})` : "rgba(255,255,255,0.12)";
    ctx.fillText("<", 72, canvas.height / 2);
    ctx.fillStyle = albumIdx < album.length - 1
      ? `rgba(255,255,255,${0.55 + 0.25 * Math.sin(time * 4)})` : "rgba(255,255,255,0.12)";
    ctx.fillText(">", canvas.width - 72, canvas.height / 2);
  }

  const hovC = mouse.x >= ALB_CLOSE.x && mouse.x <= ALB_CLOSE.x + ALB_CLOSE.w &&
               mouse.y >= ALB_CLOSE.y && mouse.y <= ALB_CLOSE.y + ALB_CLOSE.h;
  ctx.fillStyle = "rgba(255,255,255,0.07)";
  ctx.fillRect(ALB_CLOSE.x, ALB_CLOSE.y, ALB_CLOSE.w, ALB_CLOSE.h);
  ctx.lineWidth = hovC ? 3 : 2;
  ctx.strokeStyle = hovC ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.5)";
  ctx.strokeRect(ALB_CLOSE.x, ALB_CLOSE.y, ALB_CLOSE.w, ALB_CLOSE.h);
  ctx.font = "bold 19px 'Courier New', monospace";
  ctx.fillStyle = "rgba(230,230,230,0.9)";
  ctx.fillText("FECHAR", ALB_CLOSE.x + ALB_CLOSE.w / 2, ALB_CLOSE.y + ALB_CLOSE.h / 2 + 1);

  ctx.font = "bold 12px 'Courier New', monospace";
  ctx.fillStyle = "rgba(140,140,140,0.7)";
  ctx.fillText(touchUI.seen ? "toque nas setas para passar as fotos"
                            : "← → navegar   ·   F fechar",
               canvas.width / 2, canvas.height - 28);
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
      if (b.id === "fotos") {
        state = "album"; albumReturn = "dead";
        albumIdx = Math.max(0, album.length - 1);
      } else if (b.id === "jogar") newRun();
      else state = "title";
      return;
    }
}
function albumHit(px2, py2) {
  if (px2 >= ALB_CLOSE.x && px2 <= ALB_CLOSE.x + ALB_CLOSE.w &&
      py2 >= ALB_CLOSE.y && py2 <= ALB_CLOSE.y + ALB_CLOSE.h) {
    state = albumReturn; return;
  }
  if (album.length && px2 > canvas.width * 0.66)
    albumIdx = Math.min(album.length - 1, albumIdx + 1);
  else if (album.length && px2 < canvas.width * 0.33 && albumIdx > 0) albumIdx--;
  else state = albumReturn;
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
  if (state === "title") { titleKey(e.code); return; }
  if (state === "chat" || state === "safe" || state === "elevator") {
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
    if (e.code === "KeyF") {
      state = "album"; albumReturn = "dead";
      albumIdx = Math.max(0, album.length - 1);
    }
    return;
  }

  if (e.code === "KeyF") {
    if (state === "play") {
      state = "album"; albumReturn = "play";
      albumIdx = Math.max(0, album.length - 1);
    } else if (state === "album") state = albumReturn;
    return;
  }
  if (state === "album") {
    if (e.code === "Escape") state = albumReturn;
    if (e.code === "ArrowLeft"  && albumIdx > 0) albumIdx--;
    if (e.code === "ArrowRight" && albumIdx < album.length - 1) albumIdx++;
    return;
  }
  if (e.code === "KeyE" && state === "play" && prompt && prompt.action) {
    prompt.action(); return;
  }
  keys.add(e.code);
});
window.addEventListener("keyup", e => keys.delete(e.code));

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
  if (state === "title") { titleHit(mx, my); return; }
  if (state === "dead")  { deadHit(mx, my); return; }
  if (state === "album") { albumHit(mx, my); return; }
  if (state === "chat")  { chatHit(mx, my); return; }
  if (state === "safe")  { safeHit(mx, my); return; }
  if (state === "elevator") { elevatorHit(mx, my); return; }
  if (state === "win")   { winHit(mx, my); return; }
  if (state !== "play") return;
  if (e.button === 0 && liveInPanel(mx, my)) { state = "chat"; live.scroll = 0; return; }
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
    if (state === "win")   { winHit(p.x, p.y); return; }
    if (liveInPanel(p.x, p.y)) { state = "chat"; live.scroll = 0; return; }
    if (Math.hypot(p.x - BTN_PHOTO.x, p.y - BTN_PHOTO.y) < BTN_PHOTO.r + 16) {
      takePhoto(); continue;
    }
    if (Math.hypot(p.x - BTN_ALBUM.x, p.y - BTN_ALBUM.y) < BTN_ALBUM.r + 16) {
      state = "album"; albumReturn = "play";
      albumIdx = Math.max(0, album.length - 1); continue;
    }
    if (Math.hypot(p.x - BTN_FS.x, p.y - BTN_FS.y) < BTN_FS.r + 14) {
      toggleFullscreen(); continue;
    }
    if (prompt && prompt.action &&
        Math.hypot(p.x - BTN_USE.x, p.y - BTN_USE.y) < BTN_USE.r + 16) {
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

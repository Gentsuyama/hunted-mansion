"use strict";
// ==================================================================
// FOTO — raycaster realista + passe VHS + álbum
// ==================================================================
let VHS_S = null, RS_S = null;   // buffers reutilizados (evita pausas de GC)

function inFlashCone(ex, ey, dir) {
  const dx = ex - player.x, dy = ey - player.y;
  const d = Math.hypot(dx, dy);
  if (d > FLASH.range * 0.85) return false;
  let da = Math.atan2(dy, dx) - dir;
  while (da > Math.PI) da -= 2 * Math.PI;
  while (da < -Math.PI) da += 2 * Math.PI;
  if (Math.abs(da) > FLASH.halfAngle * 0.95) return false;
  return hasLOS(player.x, player.y, ex, ey);
}

function takePhoto() {
  if (flashCd > 0) return;
  const cam = world.flags.cam;
  // FOTO REAL exige: tampa na câmera + filme CARREGADO (R põe/tira) + rolos
  const fotoReal = cam.tampa && world.flags.filmLoaded && film > 0;

  flashT = 1; flashCd = FLASH.cooldown;
  flashDir = aimAngle();
  attractT = 7;                        // o flash SEMPRE atrai — mesmo vazio
  sfxCamera();

  if (fotoReal) {
    film--;
    photoCount++;
    window._espelhoPend = -1; window._pianoPend = -1;
    const cv = renderPhoto(player.x, player.y, flashDir);
    album.push({ cv, caption: `FOTO ${photoCount} · ${FLOOR_NAMES[world.cur]}` });
    if (album.length > ALBUM_MAX) album.shift();
    // a noiva apareceu no reflexo? (desperta DEPOIS da foto renderizada)
    if (window._espelhoPend >= 0) {
      soulsOnMirror(window._espelhoPend);
      window._espelhoPend = -1;
    }
    // modo puzzle: a foto do piano acordou a pianista
    if (window._pianoPend >= 0) {
      const pf = window._pianoPend; window._pianoPend = -1;
      if (world.flags.souls.olivia.state === "dormant") {
        soulAwaken("olivia", pf);
        livePush(liveRandUser(), "o PIANO respondeu a foto… tem alguém sentado nele agora");
      }
    }

    // CAPTURA ecos no cone (com filme, o eco vai para o filme)
    for (const g of fl().ghosts) {
      if (g.respawn > 0) continue;
      if (inFlashCone(g.x, g.y, flashDir)) {
        g.respawn = 10 + Math.random() * 6;
        g.chase = false;
        sfxDissolve();
        soulsOnEcoCaptured();            // 7 ecos no filme despertam a Olívia
        for (let i = 0; i < 26; i++) {
          const a = Math.random() * 6.28, s = 4 + Math.random() * 14;
          particles.push({
            x: g.x, y: g.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
            life: 0.7, ch: "Ψ*·:"[Math.random() * 4 | 0],
          });
        }
      }
    }
  } else {
    // FLASH VAZIO: nada é registrado — os ecos são só ARREMESSADOS
    sfxDry();
    let bateu = false;
    for (const g of fl().ghosts) {
      if (g.respawn > 0) continue;
      if (inFlashCone(g.x, g.y, flashDir)) {
        bateu = true;
        const d = Math.hypot(g.x - player.x, g.y - player.y) || 1;
        g.x = Math.max(2, Math.min(COLS - 2, g.x + (g.x - player.x) / d * 8));
        g.y = Math.max(2, Math.min(ROWS - 2, g.y + (g.y - player.y) / d * 8));
        g.wx = g.x; g.wy = g.y;
        g.chase = false; g.stun = 1.3;
        for (let i = 0; i < 10; i++) {
          const a = Math.random() * 6.28, s = 3 + Math.random() * 8;
          particles.push({ x: g.x, y: g.y, vx: Math.cos(a) * s,
                           vy: Math.sin(a) * s, life: 0.4, ch: "·:" [Math.random() * 2 | 0] });
        }
      }
    }
    if (bateu && cam.tampa && !live.hinted.has("flashvazio")) {
      live.hinted.add("flashvazio");
      livePush(liveRandUser(), "o flash EMPURROU mas não prendeu — sem filme não registra nada");
    }
  }

  // almas nomeadas: captura (com retrato+obturador+filme) ou repelão
  soulsOnFlash(flashDir, fotoReal);
  saveRun();
}

// cena realista: raycaster por pixel com textura procedural
function renderRealisticScene(c, px, py, FR, PW, PH, dirX, dirY, planeX, planeY, MAXD, W2) {
  const H2 = Math.round(PH / 2);
  if (!RS_S || RS_S.img.width !== W2 || RS_S.img.height !== H2) {
    RS_S = { img: new ImageData(W2, H2), tmp: document.createElement("canvas") };
    RS_S.tmp.width = W2; RS_S.tmp.height = H2;
  }
  const img = RS_S.img;
  const d = img.data;
  const zbuf = new Float32Array(W2);
  const posZ = 0.675 * H2;

  function h2(x, y) {
    let n = x * 374761393 + y * 668265263 + 1013904223;
    n = (n ^ (n >> 13)) * 1274126177;
    return ((n ^ (n >> 16)) >>> 0) / 4294967295;
  }
  function vn(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const fx = x - xi, fy = y - yi;
    const a = h2(xi, yi), b = h2(xi + 1, yi);
    const e = h2(xi, yi + 1), f = h2(xi + 1, yi + 1);
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    return a + (b - a) * sx + (e - a) * sy + (a - b - e + f) * sx * sy;
  }
  function fbm(x, y) {
    return 0.62 * vn(x, y) + 0.27 * vn(x * 2.1 + 13.7, y * 2.1 + 7.3)
         + 0.11 * vn(x * 4.3 + 31.1, y * 4.3 + 17.9);
  }

  // décor do andar atual: papel de parede, banheiros (azulejo) e tapetes
  const FL = world.cur;
  const RG = fl().rugGrid;
  const BANH = fl().banheiros || [];

  for (let col = 0; col < W2; col++) {
    const camX = 2 * col / W2 - 1;
    const rdx = dirX + planeX * camX, rdy = dirY + planeY * camX;
    let mapX = px | 0, mapY = py | 0;
    const dX = Math.abs(1 / (rdx || 1e-9)), dY = Math.abs(1 / (rdy || 1e-9));
    let stepX, stepY, sideX, sideY;
    if (rdx < 0) { stepX = -1; sideX = (px - mapX) * dX; }
    else         { stepX =  1; sideX = (mapX + 1 - px) * dX; }
    if (rdy < 0) { stepY = -1; sideY = (py - mapY) * dY; }
    else         { stepY =  1; sideY = (mapY + 1 - py) * dY; }

    let side = 0, perp = MAXD, hit = false;
    for (let it = 0; it < 200; it++) {
      if (sideX < sideY) { sideX += dX; mapX += stepX; side = 0; }
      else               { sideY += dY; mapY += stepY; side = 1; }
      if (mapX < 0 || mapY < 0 || mapX >= COLS || mapY >= ROWS) break;
      const tHit = grid[mapY * COLS + mapX];
      if (tHit === T_WALL || tHit === T_DOOR) {   // porta NÃO é vão (vão = parede falsa)
        perp = side === 0 ? sideX - dX : sideY - dY;
        hit = true; break;
      }
      if (Math.min(sideX, sideY) > MAXD) break;
    }
    perp = Math.max(perp, 0.12);
    zbuf[col] = perp;

    const wallH = H2 * 1.35 / perp;
    const start = H2 / 2 - wallH / 2;
    const s0 = Math.max(0, Math.round(start));
    const s1 = Math.min(H2 - 1, Math.round(start + wallH));
    const centerFall = 1 - 0.42 * camX * camX;

    const uw = side === 0 ? py + perp * rdy : px + perp * rdx;  // contínuo
    // esta parede é de um BANHEIRO? (célula atingida encosta na sala)
    let azulejo = false;
    if (hit)
      for (const br of BANH)
        if (mapX >= br.x - 1 && mapX <= br.x + br.w &&
            mapY >= br.y - 1 && mapY <= br.y + br.h) { azulejo = true; break; }

    for (let yy = 0; yy < H2; yy++) {
      let rr = 0, gg = 0, bb = 0;
      if (hit && yy >= s0 && yy <= s1) {
        const texY = (yy - start) / wallH;
        const t = fbm(uw * 5.1, texY * 5.1 + mapY * 2.7);
        let L = Math.max(0, 1 - perp / 28) * centerFall;
        if (side === 1) L *= 0.72;
        // papel de parede POR ANDAR (e azulejo nos banheiros)
        let r3 = 208, g3 = 194, b3 = 166, pat;
        if (azulejo) {                 // azulejo claro com rejunte
          const gx = ((uw * 3) % 1 + 1) % 1, gy = ((texY * 4) % 1 + 1) % 1;
          r3 = 184; g3 = 200; b3 = 196;
          pat = (gx < 0.07 || gx > 0.93 || gy < 0.08 || gy > 0.92)
            ? 0.5 : 1.02 + t * 0.3;
        } else if (FL === 1) {         // térreo: listras verde-musgo
          const sx2 = ((uw * 2) % 1 + 1) % 1;
          r3 = 168; g3 = 178; b3 = 150;
          pat = (sx2 < 0.5 ? 1.04 : 0.82) * (0.6 + 0.55 * t);
        } else if (FL === 2) {         // 1º andar: damasco vinho (losangos)
          const dd2 = Math.abs(((uw * 1.5) % 1 + 1) % 1 - 0.5) +
                      Math.abs(((texY * 1.5) % 1 + 1) % 1 - 0.5);
          r3 = 186; g3 = 150; b3 = 148;
          pat = (dd2 < 0.4 ? 1.07 : 0.82) * (0.6 + 0.5 * t);
        } else if (FL === 3) {         // 2º andar: florais ocre (pontinhos)
          const fl3 = h2(Math.floor(uw * 3), Math.floor(texY * 4));
          r3 = 198; g3 = 182; b3 = 142;
          pat = (fl3 > 0.86 ? 1.32 : 0.88) * (0.6 + 0.5 * t);
        } else if (FL === 4) {         // 3º andar: listras finas frias
          const sx3 = ((uw * 4) % 1 + 1) % 1;
          r3 = 162; g3 = 168; b3 = 182;
          pat = ((sx3 < 0.14 || (sx3 > 0.3 && sx3 < 0.38)) ? 0.76 : 1.02) *
                (0.62 + 0.48 * t);
        } else if (FL === NFLOORS - 1) { // ateliê: painéis de madeira escura
          r3 = 142; g3 = 112; b3 = 84;
          pat = (0.72 + 0.45 * vn(uw * 1.3, texY * 7 + mapY)) *
                (((texY * 2) % 1 + 1) % 1 < 0.06 ? 0.68 : 1);
        } else {                       // porão: pedra crua e fria
          r3 = 172; g3 = 168; b3 = 156;
          pat = 0.45 + 0.8 * t;
        }
        L *= pat;
        if (texY > 0.88) L *= 0.55;    // rodapé
        rr = r3 * L; gg = g3 * L; bb = b3 * L;
      } else if (yy > H2 / 2) {
        const rowDist = posZ / (yy - H2 / 2);
        const wx2 = px + rdx * rowDist, wy2 = py + rdy * rowDist;
        const t = fbm(wx2 * 1.6, wy2 * 1.6);
        const L = Math.max(0, 1 - rowDist / 24) * centerFall;
        const cx4 = wx2 | 0, cy4 = wy2 | 0;
        const rg = (RG && cx4 >= 0 && cy4 >= 0 && cx4 < COLS && cy4 < ROWS)
          ? RG[cy4 * COLS + cx4] : 0;
        if (rg === 1) {                // PASSADEIRA vinho com barra dourada
          const fx4 = wx2 - cx4, fy4 = wy2 - cy4;
          const id4 = cy4 * COLS + cx4;
          // barra SÓ no perímetro do tapete (não a cada célula)
          const borda =
            (RG[id4 - 1] !== 1 && fx4 < 0.2) || (RG[id4 + 1] !== 1 && fx4 > 0.8) ||
            (RG[id4 - COLS] !== 1 && fy4 < 0.2) || (RG[id4 + COLS] !== 1 && fy4 > 0.8);
          const k = L * (0.55 + 0.38 * t);
          rr = (borda ? 126 : 96) * k;
          gg = (borda ? 102 : 36) * k;
          bb = (borda ? 46 : 33) * k;
        } else if (rg === 2) {         // TAPETE grande azul-petróleo
          const wv = vn(wx2 * 2.4, wy2 * 2.4);
          const k = L * (0.7 + 0.6 * wv);
          rr = 64 * k; gg = 78 * k; bb = 94 * k;
        } else if (rg === 3) {         // banheiro: ladrilho xadrez
          const ck = ((cx4 + cy4) & 1) ? 1.0 : 0.55;
          const v2 = 150 * L * ck * (0.75 + 0.3 * t);
          rr = v2; gg = v2 * 1.05; bb = v2;
        } else {                       // assoalho manchado
          const L2 = L * (0.45 + 0.85 * t);
          rr = 138 * L2; gg = 124 * L2; bb = 104 * L2;
        }
      } else {
        const t = fbm(col * 0.06 + 99, yy * 0.06);
        const v = 6 + 12 * t * centerFall;
        rr = v; gg = v; bb = v * 0.94;
      }
      const i4 = (yy * W2 + col) * 4;
      d[i4] = rr; d[i4 + 1] = gg; d[i4 + 2] = bb; d[i4 + 3] = 255;
    }
  }

  RS_S.tmp.getContext("2d").putImageData(img, 0, 0);
  c.imageSmoothingEnabled = true;
  c.drawImage(RS_S.tmp, FR, FR, PW, PH);
  return zbuf;
}

// passe "fita VHS 1996"
function vhsPass(cv, x, y, iw, ih) {
  const c = cv.getContext("2d");
  if (!VHS_S || VHS_S.out.width !== iw || VHS_S.out.height !== ih) {
    VHS_S = {
      tmp: document.createElement("canvas"),
      out: document.createElement("canvas"),
      ch:  document.createElement("canvas"),
    };
    VHS_S.tmp.width = (iw * 0.55) | 0; VHS_S.tmp.height = (ih * 0.5) | 0;
    VHS_S.out.width = iw; VHS_S.out.height = ih;
    VHS_S.ch.width = iw;  VHS_S.ch.height = ih;
  }
  const tmp = VHS_S.tmp, out = VHS_S.out;
  const tc = tmp.getContext("2d");
  tc.clearRect(0, 0, tmp.width, tmp.height);
  tc.drawImage(cv, x, y, iw, ih, 0, 0, tmp.width, tmp.height);

  const o = out.getContext("2d");
  o.globalCompositeOperation = "source-over";
  o.fillStyle = "#000"; o.fillRect(0, 0, iw, ih);

  function channel(color, dx2, dy2) {
    const c2 = VHS_S.ch.getContext("2d");
    c2.globalCompositeOperation = "source-over";
    c2.clearRect(0, 0, iw, ih);
    c2.drawImage(tmp, 0, 0, iw, ih);
    c2.globalCompositeOperation = "multiply";
    c2.fillStyle = color; c2.fillRect(0, 0, iw, ih);
    o.globalCompositeOperation = "lighter";
    o.drawImage(VHS_S.ch, dx2, dy2);
  }
  channel("#ff0000", 1.8, 0);
  channel("#00ff00", 0, 0);
  channel("#0000ff", -1.8, 0.6);

  o.globalCompositeOperation = "multiply";
  o.fillStyle = "rgba(238,224,168,0.30)"; o.fillRect(0, 0, iw, ih);
  o.globalCompositeOperation = "lighten";
  o.fillStyle = "rgb(24,26,18)"; o.fillRect(0, 0, iw, ih);
  o.globalCompositeOperation = "source-over";

  o.fillStyle = "rgba(0,0,0,0.22)";
  for (let yy = 0; yy < ih; yy += 3) o.fillRect(0, yy, iw, 1);

  const nb = 1 + (Math.random() * 2 | 0);
  for (let i = 0; i < nb; i++) {
    const by = Math.random() * ih, bh2 = 2 + Math.random() * 7;
    const off = (Math.random() - 0.5) * 16;
    o.drawImage(out, 0, by, iw, bh2, off, by, iw, bh2);
  }
  for (let i = 0; i < 7; i++) if (Math.random() < 0.6) {
    o.fillStyle = `rgba(255,255,255,${0.08 + Math.random() * 0.22})`;
    o.fillRect(Math.random() * iw, Math.random() * ih, 20 + Math.random() * 90, 1);
  }
  for (let i = 0; i < 800; i++) {
    const b = (Math.random() * 255) | 0;
    o.fillStyle = `rgba(${b},${b},${b},0.06)`;
    o.fillRect(Math.random() * iw, Math.random() * ih, 2, 1);
  }

  o.fillStyle = "rgba(255,64,52,0.95)";
  o.beginPath(); o.arc(24, 22, 5, 0, 7); o.fill();
  o.font = "bold 13px 'Courier New', monospace";
  o.textAlign = "left"; o.textBaseline = "middle";
  o.fillStyle = "rgba(235,235,235,0.92)";
  o.fillText("REC", 36, 22);
  o.textAlign = "right";
  const mm = String((Math.random() * 59) | 0).padStart(2, "0");
  const ss = String((Math.random() * 59) | 0).padStart(2, "0");
  o.fillText(`${FLOOR_NAMES[world.cur]}  03:${mm}:${ss} AM`, iw - 14, 22);

  c.drawImage(out, x, y);
}

function blitOccluded(c, spr, zbuf, ty, centerX, topY, wPx, hPx, alpha, Wc, CWc, FR) {
  const destX = centerX - wPx / 2;
  const colStart = Math.max(0, Math.floor((destX - FR) / CWc));
  const colEnd = Math.min(Wc - 1, Math.ceil((destX + wPx - FR) / CWc));
  c.save();
  c.globalAlpha = Math.max(0, Math.min(1, alpha));
  for (let col = colStart; col <= colEnd; col++) {
    if (ty >= zbuf[col]) continue;
    const dx0 = FR + col * CWc;
    const sx0 = (dx0 - destX) / wPx * spr.width;
    const sw = Math.max(1, CWc / wPx * spr.width);
    c.drawImage(spr, sx0, 0, sw, spr.height, dx0, topY, CWc, hPx);
  }
  c.restore();
}

function renderPhoto(px, py, dir) {
  const W = 96, H = 58, CW = 6, CH = 7;
  // POLAROID: borda branca-creme, rodapé largo para a legenda à mão
  const FR = 22, BOT = 66;
  const cv = document.createElement("canvas");
  cv.width = W * CW + FR * 2; cv.height = H * CH + FR + BOT;
  const c = cv.getContext("2d");

  // papel instantâneo (creme, levemente manchado pelos anos)
  const pap = c.createLinearGradient(0, 0, 0, cv.height);
  pap.addColorStop(0, "#efe9db");
  pap.addColorStop(1, "#e2dac6");
  c.fillStyle = pap; c.fillRect(0, 0, cv.width, cv.height);
  for (let i = 0; i < 4; i++) {          // manchas de idade
    const mx = Math.random() * cv.width, my = Math.random() * cv.height;
    const mg = c.createRadialGradient(mx, my, 2, mx, my, 16 + Math.random() * 22);
    mg.addColorStop(0, "rgba(150,125,80,0.07)");
    mg.addColorStop(1, "rgba(150,125,80,0)");
    c.fillStyle = mg; c.fillRect(0, 0, cv.width, cv.height);
  }
  c.strokeStyle = "rgba(90,80,60,0.25)";
  c.lineWidth = 1.5;
  c.strokeRect(0.75, 0.75, cv.width - 1.5, cv.height - 1.5);
  // o "vidro" da foto
  c.fillStyle = "#000"; c.fillRect(FR, FR, W * CW, H * CH);
  c.strokeStyle = "rgba(60,52,40,0.5)";
  c.strokeRect(FR - 0.5, FR - 0.5, W * CW + 1, H * CH + 1);

  c.textAlign = "center"; c.textBaseline = "middle";

  const FOV = 1.15;
  const dirX = Math.cos(dir), dirY = Math.sin(dir);
  const tanF = Math.tan(FOV / 2);
  const planeX = -dirY * tanF, planeY = dirX * tanF;
  const MAXD = 32;
  const Wc = 288, CWc = (W * CW) / 288;
  const zbuf = renderRealisticScene(c, px, py, FR, W * CW, H * CH,
                                    dirX, dirY, planeX, planeY, MAXD, Wc);

  // --- sprites: fantasmas, refis, MÓVEIS ---
  const sprites = [];
  for (const g of fl().ghosts) if (g.respawn <= 0)
    sprites.push({ x: g.x, y: g.y, kind: "ghost", gh: g });
  for (const f of fl().films) if (!f.taken)
    sprites.push({ x: f.x, y: f.y, kind: "film" });
  for (const fu of fl().furn) {
    const dd = Math.hypot(fu.x - px, fu.y - py);
    if (dd < MAXD) sprites.push({ x: fu.x, y: fu.y, kind: "furn", furn: fu });
  }
  // marcas com dígitos do cofre: SÓ a foto enxerga
  for (const mk of fl().marks)
    sprites.push({ x: mk.x, y: mk.y, kind: "mark", mk });
  // retratos aprisionadores escondidos: SÓ a foto denuncia
  for (const r of world.retratos)
    if (r.floor === world.cur && !world.taken.has(r.id))
      sprites.push({ x: r.x, y: r.y, kind: "ret", ret: r });
  // almas nomeadas vagando
  for (const e of soulEnts)
    if (e.floor === world.cur)
      sprites.push({ x: e.x, y: e.y, kind: "soul", ent: e });
  // as 7 correntes espectrais da porta da frente
  if (world.cur === 1 && fl().door)
    sprites.push({ x: fl().door.x, y: fl().door.y - 0.6, kind: "chains" });
  // o SINAL do Hóspede (olho riscado): só a foto — e só com a lente nova
  if (world.sinal && world.sinal.floor === world.cur)
    sprites.push({ x: world.sinal.x, y: world.sinal.y, kind: "sinal" });
  // as ESCADAS nos nichos: a foto as mostra (e as DENUNCIA se escondidas)
  if (world.cur < NFLOORS - 2)
    sprites.push({ x: STAIR_UP_RECT.x + 1,
                   y: STAIR_UP_RECT.y + STAIR_UP_RECT.h - 0.4,
                   kind: "stair", up: true, key: world.cur + ":up" });
  if (world.cur > 0 && world.cur < NFLOORS - 1)
    sprites.push({ x: STAIR_DOWN_RECT.x + 1, y: STAIR_DOWN_RECT.y + 0.4,
                   kind: "stair", up: false, key: world.cur + ":down" });

  const invDet = 1 / (planeX * dirY - dirX * planeY);
  sprites.sort((a, b) =>
    Math.hypot(b.x - px, b.y - py) - Math.hypot(a.x - px, a.y - py));

  const areaH = H * CH;
  for (const s of sprites) {
    const dx = s.x - px, dy = s.y - py;
    const tx = invDet * (dirY * dx - dirX * dy);
    const ty = invDet * (-planeY * dx + planeX * dy);
    if (ty <= 0.4 || ty > MAXD) continue;
    const sxCol = (Wc / 2) * (1 + tx / ty);
    if (sxCol < -Wc * 0.3 || sxCol > Wc * 1.3) continue;
    const centerX = FR + sxCol * CWc;
    const bright = Math.max(0, 1 - ty / 24);
    if (bright <= 0.03) continue;

    const wallHpx = (H * 1.35 / ty) * CH;
    const floorPx = FR + (areaH + wallHpx) / 2;

    if (s.kind === "ghost") {
      const spr = s.gh.sprCv || (s.gh.sprCv = ghostSprite(s.gh.artSeed));
      const hs = spr._hscale || 1;
      const hPx = Math.min(areaH * 1.3, (H * 1.7 / ty) * CH) * hs;
      const wPx = hPx * (spr._aspect || 0.72);
      const topY = floorPx - hPx * 0.97;
      const glow = GLOW_SPR || (GLOW_SPR = makeGlowSprite());
      blitOccluded(c, glow, zbuf, ty, centerX, topY - hPx * 0.04,
                   wPx * 1.25, hPx * 1.05, 0.16 + bright * 0.2, Wc, CWc, FR);
      blitOccluded(c, spr, zbuf, ty, centerX, topY, wPx, hPx,
                   Math.min(1, 0.35 + bright * 1.1), Wc, CWc, FR);
    } else if (s.kind === "film") {
      const spr = FILM_SPR || (FILM_SPR = makeFilmSprite());
      const hPx = Math.min(areaH * 0.7, wallHpx * 0.6);
      blitOccluded(c, spr, zbuf, ty, centerX, floorPx - hPx, hPx, hPx,
                   0.35 + bright, Wc, CWc, FR);
    } else if (s.kind === "furn") {
      const ft = FURN_TYPES[s.furn.type];
      const spr = furnArt(s.furn.type);
      // ALTURA física manda (hC em unidades de parede); a LARGURA segue a
      // proporção da imagem, e o footprint só estica/comprime até 30% —
      // nunca mais sofá-panqueca
      const hPx = Math.min(areaH * 1.2, ft.hC * wallHpx);
      const natW = hPx * (spr.width / spr.height);
      const vd = Math.hypot(dx, dy) || 1;
      const ux2 = dx / vd, uy2 = dy / vd;
      const lateralCells = ft.w * Math.abs(uy2) + ft.h * Math.abs(ux2);
      const footW = lateralCells * ((Wc * CWc) / (2 * tanF * ty));
      const wPx = Math.max(natW * 0.7, Math.min(natW * 1.3, footW));
      blitOccluded(c, spr, zbuf, ty, centerX, floorPx - hPx, wPx, hPx,
                   Math.min(1, 0.35 + bright * 1.0), Wc, CWc, FR);
      // MODO PUZZLE (sem ecos): fotografar O piano desperta a Olívia
      if (typeof noGhosts !== "undefined" && noGhosts &&
          world.pianoOlivia && s.furn.type === "piano" &&
          Math.abs(s.furn.x - world.pianoOlivia.x) < 1 &&
          Math.abs(s.furn.y - world.pianoOlivia.y) < 1 &&
          world.flags.souls.olivia &&
          world.flags.souls.olivia.state === "dormant" && bright > 0.25) {
        const zcp = zbuf[Math.max(0, Math.min(Wc - 1, sxCol | 0))];
        if (ty < zcp + 0.6) window._pianoPend = world.pianoOlivia.floor;
      }
      // A NOIVA NO REFLEXO: no espelho certo, ela sai na foto antes de
      // existir no mundo (desenhada POR CIMA do vidro, translúcida)
      if (world.espelhoCecilia && s.furn === world.espelhoCecilia.furn &&
          world.flags.souls.cecilia &&
          world.flags.souls.cecilia.state === "dormant" && bright > 0.25) {
        const zc0 = zbuf[Math.max(0, Math.min(Wc - 1, sxCol | 0))];
        if (ty < zc0 + 0.6) {
          const gspr = ghostSprite(SOUL_DEFS.cecilia.artSeed);
          const ghPx = hPx * 0.85;
          blitOccluded(c, gspr, zbuf, ty, centerX, floorPx - hPx * 0.95,
                       ghPx * (gspr._aspect || 0.72), ghPx,
                       0.30, Wc, CWc, FR);
          window._espelhoPend = world.cur;
        }
      }
    } else if (s.kind === "mark") {
      // sem a LENTE NOVA a foto sai rachada: dá pra ver QUE tem algo, não O QUÊ
      const nitida = world.flags.cam.lente;
      const spr = nitida ? digitSprite(s.mk.digit, s.mk.ord) : smudgeSprite();
      const hPx = Math.min(areaH * 0.8, wallHpx * 0.75);
      const wPx = hPx * 0.73;
      blitOccluded(c, spr, zbuf, ty, centerX, floorPx - wallHpx * 0.9, wPx, hPx,
                   Math.min(1, 0.35 + bright * 1.0), Wc, CWc, FR);
      const zc = zbuf[Math.max(0, Math.min(Wc - 1, sxCol | 0))];
      if (nitida && bright > 0.25 && Math.abs(sxCol - Wc / 2) < Wc * 0.45 &&
          ty < zc + 0.6 && !s.mk.seen) {         // só conta se a marca saiu na foto
        s.mk.seen = true;                        // o chat para de dar essa dica
        if (!world.flags.marksSeen.includes(s.mk.ord))
          world.flags.marksSeen.push(s.mk.ord);
      } else if (!nitida && bright > 0.25 && !live.hinted.has("lenteruim")) {
        live.hinted.add("lenteruim");
        livePush(liveRandUser(), "tem ALGO escrito aí mas a lente tá RACHADA… precisa de outra");
      }
    } else if (s.kind === "ret") {
      const spr = retratoSprite(s.ret.soul);
      const hPx = Math.min(areaH * 0.7, wallHpx * 0.55);
      const wPx = hPx * 0.78;
      blitOccluded(c, spr, zbuf, ty, centerX, floorPx - hPx * 1.05, wPx, hPx,
                   Math.min(1, 0.4 + bright * 1.0), Wc, CWc, FR);
      const zc = zbuf[Math.max(0, Math.min(Wc - 1, sxCol | 0))];
      if (bright > 0.2 && ty < zc + 0.6 &&
          !world.flags.retSeen.includes(s.ret.id)) {
        world.flags.retSeen.push(s.ret.id);
        livePush(liveRandUser(), "PERA. tem um RETRATO escondido perto do " +
                 s.ret.movel + "!! volta lá e pega");
        live.viewers += 40;
      }
    } else if (s.kind === "soul") {
      const def = SOUL_DEFS[s.ent.id];
      // o Hóspede não tem rosto no mundo — NA FOTO ele tem o SEU
      const spr = s.ent.id === "hospede" ? hospedeSprite()
                                         : ghostSprite(def.artSeed);
      const hs = (spr._hscale || 1) * (def.escala || 1);
      const hPx = Math.min(areaH * 1.3, (H * 1.7 / ty) * CH) * hs;
      const wPx = hPx * (spr._aspect || 0.72);
      const topY = floorPx - hPx * 0.97;
      const glow = GLOW_SPR || (GLOW_SPR = makeGlowSprite());
      blitOccluded(c, glow, zbuf, ty, centerX, topY - hPx * 0.04,
                   wPx * 1.25, hPx * 1.05, 0.16 + bright * 0.2, Wc, CWc, FR);
      blitOccluded(c, spr, zbuf, ty, centerX, topY, wPx, hPx,
                   Math.min(1, 0.35 + bright * 1.1), Wc, CWc, FR);
    } else if (s.kind === "chains") {
      const spr = chainsSprite(chainsBroken());
      const pxPerCell = (Wc * CWc) / (2 * tanF * ty);
      const wPx = pxPerCell * 3.4;
      const hPx = wallHpx * 0.95;
      blitOccluded(c, spr, zbuf, ty, centerX, floorPx - hPx, wPx, hPx,
                   Math.min(1, 0.4 + bright * 0.9), Wc, CWc, FR);
      const zc = zbuf[Math.max(0, Math.min(Wc - 1, sxCol | 0))];
      if (bright > 0.2 && ty < zc + 1.2 && !live.hinted.has("chainsSeen")) {
        live.hinted.add("chainsSeen");
        livePush(liveRandUser(), "A PORTA TÁ ACORRENTADA NA FOTO?!?!");
        livePush(liveRandUser(), "7 correntes… uma pra cada alma presa na casa. liberta elas");
        live.viewers += 70;
      }
    } else if (s.kind === "stair") {
      const spr = stairSprite(s.up);
      const pxPerCell = (Wc * CWc) / (2 * tanF * ty);
      const wPx = pxPerCell * 2.1;
      const hPx = wallHpx * 0.94;
      blitOccluded(c, spr, zbuf, ty, centerX, floorPx - hPx, wPx, hPx,
                   Math.min(1, 0.4 + bright * 0.9), Wc, CWc, FR);
      const zc = zbuf[Math.max(0, Math.min(Wc - 1, sxCol | 0))];
      if (bright > 0.2 && ty < zc + 0.8) {
        if (!world.flags.stairsSeen) world.flags.stairsSeen = [];
        if (!world.flags.stairsSeen.includes(s.key)) {
          world.flags.stairsSeen.push(s.key);   // a FOTO denunciou a escada
          livePush(liveRandUser(), "TEM UMA ESCADA NA FOTO!! dentro da parede!!");
          live.viewers += 30;
        }
      }
    } else if (s.kind === "sinal") {
      // o olho riscado: só sai com a LENTE NOVA (a rachada borra tudo)
      const spr = world.flags.cam.lente ? sinalSprite() : smudgeSprite();
      const hPx = Math.min(areaH * 0.6, wallHpx * 0.55);
      blitOccluded(c, spr, zbuf, ty, centerX, floorPx - wallHpx * 0.82,
                   hPx, hPx, Math.min(1, 0.35 + bright * 1.0), Wc, CWc, FR);
      const zc = zbuf[Math.max(0, Math.min(Wc - 1, sxCol | 0))];
      if (world.flags.cam.lente && bright > 0.25 && ty < zc + 0.6)
        soulsOnSinal(world.cur);
    }
  }

  // grão e vinheta
  for (let i = 0; i < 420; i++) {
    const gx = FR + Math.random() * W * CW, gy = FR + Math.random() * H * CH;
    c.fillStyle = `rgba(255,255,255,${Math.random() * 0.08})`;
    c.fillRect(gx, gy, 1.5, 1.5);
  }
  const vg = c.createRadialGradient(cv.width / 2, (FR + H * CH) / 2, H * CH * 0.35,
                                    cv.width / 2, (FR + H * CH) / 2, H * CH * 0.85);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(0,0,0,0.55)");
  c.fillStyle = vg; c.fillRect(FR, FR, W * CW, H * CH);

  // LENTE DO PASSADO: perto do lugar de uma alma, a foto volta décadas
  let passadoSpot = null;
  if (world.flags.cam.passado) {
    let best = 10;
    for (const r2 of world.retratos) {
      if (r2.floor !== world.cur) continue;
      const dd = Math.hypot(r2.x - px, r2.y - py);
      if (dd > best) continue;
      const ty2 = invDet * (-planeY * (r2.x - px) + planeX * (r2.y - py));
      if (ty2 <= 0.2) continue;              // precisa estar no enquadramento
      best = dd; passadoSpot = r2;
    }
    if (passadoSpot) {                        // lavagem sépia (vai sob o VHS)
      c.fillStyle = "rgba(205,170,110,0.14)";
      c.fillRect(FR, FR, W * CW, H * CH);
      c.fillStyle = "rgba(110,75,30,0.10)";
      c.fillRect(FR, FR, W * CW, H * CH);
    }
  }

  vhsPass(cv, FR, FR, W * CW, H * CH);

  // a legenda do passado "queima" por cima do VHS, como data de filmadora
  if (passadoSpot) {
    c.font = "italic bold 14px 'Courier New', monospace";
    c.textAlign = "left";
    c.fillStyle = "rgba(242,226,188,0.92)";
    c.fillText(PASSADO_TXT[passadoSpot.soul] || "", FR + 8, FR + H * CH - 14);
    const hid = "pass_" + passadoSpot.soul;
    if (!live.hinted.has(hid)) {
      live.hinted.add(hid);
      livePush(liveRandUser(), 'a legenda da foto… "' +
               (PASSADO_TXT[passadoSpot.soul] || "") + '"');
      live.viewers += 25;
    }
  }

  // legenda à mão no rodapé da polaroid
  c.save();
  c.translate(FR + 4, cv.height - 26);
  c.rotate(-0.015);
  c.textAlign = "left"; c.textBaseline = "middle";
  c.font = "italic 21px 'Segoe Script', 'Comic Sans MS', cursive";
  c.fillStyle = "rgba(68,60,52,0.88)";
  c.fillText(`foto ${photoCount} — ${FLOOR_NAMES[world.cur].toLowerCase()}`, 0, 0);
  c.restore();
  return cv;
}

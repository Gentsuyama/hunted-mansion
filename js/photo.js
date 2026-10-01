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
  if (film <= 0) { sfxDry(); return; }
  film--;
  flashT = 1; flashCd = FLASH.cooldown;
  flashDir = aimAngle();
  attractT = 7;
  sfxCamera();

  photoCount++;
  const cv = renderPhoto(player.x, player.y, flashDir);
  album.push({ cv, caption: `FOTO ${photoCount} · ${FLOOR_NAMES[world.cur]}` });
  if (album.length > ALBUM_MAX) album.shift();

  // dissolve fantasmas no cone
  for (const g of fl().ghosts) {
    if (g.respawn > 0) continue;
    if (inFlashCone(g.x, g.y, flashDir)) {
      g.respawn = 10 + Math.random() * 6;
      g.chase = false;
      sfxDissolve();
      for (let i = 0; i < 26; i++) {
        const a = Math.random() * 6.28, s = 4 + Math.random() * 14;
        particles.push({
          x: g.x, y: g.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
          life: 0.7, ch: "Ψ*·:"[Math.random() * 4 | 0],
        });
      }
    }
  }
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
      if (grid[mapY * COLS + mapX] === T_WALL) {
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

    let wallX = side === 0 ? py + perp * rdy : px + perp * rdx;
    wallX -= Math.floor(wallX);

    for (let yy = 0; yy < H2; yy++) {
      let rr = 0, gg = 0, bb = 0;
      if (hit && yy >= s0 && yy <= s1) {
        const texY = (yy - start) / wallH;
        const t = fbm((mapX + wallX) * 5.1, texY * 5.1 + mapY * 2.7);
        let L = Math.max(0, 1 - perp / 28) * centerFall * (0.5 + 0.8 * t);
        if (side === 1) L *= 0.72;
        if (texY > 0.88) L *= 0.55;
        rr = 208 * L; gg = 194 * L; bb = 166 * L;
      } else if (yy > H2 / 2) {
        const rowDist = posZ / (yy - H2 / 2);
        const wx2 = px + rdx * rowDist, wy2 = py + rdy * rowDist;
        const t = fbm(wx2 * 1.6, wy2 * 1.6);
        const L = Math.max(0, 1 - rowDist / 24) * centerFall * (0.45 + 0.85 * t);
        rr = 138 * L; gg = 124 * L; bb = 104 * L;
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
  const FR = 14, BOT = 44;
  const cv = document.createElement("canvas");
  cv.width = W * CW + FR * 2; cv.height = H * CH + FR + BOT;
  const c = cv.getContext("2d");

  c.fillStyle = "#1a1a1a"; c.fillRect(0, 0, cv.width, cv.height);
  c.strokeStyle = "#3a3a3a"; c.strokeRect(2.5, 2.5, cv.width - 5, cv.height - 5);
  c.fillStyle = "#000"; c.fillRect(FR, FR, W * CW, H * CH);

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
      // LARGURA real: projeção do footprint (células) perpendicular à visão —
      // um sofá de 3 células ocupa 3 células na foto, como as paredes
      const vd = Math.hypot(dx, dy) || 1;
      const ux2 = dx / vd, uy2 = dy / vd;
      const lateralCells = ft.w * Math.abs(uy2) + ft.h * Math.abs(ux2);
      const pxPerCell = (Wc * CWc) / (2 * tanF * ty);
      const wPx = Math.max(8, lateralCells * pxPerCell);
      // ALTURA real em unidades de parede (parede = wallHpx)
      const hPx = Math.min(areaH * 1.2, ft.hC * wallHpx);
      blitOccluded(c, spr, zbuf, ty, centerX, floorPx - hPx, wPx, hPx,
                   Math.min(1, 0.35 + bright * 1.0), Wc, CWc, FR);
    } else if (s.kind === "mark") {
      const spr = digitSprite(s.mk.digit, s.mk.ord);
      const hPx = Math.min(areaH * 0.8, wallHpx * 0.75);
      const wPx = hPx * 0.73;
      blitOccluded(c, spr, zbuf, ty, centerX, floorPx - wallHpx * 0.9, wPx, hPx,
                   Math.min(1, 0.35 + bright * 1.0), Wc, CWc, FR);
      if (bright > 0.25 && Math.abs(sxCol - Wc / 2) < Wc * 0.45 && !s.mk.seen) {
        s.mk.seen = true;                        // o chat para de dar essa dica
        if (!world.flags.marksSeen.includes(s.mk.ord))
          world.flags.marksSeen.push(s.mk.ord);
      }
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

  vhsPass(cv, FR, FR, W * CW, H * CH);

  c.textAlign = "left";
  c.font = "bold 12px 'Courier New', monospace";
  c.fillStyle = "#888";
  c.fillText(`FOTO ${photoCount}  ·  ${FLOOR_NAMES[world.cur]}`, FR, cv.height - 18);
  return cv;
}

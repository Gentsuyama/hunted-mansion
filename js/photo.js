"use strict";
// ==================================================================
// FOTO — raycaster texturizado com luz de FLASH + filme instantâneo
// ==================================================================
let RS_S = null, FILME_S = null, LIT_S = null;   // buffers reutilizados

// geometria física da foto, em células (1 célula ≈ 0,6 m)
const FOTO = {
  WALL: 6.0,      // pé-direito
  EYE: 2.7,       // altura da câmera
  HOR: 0.47,      // linha do horizonte (fração da altura da imagem)
  FOV: 1.15,
  MAXD: 32,
  D0: 8.0,        // alcance do flash (queda com o quadrado da distância)
  EXPO: 4.6,      // exposição
  FURN_K: 2.9,    // hC dos móveis -> altura em células
  DOOR_H: 4.6,    // altura da porta da frente
  rapido: false,  // true só nos robôs de teste: calcula o que a foto VÊ sem pintá-la
};
let TONE_LUT = null;
function toneLut() {
  if (TONE_LUT) return TONE_LUT;
  TONE_LUT = new Uint8ClampedArray(2048);
  for (let i = 0; i < 2048; i++) TONE_LUT[i] = 255 * (1 - Math.exp(-i / 341));
  return TONE_LUT;
}

// nome de cada móvel como o chat o diz (a geração guarda só o id do tipo)
const MOVEL_NOME = { berco: "berço", cama: "cama", espelho: "espelho", piano: "piano",
  relogio: "relógio", escrivaninha: "escrivaninha", poltrona: "poltrona", cadeira: "cadeira",
  sofa: "sofá", mesa: "mesa", estante: "estante", bau: "baú" };

function inFlashCone(ex, ey, dir, fator) {
  const dx = ex - player.x, dy = ey - player.y;
  const d = Math.hypot(dx, dy);
  if (d > FLASH.range * 0.85 * (fator || 1)) return false;
  let da = Math.atan2(dy, dx) - dir;
  while (da > Math.PI) da -= 2 * Math.PI;
  while (da < -Math.PI) da += 2 * Math.PI;
  if (Math.abs(da) > FLASH.halfAngle * 0.95) return false;
  return hasLOS(player.x, player.y, ex, ey);
}

// o flash pegou um eco no meio da inspiração: o bote não sai
function boteCortado() {
  boteLivreT = BOTE.pausa;
  if (!live.hinted.has("bote3")) {
    live.hinted.add("bote3");
    livePush(liveRandUser(), "CORTOU o bote no meio!! é ISSO: flash quando ele puxa o ar");
  }
}

// esta foto guarda uma PISTA (vai para as páginas vinho do álbum se for nova)
function fotoPista(texto, nova, tipo) {
  if (!window._fotoPistas) return;
  if (!window._fotoPistas.includes(texto)) window._fotoPistas.push(texto);
  if (nova) { window._fotoPistaAuto = true; if (!window._fotoFita) window._fotoFita = tipo || "manual"; }
}

function takePhoto() {
  if (flashCd > 0) return;
  const cam = world.flags.cam;
  // FOTO REAL exige: tampa na câmera + filme CARREGADO (R põe/tira) + rolos
  const fotoReal = cam.tampa && world.flags.filmLoaded && film > 0;
  // o FLASH exige bateria; sem ela, a foto sai no escuro (e sem foto, nada acontece)
  const comFlash = bateria > 0;
  if (!comFlash && !fotoReal) {
    sfxDry(); flashCd = 0.5;
    toast("SEM BATERIA — e sem filme pra fotografar no escuro", 2.5);
    return;
  }

  flashCd = FLASH.cooldown;
  flashDir = aimAngle();
  if (comFlash) {
    bateria--;
    flashT = 1;
    attractT = ECO.atraiFlash;         // o flash SEMPRE atrai — mesmo vazio
    sfxCamera();
    if (bateria <= 0) bateriaAcabou();
  } else {
    flashT = 0;
    sfxObturadorSeco();
    if (!live.hinted.has("escuro1")) {
      live.hinted.add("escuro1");
      livePush(liveRandUser(), "foto no ESCURO… saiu, mas só o que a lanterna pegou. e nada se assustou");
    }
  }

  if (fotoReal) {
    film--;
    photoCount++;
    window._espelhoPend = -1; window._pianoPend = -1; window._fotoAlmas = [];
    window._fotoPistas = []; window._fotoPistaAuto = false; window._fotoFita = null;
    const cv = renderPhoto(player.x, player.y, flashDir, !comFlash);
    const ent = { cv, caption: `FOTO ${photoCount} · ${FLOOR_NAMES[world.cur]}`,
                  almas: 0, armazenadas: 0, marcas: [], t: world.timeSec,
                  pistas: window._fotoPistas.slice(), pista: window._fotoPistaAuto, fita: window._fotoFita,
                  escuro: !comFlash, sepia: !!window._fotoSepia, quimica: window._fotoQuimica,
                  semFilme: !!FOTO.rapido };
    album.push(ent);
    albumLimita();
    if (typeof polaroidEjeta === "function") polaroidEjeta(cv);
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

    // CAPTURA ecos no cone (com filme, o eco vai para o filme; no escuro, só de perto)
    for (const g of fl().ghosts) {
      if (g.respawn > 0) continue;
      if (inFlashCone(g.x, g.y, flashDir, comFlash ? 1 : 0.2)) {
        if (comFlash && g.bote && g.bote.fase === "inspira") boteCortado();
        g.respawn = ECO.volta[0] + Math.random() * ECO.volta[1];
        g.chase = false; g.bote = null;
        ent.almas++;                     // essa alma está na foto: dá para GUARDAR
        const mk = (window._fotoAlmas || []).find(m => m.gh === g);
        if (mk) ent.marcas.push(mk);
        sfxDissolve();
        soulsOnEcoCaptured();            // 7 ecos no filme despertam a Olívia
        for (let i = 0; i < 26; i++) {
          const a = Math.random() * 6.28, s = 4 + Math.random() * 14;
          particles.push({
            x: g.x, y: g.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
            life: 0.7, ch: "·:"[Math.random() * 2 | 0],       // só respingos de tinta
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
        // recuo: ele é arremessado para trás (3–4 células, em meio segundo) e fica tonto —
        // mas continua lá, e volta
        g.kb = { dx: (g.x - player.x) / d, dy: (g.y - player.y) / d, t: 0.7 };
        if (g.bote && g.bote.fase === "inspira") boteCortado();
        g.chase = false; g.stun = 1.4; g.bote = null; g.gasto = BOTE.gasto * 0.5;
        for (let i = 0; i < 10; i++) {
          const a = Math.random() * 6.28, s = 3 + Math.random() * 8;
          particles.push({ x: g.x, y: g.y, vx: Math.cos(a) * s,
                           vy: Math.sin(a) * s, life: 0.4, ch: "·:" [Math.random() * 2 | 0] });
        }
      }
    }
    if (bateu && cam.tampa && !live.hinted.has("flashvazio")) {
      live.hinted.add("flashvazio");
      livePush(liveRandUser(), "ele VOLTOU pra trás com o clarão!! mas não sumiu…");
    }
  }

  // almas nomeadas: captura (com retrato+obturador+filme) ou repelão
  const pegouAlma = soulsOnFlash(flashDir, fotoReal, comFlash);
  // ELE comenta as fotos em que há gente
  if (pegouAlma && fotoReal && time - live.fixoFotoT > 45 && !soulCaptured()) {
    live.fixoFotoT = time;
    liveFixo(["boa luz.", "enquadrou bem.", "mais perto, da próxima vez."][Math.random() * 3 | 0]);
  }
  saveRun();
}

// ------------------------------------------------------------------
// A CENA: raycaster por pixel. Parede, chão e teto têm altura física,
// textura por andar e são iluminados por um flash preso à câmera
// (queda com o quadrado da distância + ângulo de incidência).
// ------------------------------------------------------------------
function renderRealisticScene(c, px, py, FR, PW, PH, dirX, dirY, planeX, planeY, MAXD, W2, escuro) {
  const H2 = Math.round(PH * W2 / PW);
  if (!RS_S || RS_S.img.width !== W2 || RS_S.img.height !== H2) {
    RS_S = { img: new ImageData(W2, H2), tmp: document.createElement("canvas") };
    RS_S.tmp.width = W2; RS_S.tmp.height = H2;
  }
  const img = RS_S.img, d = img.data;
  const zbuf = new Float32Array(W2);
  const TONE = toneLut();
  const WALL = FOTO.WALL, EYE = FOTO.EYE, UP = WALL - EYE, DOOR_H = FOTO.DOOR_H;
  const tanF = Math.hypot(planeX, planeY);
  const fV = (W2 / 2) / tanF;                      // distância focal em px
  const hor = H2 * FOTO.HOR;
  const invD0 = 1 / (FOTO.D0 * FOTO.D0);
  const K0 = FOTO.EXPO * 341 / 255 * (escuro ? 0.17 : 1);
  let K = K0;

  // o andar decide os materiais
  const FL = world.cur, F = fl();
  const RG = F.rugGrid, BANH = F.banheiros || [];
  const porao = FL === 0, atelie = FL === NFLOORS - 1;
  const WP = TEX["wp" + FL] || TEX.wp1;
  const lambri = FL === 1 || FL === 2;
  const creme = FL === 2;                           // lambri pintado
  const descasca = FL >= 3 && !atelie;              // papel soltando no alto da casa
  const pisoT = porao ? TEX.laje : TEX.assoalho;
  const door = FL === 1 ? F.door : null;
  // cômodos ÚNICOS: o quarto escuro (tudo banhado de vermelho) e as salas
  // secretas (vão de parede: tijolo nu, sem papel, sem rodapé, sem quadro)
  const SEC = F.secretRooms || [];
  const noQE = (x, y) => porao && x >= DARKROOM.x && x < DARKROOM.x + DARKROOM.w &&
                         y >= DARKROOM.y && y < DARKROOM.y + DARKROOM.h;
  const naSec = (x, y) => {
    for (const q of SEC) if (x >= q.x && x < q.x + q.w && y >= q.y && y < q.y + q.h) return true;
    return false;
  };

  // por linha: profundidade do chão/teto, queda do facho e base do LOD
  const rowT = new Float32Array(H2), rowS = new Float32Array(H2),
        rowLod = new Float32Array(H2);
  for (let yy = 0; yy < H2; yy++) {
    const dyp = yy + 0.5 - hor;
    const hgt = dyp > 0 ? EYE : UP;
    rowT[yy] = Math.abs(dyp) > 0.25 ? fV * hgt / Math.abs(dyp) : 1e9;
    const ay = (yy + 0.5 - H2 / 2) / fV;
    rowS[yy] = ay * ay;
    rowLod[yy] = 1.5 * Math.log2(rowT[yy]) - Math.log2(fV * Math.sqrt(hgt));
  }
  const horRow = Math.max(0, Math.min(H2, Math.ceil(hor - 0.5)));

  for (let col = 0; col < W2; col++) {
    const camX = 2 * (col + 0.5) / W2 - 1;
    const rdx = dirX + planeX * camX, rdy = dirY + planeY * camX;
    const rdLen2 = rdx * rdx + rdy * rdy;
    const axc = camX * tanF, colS = axc * axc;
    if (escuro) {                        // sem flash: só o facho da lanterna, estreito
      const ang = Math.abs(Math.atan(axc));
      const t = Math.max(0, Math.min(1, (ang - 0.30) / 0.30));
      K = K0 * (1 - t * t * (3 - 2 * t) * 0.8);
    }
    let mapX = px | 0, mapY = py | 0;
    const dX = Math.abs(1 / (rdx || 1e-9)), dY = Math.abs(1 / (rdy || 1e-9));
    let stepX, stepY, sideX, sideY;
    if (rdx < 0) { stepX = -1; sideX = (px - mapX) * dX; }
    else         { stepX =  1; sideX = (mapX + 1 - px) * dX; }
    if (rdy < 0) { stepY = -1; sideY = (py - mapY) * dY; }
    else         { stepY =  1; sideY = (mapY + 1 - py) * dY; }

    let side = 0, perp = MAXD, hit = false, tHit = 0;
    for (let it = 0; it < 220; it++) {
      if (sideX < sideY) { sideX += dX; mapX += stepX; side = 0; }
      else               { sideY += dY; mapY += stepY; side = 1; }
      if (mapX < 0 || mapY < 0 || mapX >= COLS || mapY >= ROWS) break;
      tHit = grid[mapY * COLS + mapX];
      if (tHit === T_WALL || tHit === T_DOOR) {   // porta NÃO é vão (vão = parede falsa)
        perp = side === 0 ? sideX - dX : sideY - dY;
        hit = true; break;
      }
      if (Math.min(sideX, sideY) > MAXD) break;
    }
    perp = Math.max(perp, 0.12);
    zbuf[col] = perp;
    if (FOTO.rapido) continue;     // robôs de teste: só a geometria, sem pintar

    const yTop = hor - fV * UP / perp, yBot = hor + fV * EYE / perp;
    const s0 = hit ? Math.max(0, Math.ceil(yTop - 0.5)) : horRow;
    const s1 = hit ? Math.min(H2 - 1, Math.floor(yBot - 0.5)) : horRow - 1;

    // ---------------- TETO ----------------
    for (let yy = 0; yy < s0; yy++) {
      const i4 = (yy * W2 + col) << 2;
      const t = rowT[yy];
      d[i4 + 3] = 255;
      if (t > MAXD) { d[i4] = d[i4 + 1] = d[i4 + 2] = 0; continue; }
      const wx = px + rdx * t, wy = py + rdy * t;
      const lb = rowLod[yy];
      let sh = 1;
      if (porao) {                       // barrotes sob o piso de cima
        const m = wy - Math.floor(wy / 2) * 2;
        if (m < 0.42) { texS(TEX.madeira, wy * 3, wx, lb + 7); sh = 0.9; }
        else { texS(TEX.madeira, wx, wy, lb + 7); sh = m < 0.6 ? 0.25 : 0.5; }
      } else if (atelie) {
        texS(TEX.madeira, wx, wy, lb + 7); sh = 0.7;
      } else {
        texS(TEX.gesso, wx, wy, lb + 6);
        const inf = nzVal(wx * 0.3 + 2.2, wy * 0.3 + FL * 5.1);   // infiltração
        if (inf > 0.6) sh = 1 - (inf - 0.6) * 1.9;
      }
      if (porao && noQE(wx | 0, wy | 0)) { TR *= 1.25; TG *= 0.36; TB *= 0.32; }
      const d2 = t * t * rdLen2 + UP * UP;
      let L = UP / Math.sqrt(d2) / (1 + d2 * invD0) / (1 + 1.1 * (colS + rowS[yy]));
      if (hit) { const gap = perp - t; if (gap < 1.2) L *= 0.5 + 0.5 * gap / 1.2; }
      const q = L * K * sh * 2.0;
      let a = TR * q; d[i4]     = TONE[a > 2047 ? 2047 : a | 0];
      a = TG * q;     d[i4 + 1] = TONE[a > 2047 ? 2047 : a | 0];
      a = TB * q;     d[i4 + 2] = TONE[a > 2047 ? 2047 : a | 0];
    }

    // ---------------- PAREDE ----------------
    if (hit) {
      const uw = side === 0 ? py + perp * rdy : px + perp * rdx;   // contínuo
      const fu = uw - Math.floor(uw);
      const nrm = (side === 0 ? Math.abs(rdx) : Math.abs(rdy)) * perp;
      const hd2 = perp * perp * rdLen2;
      const wLod = Math.log2(perp / fV);
      const agU = uw * 0.33 + (side === 0 ? mapX : mapY) * 0.61;
      // esta parede é de um BANHEIRO? (célula atingida encosta na sala)
      // (vale a célula de ONDE o raio veio: só a face de dentro é azulejada)
      let azul = false;
      if (!porao && !atelie) {
        const ox = side === 0 ? mapX - stepX : mapX, oy = side === 1 ? mapY - stepY : mapY;
        for (const br of BANH)
          if (ox >= br.x && ox < br.x + br.w &&
              oy >= br.y && oy < br.y + br.h) { azul = true; break; }
      }
      const oxC = side === 0 ? mapX - stepX : mapX, oyC = side === 1 ? mapY - stepY : mapY;
      const qeP = noQE(oxC, oyC), secP = !qeP && SEC.length > 0 && naSec(oxC, oyC);
      const ehPorta = tHit === T_DOOR && !!door;
      const sPorta = ehPorta ? (uw - (door.x - 1.5)) / 3 : 0;
      // um QUADRO pendurado nesta face? (só a foto sabe)
      let quadro = null;
      if (!porao && !atelie && !azul && !ehPorta && !secP) {
        const hq = nzHash(mapX * 7 + side * 3 + FL * 131, mapY * 13 + 5);
        if (hq < 0.2 && (side === 0 ? mapY : mapX) % 3 === 0 && fu > 0.14 && fu < 0.86)
          quadro = TEX["quadro" + ((hq * 1000 | 0) % 3)];
      }
      const invWallPx = WALL / (yBot - yTop);

      for (let yy = s0; yy <= s1; yy++) {
        const v = (yBot - (yy + 0.5)) * invWallPx;   // altura no mundo (células)
        const tv = WALL - v;                         // textura cresce para baixo
        let sh = 1;
        if (ehPorta && v < DOOR_H) {
          texN(TEX.porta, sPorta, 1 - v / DOOR_H, wLod + 6.4);
        } else if (secP) {                           // sala secreta: tijolo nu
          texS(TEX.pedra, uw * 1.4, tv * 1.4, wLod + 6);
          TR *= 1.12; TG *= 0.84; TB *= 0.7;
          if (v < 0.5) sh = 0.6 + 0.6 * v;
        } else if (porao) {
          texS(TEX.pedra, uw, tv, wLod + 6);
          if (v < 0.9) sh = 0.55 + 0.5 * v;          // umidade no pé da parede
        } else if (atelie) {
          texS(TEX.madeira, uw, tv, wLod + 7);
          if (v < 0.45) sh = 0.6;
          else if (v > 2.2 && v < 2.36) sh = v < 2.26 ? 0.5 : 1.35;
          else if (v > WALL - 0.4) sh = 0.7;
        } else if (v > WALL - 0.5) {                 // sanca de gesso
          texS(TEX.gesso, uw, tv, wLod + 6);
          const b = ((WALL - v) * 8) | 0;
          sh = b === 0 ? 0.78 : b === 1 ? 1.08 : b === 2 ? 0.7 : 1.0;
        } else if (azul) {
          if (v < 3.4) {
            texS(TEX.azulejo, uw, tv, wLod + 8);
            if (v > 3.15) { TR *= 0.42; TG *= 0.58; TB *= 0.5; }   // barra
          } else texS(TEX.gesso, uw, tv, wLod + 6);
        } else if (v < 0.4) {                        // rodapé
          texS(TEX.madeira, tv * 3, uw, wLod + 7);
          sh = v > 0.34 ? 1.5 : 0.62;
          if (creme) { TR = TR * 0.5 + 84; TG = TG * 0.5 + 78; TB = TB * 0.5 + 62; }
        } else if (lambri && v < 2.0) {              // lambri almofadado
          texS(TEX.lambri, uw, (2.0 - v) * 1.25, wLod + 7);
          if (creme) { TR = TR * 0.5 + 92; TG = TG * 0.5 + 86; TB = TB * 0.5 + 70; }
        } else if (lambri && v < 2.14) {             // guarnição
          texS(TEX.madeira, tv * 3, uw, wLod + 7);
          sh = v > 2.09 ? 1.6 : 0.85;
          if (creme) { TR = TR * 0.5 + 92; TG = TG * 0.5 + 86; TB = TB * 0.5 + 70; }
        } else {                                     // papel de parede
          texS(WP, uw, tv, wLod + 7);
          if (descasca) {
            const pe = nzFbm(uw * 0.55 + 9.1, v * 0.55 + FL * 3.3);
            if (pe > 0.63) {
              if (pe < 0.655) sh = 0.5;              // aba do papel solto
              else { texS(TEX.gesso, uw, tv, wLod + 6); sh = 0.9; }
            }
          }
          if (quadro) {
            if (v > 2.75 && v < 4.35) {
              texN(quadro, (fu - 0.14) / 0.72, (4.35 - v) / 1.6, wLod + 7.5);
              sh = 1;
            } else if (v > 2.6 && v <= 2.75) sh *= 0.6;   // sombra sob a moldura
          }
        }
        // idade: manchas largas + infiltração que desce do teto
        const ag = 0.74 + 0.5 * nzVal(agU, v * 0.37);
        let um = 1;
        if (!porao && !ehPorta) {
          const st = nzVal(uw * 1.9 + 4.4, v * 0.22 + agU);
          if (st > 0.6) um = 1 - (st - 0.6) * 1.5 * (v / WALL);
        }
        const dz = v - EYE;
        const d2 = hd2 + dz * dz;
        let L = nrm / Math.sqrt(d2) / (1 + d2 * invD0) / (1 + 1.1 * (colS + rowS[yy]));
        if (v < 0.6) L *= 0.55 + 0.75 * v;           // oclusão no pé…
        else if (v > WALL - 0.5) L *= 0.6 + 0.8 * (WALL - v);   // …e no alto
        if (qeP) { TR *= 1.25; TG *= 0.36; TB *= 0.32; }   // luz de segurança
        const q = L * K * sh * ag * um;
        const i4 = (yy * W2 + col) << 2;
        let a = TR * q; d[i4]     = TONE[a > 2047 ? 2047 : a | 0];
        a = TG * q;     d[i4 + 1] = TONE[a > 2047 ? 2047 : a | 0];
        a = TB * q;     d[i4 + 2] = TONE[a > 2047 ? 2047 : a | 0];
        d[i4 + 3] = 255;
      }
    }

    // ---------------- CHÃO ----------------
    for (let yy = s1 + 1; yy < H2; yy++) {
      const i4 = (yy * W2 + col) << 2;
      const t = rowT[yy];
      d[i4 + 3] = 255;
      if (t > MAXD) { d[i4] = d[i4 + 1] = d[i4 + 2] = 0; continue; }
      const wx = px + rdx * t, wy = py + rdy * t;
      const cx = wx | 0, cy = wy | 0;
      const id = cy * COLS + cx;
      const rg = (RG && wx >= 0 && wy >= 0 && cx < COLS && cy < ROWS) ? RG[id] : 0;
      const lb = rowLod[yy];
      let sh = 1;
      if (rg === 1) {                    // PASSADEIRA vinho, barra dourada no perímetro
        const fx = wx - cx, fy = wy - cy;
        const borda =
          (RG[id - 1] !== 1 && fx < 0.2) || (RG[id + 1] !== 1 && fx > 0.8) ||
          (RG[id - COLS] !== 1 && fy < 0.2) || (RG[id + COLS] !== 1 && fy > 0.8);
        if (borda) { TR = 146; TG = 116; TB = 62; sh = 0.8; }
        else texS(TEX.passadeira, wx, wy, lb + 7);
      } else if (rg === 2) {             // TAPETE grande, franja clara na borda
        const fx = wx - cx, fy = wy - cy;
        const borda =
          (RG[id - 1] !== 2 && fx < 0.3) || (RG[id + 1] !== 2 && fx > 0.7) ||
          (RG[id - COLS] !== 2 && fy < 0.3) || (RG[id + COLS] !== 2 && fy > 0.7);
        if (borda) { TR = 150; TG = 138; TB = 108; sh = 0.75; }
        else texS(TEX.tapete, wx, wy, lb + 6);
      } else if (rg === 3) texS(TEX.xadrez, wx, wy, lb + 7);
      else if (SEC.length && naSec(cx, cy)) { texS(TEX.laje, wx, wy, lb + 6); sh = 0.8; }
      else texS(pisoT, wx, wy, lb + 6);
      if (porao && noQE(cx, cy)) { TR *= 1.25; TG *= 0.36; TB *= 0.32; }
      const ag = 0.7 + 0.6 * nzVal(wx * 0.45 + 7.7, wy * 0.45);
      const d2 = t * t * rdLen2 + EYE * EYE;
      let L = EYE / Math.sqrt(d2) / (1 + d2 * invD0) / (1 + 1.1 * (colS + rowS[yy]));
      if (hit) { const gap = perp - t; if (gap < 1.4) L *= 0.42 + 0.58 * gap / 1.4; }
      const q = L * K * sh * ag * 2.0;
      let a = TR * q; d[i4]     = TONE[a > 2047 ? 2047 : a | 0];
      a = TG * q;     d[i4 + 1] = TONE[a > 2047 ? 2047 : a | 0];
      a = TB * q;     d[i4 + 2] = TONE[a > 2047 ? 2047 : a | 0];
    }
  }

  if (FOTO.rapido) return zbuf;
  RS_S.tmp.getContext("2d").putImageData(img, 0, 0);
  c.imageSmoothingEnabled = true;
  c.drawImage(RS_S.tmp, FR, FR, PW, PH);
  return zbuf;
}

// ------------------------------------------------------------------
// FILME INSTANTÂNEO: halação, cor lavada, pretos leitosos, grão,
// vinheta e os defeitos químicos da revelação. (Sem REC, sem scanline:
// isso é do celular da live — a polaroid é outro aparelho.)
// ------------------------------------------------------------------
function filmePass(cv, x, y, iw, ih, sepia, escuro) {
  const c = cv.getContext("2d");
  filmeHalacao(c, cv, x, y, iw, ih, null);
  filmePixels(c, x, y, iw, ih, sepia, escuro, null);
  const q = filmeQuimicaSorteia(x, y, iw, ih);
  filmeQuimicaDesenha(c, x, y, iw, ih, q, null);
  window._fotoQuimica = q;               // a foto guarda o sorteio: a conversão repete igual
}
function filmeTabelas(iw, ih) {
  if (!FILME_S || FILME_S.w !== iw || FILME_S.h !== ih) {
    const sm = document.createElement("canvas");
    sm.width = Math.max(8, iw >> 3); sm.height = Math.max(8, ih >> 3);
    const vg = new Float32Array(iw * ih);
    for (let yy = 0; yy < ih; yy++)
      for (let xx = 0; xx < iw; xx++) {
        const dx = (xx - iw / 2) / (iw / 2), dy = (yy - ih / 2) / (ih / 2);
        const r2 = dx * dx * 0.85 + dy * dy;
        vg[yy * iw + xx] = 1 - 0.34 * Math.min(1, r2 * r2 * 0.9 + r2 * 0.10);
      }
    const lr = new Uint8ClampedArray(256), lg = new Uint8ClampedArray(256),
          lb = new Uint8ClampedArray(256);
    for (let i = 0; i < 256; i++) {
      const t = i / 255, s = t * t * (3 - 2 * t);
      const m = t * 0.45 + s * 0.55;                      // contraste suave em S
      lr[i] = 255 * (0.055 + 0.960 * Math.pow(m, 0.92));  // altas quentes
      lg[i] = 255 * (0.066 + 0.915 * Math.pow(m, 0.96));  // sombras esverdeadas
      lb[i] = 255 * (0.062 + 0.820 * Math.pow(m, 1.04));  // azul contido
    }
    FILME_S = { w: iw, h: ih, sm, vg, lr, lg, lb };
  }
  return FILME_S;
}
// recorte (dentro do vidro) onde a passagem se aplica — null = o vidro todo
function filmeClip(c, x, y, iw, ih, sub) {
  c.beginPath();
  if (sub) c.rect(Math.max(x, sub.x), Math.max(y, sub.y),
                  Math.min(x + iw, sub.x + sub.w) - Math.max(x, sub.x),
                  Math.min(y + ih, sub.y + sub.h) - Math.max(y, sub.y));
  else c.rect(x, y, iw, ih);
  c.clip();
}
// 1) halação: as áreas estouradas pelo flash vazam luz em volta
function filmeHalacao(c, cv, x, y, iw, ih, sub) {
  const { sm } = filmeTabelas(iw, ih);
  const sc = sm.getContext("2d");
  sc.globalCompositeOperation = "source-over";
  sc.drawImage(cv, x, y, iw, ih, 0, 0, sm.width, sm.height);
  c.save();
  filmeClip(c, x, y, iw, ih, sub);
  c.globalCompositeOperation = "lighter";
  c.globalAlpha = 0.20;
  c.imageSmoothingEnabled = true;
  c.drawImage(sm, 0, 0, sm.width, sm.height, x - 3, y - 3, iw + 6, ih + 6);
  c.restore();
}
// 2) cor, grão e vinheta — por pixel (a vinheta depende da posição no vidro)
function filmePixels(c, x, y, iw, ih, sepia, escuro, sub) {
  const { vg, lr, lg, lb } = filmeTabelas(iw, ih);
  const sx = sub ? Math.max(x, sub.x) : x, sy = sub ? Math.max(y, sub.y) : y;
  const sw = sub ? Math.min(x + iw, sub.x + sub.w) - sx : iw;
  const sh = sub ? Math.min(y + ih, sub.y + sub.h) - sy : ih;
  if (sw <= 0 || sh <= 0) return;
  const im = c.getImageData(sx, sy, sw, sh), p = im.data;
  const SAT = sepia ? 0 : 0.5;
  for (let yy = 0, i = 0; yy < sh; yy++) {
    let n = (sy - y + yy) * iw + (sx - x);
    for (let xx = 0; xx < sw; xx++, i += 4, n++) {
      let r = p[i], g = p[i + 1], b = p[i + 2];
      const lum = 0.3 * r + 0.59 * g + 0.11 * b;
      const gr = (Math.random() - 0.5) * (24 - lum * 0.05) * (escuro ? 2.3 : 1);   // mais grão na sombra (e no escuro)
      const v = vg[n];
      r = (lum + (r - lum) * SAT) * v + gr;
      g = (lum + (g - lum) * SAT) * v + gr;
      b = (lum + (b - lum) * SAT) * v + gr;
      r = lr[r < 0 ? 0 : r > 255 ? 255 : r | 0];
      g = lg[g < 0 ? 0 : g > 255 ? 255 : g | 0];
      b = lb[b < 0 ? 0 : b > 255 ? 255 : b | 0];
      if (sepia) { r = r * 1.05 + 6; g = g * 0.93; b = b * 0.70; }
      p[i] = r; p[i + 1] = g; p[i + 2] = b;
    }
  }
  c.putImageData(im, sx, sy);
}
// 3) química: bordas mal reveladas, nuvens, vazamento de luz, poeira, fio
function filmeQuimicaSorteia(x, y, iw, ih) {
  const q = { nuvens: [], vaza: null, poeira: [], fio: null };
  for (let i = 0; i < 3; i++)
    q.nuvens.push({ mx: x + Math.random() * iw, my: y + Math.random() * ih, rad: 60 + Math.random() * 120 });
  if (Math.random() < 0.2)               // vazamento de luz num canto
    q.vaza = { cx: x + (Math.random() < 0.5 ? 0 : iw), cy: y + (Math.random() < 0.5 ? 0 : ih),
               rad: 150 + Math.random() * 110 };
  for (let i = 0; i < 9; i++)
    q.poeira.push({ px: x + Math.random() * iw, py: y + Math.random() * ih,
                    w: 1 + Math.random() * 1.5, h: 1 + Math.random() * 1.5, claro: Math.random() < 0.5 });
  if (Math.random() < 0.18)              // um fio de cabelo preso no rolo
    q.fio = { hx: x + Math.random() * iw, hy: y + Math.random() * ih };
  return q;
}
function filmeQuimicaDesenha(c, x, y, iw, ih, q, sub) {
  c.save();
  filmeClip(c, x, y, iw, ih, sub);
  for (const [x0, y0, x1, y1] of [[x, 0, x + 26, 0], [x + iw, 0, x + iw - 26, 0],
                                  [0, y, 0, y + 20], [0, y + ih, 0, y + ih - 30]]) {
    const gr = c.createLinearGradient(x0, y0, x1, y1);
    gr.addColorStop(0, "rgba(236,222,186,0.11)");
    gr.addColorStop(1, "rgba(236,222,186,0)");
    c.fillStyle = gr; c.fillRect(x, y, iw, ih);
  }
  for (const nv of q.nuvens) {
    const gr = c.createRadialGradient(nv.mx, nv.my, 4, nv.mx, nv.my, nv.rad);
    gr.addColorStop(0, "rgba(214,222,190,0.07)");
    gr.addColorStop(1, "rgba(214,222,190,0)");
    c.fillStyle = gr; c.fillRect(x, y, iw, ih);
  }
  if (q.vaza) {
    const gr = c.createRadialGradient(q.vaza.cx, q.vaza.cy, 6, q.vaza.cx, q.vaza.cy, q.vaza.rad);
    gr.addColorStop(0, "rgba(255,150,70,0.26)");
    gr.addColorStop(1, "rgba(255,150,70,0)");
    c.globalCompositeOperation = "screen";
    c.fillStyle = gr; c.fillRect(x, y, iw, ih);
    c.globalCompositeOperation = "source-over";
  }
  for (const d of q.poeira) {
    c.fillStyle = d.claro ? "rgba(255,255,255,0.32)" : "rgba(0,0,0,0.4)";
    c.fillRect(d.px, d.py, d.w, d.h);
  }
  if (q.fio) {
    const { hx, hy } = q.fio;
    c.strokeStyle = "rgba(18,14,10,0.5)"; c.lineWidth = 0.8;
    c.beginPath(); c.moveTo(hx, hy);
    c.bezierCurveTo(hx + 30, hy - 26, hx + 54, hy + 30, hx + 90, hy + 8);
    c.stroke();
  }
  // sombra interna da moldura
  const eg = c.createLinearGradient(0, y, 0, y + 9);
  eg.addColorStop(0, "rgba(0,0,0,0.35)"); eg.addColorStop(1, "rgba(0,0,0,0)");
  c.fillStyle = eg; c.fillRect(x, y, iw, 9);
  c.restore();
}

// um contexto "duplo": tudo o que se desenha num vai também no outro
function teeCtx(a, b) {
  return new Proxy(a, {
    get(t, k) {
      const v = t[k];
      if (typeof v !== "function") return v;
      return function (...args) { const r = v.apply(a, args); b[k](...args); return r; };
    },
    set(t, k, val) { a[k] = val; b[k] = val; return true; },
  });
}
function recorte(src, x, y, w, h) {
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  cv.getContext("2d").drawImage(src, x, y, w, h, 0, 0, w, h);
  return cv;
}
// a alma foi convertida: o fundo limpo volta para o lugar do vulto, os vultos
// vizinhos que ainda estão na foto são repostos e a revelação é repetida só
// ali — a foto fica como se ele nunca tivesse estado nela
function fotoSomeVulto(e, m) {
  if (!m.fundo) return false;
  const cv = e.cv, c = cv.getContext("2d");
  const FR = FOTO_MOLDURA.FR, PW = cv.width - FR * 2, PH = cv.height - FR - FOTO_MOLDURA.BOT;
  const sub = { x: m.fx, y: m.fy, w: m.fundo.width, h: m.fundo.height };
  c.save();
  c.beginPath(); c.rect(sub.x, sub.y, sub.w, sub.h); c.clip();
  c.drawImage(m.fundo, m.fx, m.fy);
  for (const o of e.marcas || [])
    if (o !== m && !o.guardada && o.vulto) c.drawImage(o.vulto, o.fx, o.fy);
  c.restore();
  if (!e.semFilme) {
    filmeHalacao(c, cv, FR, FR, PW, PH, sub);
    filmePixels(c, FR, FR, PW, PH, !!e.sepia, !!e.escuro, sub);
    if (e.quimica) filmeQuimicaDesenha(c, FR, FR, PW, PH, e.quimica, sub);
  }
  m.fundo = null; m.vulto = null;
  return true;
}

// ------------------------------------------------------------------
// Billboards com oclusão por coluna (desenha em FAIXAS contínuas)
// ------------------------------------------------------------------
function blitRuns(c, src, srcW, srcH, zbuf, ty, destX, topY, wPx, hPx, Wc, CWc, FR) {
  const colStart = Math.max(0, Math.floor((destX - FR) / CWc));
  const colEnd = Math.min(Wc - 1, Math.ceil((destX + wPx - FR) / CWc) - 1);
  if (colEnd < colStart || wPx < 1 || hPx < 1) return;
  let run = -1;
  for (let col = colStart; col <= colEnd + 1; col++) {
    const vis = col <= colEnd && ty < zbuf[col];
    if (vis) { if (run < 0) run = col; continue; }
    if (run < 0) continue;
    const x0 = Math.max(destX, FR + run * CWc);
    const x1 = Math.min(destX + wPx, FR + col * CWc);
    if (x1 > x0) {
      const sx0 = (x0 - destX) / wPx * srcW, sw = (x1 - x0) / wPx * srcW;
      c.drawImage(src, sx0, 0, sw, srcH, x0, topY, x1 - x0, hPx);
    }
    run = -1;
  }
}
// sprite "de luz" (alma, marca, corrente): o brilho entra como transparência
function blitOccluded(c, spr, zbuf, ty, centerX, topY, wPx, hPx, alpha, Wc, CWc, FR) {
  c.save();
  c.globalAlpha = Math.max(0, Math.min(1, alpha));
  blitRuns(c, spr, spr.width, spr.height, zbuf, ty, centerX - wPx / 2, topY,
           wPx, hPx, Wc, CWc, FR);
  c.restore();
}
// sprite SÓLIDO (móvel, retrato, escada): opaco, escurecido/estourado pelo flash
function blitLit(c, spr, zbuf, ty, centerX, topY, wPx, hPx, k, Wc, CWc, FR) {
  const w = Math.max(1, Math.min(1400, Math.round(wPx)));
  const h = Math.max(1, Math.min(1400, Math.round(hPx)));
  if (!LIT_S) LIT_S = document.createElement("canvas");
  if (LIT_S.width < w || LIT_S.height < h) {
    LIT_S.width = Math.max(LIT_S.width, w);
    LIT_S.height = Math.max(LIT_S.height, h);
  }
  const g = LIT_S.getContext("2d");
  g.globalCompositeOperation = "source-over";
  g.clearRect(0, 0, w, h);
  g.imageSmoothingEnabled = true;
  g.drawImage(spr, 0, 0, w, h);
  g.globalCompositeOperation = "source-atop";
  g.fillStyle = k < 1 ? `rgba(0,0,0,${(1 - k).toFixed(3)})`
                      : `rgba(255,248,232,${Math.min(0.45, (k - 1) * 0.5).toFixed(3)})`;
  g.fillRect(0, 0, w, h);
  blitRuns(c, LIT_S, w, h, zbuf, ty, centerX - wPx / 2, topY, wPx, hPx, Wc, CWc, FR);
}
let SOMBRA_SPR = null;
function sombraSprite() {
  if (SOMBRA_SPR) return SOMBRA_SPR;
  const cv = document.createElement("canvas");
  cv.width = 128; cv.height = 64;
  const g = cv.getContext("2d");
  g.scale(1, 0.5);
  const gr = g.createRadialGradient(64, 64, 6, 64, 64, 62);
  gr.addColorStop(0, "rgba(0,0,0,0.85)");
  gr.addColorStop(0.6, "rgba(0,0,0,0.5)");
  gr.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  return (SOMBRA_SPR = cv);
}

// POLAROID: borda branca-creme, rodapé largo para a legenda à mão
const FOTO_MOLDURA = { FR: 22, BOT: 66 };
function renderPhoto(px, py, dir, escuro) {
  const W = 96, H = 58, CW = 6, CH = 7;
  const FR = FOTO_MOLDURA.FR, BOT = FOTO_MOLDURA.BOT;
  const PW = W * CW, PH = H * CH;
  const cv = document.createElement("canvas");
  cv.width = PW + FR * 2; cv.height = PH + FR + BOT;
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
  c.fillStyle = "#000"; c.fillRect(FR, FR, PW, PH);
  c.strokeStyle = "rgba(60,52,40,0.5)";
  c.strokeRect(FR - 0.5, FR - 0.5, PW + 1, PH + 1);

  c.textAlign = "center"; c.textBaseline = "middle";

  const dirX = Math.cos(dir), dirY = Math.sin(dir);
  const tanF = Math.tan(FOTO.FOV / 2);
  const planeX = -dirY * tanF, planeY = dirX * tanF;
  const MAXD = FOTO.MAXD;
  const Wc = IS_TOUCH ? 384 : 576, CWc = PW / Wc;
  const zbuf = renderRealisticScene(c, px, py, FR, PW, PH,
                                    dirX, dirY, planeX, planeY, MAXD, Wc, escuro);

  // projeção dos billboards (mesma câmera da cena)
  const fP = (PW / 2) / tanF;                       // focal em px finais
  const horY = FR + PH * FOTO.HOR;
  const yAt = (h, dep) => horY - fP * (h - FOTO.EYE) / dep;
  const luzK = (dep, sxCol) => {                    // brilho sob o flash
    const ax = (sxCol / Wc * 2 - 1) * tanF;
    const L = 1 / (1 + dep * dep / (FOTO.D0 * FOTO.D0)) / (1 + 1.1 * ax * ax);
    let k = Math.min(1.12, (1 - Math.exp(-0.5 * L * FOTO.EXPO)) / 0.5 * 0.88);
    if (escuro) {                                   // sem flash: só a lanterna, de perto
      const ang = Math.abs(Math.atan(ax)), t = Math.max(0, Math.min(1, (ang - 0.3) / 0.3));
      k *= 0.32 * (1 - t * 0.8) * Math.max(0.15, 1 - dep / 14);
    }
    return k;
  };

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
  // peças de cenário: no mapa são um ícone; a foto mostra o objeto
  if (fl().safe) sprites.push({ x: fl().safe.x, y: fl().safe.y, kind: "prop",
                                tipo: "cofre", h: 1.9, base: 0 });
  if (fl().fusebox) sprites.push({ x: fl().fusebox.x, y: fl().fusebox.y, kind: "prop",
                                   tipo: "quadro", h: 2.0, base: 1.5 });
  if (fl().bench) sprites.push({ x: fl().bench.x, y: fl().bench.y, kind: "prop",
                                 tipo: "bancada", h: 2.7, base: 0 });
  if (world.cur === NFLOORS - 1) {
    sprites.push({ x: ATELIER_CAVALETE.x, y: ATELIER_CAVALETE.y, kind: "prop",
                   tipo: "cavalete", h: 3.4, base: 0 });
    sprites.push({ x: ATELIER_CADEIRA.x, y: ATELIER_CADEIRA.y, kind: "prop",
                   tipo: "cadeira", h: 2.7, base: 0 });
    // a PAREDE DE MOLDURAS: sete, uma para cada. É o placar da casa.
    RET_SOUL_IDS.forEach((id, i) => sprites.push({
      x: ATELIER.x + 4.5 + i * 3.5, y: ATELIER.y + 0.55, kind: "moldura", alma: id }));
  }
  // a grade do elevador (o poço existe em todo andar)
  if (fl().elev)
    sprites.push({ x: fl().elev.cx, y: fl().elev.wy, kind: "prop", tipo: "grade", h: 4.9, base: 0 });
  // candelabros do andar (acesos ou não)
  for (const cd of fl().candelabros || [])
    sprites.push({ x: cd.x, y: cd.y, kind: "cande", cd });
  // o hall: a lamparina e os quadros de quem ficou (parede — só a foto mostra)
  if (world.cur === 1 && world.lamp)
    sprites.push({ x: world.lamp.x, y: world.lamp.y, kind: "prop",
                   tipo: "lamparina", h: 2.5, base: 0 });
  if (world.cur === 1 && world.quadros)
    for (const q of world.quadros) sprites.push({ x: q.x, y: q.y, kind: "ant", q });
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

  // a CÓPIA LIMPA (sem vultos): é o que fica na foto quando uma alma é convertida
  const temVulto = !!window._fotoAlmas && sprites.some(sp => sp.kind === "ghost");
  let cv2 = null, cc = c;
  if (temVulto) {
    cv2 = document.createElement("canvas"); cv2.width = cv.width; cv2.height = cv.height;
    cv2.getContext("2d").drawImage(cv, 0, 0);
    cc = teeCtx(c, cv2.getContext("2d"));
  }
  const areaH = PH;
  cc.save();
  cc.beginPath(); cc.rect(FR, FR, PW, PH); cc.clip();   // nada vaza para a moldura
  for (const s of sprites) {
    const dx = s.x - px, dy = s.y - py;
    const tx = invDet * (dirY * dx - dirX * dy);
    const ty = invDet * (-planeY * dx + planeX * dy);
    if (ty <= 0.4 || ty > MAXD) continue;
    const sxCol = (Wc / 2) * (1 + tx / ty);
    if (sxCol < -Wc * 0.3 || sxCol > Wc * 1.3) continue;
    const centerX = FR + sxCol * CWc;
    const bright = Math.max(0, 1 - ty / (escuro ? 10 : 24));   // ALCANCE das pistas (lógica)
    if (bright <= 0.03) continue;
    const k = luzK(ty, sxCol);                    // brilho visual sob o flash
    const cell = fP / ty;                         // px por célula nesta distância
    const floorPx = yAt(0, ty);
    const zAqui = zbuf[Math.max(0, Math.min(Wc - 1, sxCol | 0))];

    if (s.kind === "ghost" || s.kind === "soul") {
      let spr, hs;
      if (s.kind === "ghost") {
        // quem caiu na live passada vaga de moletom no andar onde ficou
        spr = s.gh.streamer ? ecoStreamerSprite()
                            : s.gh.sprCv || (s.gh.sprCv = ghostSprite(s.gh.artSeed));
        hs = spr._hscale || 1;
        if (s.gh.streamer && bright > 0.2 && ty < zAqui + 0.6 &&
            !world.flags.antVistos.includes("eco")) {
          world.flags.antVistos.push("eco");
          livePush(liveRandUser(), "esse vulto tá de MOLETOM. e segurando um CELULAR");
          livePush(liveRandUser(), tf("é ELE. é o cara da live nº {0}. ele nunca saiu daqui",
                   (world.flags.anteriores[0] || {}).n || "?"));
          liveFixo("ele ainda está transmitindo. para mim.");
          live.viewers += 70;
        }
      } else {
        const def = SOUL_DEFS[s.ent.id];
        // cada alma tem o SEU corpo (e o Hóspede, sem rosto no mundo, na foto usa o seu)
        spr = soulSprite(s.ent.id);
        hs = (spr._hscale || 1) * (def.escala || 1);
        if (s.ent.id === "hospede" && bright > 0.2 && ty < zAqui + 0.6 &&
            !live.hinted.has("rostoHosp") && typeof STREAMER_IMG !== "undefined" && STREAMER_IMG) {
          live.hinted.add("rostoHosp");
          livePush(liveRandUser(), "olha o ROSTO dele na foto. olha direito");
          livePush(liveRandUser(), "é o SEU rosto. por que ele tá usando o SEU rosto???");
        }
      }
      const hPx = Math.min(areaH * 1.6, 3.3 * cell) * hs;
      const wPx = hPx * (spr._aspect || 0.72);
      const topY = floorPx - hPx * 0.97;
      const kk = Math.min(1, k);
      const glow = GLOW_SPR || (GLOW_SPR = makeGlowSprite());
      // o VULTO (eco) não entra na cópia limpa; entra em c e numa camada só dele
      let lay = null, cg = cc;
      if (s.kind === "ghost") {
        cg = c;
        if (temVulto) {
          lay = document.createElement("canvas"); lay.width = cv.width; lay.height = cv.height;
          const lc = lay.getContext("2d");
          lc.beginPath(); lc.rect(FR, FR, PW, PH); lc.clip();
          cg = teeCtx(c, lc);
        }
      }
      blitOccluded(cg, glow, zbuf, ty, centerX, topY - hPx * 0.04,
                   wPx * 1.3, hPx * 1.05, 0.14 + kk * 0.22, Wc, CWc, FR);
      // a presença nunca sai nítida: um rastro de exposição dupla
      const rastro = (Math.random() < 0.5 ? -1 : 1) * (3 + Math.random() * 7);
      blitOccluded(cg, spr, zbuf, ty, centerX + rastro, topY + Math.random() * 3,
                   wPx * 1.03, hPx, 0.16 + kk * 0.14, Wc, CWc, FR);
      blitOccluded(cg, spr, zbuf, ty, centerX, topY, wPx, hPx,
                   Math.min(1, 0.34 + kk * 0.7), Wc, CWc, FR);
      if (s.kind === "ghost" && window._fotoAlmas)   // onde a figura ficou na foto
        window._fotoAlmas.push({ gh: s.gh, x: centerX, y: topY, w: wPx, h: hPx, lay });
    } else if (s.kind === "cande") {
      const n = world.flags.velas[s.cd.id] || 0;
      const spr = candelabroSprite(n);
      const hPx = Math.min(areaH * 1.5, 3.1 * cell), wPx = hPx * (spr.width / spr.height);
      const shH = Math.max(3, fP * FOTO.EYE / (ty * ty) * 1.2);
      blitOccluded(cc, sombraSprite(), zbuf, ty, centerX, floorPx - shH * 0.62,
                   wPx * 1.1, shH, 0.6, Wc, CWc, FR);
      blitLit(cc, spr, zbuf, ty, centerX, floorPx - hPx, wPx, hPx, Math.max(k, n ? 0.55 : 0), Wc, CWc, FR);
      if (n) {                                       // o fogo azul ilumina em volta
        const gl = GLOW_AZUL || (GLOW_AZUL = makeGlowSprite("azul"));
        blitOccluded(cc, gl, zbuf, ty, centerX, floorPx - hPx * 1.05,
                     wPx * (1.6 + n * 0.5), hPx * (0.6 + n * 0.12), 0.18 + n * 0.1, Wc, CWc, FR);
      }
    } else if (s.kind === "film") {
      const spr = FILM_SPR || (FILM_SPR = makeFilmSprite());
      const hPx = Math.min(areaH * 0.7, 0.9 * cell);
      blitOccluded(cc, spr, zbuf, ty, centerX, floorPx - hPx, hPx, hPx,
                   Math.min(1, 0.3 + k * 0.7), Wc, CWc, FR);
    } else if (s.kind === "furn") {
      const ft = FURN_TYPES[s.furn.type];
      const spr = furnArt(s.furn.type);
      // ALTURA física manda (hC × FURN_K, em células); a LARGURA segue a
      // proporção da imagem, e o footprint só estica/comprime até 30%
      const hPx = Math.min(areaH * 1.6, ft.hC * FOTO.FURN_K * cell);
      const natW = hPx * (spr.width / spr.height);
      const vd = Math.hypot(dx, dy) || 1;
      const ux2 = dx / vd, uy2 = dy / vd;
      const lateralCells = ft.w * Math.abs(uy2) + ft.h * Math.abs(ux2);
      const footW = lateralCells * cell;
      const wPx = Math.max(natW * 0.7, Math.min(natW * 1.3, footW));
      // sombra de contato: o móvel PISA no chão
      const fundoCells = (ft.w * Math.abs(ux2) + ft.h * Math.abs(uy2)) * 0.5 + 0.3;
      const shH = Math.max(3, fP * FOTO.EYE / (ty * ty) * fundoCells * 2);
      blitOccluded(cc, sombraSprite(), zbuf, ty, centerX, floorPx - shH * 0.62,
                   wPx * 1.16, shH, 0.7, Wc, CWc, FR);
      blitLit(cc, spr, zbuf, ty, centerX, floorPx - hPx, wPx, hPx, k, Wc, CWc, FR);
      // MODO PUZZLE (sem ecos): fotografar O piano desperta a Olívia
      if (typeof noGhosts !== "undefined" && noGhosts &&
          world.pianoOlivia && s.furn.type === "piano" &&
          Math.abs(s.furn.x - world.pianoOlivia.x) < 1 &&
          Math.abs(s.furn.y - world.pianoOlivia.y) < 1 &&
          world.flags.souls.olivia &&
          world.flags.souls.olivia.state === "dormant" && bright > 0.25) {
        if (ty < zAqui + 0.6) window._pianoPend = world.pianoOlivia.floor;
      }
      // A NOIVA NO REFLEXO: no espelho certo, ela sai na foto antes de
      // existir no mundo (desenhada POR CIMA do vidro, translúcida)
      if (world.espelhoCecilia && s.furn === world.espelhoCecilia.furn &&
          world.flags.souls.cecilia &&
          world.flags.souls.cecilia.state === "dormant" && bright > 0.25) {
        if (ty < zAqui + 0.6) {
          fotoPista("o reflexo no espelho", true, "reflexo");
          const gspr = soulSprite("cecilia");
          const ghPx = hPx * 0.85;
          blitOccluded(cc, gspr, zbuf, ty, centerX, floorPx - hPx * 0.95,
                       ghPx * (gspr._aspect || 0.72), ghPx,
                       0.30, Wc, CWc, FR);
          window._espelhoPend = world.cur;
        }
      }
    } else if (s.kind === "prop") {
      const spr = s.tipo === "bancada" ? bancadaSprite() : propSprite(s.tipo);
      const hPx = Math.min(areaH * 1.6, s.h * cell);
      const wPx = hPx * (spr.width / spr.height);
      if (s.base === 0) {
        const shH = Math.max(3, fP * FOTO.EYE / (ty * ty) * 1.6);
        blitOccluded(cc, sombraSprite(), zbuf, ty, centerX, floorPx - shH * 0.62,
                     wPx * 1.16, shH, 0.7, Wc, CWc, FR);
      }
      blitLit(cc, spr, zbuf, ty, centerX, yAt(s.base + s.h, ty), wPx, hPx, k, Wc, CWc, FR);
    } else if (s.kind === "mark") {
      // sem a LENTE NOVA a foto sai rachada: dá pra ver QUE tem algo, não O QUÊ
      const nitida = world.flags.cam.lente;
      const spr = nitida ? digitSprite(s.mk.digit, s.mk.ord) : smudgeSprite();
      const hPx = Math.min(areaH * 0.9, 2.3 * cell);
      const wPx = hPx * 0.73;
      blitOccluded(cc, spr, zbuf, ty, centerX, yAt(4.1, ty), wPx, hPx,
                   Math.min(1, 0.3 + k * 0.7), Wc, CWc, FR);
      if (nitida && bright > 0.25 && Math.abs(sxCol - Wc / 2) < Wc * 0.45 && ty < zAqui + 0.6)
        fotoPista(tf("dígito nº {0} do cofre", s.mk.ord), !s.mk.seen, "digito");
      if (nitida && bright > 0.25 && Math.abs(sxCol - Wc / 2) < Wc * 0.45 &&
          ty < zAqui + 0.6 && !s.mk.seen) {        // só conta se a marca saiu na foto
        s.mk.seen = true;                          // o chat para de dar essa dica
        if (!world.flags.marksSeen.includes(s.mk.ord))
          world.flags.marksSeen.push(s.mk.ord);
      } else if (!nitida && bright > 0.25 && !live.hinted.has("lenteruim")) {
        live.hinted.add("lenteruim");
        livePush(liveRandUser(), "tem ALGO escrito aí mas a lente tá RACHADA… precisa de outra");
      }
    } else if (s.kind === "ret") {
      const spr = retratoSprite(s.ret.soul);
      const hPx = Math.min(areaH * 0.8, 1.25 * cell);
      const wPx = hPx * 0.78;
      // o autorretrato do Blackwood está NO cavalete; os outros, no chão
      const topRet = s.ret.soul === "blackwood" ? yAt(2.95, ty) : floorPx - hPx * 1.02;
      blitLit(cc, spr, zbuf, ty, centerX, topRet, wPx, hPx,
              Math.max(k, 0.35), Wc, CWc, FR);
      if (bright > 0.2 && ty < zAqui + 0.6)
        fotoPista(tf("retrato de {0}", tr(SOUL_DEFS[s.ret.soul].nome)), !world.flags.retSeen.includes(s.ret.id), "retrato");
      if (bright > 0.2 && ty < zAqui + 0.6 &&
          !world.flags.retSeen.includes(s.ret.id)) {
        world.flags.retSeen.push(s.ret.id);
        livePush(liveRandUser(), tf("PERA. tem um RETRATO escondido perto do {0}!! volta lá e pega",
                 tr(MOVEL_NOME[s.ret.movel] || s.ret.movel)));
        live.viewers += 40;
      }
    } else if (s.kind === "moldura") {
      const est = (world.flags.souls[s.alma] || {}).state || "dormant";
      const spr = molduraSprite(s.alma, est);
      const hPx = Math.min(areaH * 0.9, 1.9 * cell);
      const wPx = hPx * (spr.width / spr.height);
      blitLit(cc, spr, zbuf, ty, centerX, yAt(4.4, ty), wPx, hPx, Math.max(k, 0.3), Wc, CWc, FR);
      if (bright > 0.25 && ty < zAqui + 0.9) fotoPista("as molduras do ateliê", false);
      if (bright > 0.25 && ty < zAqui + 0.9 && !live.hinted.has("molduras")) {
        live.hinted.add("molduras");
        livePush(liveRandUser(), "SETE molduras na parede do estúdio. uma pra cada um deles");
        livePush(liveRandUser(), "as VAZIAS são os que você soltou. as queimadas… dá pra ver");
      }
    } else if (s.kind === "ant") {
      const spr = quadroAntSprite();
      const hPx = Math.min(areaH * 0.9, 1.95 * cell);
      const wPx = hPx * (spr.width / spr.height);
      blitLit(cc, spr, zbuf, ty, centerX, yAt(4.35, ty), wPx, hPx,
              Math.max(k, 0.3), Wc, CWc, FR);
      if (bright > 0.2 && ty < zAqui + 0.9) fotoPista("quem veio antes", !world.flags.antVistos.includes(s.q.id), "antes");
      if (bright > 0.2 && ty < zAqui + 0.9 && !world.flags.antVistos.includes(s.q.id)) {
        world.flags.antVistos.push(s.q.id);
        quadroAntVisto(s.q);
      }
    } else if (s.kind === "chains") {
      const spr = chainsSprite(chainsBroken());
      const wPx = cell * 3.4;
      const hPx = FOTO.DOOR_H * cell;
      blitOccluded(cc, spr, zbuf, ty, centerX, floorPx - hPx, wPx, hPx,
                   Math.min(1, 0.4 + k * 0.6), Wc, CWc, FR);
      if (bright > 0.2 && ty < zAqui + 1.2) fotoPista("as correntes da porta", !live.hinted.has("chainsSeen"), "correntes");
      if (bright > 0.2 && ty < zAqui + 1.2 && !live.hinted.has("chainsSeen")) {
        live.hinted.add("chainsSeen");
        livePush(liveRandUser(), "A PORTA TÁ ACORRENTADA NA FOTO?!?!");
        livePush(liveRandUser(), "7 correntes… uma pra cada alma presa na casa. liberta elas");
        live.viewers += 70;
      }
    } else if (s.kind === "stair") {
      const spr = stairSprite(s.up);
      const hPx = 4.8 * cell;
      const wPx = hPx * (spr.width / spr.height);
      blitLit(cc, spr, zbuf, ty, centerX, floorPx - hPx, wPx, hPx,
              Math.max(k, 0.3), Wc, CWc, FR);
      if (bright > 0.2 && ty < zAqui + 0.8) {
        if (!world.flags.stairsSeen) world.flags.stairsSeen = [];
        fotoPista("a escada escondida", !world.flags.stairsSeen.includes(s.key), "escada");
        if (!world.flags.stairsSeen.includes(s.key)) {
          world.flags.stairsSeen.push(s.key);   // a FOTO denunciou a escada
          livePush(liveRandUser(), "TEM UMA ESCADA NA FOTO!! dentro da parede!!");
          live.viewers += 30;
        }
      }
    } else if (s.kind === "sinal") {
      // o olho riscado: só sai com a LENTE NOVA (a rachada borra tudo)
      const spr = world.flags.cam.lente ? sinalSprite() : smudgeSprite();
      const hPx = Math.min(areaH * 0.7, 1.9 * cell);
      blitOccluded(cc, spr, zbuf, ty, centerX, yAt(4.15, ty),
                   hPx, hPx, Math.min(1, 0.3 + k * 0.7), Wc, CWc, FR);
      if (world.flags.cam.lente && bright > 0.25 && ty < zAqui + 0.6) {
        fotoPista("o sinal do Hóspede", world.flags.souls.hospede.state === "dormant", "sinal");
        soulsOnSinal(world.cur);
      }
    }
  }
  cc.restore();
  // cada vulto guarda o fundo limpo sob ele e os próprios pixels (para sumir depois)
  if (cv2) for (const m of window._fotoAlmas) {
    const fx = Math.max(FR, Math.round(m.x - m.w * 0.8)), fy = Math.max(FR, Math.round(m.y - m.h * 0.12));
    const fx1 = Math.min(FR + PW, Math.round(m.x + m.w * 0.8)), fy1 = Math.min(FR + PH, Math.round(m.y + m.h * 1.08));
    if (m.lay && fx1 - fx > 2 && fy1 - fy > 2) {
      m.fx = fx; m.fy = fy;
      m.fundo = recorte(cv2, fx, fy, fx1 - fx, fy1 - fy);
      m.vulto = recorte(m.lay, fx, fy, fx1 - fx, fy1 - fy);
    }
    m.lay = null;
  }

  // LENTE DO PASSADO: perto do lugar de uma alma, a foto volta décadas
  let passadoSpot = null;
  if (world.flags.cam.passado) {
    let best = 10;
    for (const r2 of world.retratos) {
      if (r2.floor !== world.cur) continue;
      const dd = Math.hypot(r2.x - px, r2.y - py);
      if (dd > best) continue;
      const ty2 = invDet * (-planeY * (r2.x - px) + planeX * (r2.y - py));
      const tx2 = invDet * (dirY * (r2.x - px) - dirX * (r2.y - py));
      if (ty2 <= 0.2 || Math.abs(tx2) > ty2 * 1.05) continue;   // precisa estar no enquadramento
      best = dd; passadoSpot = r2;
    }
  }

  window._fotoSepia = !!passadoSpot; window._fotoQuimica = null;
  if (!FOTO.rapido) filmePass(cv, FR, FR, PW, PH, !!passadoSpot, escuro);

  // a legenda do passado: escrita à mão sobre a emulsão, como num verso de foto
  if (passadoSpot) {
    c.save();
    c.font = "italic 17px 'Segoe Script', 'Comic Sans MS', cursive";
    c.textAlign = "left"; c.textBaseline = "middle";
    c.shadowColor = "rgba(0,0,0,0.8)"; c.shadowBlur = 4;
    c.fillStyle = "rgba(244,230,196,0.94)";
    c.fillText(PASSADO_TXT[passadoSpot.soul] || "", FR + 10, FR + PH - 16);
    c.restore();
    const hid = "pass_" + passadoSpot.soul;
    fotoPista(tf("legenda do passado: {0}", tr(PASSADO_TXT[passadoSpot.soul] || "")), !live.hinted.has(hid), "passado");
    if (!live.hinted.has(hid)) {
      live.hinted.add(hid);
      livePush(liveRandUser(), tf("a legenda da foto… “{0}”",
               tr(PASSADO_TXT[passadoSpot.soul] || "")));
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
  c.fillText(tf(escuro ? "foto {0} — {1} · sem flash" : "foto {0} — {1}",
                photoCount, tr(FLOOR_NAMES[world.cur]).toLowerCase()), 0, 0);
  c.restore();
  return cv;
}

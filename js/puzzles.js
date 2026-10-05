"use strict";
// ==================================================================
// PUZZLES em overlay (jogo pausado): cofre, fusíveis, elevador; vitória
// ==================================================================
const safeUI = { guess: [1, 1, 1], msg: null, msgT: 0 };

// --- COFRE: 3 rodas de dígitos; código revelado pelas FOTOS ---
// geometria sobre a FOTO do cofre: as 3 janelinhas e a maçaneta
function safeGeom() {
  const im = UI_IMGS.cofre;
  if (!im) return null;
  const s = Math.max(canvas.width / im.naturalWidth,
                     canvas.height / im.naturalHeight);
  const dw = im.naturalWidth * s, dh = im.naturalHeight * s;
  const ox = (canvas.width - dw) / 2, oy = (canvas.height - dh) / 2;
  const P = (fx, fy) => ({ x: ox + fx * dw, y: oy + fy * dh });
  return {
    jan: [P(0.4215, 0.512), P(0.4993, 0.512), P(0.5763, 0.512)],
    jw: 0.058 * dw, jh: 0.124 * dh,
    alav: Object.assign(P(0.664, 0.545), { r: 0.052 * dw }),
  };
}

function drawSafe() {
  const g = safeGeom();
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  if (g) {
    drawCover(ctx, UI_IMGS.cofre, 0, 0, canvas.width, canvas.height);
    // título discreto com backing
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(canvas.width / 2 - 330, 34, 660, 66);
    ctx.font = "bold 24px 'Courier New', monospace";
    ctx.fillStyle = "rgba(225,220,210,0.95)";
    ctx.fillText("COFRE DE PAREDE", canvas.width / 2, 58);
    ctx.font = "bold 13px 'Courier New', monospace";
    ctx.fillStyle = "rgba(170,165,150,0.85)";
    ctx.fillText("os números estão escritos pela casa — a câmera os enxerga",
                 canvas.width / 2, 84);
    // dígitos DENTRO das janelinhas da foto
    for (let i = 0; i < 3; i++) {
      const j = g.jan[i];
      const hov = Math.abs(mouse.x - j.x) < g.jw / 2 + 8 &&
                  Math.abs(mouse.y - j.y) < g.jh / 2 + 26;
      ctx.font = `bold ${(g.jh * 0.52) | 0}px 'Courier New', monospace`;
      ctx.fillStyle = "rgba(235,228,205,0.95)";
      ctx.fillText(safeUI.guess[i], j.x, j.y + 2);
      // pontinhos da ordem + setinhas
      ctx.font = "bold 16px 'Courier New', monospace";
      ctx.fillStyle = "rgba(230,90,80,0.95)";
      ctx.fillText("•".repeat(i + 1), j.x, j.y - g.jh / 2 - 34);
      ctx.fillStyle = `rgba(255,255,255,${hov ? 0.9 : 0.45})`;
      ctx.font = "bold 20px 'Courier New', monospace";
      ctx.fillText("▲", j.x, j.y - g.jh / 2 - 14);
      ctx.fillText("▼", j.x, j.y + g.jh / 2 + 14);
    }
    // a maçaneta é o GIRAR
    const hovA = Math.hypot(mouse.x - g.alav.x, mouse.y - g.alav.y) < g.alav.r;
    ctx.lineWidth = hovA ? 4 : 2.5;
    ctx.strokeStyle = `rgba(240,220,160,${hovA ? 0.95 : 0.55 + 0.25 * Math.sin(time * 3)})`;
    ctx.beginPath(); ctx.arc(g.alav.x, g.alav.y, g.alav.r, 0, 7); ctx.stroke();
    ctx.font = "bold 15px 'Courier New', monospace";
    ctx.fillStyle = "rgba(240,220,160,0.9)";
    ctx.fillText("GIRAR", g.alav.x, g.alav.y + g.alav.r + 18);
  } else {
    // reserva: layout antigo sem imagem
    ctx.fillStyle = "rgba(0,0,0,0.88)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = "bold 26px 'Courier New', monospace";
    ctx.fillStyle = "rgba(220,220,220,0.95)";
    ctx.fillText("COFRE DE PAREDE", canvas.width / 2, 90);
    for (let i = 0; i < 3; i++) {
      const x = canvas.width / 2 + (i - 1) * 180, y = canvas.height / 2;
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.font = "bold 40px 'Courier New', monospace";
      ctx.fillText("▲", x, y - 110);
      ctx.strokeStyle = "rgba(255,255,255,0.5)";
      ctx.lineWidth = 2;
      ctx.strokeRect(x - 55, y - 65, 110, 130);
      ctx.font = "bold 72px 'Courier New', monospace";
      ctx.fillStyle = "rgba(240,240,240,0.95)";
      ctx.fillText(safeUI.guess[i], x, y + 2);
      ctx.font = "bold 22px 'Courier New', monospace";
      ctx.fillStyle = "rgba(230,90,80,0.9)";
      ctx.fillText("•".repeat(i + 1), x, y - 88);
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.font = "bold 40px 'Courier New', monospace";
      ctx.fillText("▼", x, y + 112);
    }
    ctx.fillStyle = "rgba(255,255,255,0.07)";
    ctx.fillRect(canvas.width / 2 - 120, canvas.height - 150, 240, 62);
    ctx.strokeStyle = `rgba(255,255,255,${0.6 + 0.25 * Math.sin(time * 3)})`;
    ctx.lineWidth = 2;
    ctx.strokeRect(canvas.width / 2 - 120, canvas.height - 150, 240, 62);
    ctx.font = "bold 24px 'Courier New', monospace";
    ctx.fillStyle = "rgba(240,240,240,0.95)";
    ctx.fillText("TENTAR", canvas.width / 2, canvas.height - 118);
  }

  if (safeUI.msg && safeUI.msgT > 0) {
    safeUI.msgT -= frameDt;
    ctx.font = "bold 18px 'Courier New', monospace";
    ctx.fillStyle = "rgba(230,90,80,0.9)";
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(canvas.width / 2 - 220, canvas.height - 76, 440, 34);
    ctx.fillStyle = "rgba(240,120,110,0.95)";
    ctx.fillText(safeUI.msg, canvas.width / 2, canvas.height - 59);
  }
  drawOverlayClose();
}

function safeTry() {
  if (safeUI.guess.join("") === world.code.join("")) {
    world.flags.safeOpen = true;
    world.flags.fuses++;
    film = Math.min(filmMax(), film + 4);
    sfxSting(); liveEvent("safe");
    livePush("CanalDoPavor", "tinha um FUSÍVEL e filme dentro!!");
    soulsOnSafeOpened();                 // reserva da Cecília (casa sem espelho)
    saveRun();
    state = "play";
  } else {
    safeUI.msg = "clunk. errado."; safeUI.msgT = 1.6;
    sfxDry();
  }
}

function safeHit(px2, py2) {
  if (overlayCloseHit(px2, py2)) { state = "play"; return; }
  const g = safeGeom();
  if (g) {
    for (let i = 0; i < 3; i++) {
      const j = g.jan[i];
      if (Math.abs(px2 - j.x) > g.jw / 2 + 14) continue;
      // metade de cima (e a setinha) sobe; de baixo desce
      if (py2 > j.y - g.jh / 2 - 28 && py2 < j.y)
        { safeUI.guess[i] = safeUI.guess[i] % 9 + 1; sfxDry(); return; }
      if (py2 >= j.y && py2 < j.y + g.jh / 2 + 28)
        { safeUI.guess[i] = (safeUI.guess[i] + 7) % 9 + 1; sfxDry(); return; }
    }
    if (Math.hypot(px2 - g.alav.x, py2 - g.alav.y) < g.alav.r + 8) safeTry();
    return;
  }
  for (let i = 0; i < 3; i++) {
    const x = canvas.width / 2 + (i - 1) * 180, y = canvas.height / 2;
    if (Math.abs(px2 - x) < 60 && Math.abs(py2 - (y - 110)) < 34)
      safeUI.guess[i] = safeUI.guess[i] % 9 + 1;
    if (Math.abs(px2 - x) < 60 && Math.abs(py2 - (y + 112)) < 34)
      safeUI.guess[i] = (safeUI.guess[i] + 7) % 9 + 1;
  }
  if (Math.abs(px2 - canvas.width / 2) < 120 &&
      py2 > canvas.height - 150 && py2 < canvas.height - 88) safeTry();
}

// --- QUADRO DE FUSÍVEIS: encaixe nos soquetes da FOTO e puxe a alavanca ---
function fbGeom() {
  const im = UI_IMGS.fusebox;
  if (!im) return null;
  const s = Math.max(canvas.width / im.naturalWidth,
                     canvas.height / im.naturalHeight);
  const dw = im.naturalWidth * s, dh = im.naturalHeight * s;
  const ox = (canvas.width - dw) / 2, oy = (canvas.height - dh) / 2;
  const P = (fx, fy) => ({ x: ox + fx * dw, y: oy + fy * dh });
  return {
    soq: [P(0.4385, 0.489), P(0.4964, 0.491), P(0.5538, 0.489)],
    r: 0.0315 * dw,
    alav: Object.assign(P(0.6577, 0.50), { hw: 0.045 * dw, hh: 0.118 * dh }),
  };
}

function drawFusebox() {
  const g = fbGeom();
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  if (!g) {   // sem imagem não há overlay: nunca deve acontecer, mas protege
    ctx.fillStyle = "rgba(0,0,0,0.88)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ddd";
    ctx.fillText(tf("QUADRO DE FUSÍVEIS ({0}/3)", world.flags.fusesIn),
                 canvas.width / 2, canvas.height / 2);
    drawOverlayClose();
    return;
  }
  drawCover(ctx, UI_IMGS.fusebox, 0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(canvas.width / 2 - 300, 30, 600, 64);
  ctx.font = "bold 22px 'Courier New', monospace";
  ctx.fillStyle = "rgba(225,220,210,0.95)";
  ctx.fillText("QUADRO DE FUSÍVEIS", canvas.width / 2, 54);
  ctx.font = "bold 13px 'Courier New', monospace";
  ctx.fillStyle = "rgba(180,170,150,0.9)";
  ctx.fillText(tf("{0}/3 encaixados · {1} na mão", world.flags.fusesIn, world.flags.fuses),
               canvas.width / 2, 78);

  for (let i = 0; i < 3; i++) {
    const s = g.soq[i];
    if (i < world.flags.fusesIn) {
      // fusível encaixado: vidro âmbar com filamento
      const fg = ctx.createRadialGradient(s.x, s.y, 2, s.x, s.y, g.r);
      fg.addColorStop(0, "rgba(255,215,130,0.95)");
      fg.addColorStop(0.7, "rgba(190,130,50,0.8)");
      fg.addColorStop(1, "rgba(90,55,20,0.5)");
      ctx.fillStyle = fg;
      ctx.beginPath(); ctx.arc(s.x, s.y, g.r * 0.82, 0, 7); ctx.fill();
      ctx.strokeStyle = "rgba(255,230,170,0.8)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(s.x - g.r * 0.4, s.y + g.r * 0.25);
      ctx.quadraticCurveTo(s.x, s.y - g.r * 0.5, s.x + g.r * 0.4, s.y + g.r * 0.25);
      ctx.stroke();
    } else if (world.flags.fuses > 0) {
      // soquete vazio com fusível disponível: anel convidando
      const hov = Math.hypot(mouse.x - s.x, mouse.y - s.y) < g.r + 10;
      ctx.lineWidth = hov ? 4 : 2.5;
      ctx.strokeStyle = `rgba(255,210,120,${hov ? 0.95 : 0.5 + 0.3 * Math.sin(time * 4)})`;
      ctx.beginPath(); ctx.arc(s.x, s.y, g.r + 4, 0, 7); ctx.stroke();
    }
  }

  // a alavanca (OFF na foto): com 3/3 ela pede para ser puxada
  const a = g.alav;
  const pronta = world.flags.fusesIn >= 3;
  const hovA = Math.abs(mouse.x - a.x) < a.hw + 10 &&
               Math.abs(mouse.y - a.y) < a.hh + 10;
  ctx.lineWidth = hovA && pronta ? 4 : 2.5;
  ctx.strokeStyle = pronta
    ? `rgba(140,230,150,${0.55 + 0.4 * Math.sin(time * 5)})`
    : "rgba(150,150,150,0.3)";
  ctx.strokeRect(a.x - a.hw, a.y - a.hh, a.hw * 2, a.hh * 2);
  ctx.font = "bold 15px 'Courier New', monospace";
  ctx.fillStyle = pronta ? "rgba(150,235,160,0.95)" : "rgba(170,170,170,0.6)";
  ctx.fillText(pronta ? "LIGAR" : "sem carga", a.x, a.y + a.hh + 18);

  drawOverlayClose();
}

function fuseboxHit(px2, py2) {
  if (overlayCloseHit(px2, py2)) { state = "play"; return; }
  const g = fbGeom();
  if (!g) { state = "play"; return; }
  for (let i = 0; i < 3; i++) {
    const s = g.soq[i];
    if (Math.hypot(px2 - s.x, py2 - s.y) < g.r + 12 &&
        i >= world.flags.fusesIn && world.flags.fuses > 0) {
      world.flags.fusesIn++;
      world.flags.fuses--;
      sfxPickup(); saveRun();
      return;
    }
  }
  const a = g.alav;
  if (world.flags.fusesIn >= 3 &&
      Math.abs(px2 - a.x) < a.hw + 12 && Math.abs(py2 - a.y) < a.hh + 12) {
    world.flags.elevatorOn = true;
    sfxSting(); liveEvent("elevator");
    soulsOnFusebox();                    // a energia voltou… e o zelador também
    toast("A CASA TEM ENERGIA — o elevador acordou", 4);
    saveRun();
    state = "play";
  }
}

// --- ELEVADOR: escolher andar (os 6 botões da FOTO do painel) ---
const ELEV_BTN_FRACS = [0.264, 0.359, 0.455, 0.545, 0.636, 0.723];
function elevGeom() {
  const im = UI_IMGS.elevador;
  if (!im) return null;
  const s = canvas.height / im.naturalHeight;     // encaixa pela ALTURA
  const dw = im.naturalWidth * s, dh = canvas.height;
  const ox = (canvas.width - dw) / 2;
  const btns = ELEV_BTN_FRACS.map((fy, i) => ({
    floor: NFLOORS - 1 - i,                       // topo = último andar
    x: ox + 0.652 * dw, y: fy * dh, r: 0.062 * dw,
  }));
  return { ox, dw, dh, btns };
}
function elevBtnPos(f) {      // usado também pelo robô de QA
  const g = elevGeom();
  if (g) { const b = g.btns.find(q => q.floor === f); return { x: b.x, y: b.y }; }
  return { x: canvas.width / 2, y: 160 + (NFLOORS - 1 - f) * 72 + 28 };
}

function elevGo(f) {
  if (f === world.cur) return;
  setFloor(f);
  const ec = roomCenter(ELEV_ROOM);
  const fr = fl().elev ? fl().elev.frente : { x: ec.x, y: ELEV_ROOM.y + 1.6 };
  player.x = fr.x; player.y = fr.y;                            // sai do elevador: em frente à grade
  cam.x = player.x * CELL; cam.y = player.y * CELL;
  floorFadeT = 0.6; stairCd = 0.6;
  sfxStairs(); setTimeout(sfxSlam, 400);
  liveEvent("floor");
  saveRun();
  state = "play";
  if (f === NFLOORS - 1) showVinheta("atelie");   // a chegada ao estúdio
}

function drawElevator() {
  const g = elevGeom();
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  if (g) {
    ctx.fillStyle = "#0a0908";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(UI_IMGS.elevador, g.ox, 0, g.dw, g.dh);
    // sombras laterais fundindo a foto no breu
    for (const [x0, x1] of [[g.ox - 2, g.ox + 80], [g.ox + g.dw - 80, g.ox + g.dw + 2]]) {
      const sh = ctx.createLinearGradient(x0, 0, x1, 0);
      const inv = x0 < canvas.width / 2;
      sh.addColorStop(0, inv ? "rgba(10,9,8,1)" : "rgba(10,9,8,0)");
      sh.addColorStop(1, inv ? "rgba(10,9,8,0)" : "rgba(10,9,8,1)");
      ctx.fillStyle = sh;
      ctx.fillRect(x0, 0, x1 - x0, canvas.height);
    }
    ctx.font = "bold 24px 'Courier New', monospace";
    ctx.fillStyle = "rgba(230,215,180,0.95)";
    ctx.fillText("ELEVADOR", canvas.width / 2 - g.dw / 2 - 150, 80);
    ctx.font = "bold 12px 'Courier New', monospace";
    ctx.fillStyle = "rgba(170,160,140,0.75)";
    ctx.fillText("aperte um botão", canvas.width / 2 - g.dw / 2 - 150, 108);
    for (const b of g.btns) {
      const cur2 = b.floor === world.cur;
      const hov = !cur2 && Math.hypot(mouse.x - b.x, mouse.y - b.y) < b.r + 8;
      // rótulo do andar com fiozinho até o botão
      ctx.textAlign = "right";
      ctx.font = `bold ${hov ? 19 : 16}px 'Courier New', monospace`;
      ctx.fillStyle = cur2 ? "rgba(140,130,115,0.6)"
        : hov ? "rgba(255,235,180,0.98)" : "rgba(220,205,175,0.85)";
      ctx.fillText(tr(FLOOR_NAMES[b.floor]) + (cur2 ? tr(" ◂ você") : ""),
                   b.x - b.r - 26, b.y);
      ctx.strokeStyle = "rgba(200,185,150,0.35)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(b.x - b.r - 20, b.y); ctx.lineTo(b.x - b.r - 4, b.y);
      ctx.stroke();
      // aro no botão da foto
      if (!cur2) {
        ctx.lineWidth = hov ? 3.5 : 2;
        ctx.strokeStyle = hov
          ? "rgba(255,235,180,0.95)"
          : `rgba(230,210,170,${0.3 + 0.2 * Math.sin(time * 3 + b.floor)})`;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.stroke();
      }
      ctx.textAlign = "center";
    }
  } else {
    ctx.fillStyle = "rgba(0,0,0,0.88)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = "bold 26px 'Courier New', monospace";
    ctx.fillStyle = "rgba(220,220,220,0.95)";
    ctx.fillText("ELEVADOR", canvas.width / 2, 90);
    for (let f = NFLOORS - 1; f >= 0; f--) {
      const y = 160 + (NFLOORS - 1 - f) * 72;
      const cur2 = f === world.cur;
      ctx.fillStyle = "rgba(255,255,255,0.07)";
      ctx.fillRect(canvas.width / 2 - 160, y, 320, 56);
      ctx.strokeStyle = cur2 ? "rgba(120,120,120,0.4)" : "rgba(255,255,255,0.55)";
      ctx.lineWidth = 2;
      ctx.strokeRect(canvas.width / 2 - 160, y, 320, 56);
      ctx.font = "bold 20px 'Courier New', monospace";
      ctx.fillStyle = cur2 ? "rgba(120,120,120,0.6)" : "rgba(235,235,235,0.9)";
      ctx.fillText(tr(FLOOR_NAMES[f]) + (cur2 ? tr(" ◂ você") : ""),
                   canvas.width / 2, y + 29);
    }
  }
  drawOverlayClose();
}

function elevatorHit(px2, py2) {
  if (overlayCloseHit(px2, py2)) { state = "play"; return; }
  const g = elevGeom();
  if (g) {
    for (const b of g.btns)
      if (Math.hypot(px2 - b.x, py2 - b.y) < b.r + 10) { elevGo(b.floor); return; }
    return;
  }
  for (let f = NFLOORS - 1; f >= 0; f--) {
    const y = 160 + (NFLOORS - 1 - f) * 72;
    if (Math.abs(px2 - canvas.width / 2) < 160 && py2 > y && py2 < y + 56) {
      elevGo(f); return;
    }
  }
}

// --- VITÓRIA ---
function drawWin() {
  ctx.fillStyle = "rgba(0,0,0,0.92)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const fim = ENDINGS[world.endType] || ENDINGS.alvorada;
  // fundo fotográfico do final (alvorada reusa a porta com banho DOURADO
  // até a imagem própria existir)
  const bg = UI_IMGS["final_" + world.endType] ||
             (world.endType === "alvorada" ? UI_IMGS.final_cinzas : null);
  if (bg) {
    ctx.save();
    ctx.globalAlpha = 0.85;
    drawCover(ctx, bg, 0, 0, canvas.width, canvas.height);
    ctx.restore();
    if (world.endType === "alvorada" && !UI_IMGS.final_alvorada) {
      ctx.fillStyle = "rgba(235,185,95,0.22)";          // o sol chegou
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    const g2 = ctx.createLinearGradient(0, 0, 0, canvas.height);
    g2.addColorStop(0, "rgba(0,0,0,0.72)");
    g2.addColorStop(0.42, "rgba(0,0,0,0.38)");
    g2.addColorStop(1, "rgba(0,0,0,0.78)");
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.font = "bold 44px 'Courier New', monospace";
  const p = 0.8 + 0.2 * Math.sin(time * 2);
  ctx.fillStyle = `rgba(${fim.cor[0]},${fim.cor[1]},${fim.cor[2]},${p.toFixed(2)})`;
  ctx.fillText(fim.titulo, canvas.width / 2, 150);
  ctx.font = "bold 16px 'Courier New', monospace";
  ctx.fillStyle = "rgba(185,185,185,0.85)";
  endingLinhas(fim).forEach((ln, i) =>
    ctx.fillText(ln, canvas.width / 2, 200 + i * 26));

  const mm = String((world.timeSec / 60) | 0).padStart(2, "0");
  const ss = String((world.timeSec | 0) % 60).padStart(2, "0");
  ctx.font = "bold 15px 'Courier New', monospace";
  ctx.fillStyle = "rgba(160,160,160,0.85)";
  ctx.fillText(tf("tempo na casa: {0}:{1}   ·   fotos reveladas: {2}   ·   pico da live: {3}",
                  mm, ss, photoCount, fmtViewers(Math.max(live.pico, live.viewers))),
               canvas.width / 2, 330);

  const btns = [
    { id: "new", x: 330, y: 400, w: 240, h: 70, label: "NOVA LIVE" },
    { id: "menu", x: 630, y: 400, w: 240, h: 70, label: "MENU" },
  ];
  for (const b of btns) {
    const hov = mouse.x >= b.x && mouse.x <= b.x + b.w &&
                mouse.y >= b.y && mouse.y <= b.y + b.h;
    ctx.fillStyle = "rgba(255,255,255,0.07)";
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.lineWidth = hov ? 3 : 2;
    ctx.strokeStyle = hov ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.5)";
    ctx.strokeRect(b.x, b.y, b.w, b.h);
    ctx.font = "bold 24px 'Courier New', monospace";
    ctx.fillStyle = "rgba(235,235,235,0.92)";
    ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2 + 1);
  }
}
function winHit(px2, py2) {
  if (px2 >= 330 && px2 <= 570 && py2 >= 400 && py2 <= 470) newRun();
  else if (px2 >= 630 && px2 <= 870 && py2 >= 400 && py2 <= 470) state = "title";
}

// ==================================================================
// QUARTO ESCURO — revelar (liberta) ou queimar (destrói) um negativo
// Minigame: 3 banhos químicos; pare a agulha dentro da zona de cada um
// ==================================================================
const darkUI = { alvo: null, fase: -1, msg: "", confirma: 0, zc: 0.5, zw: 0.26 };
// (o terceiro banho era 1,75 com zona de 0,15: medido no robô humano, gente
// errava de 3 a 16 vezes por run — difícil pelo reflexo, não pela tensão)
const DARK_VEL = [1.0, 1.25, 1.45];        // velocidade da agulha por banho
const DARK_ZW  = [0.26, 0.21, 0.19];       // largura da zona por banho
const DARK_NOMES = ["REVELADOR", "INTERRUPTOR", "FIXADOR"];

function darkNeedle() {
  const sp = DARK_VEL[Math.max(0, darkUI.fase)];
  const p = (time * sp) % 2;
  return p < 1 ? p : 2 - p;                // vai-e-vem 0..1
}
function darkNovaZona() {
  darkUI.zc = 0.28 + Math.random() * 0.44;
  darkUI.zw = DARK_ZW[darkUI.fase];
}

function drawDarkroom() {
  const temBg = !!UI_IMGS.quartoescuro;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  if (temBg) {
    // a BANCADA real sob luz vermelha; escurece de leve p/ ler os controles
    drawCover(ctx, UI_IMGS.quartoescuro, 0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(10,0,0,0.3)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else {
    ctx.fillStyle = "rgba(12,2,2,0.93)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(canvas.width / 2 - 280, 26, 560, 68);
  ctx.font = "bold 24px 'Courier New', monospace";
  ctx.fillStyle = "rgba(235,140,130,0.95)";
  ctx.fillText("QUARTO ESCURO", canvas.width / 2, 48);

  const def = SOUL_DEFS[darkUI.alvo] || {};
  ctx.font = "bold 14px 'Courier New', monospace";
  ctx.fillStyle = "rgba(230,195,185,0.9)";
  ctx.fillText(tf("negativo de {0} — {1}", tr(def.nome || "?"), tr(def.titulo || "")),
               canvas.width / 2, 78);

  // o retrato pendurado no VARAL (o da foto, quando presente)
  const spr = retratoSprite(darkUI.alvo);
  const rh = 185, rw = rh * (spr.width / spr.height);
  const ry = temBg ? 110 : 128;              // pendurado abaixo do varal real
  if (!temBg) {
    ctx.strokeStyle = "rgba(200,120,110,0.5)";
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2 - 160, 120);
    ctx.lineTo(canvas.width / 2 + 160, 120);
    ctx.stroke();
  }
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.6)"; ctx.shadowBlur = 16;
  ctx.globalAlpha = 0.95;
  ctx.drawImage(spr, canvas.width / 2 - rw / 2, ry, rw, rh);
  ctx.restore();
  // dois prendedores segurando o retrato
  ctx.fillStyle = "rgba(225,200,160,0.9)";
  ctx.fillRect(canvas.width / 2 - rw / 2 + 14, ry - 10, 9, 22);
  ctx.fillRect(canvas.width / 2 + rw / 2 - 23, ry - 10, 9, 22);

  if (darkUI.fase === -1) {
    // escolha: revelar (puzzle) ou queimar (atalho cruel)
    const bs = [
      { id: "rev", x: canvas.width / 2 - 270, label: "REVELAR",
        sub: "liberta a alma (3 banhos)" },
      { id: "burn", x: canvas.width / 2 + 30,
        label: darkUI.confirma ? "QUEIMAR MESMO?" : "QUEIMAR",
        sub: darkUI.confirma ? "não tem volta. clique de novo" : "quebra a corrente… destruindo a alma" },
    ];
    for (const b of bs) {
      const y = 370, w = 240, h = 86;
      ctx.fillStyle = b.id === "burn" ? "rgba(60,8,4,0.72)" : "rgba(0,0,0,0.62)";
      ctx.fillRect(b.x, y, w, h);
      ctx.lineWidth = 2;
      ctx.strokeStyle = b.id === "burn" ? "rgba(235,120,90,0.8)" : "rgba(235,200,195,0.7)";
      ctx.strokeRect(b.x, y, w, h);
      ctx.font = "bold 22px 'Courier New', monospace";
      ctx.fillStyle = "rgba(240,225,220,0.95)";
      ctx.fillText(b.label, b.x + w / 2, y + 32);
      ctx.font = "bold 12px 'Courier New', monospace";
      ctx.fillStyle = "rgba(200,170,165,0.8)";
      ctx.fillText(b.sub, b.x + w / 2, y + 60);
    }
  } else {
    // a BANDEJA do banho atual ganha um contorno (as 3 da foto)
    if (temBg) {
      const bx2 = [0.335, 0.505, 0.705][darkUI.fase] * canvas.width;
      const by2 = 0.70 * canvas.height;
      ctx.strokeStyle = `rgba(255,210,140,${0.45 + 0.3 * Math.sin(time * 5)})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(bx2, by2, canvas.width * 0.085, canvas.height * 0.075, 0, 0, 7);
      ctx.stroke();
    }
    // banhos: barra com agulha vai-e-vem e zona-alvo
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(canvas.width / 2 - 230, 338, 460, 34);
    ctx.font = "bold 18px 'Courier New', monospace";
    ctx.fillStyle = "rgba(235,200,195,0.95)";
    ctx.fillText(tf("BANHO {0}/3 — {1}", darkUI.fase + 1, tr(DARK_NOMES[darkUI.fase])),
                 canvas.width / 2, 356);
    const bx = canvas.width / 2 - 260, bw = 520, by = 388, bh = 30;
    ctx.fillStyle = "rgba(60,18,14,0.8)";
    ctx.fillRect(bx, by, bw, bh);
    // zona-alvo
    ctx.fillStyle = "rgba(140,230,150,0.3)";
    ctx.fillRect(bx + (darkUI.zc - darkUI.zw / 2) * bw, by, darkUI.zw * bw, bh);
    ctx.strokeStyle = "rgba(140,230,150,0.8)";
    ctx.strokeRect(bx + (darkUI.zc - darkUI.zw / 2) * bw, by, darkUI.zw * bw, bh);
    // agulha
    const nx = bx + darkNeedle() * bw;
    ctx.fillStyle = "rgba(245,240,235,0.95)";
    ctx.fillRect(nx - 2, by - 6, 4, bh + 12);
    // botão PARAR
    const px3 = canvas.width / 2 - 120, py3 = 452;
    ctx.fillStyle = "rgba(0,0,0,0.62)";
    ctx.fillRect(px3, py3, 240, 72);
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(235,200,195,0.85)";
    ctx.strokeRect(px3, py3, 240, 72);
    ctx.font = "bold 24px 'Courier New', monospace";
    ctx.fillStyle = "rgba(240,225,220,0.95)";
    ctx.fillText("PARAR", canvas.width / 2, py3 + 37);
  }

  if (darkUI.msg) {
    ctx.font = "bold 16px 'Courier New', monospace";
    ctx.fillStyle = "rgba(240,150,140,0.9)";
    ctx.fillText(darkUI.msg, canvas.width / 2, 560);
  }
  ctx.font = "bold 13px 'Courier New', monospace";
  ctx.fillStyle = "rgba(190,150,145,0.6)";
  ctx.fillText("ESC sai sem revelar", canvas.width / 2, canvas.height - 24);
  drawOverlayClose();
}

function darkroomHit(px2, py2) {
  if (overlayCloseHit(px2, py2)) { state = "play"; darkUI.fase = -1; return; }
  if (darkUI.fase === -1) {
    const y = 370, w = 240, h = 86;
    if (px2 >= canvas.width / 2 - 270 && px2 <= canvas.width / 2 - 270 + w &&
        py2 >= y && py2 <= y + h) {
      darkUI.fase = 0; darkUI.msg = ""; darkUI.confirma = 0;
      darkNovaZona();
      return;
    }
    if (px2 >= canvas.width / 2 + 30 && px2 <= canvas.width / 2 + 30 + w &&
        py2 >= y && py2 <= y + h) {
      if (!darkUI.confirma) { darkUI.confirma = 1; return; }
      soulBurn(darkUI.alvo);
      darkUI.fase = -1; darkUI.confirma = 0;
      state = "play";
      return;
    }
    return;
  }
  // botão PARAR
  const px3 = canvas.width / 2 - 120, py3 = 452;
  if (px2 >= px3 && px2 <= px3 + 240 && py2 >= py3 && py2 <= py3 + 72) {
    const n = darkNeedle();
    if (Math.abs(n - darkUI.zc) <= darkUI.zw / 2) {
      darkUI.fase++;
      sfxSting();
      if (darkUI.fase >= 3) {
        soulFree(darkUI.alvo);
        darkUI.fase = -1;
        state = "play";
      } else darkNovaZona();
    } else {
      sanity = Math.max(1, sanity - 5);   // o retrato estremece; aqui não mata
      shake = 0.8; sfxDry();
      darkUI.msg = "o banho borrou… o retrato ESTREMECEU. tenta de novo";
    }
  }
}

// --- botão fechar compartilhado dos overlays ---
function drawOverlayClose() {
  const hovC = mouse.x >= ALB_CLOSE.x && mouse.x <= ALB_CLOSE.x + ALB_CLOSE.w &&
               mouse.y >= ALB_CLOSE.y && mouse.y <= ALB_CLOSE.y + ALB_CLOSE.h;
  ctx.fillStyle = "rgba(255,255,255,0.07)";
  ctx.fillRect(ALB_CLOSE.x, ALB_CLOSE.y, ALB_CLOSE.w, ALB_CLOSE.h);
  ctx.lineWidth = hovC ? 3 : 2;
  ctx.strokeStyle = hovC ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.5)";
  ctx.strokeRect(ALB_CLOSE.x, ALB_CLOSE.y, ALB_CLOSE.w, ALB_CLOSE.h);
  ctx.textAlign = "center";
  ctx.font = "bold 19px 'Courier New', monospace";
  ctx.fillStyle = "rgba(230,230,230,0.9)";
  ctx.fillText("FECHAR", ALB_CLOSE.x + ALB_CLOSE.w / 2, ALB_CLOSE.y + ALB_CLOSE.h / 2 + 1);
}
function overlayCloseHit(px2, py2) {
  return px2 >= ALB_CLOSE.x && px2 <= ALB_CLOSE.x + ALB_CLOSE.w &&
         py2 >= ALB_CLOSE.y && py2 <= ALB_CLOSE.y + ALB_CLOSE.h;
}

// --- vencer: 3 finais ---
// porta: ALVORADA (todas libertadas) ou CINZAS (alguma queimada)
// cadeira do Fotógrafo: O NOVO FOTÓGRAFO (final secreto)
const ENDINGS = {
  alvorada: {
    titulo: "ALVORADA",
    linhas: ["As sete correntes caíram. A porta abriu sozinha.",
             "Sete vultos atravessam o jardim com você — e, um a um,",
             "viram só luz da manhã. O chat não escreve nada. Ninguém sai da live."],
    cor: [235, 225, 200],
  },
  cinzas: {
    titulo: "CINZAS",
    linhas: ["A porta abriu. Você saiu.",
             "Mas parte do que estava preso aqui não saiu com você —",
             "virou fumaça no quarto escuro. A casa ficou mais leve. E mais vazia."],
    cor: [200, 170, 150],
  },
  fotografo: {
    titulo: "O NOVO FOTÓGRAFO",
    linhas: ["Você sentou. A cadeira estava morna.",
             "A câmera encaixa na sua mão como se sempre tivesse sido sua.",
             "A live caiu. O último frame mostra você… sorrindo para o cavalete.",
             "A casa tem um dono de novo.",
             "O diário na sua mão está em branco outra vez. Ele vai precisar de outro leitor."],
    cor: [160, 150, 170],
  },
};
// a linha a mais dos finais pela porta, quando o diário já se revelou
function endingLinhas(fim) {
  const d = world.flags.diario;
  if (world.endType !== "fotografo" && d && d.revelado)
    return fim.linhas.concat(["O diário ficou na soleira, aberto na página assinada. Ninguém mais vai lê-lo."]);
  return fim.linhas;
}

function winGame(tipo) {
  if (!tipo) {
    // saída pela porta: depende do que você fez com as almas
    let queimada = false;
    for (const id in world.flags.souls)
      if (world.flags.souls[id].state === "burned") queimada = true;
    tipo = queimada ? "cinzas" : "alvorada";
  }
  world.endType = tipo;
  if (tipo === "alvorada") {
    livePush(liveRandUser(), "eu tô CHORANDO, eles foram EMBORA JUNTOS");
    livePush(liveRandUser(), "melhor final da história das lives");
  } else if (tipo === "cinzas") {
    livePush(liveRandUser(), "saiu… mas a que custo, mano");
  } else {
    if (world.flags.diario && world.flags.diario.revelado)
      livePush(liveRandUser(), "VOCÊ LEU A ASSINATURA E SENTOU MESMO ASSIM???");
    livePush(liveRandUser(), "a live caiu?? alguém tá vendo isso?");
    livePush(liveRandUser(), "a câmera dele ainda tá gravando…");
  }
  state = "win";
  sfxSlam();
  arquivoGrava(tipo);      // a live entra no arquivo do canal
  clearRun();
}

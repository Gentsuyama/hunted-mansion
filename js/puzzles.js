"use strict";
// ==================================================================
// PUZZLES em overlay (jogo pausado): cofre, fusíveis, elevador; vitória
// ==================================================================
const safeUI = { guess: [1, 1, 1], msg: null, msgT: 0 };

// --- COFRE: 3 rodas de dígitos; código revelado pelas FOTOS ---
function drawSafe() {
  ctx.fillStyle = "rgba(0,0,0,0.88)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.font = "bold 26px 'Courier New', monospace";
  ctx.fillStyle = "rgba(220,220,220,0.95)";
  ctx.fillText("COFRE DE PAREDE", canvas.width / 2, 90);
  ctx.font = "bold 14px 'Courier New', monospace";
  ctx.fillStyle = "rgba(150,150,150,0.8)";
  ctx.fillText("os números estão escritos pela casa — a câmera os enxerga",
               canvas.width / 2, 126);

  // 3 rodas
  for (let i = 0; i < 3; i++) {
    const x = canvas.width / 2 + (i - 1) * 180, y = canvas.height / 2;
    // seta cima
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font = "bold 40px 'Courier New', monospace";
    ctx.fillText("▲", x, y - 110);
    // dígito
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 55, y - 65, 110, 130);
    ctx.font = "bold 72px 'Courier New', monospace";
    ctx.fillStyle = "rgba(240,240,240,0.95)";
    ctx.fillText(safeUI.guess[i], x, y + 2);
    // pontinhos da ordem
    ctx.font = "bold 22px 'Courier New', monospace";
    ctx.fillStyle = "rgba(230,90,80,0.9)";
    ctx.fillText("•".repeat(i + 1), x, y - 88);
    // seta baixo
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font = "bold 40px 'Courier New', monospace";
    ctx.fillText("▼", x, y + 112);
  }

  // botão TENTAR
  ctx.fillStyle = "rgba(255,255,255,0.07)";
  ctx.fillRect(canvas.width / 2 - 120, canvas.height - 150, 240, 62);
  ctx.strokeStyle = `rgba(255,255,255,${0.6 + 0.25 * Math.sin(time * 3)})`;
  ctx.lineWidth = 2;
  ctx.strokeRect(canvas.width / 2 - 120, canvas.height - 150, 240, 62);
  ctx.font = "bold 24px 'Courier New', monospace";
  ctx.fillStyle = "rgba(240,240,240,0.95)";
  ctx.fillText("TENTAR", canvas.width / 2, canvas.height - 118);

  if (safeUI.msg && safeUI.msgT > 0) {
    safeUI.msgT -= 1 / 60;
    ctx.font = "bold 18px 'Courier New', monospace";
    ctx.fillStyle = "rgba(230,90,80,0.9)";
    ctx.fillText(safeUI.msg, canvas.width / 2, canvas.height - 60);
  }
  drawOverlayClose();
}

function safeHit(px2, py2) {
  if (overlayCloseHit(px2, py2)) { state = "play"; return; }
  for (let i = 0; i < 3; i++) {
    const x = canvas.width / 2 + (i - 1) * 180, y = canvas.height / 2;
    if (Math.abs(px2 - x) < 60 && Math.abs(py2 - (y - 110)) < 34)
      safeUI.guess[i] = safeUI.guess[i] % 9 + 1;
    if (Math.abs(px2 - x) < 60 && Math.abs(py2 - (y + 112)) < 34)
      safeUI.guess[i] = (safeUI.guess[i] + 7) % 9 + 1;
  }
  if (Math.abs(px2 - canvas.width / 2) < 120 &&
      py2 > canvas.height - 150 && py2 < canvas.height - 88) {
    if (safeUI.guess.join("") === world.code.join("")) {
      world.flags.safeOpen = true;
      world.flags.fuses++;
      film = Math.min(FILM_MAX, film + 4);
      sfxSting(); liveEvent("safe");
      livePush("CanalDoPavor", "tinha um FUSÍVEL e filme dentro!!");
      saveRun();
      state = "play";
    } else {
      safeUI.msg = "clunk. errado."; safeUI.msgT = 1.6;
      sfxDry();
    }
  }
}

// --- ELEVADOR: escolher andar ---
function drawElevator() {
  ctx.fillStyle = "rgba(0,0,0,0.88)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
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
    ctx.fillText(FLOOR_NAMES[f] + (cur2 ? " (você está aqui)" : ""),
                 canvas.width / 2, y + 29);
  }
  drawOverlayClose();
}

function elevatorHit(px2, py2) {
  if (overlayCloseHit(px2, py2)) { state = "play"; return; }
  for (let f = NFLOORS - 1; f >= 0; f--) {
    const y = 160 + (NFLOORS - 1 - f) * 72;
    if (Math.abs(px2 - canvas.width / 2) < 160 && py2 > y && py2 < y + 56) {
      if (f === world.cur) return;
      setFloor(f);
      const ec = roomCenter(ELEV_ROOM);
      player.x = ec.x; player.y = ELEV_ROOM.y + ELEV_ROOM.h - 1.6;
      cam.x = player.x * CELL; cam.y = player.y * CELL;
      sfxStairs(); setTimeout(sfxSlam, 400);
      liveEvent("floor");
      saveRun();
      state = "play";
      return;
    }
  }
}

// --- VITÓRIA ---
function drawWin() {
  ctx.fillStyle = "rgba(0,0,0,0.92)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.font = "bold 44px 'Courier New', monospace";
  const g = 200 + 40 * Math.sin(time * 2);
  ctx.fillStyle = `rgb(${g | 0},${g | 0},${g | 0})`;
  ctx.fillText("VOCÊ SAIU DA CASA", canvas.width / 2, 170);
  ctx.font = "bold 16px 'Courier New', monospace";
  ctx.fillStyle = "rgba(180,180,180,0.85)";
  ctx.fillText("…por enquanto.", canvas.width / 2, 220);

  const mm = String((world.timeSec / 60) | 0).padStart(2, "0");
  const ss = String((world.timeSec | 0) % 60).padStart(2, "0");
  ctx.font = "bold 15px 'Courier New', monospace";
  ctx.fillStyle = "rgba(160,160,160,0.85)";
  ctx.fillText(`tempo na casa: ${mm}:${ss}   ·   fotos reveladas: ${photoCount}   ·   pico da live: ${fmtViewers(live.viewers)}`,
               canvas.width / 2, 290);

  const btns = [
    { id: "new", x: 330, y: 400, w: 240, h: 70, label: "NOVA RUN" },
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

// --- vencer: abrir a porta da frente com a chave ---
function winGame() {
  state = "win";
  sfxSlam();
  clearRun();
}

"use strict";
// ==================================================================
// INTRO em quadrinhos (6 painéis) + TELA DE TÍTULO
// ==================================================================
const CINE_PANELS = [
  { img: "Assets/Intro/intro1.jpg",
    cap: "Mansão Blackwood. Abandonada há 70 anos… e o portão estava aberto." },
  { img: "Assets/Intro/intro2.jpg",
    cap: "\"Fala, galera! Desafio de hoje: a noite INTEIRA na mansão mais assombrada do país. Sozinho. COLA na live!\"" },
  { img: "Assets/Intro/intro3.jpg",
    cap: "…a porta também estava aberta." },
  { img: "Assets/Intro/intro4.jpg",
    cap: "\"Uma câmera antiga? …Parece NOVA. Quem deixou isso aqui?\"" },
  { img: "Assets/Intro/intro5.jpg",
    cap: "\"Bora. É só uma casa velha.\"" },
  { img: "Assets/Intro/intro6.jpg", cap: null, slam: true },
];

let cineIdx = 0, cineT = 0, cineImgs = [], cineLoaded = 0, cineSlammed = false;
let cineThen = null;   // o que fazer quando a cinematic terminar

function loadCineImages() {
  for (const p of CINE_PANELS) {
    const im = new Image();
    im.onload = () => cineLoaded++;
    im.onerror = () => cineLoaded++;
    im.src = p.img;
    cineImgs.push(im);
  }
}

function startCinematic(then) {
  cineThen = then || null;
  cineIdx = 0; cineT = 0; cineSlammed = false;
  state = "cine";
}

function finishCine() {
  if (cineThen) { const f = cineThen; cineThen = null; f(); }
  else state = "title";
}

function cineAdvance(px, py) {
  initAudio();
  // botão PULAR (canto superior direito)
  if (px !== undefined && px > canvas.width - 170 && py < 70) { finishCine(); return; }
  if (cineIdx >= CINE_PANELS.length - 1) finishCine();
  else { cineIdx++; cineT = 0; cineSlammed = false; }
}

function drawCinematic() {
  const p = CINE_PANELS[cineIdx];
  const im = cineImgs[cineIdx];
  cineT += 1 / 60;

  // painel 6: porta bate sozinha
  if (p.slam && !cineSlammed && cineT > 1.0) { sfxSlam(); cineSlammed = true; shakeCine = 1; }
  if (p.slam && cineSlammed && cineT > 3.2) { cineAdvance(); return; }

  const fade = Math.min(1, cineT * 2.2);
  const zoom = 1 + Math.min(0.05, cineT * 0.008);

  if (im && im.complete && im.naturalWidth) {
    const w = canvas.width * zoom, h = canvas.height * zoom;
    ctx.globalAlpha = fade;
    let sx = (canvas.width - w) / 2, sy = (canvas.height - h) / 2;
    if (typeof shakeCine === "number" && shakeCine > 0) {
      sx += (Math.random() - 0.5) * 14 * shakeCine;
      sy += (Math.random() - 0.5) * 14 * shakeCine;
      shakeCine = Math.max(0, shakeCine - 0.04);
    }
    ctx.drawImage(im, sx, sy, w, h);
    ctx.globalAlpha = 1;
  }

  // legenda estilo quadrinho
  if (p.cap && cineT > 0.5) {
    const a = Math.min(1, (cineT - 0.5) * 2.5);
    ctx.font = "bold 19px 'Courier New', monospace";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const lines = wrapText(p.cap, 72);
    const bh = lines.length * 28 + 24;
    ctx.fillStyle = `rgba(0,0,0,${0.72 * a})`;
    ctx.fillRect(80, canvas.height - bh - 26, canvas.width - 160, bh);
    ctx.strokeStyle = `rgba(255,255,255,${0.35 * a})`;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(80, canvas.height - bh - 26, canvas.width - 160, bh);
    ctx.fillStyle = `rgba(235,235,235,${a})`;
    lines.forEach((l, i) =>
      ctx.fillText(l, canvas.width / 2, canvas.height - bh - 26 + 24 + i * 28));
  }

  // botão PULAR + dica
  ctx.font = "bold 15px 'Courier New', monospace";
  ctx.textAlign = "right"; ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(canvas.width - 160, 18, 140, 44);
  ctx.strokeStyle = "rgba(255,255,255,0.4)";
  ctx.strokeRect(canvas.width - 160, 18, 140, 44);
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(220,220,220,0.85)";
  ctx.fillText("PULAR »", canvas.width - 90, 41);
  if (!p.slam) {
    ctx.fillStyle = `rgba(180,180,180,${0.35 + 0.25 * Math.sin(time * 3)})`;
    ctx.font = "bold 12px 'Courier New', monospace";
    ctx.fillText("toque / clique para continuar", canvas.width / 2, canvas.height - 10);
  }
}
let shakeCine = 0;

function wrapText(s, maxChars) {
  const words = s.split(" ");
  const lines = []; let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > maxChars) { lines.push(cur.trim()); cur = w; }
    else cur += " " + w;
  }
  if (cur.trim()) lines.push(cur.trim());
  return lines;
}

// ------------------------------------------------------------------
// TÍTULO
// ------------------------------------------------------------------
function titleButtons() {
  const hasSave = !!loadRunData();
  const btns = [];
  let y = 400;
  if (hasSave) { btns.push({ id: "cont", x: 460, y, w: 280, h: 64, label: "CONTINUAR" }); y += 84; }
  btns.push({ id: "new", x: 460, y, w: 280, h: 64, label: hasSave ? "NOVA RUN" : "ENTRAR" }); y += 84;
  btns.push({ id: "intro", x: 460, y, w: 280, h: 52, label: "REVER INTRO" });
  return btns;
}

function drawTitle() {
  // fundo: painel 3 (porta aberta + câmera na soleira), escurecido com vinheta
  const im = cineImgs[2];
  if (im && im.complete && im.naturalWidth) {
    ctx.globalAlpha = 0.5;
    ctx.drawImage(im, 0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1;
  }
  const vg = ctx.createRadialGradient(canvas.width / 2, 320, 180,
                                      canvas.width / 2, 320, 820);
  vg.addColorStop(0, "rgba(0,0,0,0.25)");
  vg.addColorStop(1, "rgba(0,0,0,0.94)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.textAlign = "center"; ctx.textBaseline = "middle";

  // título com flicker de luz ruim
  const tick = Math.floor(time * 13);
  let g = 205 + 40 * Math.sin(time * 2);
  if (hash(tick, 3, 7) < 0.08) g *= 0.35;         // falha de energia ocasional
  ctx.font = "bold 76px 'Courier New', monospace";
  ctx.fillStyle = "rgba(0,0,0,0.75)";
  ctx.fillText("HUNTED MANSION", canvas.width / 2 + 4, 154);
  ctx.fillStyle = `rgb(${g | 0},${g | 0},${g | 0})`;
  ctx.fillText("HUNTED MANSION", canvas.width / 2, 150);

  // "ao vivo" como assinatura do jogo
  ctx.font = "bold 17px 'Courier New', monospace";
  ctx.fillStyle = `rgba(255,70,58,${0.65 + 0.35 * Math.sin(time * 4)})`;
  ctx.fillText("●", canvas.width / 2 - 128, 212);
  ctx.fillStyle = "rgba(210,210,210,0.9)";
  ctx.fillText("  uma live na casa errada", canvas.width / 2, 212);

  ctx.font = "bold 13px 'Courier New', monospace";
  ctx.fillStyle = "rgba(150,150,150,0.8)";
  ctx.fillText("as portas trancaram · vasculhe · fotografe · encontre a saída",
               canvas.width / 2, 312);

  for (const b of titleButtons()) {
    const hov = mouse.x >= b.x && mouse.x <= b.x + b.w &&
                mouse.y >= b.y && mouse.y <= b.y + b.h;
    ctx.fillStyle = "rgba(255,255,255,0.07)";
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.lineWidth = hov ? 3 : 2;
    ctx.strokeStyle = hov ? "rgba(255,255,255,0.95)"
      : `rgba(255,255,255,${b.id === "intro" ? 0.3 : 0.5 + 0.2 * Math.sin(time * 3)})`;
    ctx.strokeRect(b.x, b.y, b.w, b.h);
    ctx.font = `bold ${b.id === "intro" ? 17 : 24}px 'Courier New', monospace`;
    ctx.fillStyle = "rgba(235,235,235,0.92)";
    ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2 + 1);
  }

  if (!IS_TOUCH) {
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(mouse.x - 5, mouse.y); ctx.lineTo(mouse.x + 5, mouse.y);
    ctx.moveTo(mouse.x, mouse.y - 5); ctx.lineTo(mouse.x, mouse.y + 5);
    ctx.stroke();
  }
}

function titleHit(px2, py2) {
  initAudio();
  for (const b of titleButtons())
    if (px2 >= b.x && px2 <= b.x + b.w && py2 >= b.y && py2 <= b.y + b.h) {
      if (b.id === "cont") continueRun();
      else if (b.id === "new") startCinematic(() => newRun());  // abertura SEMPRE
      else startCinematic(null);                                // rever, volta ao título
      return;
    }
}
function titleKey(code) {
  initAudio();
  if (code === "Enter") {
    loadRunData() ? continueRun() : startCinematic(() => newRun());
  }
}

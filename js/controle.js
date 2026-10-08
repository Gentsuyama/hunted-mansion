"use strict";
// ==================================================================
// CONTROLE (gamepad) — Gamepad API, mapeamento "standard" (Xbox/Steam Input)
// O controle não tem código próprio de jogo: ele vira teclado, mouse e os
// analógicos do toque que já existem.
//   analógico esq.  = andar (cheio = andar; LT ou L3 segurado = correr)
//   analógico dir.  = lanterna (aimDirStick, como o stick de mira do toque)
//   A = usar/confirmar · X ou RT = FOTO · Y = diário · LB/Start = álbum
//   RB = filme · B = voltar (fora do jogo) / recarregar (no jogo)
//   Back = chat da live · direcional = andar (no jogo) ou setas (nos menus)
// Fora do jogo, o analógico move um CURSOR: se o jogador o moveu, A clica
// onde ele está; se não moveu, A é ENTER (confirma o que está selecionado).
// ==================================================================
const CTL_BTN = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, BACK: 8, START: 9,
                  L3: 10, R3: 11, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };
const CTL_MORTA = 0.22;                 // zona morta dos analógicos
const CTL_REPETE = { espera: 0.42, passo: 0.16 };   // auto-repetição das setas nos menus

const controle = {
  ativo: false,         // o último gesto veio do controle (troca as dicas do HUD)
  ligado: false,        // há um controle conectado
  idx: -1,
  prev: [],             // estado anterior dos botões
  rep: {},              // temporizadores de repetição por botão
  cx: 600, cy: 340,     // cursor virtual
  cursorAtivo: false,   // o jogador moveu o cursor neste estado
  estadoAnt: null,
  movendo: false,       // o controle está alimentando touchUI.jx/jy
  conectouT: 0,
};

if (typeof window !== "undefined") {          // (os robôs carregam este arquivo num worker)
  window.addEventListener("gamepadconnected", e => {
    controle.ligado = true; controle.idx = e.gamepad.index;
    controle.conectouT = performance.now();
    if (typeof toast === "function" && typeof world !== "undefined" && world)
      toast("CONTROLE CONECTADO", 3);
  });
  window.addEventListener("gamepaddisconnected", () => {
    controle.ligado = false; controle.idx = -1; controle.ativo = false;
    controleSolta();
  });
  // teclado ou mouse de verdade: as dicas voltam ao teclado
  window.addEventListener("keydown", e => { if (e.isTrusted) controle.ativo = false; });
  window.addEventListener("mousemove", e => { if (e.isTrusted) controle.ativo = false; });
}

function controlePega() {
  if (!navigator.getGamepads) return null;
  const gs = navigator.getGamepads();
  if (controle.idx >= 0 && gs[controle.idx]) return gs[controle.idx];
  for (const g of gs) if (g && g.connected) { controle.idx = g.index; return g; }
  return null;
}
function controleSolta() {
  if (controle.movendo) { touchUI.jx = 0; touchUI.jy = 0; touchUI.jkx = 0; touchUI.jky = 0; }
  controle.movendo = false;
}
// tecla sintética: passa pelos mesmos ouvintes do teclado
function controleTecla(code) {
  const key = code.startsWith("Key") ? code.slice(3).toLowerCase() : code;
  window.dispatchEvent(new KeyboardEvent("keydown", { code, key, bubbles: true, cancelable: true }));
  window.dispatchEvent(new KeyboardEvent("keyup", { code, key, bubbles: true }));
}
// clique sintético no cursor virtual: passa pelo mousedown do canvas
function controleClica(botao) {
  const r = canvas.getBoundingClientRect();
  canvas.dispatchEvent(new MouseEvent("mousedown", {
    clientX: r.left + controle.cx * r.width / canvas.width,
    clientY: r.top + controle.cy * r.height / canvas.height,
    button: botao || 0, bubbles: true, cancelable: true,
  }));
}
function controleEixo(v) { return Math.abs(v) < CTL_MORTA ? 0 : (v - Math.sign(v) * CTL_MORTA) / (1 - CTL_MORTA); }

// estados em que o cursor virtual faz sentido (telas com botões de clique)
function controleTelaDePonteiro() {
  return !["play", "cine", "vinheta", "ritual", "lang", "boot"].includes(state);
}

function controleUpdate(dt) {
  const g = controlePega();
  if (!g) { if (controle.movendo) controleSolta(); return; }
  const b = g.buttons.map(x => x.pressed || x.value > 0.5);
  const prev = controle.prev.length ? controle.prev : b.map(() => false);
  const apertou = i => b[i] && !prev[i];
  const lx = controleEixo(g.axes[0] || 0), ly = controleEixo(g.axes[1] || 0);
  const rx = controleEixo(g.axes[2] || 0), ry = controleEixo(g.axes[3] || 0);
  const mexeu = b.some((v, i) => v && !prev[i]) || lx || ly || rx || ry;
  if (mexeu) controle.ativo = true;

  if (state !== controle.estadoAnt) {            // tela nova: cursor volta ao centro, quieto
    controle.estadoAnt = state; controle.cursorAtivo = false;
    controle.cx = canvas.width / 2; controle.cy = canvas.height / 2;
  }

  // ---------------- no jogo ----------------
  if (state === "play") {
    let mx = lx, my = ly;
    if (b[CTL_BTN.UP]) my -= 1; if (b[CTL_BTN.DOWN]) my += 1;
    if (b[CTL_BTN.LEFT]) mx -= 1; if (b[CTL_BTN.RIGHT]) mx += 1;
    const m = Math.hypot(mx, my);
    if (m > 0) {
      // só a direção importa: update() lê 0,7 como andar e acima de 0,72 como correr
      const corre = b[CTL_BTN.LT] || b[CTL_BTN.L3];
      const k = (corre ? 1 : 0.7) / m;
      touchUI.jx = mx * k; touchUI.jy = my * k; controle.movendo = true;
    } else if (controle.movendo) controleSolta();
    if (Math.hypot(rx, ry) > 0.5) { aimDirStick = Math.atan2(ry, rx); aimSource = "stick"; }

    if (apertou(CTL_BTN.A)) controleTecla("KeyE");
    if (apertou(CTL_BTN.X) || apertou(CTL_BTN.RT)) takePhoto();
    if (apertou(CTL_BTN.Y)) controleTecla("KeyJ");
    if (apertou(CTL_BTN.LB) || apertou(CTL_BTN.START)) controleTecla("KeyF");
    if (apertou(CTL_BTN.RB)) controleTecla("KeyR");
    if (apertou(CTL_BTN.B)) controleTecla("KeyB");
    if (apertou(CTL_BTN.BACK)) { state = "chat"; live.scroll = 0; }
    controle.prev = b;
    return;
  }
  if (controle.movendo) controleSolta();

  // ---------------- fora do jogo ----------------
  // setas com auto-repetição (direcional ou analógico esquerdo nos menus sem cursor)
  const setas = [[CTL_BTN.UP, "ArrowUp"], [CTL_BTN.DOWN, "ArrowDown"],
                 [CTL_BTN.LEFT, "ArrowLeft"], [CTL_BTN.RIGHT, "ArrowRight"]];
  for (const [i, code] of setas) {
    if (b[i]) {
      const r = controle.rep[i] || 0;
      if (!prev[i]) { controleSeta(code); controle.rep[i] = CTL_REPETE.espera; }
      else if (r - dt <= 0) { controleSeta(code); controle.rep[i] = CTL_REPETE.passo; }
      else controle.rep[i] = r - dt;
    } else controle.rep[i] = 0;
  }
  // cursor virtual
  if (controleTelaDePonteiro() && (lx || ly || rx || ry)) {
    const vx = (lx || rx), vy = (ly || ry);
    controle.cx = Math.max(0, Math.min(canvas.width, controle.cx + vx * 820 * dt));
    controle.cy = Math.max(0, Math.min(canvas.height, controle.cy + vy * 820 * dt));
    controle.cursorAtivo = true;
    mouse.x = controle.cx; mouse.y = controle.cy;      // hover dos botões
  } else if (state === "lang" && !b[CTL_BTN.UP] && !b[CTL_BTN.DOWN] && !b[CTL_BTN.LEFT] && !b[CTL_BTN.RIGHT]) {
    // na tela de idioma o analógico escolhe como as setas
    controleAnalogComoSeta(lx, ly, dt);
  }
  if (apertou(CTL_BTN.A)) {
    if (controle.cursorAtivo && controleTelaDePonteiro()) controleClica(0);
    else controleTecla("Enter");
  }
  if (apertou(CTL_BTN.B)) controleTecla("Escape");
  if (apertou(CTL_BTN.START)) controleTecla("Enter");
  if (apertou(CTL_BTN.X)) controleTecla(state === "album" ? "KeyP" : "Enter");
  if (apertou(CTL_BTN.Y)) controleTecla(state === "diario" ? "KeyJ" : "KeyF");
  if (apertou(CTL_BTN.LB)) controleTecla(state === "album" || state === "diario" ? "ArrowLeft" : "KeyF");
  if (apertou(CTL_BTN.RB)) controleTecla("ArrowRight");
  controle.prev = b;
}
// seta nos menus: no chat rola; nas outras telas é a tecla
function controleSeta(code) {
  if (state === "chat") {
    const maxS = Math.max(0, live.msgs.length - 20);
    if (code === "ArrowUp") live.scroll = Math.min(maxS, live.scroll + 3);
    if (code === "ArrowDown") live.scroll = Math.max(0, live.scroll - 3);
    return;
  }
  controleTecla(code);
}
let ctlAnalogSeta = { x: 0, y: 0 };
function controleAnalogComoSeta(lx, ly) {
  const sx = Math.abs(lx) > 0.6 ? Math.sign(lx) : 0, sy = Math.abs(ly) > 0.6 ? Math.sign(ly) : 0;
  if (sx && sx !== ctlAnalogSeta.x) controleTecla(sx > 0 ? "ArrowRight" : "ArrowLeft");
  if (sy && sy !== ctlAnalogSeta.y) controleTecla(sy > 0 ? "ArrowDown" : "ArrowUp");
  ctlAnalogSeta = { x: sx, y: sy };
}

// o cursor virtual (só quando o controle é a entrada ativa e a tela tem botões)
function controleDesenha() {
  if (!controle.ativo || !controle.cursorAtivo || !controleTelaDePonteiro()) return;
  const x = controle.cx, y = controle.cy;
  ctx.save();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(0,0,0,0.6)";
  ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

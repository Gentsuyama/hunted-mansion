"use strict";
// ==================================================================
// LOOP principal e boot
// ==================================================================
let last = performance.now();

function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  time += dt;
  frameDt = dt;

  if (typeof controleUpdate === "function") controleUpdate(dt);   // gamepad vira teclado/mouse
  if (state === "play") update(dt);
  else if (state === "ritual") ritualUpdate(dt);
  if (typeof musicaUpdate === "function") musicaUpdate(dt);   // a trilha ouve o jogo
  render();
  if (typeof controleDesenha === "function") controleDesenha();  // cursor do controle nos menus
  if (typeof fxApresenta === "function") fxApresenta();          // pós-processamento WebGL
  requestAnimationFrame(frame);
}

// boot: carrega as imagens e abre na tela de IDIOMA (depois, o título);
// a cinematic de abertura toca sempre que uma NOVA live começa
loadCineImages();
langBoot();
if (typeof fxBoot === "function") fxBoot();   // a camada de efeitos (sem WebGL, fica só o 2D)
state = "lang";          // a primeira tela é sempre a do idioma

// as fontes embutidas chegam antes do primeiro quadro (teto de 2,5 s)
fontesProntas().then(() => requestAnimationFrame(frame));

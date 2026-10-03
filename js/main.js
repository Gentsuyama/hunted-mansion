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

  if (state === "play") update(dt);
  else if (state === "ritual") ritualUpdate(dt);
  if (typeof musicaUpdate === "function") musicaUpdate(dt);   // a trilha ouve o jogo
  render();
  requestAnimationFrame(frame);
}

// boot: carrega as imagens e abre na tela de IDIOMA (depois, o título);
// a cinematic de abertura toca sempre que uma NOVA live começa
loadCineImages();
langBoot();
state = "lang";          // a primeira tela é sempre a do idioma

requestAnimationFrame(frame);

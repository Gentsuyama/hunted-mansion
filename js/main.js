"use strict";
// ==================================================================
// LOOP principal e boot
// ==================================================================
let last = performance.now();

function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  time += dt;

  if (state === "play") update(dt);
  render();
  requestAnimationFrame(frame);
}

// boot: carrega imagens da intro; mostra a intro na primeira visita
loadCineImages();
let introSeen = false;
try { introSeen = localStorage.getItem("hm_intro") === "1"; } catch (e) {}
if (introSeen) state = "title";
else startCinematic();

requestAnimationFrame(frame);

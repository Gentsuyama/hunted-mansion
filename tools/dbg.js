// Ferramentas de inspeção visual — carregadas pelo console (fetch + eval),
// NÃO fazem parte do jogo. Servem para olhar fotos e telas sem jogar até lá.
window.dbgFotos = (lista, esc) => {
  let el = document.getElementById("dbg");
  if (!el) {
    el = document.createElement("canvas"); el.id = "dbg";
    el.style.cssText = "position:fixed;left:0;top:0;z-index:9;background:#222";
    document.body.appendChild(el);
  }
  const t0 = performance.now();
  const cvs = lista.map(([x, y, d]) => renderPhoto(x, y, d));
  const ms = (performance.now() - t0) / lista.length;
  const w = cvs[0].width * esc, h = cvs[0].height * esc;
  const cols = Math.min(2, cvs.length);
  el.width = w * cols; el.height = h * Math.ceil(cvs.length / cols);
  const g = el.getContext("2d");
  cvs.forEach((cv, i) => g.drawImage(cv, (i % cols) * w, ((i / cols) | 0) * h, w, h));
  return el.width + "x" + el.height + " " + ms.toFixed(0) + "ms/foto";
};
window.dbgOff = () => { const el = document.getElementById("dbg"); if (el) el.remove(); };
// começa uma run com a câmera completa, no andar pedido
window.dbgStart = (f) => {
  newRun(); state = "play";
  world.flags.cam = { tampa: true, lente: true, obturador: true, passado: false };
  world.flags.filmLoaded = true; film = 12;
  if (f != null && f !== world.cur) setFloor(f);
  return "andar " + world.cur;
};
// acha um ponto de onde se VÊ o alvo (x,y): [camX, camY, direção]
window.dbgMira = (tx, ty, dist) => {
  dist = dist || 6;
  for (let k = 0; k < 48; k++) {
    const a = k / 48 * 6.283, dd = dist + (k % 3) - 1;
    const x = tx + Math.cos(a) * dd, y = ty + Math.sin(a) * dd;
    if (x < 2 || y < 2 || x > COLS - 2 || y > ROWS - 2) continue;
    if (isSolid(x | 0, y | 0) || tileAt(x | 0, y | 0) !== T_FLOOR) continue;
    if (!hasLOS(x, y, tx, ty)) continue;
    return [x, y, Math.atan2(ty - y, tx - x)];
  }
  return null;
};
// vistas de móveis de um tipo (ou de todos) no andar atual
window.dbgMoveis = (tipo, n, dist) => {
  const out = [];
  for (const fu of fl().furn) {
    if (tipo && fu.type !== tipo) continue;
    const m = dbgMira(fu.x, fu.y, dist);
    if (m) out.push(m);
    if (out.length >= (n || 4)) break;
  }
  return out;
};
// centro de uma sala -> 4 direções
window.dbgSala = (r) => {
  const x = r.x + r.w / 2, y = r.y + r.h / 2;
  return [[x, y, 0], [x, y, Math.PI / 2], [x, y, Math.PI], [x, y, -Math.PI / 2]];
};
"dbg ok";

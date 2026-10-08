// Desenha um ANDAR inteiro como planta de arquiteto (para conferir os interiores):
// chão, paredes, tapetes, portas (vãos), móveis girados e o nome de cada cômodo.
// Uso (no navegador, com o jogo carregado):  plantaDebug(seed, andar) -> dataURL PNG
function plantaDebug(seed, andar, S) {
  S = S || 8;
  const w0 = world;
  newRun && typeof genWorld === "function" && genWorld(seed);
  const flo = world.floors[andar], g = flo.grid, fg = flo.furnGrid;
  const cv = document.createElement("canvas"); cv.width = COLS * S; cv.height = ROWS * S;
  const c = cv.getContext("2d");
  c.fillStyle = "#1a1612"; c.fillRect(0, 0, cv.width, cv.height);
  for (let j = 0; j < ROWS; j++) for (let i = 0; i < COLS; i++) {
    const id = j * COLS + i;
    if (g[id] === T_WALL) continue;
    const rug = flo.rugGrid ? flo.rugGrid[id] : 0;
    c.fillStyle = rug === 3 ? "#c9c2b2" : rug ? "#8c6b4a" : "#e6dcc6";
    c.fillRect(i * S, j * S, S, S);
  }
  // salas: contorno + nome do cômodo
  c.lineWidth = 1;
  for (const r of flo.rooms) {
    c.strokeStyle = r.fixed ? "rgba(120,40,40,0.9)" : "rgba(60,60,160,0.7)";
    c.strokeRect(r.x * S + 0.5, r.y * S + 0.5, r.w * S - 1, r.h * S - 1);
    const nome = r.fixed || (flo.comodos && flo.comodos.get(r)) || "?";
    c.fillStyle = "rgba(40,40,120,0.9)"; c.font = "bold " + (S * 1.3) + "px sans-serif";
    c.fillText(nome, r.x * S + 3, r.y * S + S * 1.4);
  }
  // portas: célula da borda com vizinho de fora de chão
  c.fillStyle = "rgba(220,60,60,0.55)";
  for (const r of flo.rooms) for (let j = r.y; j < r.y + r.h; j++) for (let i = r.x; i < r.x + r.w; i++) {
    const borda = i === r.x || j === r.y || i === r.x + r.w - 1 || j === r.y + r.h - 1;
    if (!borda || g[j * COLS + i] === T_WALL) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = i + dx, ny = j + dy;
      const fora = nx < r.x || ny < r.y || nx >= r.x + r.w || ny >= r.y + r.h;
      if (fora && g[ny * COLS + nx] !== T_WALL) { c.fillRect(i * S, j * S, S, S); break; }
    }
  }
  // móveis girados
  for (const fu of flo.furn) {
    const ft = FURN_TYPES[fu.type], spr = plantaSprite(fu.type);
    let dw = ft.w, dh = ft.h; const ar = spr.width / spr.height;
    if (ar > dw / dh) dh = dw / ar; else dw = dh * ar;
    c.save(); c.translate(fu.x * S, fu.y * S); c.rotate((fu.rot || 0) * Math.PI / 2);
    c.drawImage(spr, -dw / 2 * S, -dh / 2 * S, dw * S, dh * S); c.restore();
  }
  // pontos especiais
  const pt = (x, y, cor, txt) => { c.fillStyle = cor; c.beginPath(); c.arc(x * S, y * S, S * 0.45, 0, 7); c.fill();
    if (txt) { c.fillStyle = "#000"; c.font = (S * 1.1) + "px sans-serif"; c.fillText(txt, x * S + S * 0.6, y * S + S * 0.4); } };
  for (const sr of flo.secretRooms || []) if (sr.frente) pt(sr.frente.x, sr.frente.y, "#d040d0", "secreta");
  for (const cd of flo.candelabros || []) pt(cd.x, cd.y, "#f0c040", "vela");
  for (const fm of flo.films || []) pt(fm.x, fm.y, "#40c0f0", "filme");
  for (const it of (world.items || [])) if (it.floor === andar) pt(it.x, it.y, "#40f080", it.kind + (it.part ? ":" + it.part : ""));
  for (const rt of (world.retratos || [])) if (rt.floor === andar) pt(rt.x, rt.y, "#f06040", "retrato " + rt.soul);
  const url = cv.toDataURL("image/png");
  if (w0) world = w0;
  return url;
}

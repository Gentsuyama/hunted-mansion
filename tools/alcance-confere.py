# -*- coding: utf-8 -*-
# Conferência estática da casa COM os móveis: tudo o que o jogador precisa alcançar (itens, retratos,
# filmes, velas, frente das salas secretas, cofre, fusíveis, bancada, lamparina, elevador, salas) continua
# alcançável a partir do hall da escada? Uso: python tools/alcance-confere.py 60   (servidor 8138 no ar)
# conferência estática: com os móveis no chão, tudo o que o jogador precisa alcançar continua alcançável?
import sys, glob, os, json
from playwright.sync_api import sync_playwright
n = int(sys.argv[1])
JS = r"""
(n) => {
  const falhas = [], stats = { seeds: 0, moveis: 0, tirados: 0 };
  for (let seed = 1; seed <= n; seed++) {
    genWorld(seed); stats.seeds++;
    for (let f = 0; f < NFLOORS; f++) {
      const flo = world.floors[f], g = flo.grid, fg = flo.furnGrid;
      stats.moveis += flo.furn.length;
      const seen = new Uint8Array(COLS * ROWS);
      const c0 = roomCenter(STAIR_ROOM), q = [(c0.y | 0) * COLS + (c0.x | 0)]; seen[q[0]] = 1;
      while (q.length) { const cu = q.pop(), cx = cu % COLS, cy = (cu / COLS) | 0;
        for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) { const nx = cx + dx, ny = cy + dy;
          if (nx < 1 || ny < 1 || nx >= COLS - 1 || ny >= ROWS - 1) continue; const ni = ny * COLS + nx;
          if (seen[ni] || g[ni] === T_WALL || fg[ni]) continue; seen[ni] = 1; q.push(ni); } }
      const ok = (x, y) => seen[(y | 0) * COLS + (x | 0)] === 1;
      const pontos = [];
      for (const it of world.items) if (it.floor === f) pontos.push(["item " + it.kind + (it.part ? ":" + it.part : ""), it.x, it.y]);
      for (const r of world.retratos) if (r.floor === f) pontos.push(["retrato " + r.soul, r.x, r.y]);
      for (const fm of flo.films) pontos.push(["filme", fm.x, fm.y]);
      for (const cd of flo.candelabros || []) pontos.push(["vela", cd.x, cd.y]);
      for (const sr of flo.secretRooms || []) if (sr.frente) pontos.push(["frente secreta", sr.frente.x, sr.frente.y]);
      if (flo.safe) pontos.push(["cofre", flo.safe.x, flo.safe.y]);
      if (flo.fusebox) pontos.push(["fusíveis", flo.fusebox.x, flo.fusebox.y]);
      if (flo.bench) pontos.push(["bancada", flo.bench.x, flo.bench.y]);
      if (world.lamp && world.lamp.floor === f) pontos.push(["lamparina", world.lamp.x, world.lamp.y]);
      const ce = roomCenter(ELEV_ROOM); pontos.push(["elevador", ce.x, ce.y]);
      for (const r of flo.rooms) { const c = roomCenter(r); if (!r.fixed) pontos.push(["sala " + (flo.comodos ? flo.comodos.get(r) : "?"), c.x, c.y]); }
      for (const [nome, x, y] of pontos) {
        // ponto em cima de móvel? tenta a célula e as 4 vizinhas (itens ficam ao lado de móveis)
        const raio = nome.startsWith("sala") ? 3 : 1;      // o centro da sala pode ter a mesa de jantar
        let viz = false;
        for (let dy = -raio; dy <= raio && !viz; dy++) for (let dx = -raio; dx <= raio && !viz; dx++) if (ok(x + dx, y + dy)) viz = true;
        if (!viz) falhas.push({ seed, andar: f, nome, x: +x.toFixed(1), y: +y.toFixed(1) });
      }
    }
  }
  return { falhas, stats };
}
"""
def chrome():
    c = sorted(glob.glob(os.path.expanduser("~/AppData/Local/ms-playwright/chromium-*/chrome-win64/chrome.exe"))); return c[-1] if c else None
with sync_playwright() as p:
    try: b = p.chromium.launch(headless=True)
    except Exception: b = p.chromium.launch(executable_path=chrome(), headless=True)
    pg = b.new_page()
    pg.goto("http://127.0.0.1:8138/index.html?v=alcance" + str(n), wait_until="load", timeout=60000)
    pg.wait_for_function("typeof genWorld === 'function'", timeout=20000)
    r = pg.evaluate(JS, n)
    print("seeds", r["stats"]["seeds"], "móveis", r["stats"]["moveis"], "média/andar", round(r["stats"]["moveis"] / (6 * n)))
    print("falhas:", len(r["falhas"]))
    for f in r["falhas"][:12]: print(" ", f)
    b.close()

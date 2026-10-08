# -*- coding: utf-8 -*-
# Plantas de debug dos andares (tools/planta-debug.js) para olhar os interiores.
# Uso: python tools/planta-run.py SAIDA_DIR 7,23 1,2,3   (servidor 8138 no ar)
# gera as plantas de debug de alguns andares/seeds: salva PNGs
import sys, os, base64, glob
from playwright.sync_api import sync_playwright
out = sys.argv[1]; seeds = [int(x) for x in sys.argv[2].split(",")]; andares = [int(x) for x in sys.argv[3].split(",")]
os.makedirs(out, exist_ok=True)
src = open("tools/planta-debug.js", encoding="utf-8").read()
def chrome():
    c = sorted(glob.glob(os.path.expanduser("~/AppData/Local/ms-playwright/chromium-*/chrome-win64/chrome.exe"))); return c[-1] if c else None
with sync_playwright() as p:
    try: b = p.chromium.launch(headless=True)
    except Exception: b = p.chromium.launch(executable_path=chrome(), headless=True)
    pg = b.new_page(viewport={"width": 1200, "height": 680})
    erros = []; pg.on("pageerror", lambda e: erros.append(str(e)))
    pg.goto("http://127.0.0.1:8138/index.html?v=planta" + str(seeds[0]), wait_until="load", timeout=60000)
    pg.wait_for_function("typeof genWorld === 'function' && typeof plantaSprite === 'function'", timeout=20000)
    pg.evaluate(src)
    for sd in seeds:
        for an in andares:
            url = pg.evaluate("([s, a]) => plantaDebug(s, a, 16)", [sd, an])
            open(os.path.join(out, "planta-%d-andar%d.png" % (sd, an)), "wb").write(base64.b64decode(url.split(",", 1)[1]))
    # estatística: móveis por andar e tipos de cômodo
    st = pg.evaluate("""([seeds]) => seeds.map(s => { genWorld(s); return world.floors.map(f => ({ moveis: f.furn.length,
      comodos: [...(f.comodos || new Map()).values()].join(","), salas: f.rooms.filter(r => !r.fixed).length })); })""", [seeds])
    for sd, floors in zip(seeds, st):
        print("seed", sd, " | ".join("%d:%dm/%ds[%s]" % (i, f["moveis"], f["salas"], f["comodos"]) for i, f in enumerate(floors)))
    b.close()
print("erros:", erros[:3] if erros else "nenhum")

# -*- coding: utf-8 -*-
"""
Print do jogo por Playwright (navegador próprio, sem depender do Chrome do Rodolfo).

    python tools/pw-print.py SAIDA.png [--js "código"] [--js-file arquivo.js] [--url URL] [--w 1200 --h 680]

Abre a página, espera os scripts carregarem, roda o código (no contexto da página; pode ser
`await`), chama render() e salva o PRINT do canvas do jogo. O servidor local precisa estar
no ar (python -m http.server 8138 em Hunted Mansion/, FORA do sandbox do agente — um servidor
dentro do sandbox só é visto pelo shell).
Chromium: usa o build que já existe em ~/AppData/Local/ms-playwright (CHROME_EXE abaixo) se o
Playwright pedir outro.
"""
import sys, os, io, argparse, glob
from playwright.sync_api import sync_playwright

ap = argparse.ArgumentParser()
ap.add_argument("saida")
ap.add_argument("--js", default="")
ap.add_argument("--js-file", default="")
ap.add_argument("--url", default="http://127.0.0.1:8138/index.html?v=pw")
ap.add_argument("--w", type=int, default=1200)
ap.add_argument("--h", type=int, default=680)
ap.add_argument("--full", action="store_true", help="print da página inteira, não só do canvas")
a = ap.parse_args()
js = a.js
if a.js_file: js = io.open(a.js_file, encoding="utf-8").read()

def chrome_exe():
    cands = sorted(glob.glob(os.path.expanduser("~/AppData/Local/ms-playwright/chromium-*/chrome-win64/chrome.exe")))
    return cands[-1] if cands else None

with sync_playwright() as p:
    kw = {"headless": True, "args": ["--autoplay-policy=no-user-gesture-required"]}
    try:
        b = p.chromium.launch(**kw)
    except Exception:
        exe = chrome_exe()
        if not exe: raise
        b = p.chromium.launch(executable_path=exe, **kw)
    pg = b.new_page(viewport={"width": a.w, "height": a.h})
    erros = []
    pg.on("pageerror", lambda e: erros.append(str(e)))
    pg.goto(a.url, wait_until="load", timeout=20000)
    pg.wait_for_function("typeof state !== 'undefined' && typeof ECO_IMGS !== 'undefined'", timeout=15000)
    pg.wait_for_timeout(1500)
    if js:
        res = pg.evaluate("async () => { " + js + " }")
        if res is not None: print("js:", res)
    pg.evaluate("() => { try { render(); } catch (e) {} }")
    pg.wait_for_timeout(200)
    if a.full: pg.screenshot(path=a.saida)
    else: pg.locator("#game").screenshot(path=a.saida)
    print("print:", a.saida, "| erros de página:", erros or "nenhum")
    b.close()

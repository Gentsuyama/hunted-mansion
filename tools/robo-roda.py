# -*- coding: utf-8 -*-
"""
Roda um LOTE de robôs sem abrir o navegador do Rodolfo: Playwright (Chromium headless)
carrega o jogo, injeta tools/robo-lote.js e dispara roboLote(); os workers rodam fora da
aba, em paralelo. Acompanha com roboStatus() até acabar e grava o relatório.

Uso (servidor 8138 no ar):
  python tools/robo-roda.py SAIDA.json --lote '{"medio":14,"veterano":14,"novato":14,"sim:REVELADOR":28}' [--workers 12] [--limite 150] [--max-min 60]
Imprime o resumo por perfil (roboStatus) e salva também roboRes/roboLogs das runs perdidas.
"""
import sys, os, io, json, time, argparse, glob

ap = argparse.ArgumentParser()
ap.add_argument("saida")
ap.add_argument("--lote", default='{"sim:REVELADOR":4,"medio":2}')
ap.add_argument("--workers", type=int, default=0)
ap.add_argument("--limite", type=int, default=150, help="limiteMin do robô humano (minutos de jogo)")
ap.add_argument("--max-min", type=float, default=90, help="tempo real máximo de espera (minutos)")
ap.add_argument("--url", default="http://127.0.0.1:8138/index.html?v=robo")
a = ap.parse_args()

from playwright.sync_api import sync_playwright
def chrome_exe():
    c = sorted(glob.glob(os.path.expanduser("~/AppData/Local/ms-playwright/chromium-*/chrome-win64/chrome.exe")))
    return c[-1] if c else None

with sync_playwright() as p:
    try: b = p.chromium.launch(headless=True)
    except Exception: b = p.chromium.launch(executable_path=chrome_exe(), headless=True)
    pg = b.new_page()
    erros = []; pg.on("pageerror", lambda e: erros.append(str(e)))
    for tent in range(3):               # o http.server derruba um script de vez em quando
        pg.goto(a.url + str(int(time.time())) + str(tent), wait_until="load", timeout=60000)
        try:
            pg.wait_for_function("typeof state !== 'undefined' && typeof genWorld === 'function' && typeof frame === 'function' && typeof FURN_TYPES !== 'undefined'", timeout=10000)
            break
        except Exception:
            print("aviso: script faltando, recarregando")
    lote = io.open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "robo-lote.js"), encoding="utf-8").read()
    pg.evaluate(lote)
    opts = {"limiteMin": a.limite}
    if a.workers: opts["workers"] = a.workers
    print(pg.evaluate("([q, o]) => roboLote(q, o)", [json.loads(a.lote), opts]))
    t0 = time.time(); ultimo = ""
    while True:
        time.sleep(15)
        st = pg.evaluate("() => roboStatus()")
        linha = "%4ds  %d/%d  em curso: %s  erros: %d" % (st["seg"], st["feitas"], st["de"], " ".join(st["emCurso"][:8]), len(st["erros"]))
        if linha != ultimo: print(linha, flush=True); ultimo = linha
        if st["erros"]: print("  ERRO:", st["erros"][0][:300], flush=True)
        if st["feitas"] >= st["de"] or (st["feitas"] + len(st["emCurso"]) == 0 and st["erros"]): break
        if time.time() - t0 > a.max_min * 60: print("tempo real esgotado"); break
    st = pg.evaluate("() => roboStatus()")
    res = {"status": st, "res": {}, "logsPerdidas": {}}
    for perfil in json.loads(a.lote):
        res["res"][perfil] = pg.evaluate("(p) => roboRes(p)", perfil)
        # logs das runs que não venceram (até 4 por perfil)
        res["logsPerdidas"][perfil] = pg.evaluate("""(p) => { const R = window.__robo; const out = [];
          R.res.forEach((r, i) => { if (r.perfilLote !== p) return; const fim = r.outcome !== undefined ? r.outcome : r.fim;
            if (fim !== 'VITÓRIA' && out.length < 4) out.push({ fim, res: r, log: (R.logs[i] || {}).log }); }); return out; }""", perfil)
    res["errosPagina"] = erros[:5]
    io.open(a.saida, "w", encoding="utf-8").write(json.dumps(res, ensure_ascii=False, indent=1))
    print("\n=== RESUMO (%d s reais, %d workers) ===" % (st["seg"], st["workers"]))
    for perfil, r in st["por"].items():
        print("%-16s n=%-3d vit=%-3d mortes=%-3d tempo=%-3d outro=%-3d vitMin=%s morteMin=%s quedas/run=%s dano/min=%s botes/min=%s" % (
            perfil, r["n"], r["vitorias"], r["mortes"], r["tempoEsgotado"], r["outro"], r["vitMin"], r["morteMin"],
            r["quedasPorRun"], r["danoPorMin"], r["botesPorMin"]))
        if r["travou"]: print("    travou:", json.dumps(r["travou"], ensure_ascii=False)[:300])
    if st["erros"]: print("ERROS:", st["erros"])
    if erros: print("erros de página:", erros[:3])
    b.close()

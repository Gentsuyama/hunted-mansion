# -*- coding: utf-8 -*-
"""
Renderiza a TRILHA gerada (js/musica.js) fora do tempo real e mede o que o
ouvido reclama: pico, RMS, fator de crista, amostras no limite (clipping),
centroide espectral e a fatia de energia por banda (grave / médio / agudo).
Eu não ouço — este é o jeito de julgar a trilha por número e de entregar
arquivos WAV para o Rodolfo ouvir.

Uso (servidor local no ar, porta 8138):
  python tools/trilha-render.py SAIDA_DIR [--seg 30] [--cenas calma,caca,...] [--url ...]
Gera SAIDA_DIR/<cena>.wav e SAIDA_DIR/metricas.json.

Como: no navegador (Playwright), troca o AudioContext do jogo por um
OfflineAudioContext embrulhado num Proxy cujo currentTime é um relógio
simulado; chama musicaTick() avançando esse relógio para agendar tudo, e
então renderiza de uma vez.
"""
import sys, os, io, json, base64, struct, argparse, glob

ap = argparse.ArgumentParser()
ap.add_argument("saida")
ap.add_argument("--seg", type=float, default=30)
ap.add_argument("--cenas", default="abertura,calma,tensao,caca,refugio,boss,queda,loucura,alvorada")
ap.add_argument("--url", default="http://127.0.0.1:8138/index.html?v=trilha")
ap.add_argument("--solo", default="", help="só esta camada (fund, ar, piano, pulso, tens, sinos)")
a = ap.parse_args()
os.makedirs(a.saida, exist_ok=True)

JS = r"""
async ([cena, seg, solo]) => {
  const SR = 44100, N = Math.round(SR * seg);
  const off = new OfflineAudioContext(2, N, SR);
  let tSim = 0;
  // o jogo lê AC.currentTime: o Proxy devolve o relógio simulado antes de renderizar
  const fake = new Proxy(off, { get(o, k) {
    if (k === "currentTime") return tSim;
    if (k === "state") return "running";              // offline fica "suspended" até renderizar
    const v = o[k]; return typeof v === "function" ? v.bind(o) : v; } });
  if (typeof initAudio === "function" && !AC) { /* sem áudio real: criamos só o offline */ }
  AC = fake;
  master = off.createGain(); master.gain.value = 0.55; master.connect(off.destination);
  mus = null;
  musicaInit();
  if (mus.saida) { mus.saida.gain.cancelScheduledValues(0); mus.saida.gain.setValueAtTime(MUS.vol, 0); }
  if (solo) for (const k in MUS.cenas[cena]) if (k !== "paleta" && k !== solo) MUS.cenas[cena][k] = 0;
  musicaAplicaCena(cena, true);
  for (tSim = 0; tSim < seg + 1; tSim += 0.2) musicaTick();
  tSim = 0;
  const buf = await off.startRendering();
  const L = buf.getChannelData(0), R = buf.getChannelData(1);
  // --- métricas ---
  let pico = 0, soma = 0, clip = 0;
  const ini = Math.round(SR * 4);                       // ignora a entrada
  for (let i = ini; i < N; i++) {
    const m = 0.5 * (L[i] + R[i]); const am = Math.abs(m);
    if (am > pico) pico = am; soma += m * m;
    if (Math.abs(L[i]) >= 0.985 || Math.abs(R[i]) >= 0.985) clip++;
  }
  const rms = Math.sqrt(soma / (N - ini));
  // envelope: RMS por janela de 2 s → quanto a música RESPIRA (faixa em dB)
  const jan = SR * 2; let envMin = 1e9, envMax = -1e9;
  for (let p0 = ini; p0 + jan <= N; p0 += jan) { let s2 = 0;
    for (let i = p0; i < p0 + jan; i++) { const m = 0.5 * (L[i] + R[i]); s2 += m * m; }
    const db = 10 * Math.log10(s2 / jan + 1e-12); envMin = Math.min(envMin, db); envMax = Math.max(envMax, db); }
  // espectro médio por FFT simples (radix-2) em janelas de 4096
  const W = 4096, bandas = [0, 0, 0, 0, 0], lim = [200, 1000, 3000, 8000, 1e9];
  let cen = 0, cenW = 0, nj = 0;
  const re = new Float64Array(W), im = new Float64Array(W);
  function fft(re, im) {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit;
      if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
    for (let len = 2; len <= n; len <<= 1) { const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
      for (let i = 0; i < n; i += len) { let cr = 1, ci = 0;
        for (let k = 0; k < len / 2; k++) { const ur = re[i + k], ui = im[i + k];
          const vr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci, vi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
          re[i + k] = ur + vr; im[i + k] = ui + vi; re[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi;
          const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t; } } }
  }
  for (let p = ini; p + W <= N; p += W * 2) {
    for (let i = 0; i < W; i++) { const h = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / W); re[i] = 0.5 * (L[p + i] + R[p + i]) * h; im[i] = 0; }
    fft(re, im);
    for (let k = 1; k < W / 2; k++) {
      const f = k * SR / W, e = re[k] * re[k] + im[k] * im[k];
      let b = 0; while (f > lim[b]) b++; bandas[b] += e; cen += f * e; cenW += e;
    }
    nj++;
  }
  const tot = bandas.reduce((x, y) => x + y, 0) || 1;
  // WAV 16 bits estéreo em base64
  const out = new DataView(new ArrayBuffer(44 + N * 4));
  const str = (o, s) => { for (let i = 0; i < s.length; i++) out.setUint8(o + i, s.charCodeAt(i)); };
  str(0, "RIFF"); out.setUint32(4, 36 + N * 4, true); str(8, "WAVE"); str(12, "fmt ");
  out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, 2, true);
  out.setUint32(24, SR, true); out.setUint32(28, SR * 4, true); out.setUint16(32, 4, true); out.setUint16(34, 16, true);
  str(36, "data"); out.setUint32(40, N * 4, true);
  for (let i = 0; i < N; i++) {
    out.setInt16(44 + i * 4, Math.max(-1, Math.min(1, L[i])) * 32767, true);
    out.setInt16(46 + i * 4, Math.max(-1, Math.min(1, R[i])) * 32767, true);
  }
  let bin = ""; const u8 = new Uint8Array(out.buffer);
  for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return { cena, pico, rms, dbRms: 20 * Math.log10(rms || 1e-9), crista: 20 * Math.log10((pico || 1e-9) / (rms || 1e-9)),
           respira: envMax - envMin,
           clipPct: 100 * clip / (N - ini), centroideHz: cen / (cenW || 1),
           bandas: { "<200": bandas[0] / tot, "200-1k": bandas[1] / tot, "1k-3k": bandas[2] / tot, "3k-8k": bandas[3] / tot, ">8k": bandas[4] / tot },
           wav: btoa(bin) };
}
"""

from playwright.sync_api import sync_playwright
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def chrome_exe():
    c = sorted(glob.glob(os.path.expanduser("~/AppData/Local/ms-playwright/chromium-*/chrome-win64/chrome.exe")))
    return c[-1] if c else None

metricas = {}
with sync_playwright() as p:
    kw = dict(headless=True, args=["--autoplay-policy=no-user-gesture-required"])
    try: b = p.chromium.launch(**kw)
    except Exception:
        b = p.chromium.launch(executable_path=chrome_exe(), **kw)
    pg = b.new_page(viewport={"width": 1200, "height": 680})
    erros = []
    pg.on("pageerror", lambda e: erros.append(str(e)))
    pg.goto(a.url, wait_until="load", timeout=60000)
    pg.wait_for_function("typeof musicaInit === 'function' && typeof state !== 'undefined'", timeout=20000)
    for cena in a.cenas.split(","):
        r = pg.evaluate(JS, [cena, a.seg, a.solo])
        wav = base64.b64decode(r.pop("wav"))
        io.open(os.path.join(a.saida, cena + ".wav"), "wb").write(wav)
        metricas[cena] = r
        print("%-9s pico %.2f  rms %6.1f dB  crista %4.1f dB  respira %4.1f dB  clip %.2f%%  centroide %5.0f Hz  bandas %s" % (
            cena, r["pico"], r["dbRms"], r["crista"], r["respira"], r["clipPct"], r["centroideHz"],
            " ".join("%s:%.0f%%" % (k, 100 * v) for k, v in r["bandas"].items())))
    b.close()
io.open(os.path.join(a.saida, "metricas.json"), "w", encoding="utf-8").write(json.dumps(metricas, indent=1, ensure_ascii=False))
if erros: print("erros de página:", erros[:3])
print("ok ->", a.saida)

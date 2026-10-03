// LOTES de robô em paralelo, fora da aba (workers). Carregar pelo console:
//   await fetch('tools/robo-lote.js').then(r => r.text()).then(t => (0, eval)(t));
//   roboLote({ medio: 12, veterano: 8, novato: 8 }, { limiteMin: 150 });
//   roboLote({ "sim:REVELADOR": 10, "sim:CRUEL": 10 });      // robô antigo
//   roboStatus();          // andamento e resumo por perfil
//   roboRes("medio");      // as runs de um perfil, uma por linha
// opts.ajuste = { "ECO.deriva": 0.1, "BOTE.dano": 15 } muda constantes só no lote.
window.roboLote = function (quantos, opts) {
  opts = opts || {};
  if (window.__robo) for (const w of window.__robo.ws) w.terminate();
  const fila = [];
  for (const perfil in quantos)
    for (let i = 0; i < quantos[perfil]; i++) fila.push({ perfil, id: fila.length });
  // intercala os perfis: resultados de todos chegam desde o começo
  fila.sort((a, b) => (a.id % 97) * 31 % 97 - (b.id % 97) * 31 % 97);
  const nW = Math.max(1, Math.min(opts.workers || Math.max(2, (navigator.hardwareConcurrency || 4) - 2),
                                  fila.length));
  const R = window.__robo = { fila, res: [], logs: [], erros: [], ws: [], emCurso: {},
                              t0: performance.now(), total: fila.length, nW };
  const manda = (w) => {
    const j = R.fila.shift();
    if (!j) return;
    R.emCurso[j.id] = { perfil: j.perfil, min: 0 };
    w.__job = j.id;
    if (j.perfil.startsWith("sim:"))
      w.postMessage({ cmd: "sim", id: j.id, policy: j.perfil.slice(4), ajuste: opts.ajuste });
    else
      w.postMessage({ cmd: "hum", id: j.id, perfil: j.perfil, ajuste: opts.ajuste,
                      opts: { limiteMin: opts.limiteMin || 150 } });
  };
  for (let i = 0; i < nW; i++) {
    const w = new Worker("tools/robo-worker.js?v=" + Date.now());
    w.onmessage = (e) => {
      const d = e.data;
      if (d.tipo === "pronto") manda(w);
      else if (d.tipo === "prog") { if (R.emCurso[d.id]) { R.emCurso[d.id].min = d.min; R.emCurso[d.id].travou = d.travou; } }
      else if (d.tipo === "fim") {
        delete R.emCurso[d.id];
        d.res.perfilLote = d.perfil; d.res.ms = d.ms;
        R.res.push(d.res); R.logs.push({ perfil: d.perfil, log: d.log });
        manda(w);
        if (R.res.length >= R.total) R.ms = performance.now() - R.t0;
      } else if (d.tipo === "erro") { R.erros.push(d.msg); delete R.emCurso[d.id]; manda(w); }
    };
    w.onerror = (e) => { R.erros.push("worker: " + e.message + " @" + e.lineno); };
    R.ws.push(w);
  }
  return "lote: " + fila.length + " runs em " + nW + " workers";
};
window.roboStatus = function () {
  const R = window.__robo;
  if (!R) return "sem lote";
  const por = {};
  for (const r of R.res) {
    const p = por[r.perfilLote] || (por[r.perfilLote] = { n: 0, vit: 0, morte: 0, tempo: 0, outro: 0,
      minVit: [], minMorte: [], quedas: 0, desc: 0, dano: 0, botes: 0, flashes: 0, fotos: 0, minTot: 0, travou: {} });
    p.n++;
    const sim = r.outcome !== undefined;
    const fim = sim ? (r.outcome === "VITÓRIA" ? "VITÓRIA" : r.outcome === "MORTE" ? "MORTE" : "OUTRO") : r.fim;
    const min = sim ? r.timeMin : r.min;
    if (fim === "VITÓRIA") { p.vit++; p.minVit.push(min); }
    else if (fim === "MORTE") { p.morte++; p.minMorte.push(min); }
    else if (fim === "TEMPO") p.tempo++; else p.outro++;
    if (fim !== "VITÓRIA") { const t = sim ? (r.outcome + " " + (r.trace || "")).slice(0, 40) : r.travou; p.travou[t] = (p.travou[t] || 0) + 1; }
    p.quedas += r.quedas || 0; p.desc += r.descansos || 0; p.dano += r.dano || 0;
    p.botes += r.botes || 0; p.flashes += r.flashes || 0; p.fotos += r.fotos || 0; p.minTot += min || 0;
  }
  const med = (a) => { if (!a.length) return null; const s = a.slice().sort((x, y) => x - y); return s[s.length >> 1]; };
  const out = {};
  for (const k in por) {
    const p = por[k];
    out[k] = {
      n: p.n, vitorias: p.vit, mortes: p.morte, tempoEsgotado: p.tempo, outro: p.outro,
      vitMin: p.minVit.length ? [Math.min(...p.minVit), med(p.minVit), Math.max(...p.minVit)] : null,
      morteMin: p.minMorte.length ? [Math.min(...p.minMorte), med(p.minMorte), Math.max(...p.minMorte)] : null,
      quedasPorRun: +(p.quedas / p.n).toFixed(2), descansosPorRun: +(p.desc / p.n).toFixed(2),
      danoPorMin: +(p.dano / Math.max(1, p.minTot)).toFixed(2),
      botesPorMin: +(p.botes / Math.max(1, p.minTot)).toFixed(2),
      flashesPorMin: +((p.flashes + p.fotos) / Math.max(1, p.minTot)).toFixed(2),
      travou: p.travou,
    };
  }
  return { feitas: R.res.length, de: R.total, workers: R.nW,
           seg: Math.round((R.ms || performance.now() - R.t0) / 1000),
           emCurso: Object.keys(R.emCurso).map(k => R.emCurso[k].perfil + "@" + R.emCurso[k].min + "m"),
           erros: R.erros.slice(0, 4), por: out };
};
window.roboRes = function (perfil) {
  const R = window.__robo;
  if (!R) return [];
  return R.res.filter(r => !perfil || r.perfilLote === perfil).map(r => r.outcome !== undefined
    ? [r.outcome, r.final, r.timeMin + "m", "quedas" + r.quedas, "desc" + r.descansos, "san" + r.sanityMin, r.error || r.trace].join(" ")
    : [r.fim, r.final, r.min + "m", "travou:" + r.travou, "quedas" + r.quedas, "desc" + r.descansos,
       "dano" + r.dano, "botes" + r.botes, "filme" + r.filme, "livres" + r.livres, r.causa].join(" "));
};
// depuração: roda um trecho de código dentro de um worker novo (rápido, fora da aba)
window.roboEval = function (codigo, maxMs) {
  return new Promise((ok) => {
    const w = new Worker("tools/robo-worker.js?v=" + Date.now());
    const fim = (v) => { w.terminate(); ok(v); };
    const to = setTimeout(() => fim("tempo esgotado"), maxMs || 40000);
    w.onmessage = (e) => {
      const d = e.data;
      if (d.tipo === "pronto") w.postMessage({ cmd: "eval", id: 0, codigo });
      else if (d.tipo === "eval") { clearTimeout(to); fim(d.res); }
      else if (d.tipo === "erro") { clearTimeout(to); fim("ERRO " + d.msg); }
    };
  });
};
window.roboLogs = function (perfil, i) {
  const R = window.__robo;
  const l = R.logs.filter(x => !perfil || x.perfil === perfil);
  return l[i || 0] ? l[i || 0].log : [];
};
"robo-lote ok";

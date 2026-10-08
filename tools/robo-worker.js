// WORKER dos robôs de teste: carrega o jogo inteiro SEM TELA (canvas fora de tela,
// sem imagens, sem áudio) e roda runs a toda velocidade, fora da aba — que pode
// ficar em segundo plano sem ser estrangulada. Vários workers = várias runs ao
// mesmo tempo. Quem conversa com ele é tools/robo-lote.js. NÃO faz parte do jogo.
self.window = self;
const mkCanvas = (w, h) => {
  const c = new OffscreenCanvas(w || 300, h || 150);
  c.style = {};
  c.getBoundingClientRect = () => ({ left: 0, top: 0, width: c.width, height: c.height });
  return c;
};
self.document = {
  getElementById: () => mkCanvas(1200, 680),
  createElement: () => mkCanvas(),
  addEventListener() {}, documentElement: {}, hidden: false, fullscreenElement: null,
  body: { appendChild() {} },
};
// sem arte: toda imagem "falha" e o jogo cai nos desenhos por código
self.Image = class {
  constructor() { this.complete = false; this.naturalWidth = 0; this.naturalHeight = 0; }
  set src(v) { setTimeout(() => { if (this.onerror) this.onerror(); }, 0); }
};
self.CanvasRenderingContext2D = OffscreenCanvasRenderingContext2D;
self.localStorage = {
  _m: {},
  getItem(k) { return k in this._m ? this._m[k] : null; },
  setItem(k, v) { this._m[k] = String(v); },
  removeItem(k) { delete this._m[k]; },
};
self.requestAnimationFrame = () => 0;

const V = "?v=" + Date.now();
const JOGO = ["core", "plataforma", "i18n", "fontes", "lang/chaves", "audio", "musica", "sprites", "tex", "photo", "mansion", "interiores",
              "mapa", "game", "live", "souls", "puzzles", "ritual", "energia", "planta",
              "album", "diario", "sanidade", "sangue", "controle", "fx", "intro", "main"];
try {
  // o http.server do Python derruba um pedido de vez em quando com muitos workers
  // subindo juntos: cada script tenta até 4 vezes
  const carrega = (url) => { let erro = null;
    for (let t = 0; t < 4; t++) { try { importScripts(url + (t ? "&r=" + t : "")); return; } catch (e) { erro = e; } }
    throw erro; };
  for (const f of JOGO) carrega("../js/" + f + ".js" + V);
  carrega("sim.js" + V); carrega("sim-humano.js" + V);
  setLang("pt");
  SEM_ARQUIVO = true;
} catch (e) {
  postMessage({ tipo: "erro", msg: String(e) + " | " + String(e.stack || "").split("\n").slice(0, 4).join(" | ") });
}

onmessage = (e) => {
  const d = e.data;
  try {
    if (d.ajuste) {                       // experimentos de balanceamento: muda constantes
      for (const k in d.ajuste) {
        const [obj, campo] = k.split(".");
        const alvo = { ECO, BOTE, MOV, LANTERNA, FLASH }[obj];
        if (alvo) alvo[campo] = d.ajuste[k];
      }
    }
    if (d.cmd === "hum") {
      const t0 = performance.now();
      let ult = t0, r;
      humInicia(d.perfil, d.opts);
      do {
        r = humPasso(400);
        if (performance.now() - ult > 2500) {
          ult = performance.now();
          postMessage({ tipo: "prog", id: d.id, min: r.min, travou: r.travou });
        }
      } while (r.fim === "EM CURSO");
      postMessage({ tipo: "fim", id: d.id, perfil: d.perfil, res: r, log: humLog(30),
                    ms: Math.round(performance.now() - t0) });
    } else if (d.cmd === "eval") {       // depuração: roda um trecho dentro do worker
      const r = (0, eval)(d.codigo);
      postMessage({ tipo: "eval", id: d.id, res: r });
    } else if (d.cmd === "sim") {
      const t0 = performance.now();
      FOTO.rapido = true;
      const r = simRun(d.policy, !!d.semFantasmas);
      state = "title";
      postMessage({ tipo: "fim", id: d.id, perfil: "sim:" + d.policy, res: r, log: [],
                    ms: Math.round(performance.now() - t0) });
    }
  } catch (err) {
    postMessage({ tipo: "erro", id: d.id, msg: String(err) + " | " +
                  String(err.stack || "").split("\n").slice(0, 5).join(" | ") });
  }
};
postMessage({ tipo: "pronto" });

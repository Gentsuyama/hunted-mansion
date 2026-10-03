// Inspeção das traduções — carregado pelo console (fetch + eval), NÃO faz parte do jogo.
// dbgTelas(idioma) desenha as telas principais lado a lado para conferir textos e larguras.
window.dbgIdioma = (id) => {
  setLang(id);
  const m = i18nMapa(id);
  const faltam = id === "pt" ? 0 : I18N_KEYS.filter(k => m[k] === undefined).length;
  return id + ": " + (id === "pt" ? "original" : (I18N_KEYS.length - faltam) + "/" + I18N_KEYS.length + " traduzidos");
};
// monta uma grade 3×2 com: título, jogo (HUD+chat), cofre, quarto escuro, fim, morte
window.dbgTelas = (id) => {
  setLang(id);
  let el = document.getElementById("dbgT");
  if (!el) {
    el = document.createElement("canvas"); el.id = "dbgT";
    el.style.cssText = "position:fixed;left:0;top:0;z-index:9;background:#111";
    document.body.appendChild(el);
  }
  const W = 600, Hh = 340;
  el.width = W * 3; el.height = Hh * 2;
  const g = el.getContext("2d");
  const tira = (i) => g.drawImage(canvas, (i % 3) * W, ((i / 3) | 0) * Hh, W, Hh);
  noGhosts = true; newRun(); noGhosts = false;
  world.flags.cam = { tampa: true, lente: true, obturador: true, passado: false };
  world.flags.fuses = 1; world.flags.fusesIn = 1; world.flags.key = true;
  live.hinted.add("chainsSeen");
  liveEvent("secret"); livePush(liveRandUser(), "ALI! ALI!! aquela parede de novo!! FOTOGRAFA ela");
  livePush(liveRandUser(), "gente… esse aí é o TOMÁS. o menino que sumiu na casa em 1951");
  toast("TAMPA + FILME!  [R] põe/tira o rolo — sem filme o flash só espanta", 5);
  prompt = { text: "COFRE — TENTAR O CÓDIGO", action: () => {} };
  mouse.x = 30; mouse.y = 300;
  const telas = [
    () => { state = "title"; },
    () => { state = "play"; },
    () => { state = "safe"; },
    () => { state = "darkroom"; darkUI.alvo = "cecilia"; darkUI.fase = -1; },
    () => { state = "win"; world.endType = "alvorada"; },
    () => { state = "dead"; },
  ];
  telas.forEach((f, i) => {
    f();
    const guarda = updatePrompt;
    if (state === "play") { render(); prompt = { text: "COFRE — TENTAR O CÓDIGO", action: () => {} }; drawHUD(); }
    else render();
    tira(i);
  });
  state = "lang";
  return id + " ok";
};
window.dbgTelasOff = () => { const el = document.getElementById("dbgT"); if (el) el.remove(); };
"dbg-idiomas ok";

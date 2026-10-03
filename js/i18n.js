"use strict";
// ==================================================================
// IDIOMAS — o texto em português É a chave de tradução.
// A tradução acontece no ponto de SAÍDA: tudo que vai para a tela passa
// por fillText (remendado aqui) e tudo que vai para o chat passa por
// livePush. Texto montado em pedaços usa tf("modelo {0}", valor).
// Traduções: js/lang/<idioma>.js, na ordem de js/lang/chaves.js
// (gerada por tools/i18n-extrai.py — rode-o ao criar texto novo).
// ==================================================================
const LANGS = [
  { id: "pt", nome: "PORTUGUÊS" }, { id: "en", nome: "ENGLISH" },
  { id: "es", nome: "ESPAÑOL" },   { id: "fr", nome: "FRANÇAIS" },
  { id: "de", nome: "DEUTSCH" },   { id: "zh", nome: "中文" },
  { id: "ja", nome: "日本語" },
];
let LANG = "pt";
const I18N_T = {};      // I18N_T.en = [traduções, na ordem de I18N_KEYS]
const I18N_MAP = {};    // idioma -> { "texto em português": "tradução" }

function i18nMapa(id) {
  if (I18N_MAP[id]) return I18N_MAP[id];
  const arr = I18N_T[id], m = Object.create(null);
  if (arr && typeof I18N_KEYS !== "undefined") {
    // as traduções valem pela POSIÇÃO: lista de outro tamanho é lista de outra
    // versão das chaves — melhor mostrar português do que a frase errada
    if (arr.length !== I18N_KEYS.length)
      console.warn("i18n: " + id + " tem " + arr.length + " textos, esperado " +
                   I18N_KEYS.length + " — rode tools/i18n-extrai.py migra");
    else
      for (let i = 0; i < I18N_KEYS.length; i++)
        if (typeof arr[i] === "string") m[I18N_KEYS[i]] = arr[i];
  }
  return (I18N_MAP[id] = m);
}
// texto fixo: devolve a tradução (ou o próprio texto, se não houver)
function tr(s) {
  if (LANG === "pt" || typeof s !== "string") return s;
  const v = i18nMapa(LANG)[s];
  return v === undefined ? s : v;
}
// texto com lacunas: tf("página {0} de {1}", 2, 5)
function tf(modelo) {
  const args = arguments;
  return tr(modelo).replace(/\{(\d)\}/g, (m, i) => {
    const v = args[+i + 1];
    return v === undefined ? m : v;
  });
}
function setLang(id) {
  LANG = LANGS.some(l => l.id === id) ? id : "pt";
  try { localStorage.setItem("hm_lang", LANG); } catch (e) {}
  document.documentElement.lang = LANG === "pt" ? "pt-BR" : LANG;
}

// todo texto desenhado no canvas passa pela tradução
(function () {
  const P = CanvasRenderingContext2D.prototype;
  const ft = P.fillText, st = P.strokeText, mt = P.measureText;
  P.fillText = function (s, x, y, w) {
    if (LANG !== "pt") s = tr(s);
    return w === undefined ? ft.call(this, s, x, y) : ft.call(this, s, x, y, w);
  };
  P.strokeText = function (s, x, y, w) {
    if (LANG !== "pt") s = tr(s);
    return w === undefined ? st.call(this, s, x, y) : st.call(this, s, x, y, w);
  };
  P.measureText = function (s) { return mt.call(this, LANG !== "pt" ? tr(s) : s); };
})();

// ------------------------------------------------------------------
// PRIMEIRA TELA: escolher o idioma (sempre que o jogo abre; o último
// escolhido já vem marcado — ENTER/toque confirma)
// ------------------------------------------------------------------
let langSel = 0, langMx = -1, langMy = -1;
function langBoot() {
  let id = null;
  try { id = localStorage.getItem("hm_lang"); } catch (e) {}
  if (!id || !LANGS.some(l => l.id === id)) {
    const nav = (navigator.language || "pt").slice(0, 2).toLowerCase();
    id = LANGS.some(l => l.id === nav) ? nav : "en";
  }
  LANG = id;
  langSel = Math.max(0, LANGS.findIndex(l => l.id === id));
}
function langBtns() {
  const w = 300, h = 62, gx = 44, gy = 18, out = [];
  const x0 = canvas.width / 2 - w - gx / 2, y0 = 236;
  LANGS.forEach((l, i) => {
    const col = i < 4 ? 0 : 1, row = i < 4 ? i : i - 4;
    out.push({ id: l.id, nome: l.nome, i, w, h, x: x0 + col * (w + gx),
               y: y0 + row * (h + gy) + (col ? (h + gy) / 2 : 0) });
  });
  return out;
}
function drawLang() {
  if (typeof UI_IMGS !== "undefined" && UI_IMGS.titulo)
    drawCover(ctx, UI_IMGS.titulo, 0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(0,0,0,0.80)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.font = "bold 62px 'Courier New', monospace";
  ctx.fillStyle = "rgba(0,0,0,0.75)";
  ctx.fillText("HUNTED MANSION", canvas.width / 2 + 3, 113);
  ctx.fillStyle = "rgb(222,222,222)";
  ctx.fillText("HUNTED MANSION", canvas.width / 2, 110);
  ctx.font = "bold 15px 'Courier New', monospace";
  ctx.fillStyle = "rgba(190,180,160,0.85)";
  ctx.fillText("IDIOMA · LANGUAGE · LANGUE · SPRACHE · 语言 · 言語", canvas.width / 2, 172);

  const moveu = mouse.x !== langMx || mouse.y !== langMy;   // só o mouse EM MOVIMENTO escolhe
  langMx = mouse.x; langMy = mouse.y;
  for (const b of langBtns()) {
    const hov = mouse.x >= b.x && mouse.x <= b.x + b.w &&
                mouse.y >= b.y && mouse.y <= b.y + b.h;
    if (hov && moveu && !IS_TOUCH) langSel = b.i;
    const sel = b.i === langSel;
    ctx.fillStyle = sel ? "rgba(255,255,255,0.13)" : "rgba(255,255,255,0.05)";
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.lineWidth = sel ? 3 : 2;
    ctx.strokeStyle = sel
      ? `rgba(255,236,190,${(0.75 + 0.2 * Math.sin(time * 4)).toFixed(2)})`
      : "rgba(255,255,255,0.35)";
    ctx.strokeRect(b.x, b.y, b.w, b.h);
    ctx.font = "bold 25px 'Courier New', 'Microsoft YaHei', 'Yu Gothic', monospace";
    ctx.fillStyle = sel ? "rgba(255,244,214,0.98)" : "rgba(225,225,225,0.85)";
    ctx.fillText(b.nome, b.x + b.w / 2, b.y + b.h / 2 + 1);
    if (sel) {
      ctx.fillStyle = "rgba(255,70,58,0.9)";
      ctx.beginPath(); ctx.arc(b.x + 22, b.y + b.h / 2, 5, 0, 7); ctx.fill();
    }
  }
  if (!IS_TOUCH) {
    ctx.font = "bold 13px 'Courier New', monospace";
    ctx.fillStyle = `rgba(170,170,170,${(0.45 + 0.25 * Math.sin(time * 3)).toFixed(2)})`;
    ctx.fillText("↑ ↓ ← →   ·   ENTER", canvas.width / 2, canvas.height - 30);
  }
}
function langEscolhe(i) {
  setLang(LANGS[i].id);
  langSel = i;
  if (typeof initAudio === "function") initAudio();
  state = "title";
}
function langHit(px2, py2) {
  for (const b of langBtns())
    if (px2 >= b.x && px2 <= b.x + b.w && py2 >= b.y && py2 <= b.y + b.h) {
      langEscolhe(b.i); return;
    }
}
function langKey(code) {
  const n = LANGS.length;
  if (code === "ArrowDown") langSel = (langSel + 1) % n;
  else if (code === "ArrowUp") langSel = (langSel + n - 1) % n;
  else if (code === "ArrowRight" || code === "ArrowLeft")
    langSel = langSel < 4 ? Math.min(n - 1, langSel + 4) : langSel - 4;
  else if (code === "Enter" || code === "Space") langEscolhe(langSel);
}

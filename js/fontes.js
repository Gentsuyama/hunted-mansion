"use strict";
// ==================================================================
// FONTES EMBUTIDAS — o jogo não depende mais das fontes do Windows.
//   'HM Mono'       = Courier Prime (texto do jogo; antes 'Courier New')
//   'HM Script'     = Caveat (letra à mão; antes 'Segoe Script')
//   'HM CJK'        = Noto Sans SC ou JP, conforme o idioma (ideogramas)
//   'HM Script CJK' = Long Cang (zh) ou Yomogi (ja): letra à mão nos
//                     ideogramas — o diário continua "escrito" em chinês
// As faces latinas vêm do @font-face do index.html; as CJK são trocadas
// aqui a cada setLang(), porque o mesmo ideograma tem traço diferente em
// chinês e em japonês e só uma das duas pode responder por 'HM CJK'.
// Arquivos gerados por tools/fontes-subset.py (Assets/Fontes/*.woff2).
// ==================================================================
const FONTES_CJK = {
  zh: [["HM CJK", "HM-CJK-zh"], ["HM Script CJK", "HM-Script-zh"]],
  ja: [["HM CJK", "HM-CJK-ja"], ["HM Script CJK", "HM-Script-ja"]],
};
let fontesCjkId = null;          // idioma cujas faces CJK estão registradas
let fontesCjkFaces = [];         // FontFace registradas (para tirar na troca)

// registra as faces CJK do idioma (ou as do chinês, que servem à tela de
// idioma: "中文" e "日本語" existem nas duas fontes)
function fontesIdioma(id) {
  if (typeof document === "undefined" || !document.fonts) return Promise.resolve();
  const alvo = FONTES_CJK[id] ? id : "zh";
  if (alvo === fontesCjkId) return Promise.resolve();
  for (const f of fontesCjkFaces) document.fonts.delete(f);
  fontesCjkFaces = [];
  fontesCjkId = alvo;
  const pend = [];
  for (const [familia, arq] of FONTES_CJK[alvo]) {
    const face = new FontFace(familia, "url(Assets/Fontes/" + arq + ".woff2) format('woff2')",
                              { weight: "100 900", display: "block" });
    document.fonts.add(face);
    fontesCjkFaces.push(face);
    pend.push(face.load().catch(() => null));
  }
  return Promise.all(pend);
}

// espera as fontes antes do primeiro quadro (com teto: sem fonte o jogo
// abre do mesmo jeito, com a de reserva)
function fontesProntas(ms) {
  if (typeof document === "undefined" || !document.fonts) return Promise.resolve();
  const pede = ["16px 'HM Mono'", "bold 16px 'HM Mono'", "italic 16px 'HM Mono'",
                "16px 'HM Script'", "italic 16px 'HM Script'"];
  const tudo = Promise.all(pede.map(f => document.fonts.load(f).catch(() => null))
                           .concat([fontesIdioma(typeof LANG === "string" ? LANG : "pt")]));
  return Promise.race([tudo, new Promise(r => setTimeout(r, ms || 2500))]);
}

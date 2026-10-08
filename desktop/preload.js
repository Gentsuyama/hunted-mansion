"use strict";
// ==================================================================
// Preload: roda ANTES dos scripts do jogo, no mesmo mundo (contextIsolation
// desligado de propósito), e faz duas coisas:
//   1. semeia o localStorage com os saves em arquivo (o que a Steam
//      sincronizou) e espelha cada gravação hm_* de volta para o arquivo;
//   2. expõe window.HM_DESKTOP para o que o jogo quiser pedir ao desktop
//      (conquista, tela cheia, sair, informações). No navegador esse
//      objeto não existe e o jogo segue igual.
// ==================================================================
const { ipcRenderer } = require("electron");

const info = ipcRenderer.sendSync("hm:info") || {};
const arquivos = ipcRenderer.sendSync("hm:carrega") || {};

try {
  // arquivo manda (é o que a nuvem trouxe); o que só existe no localStorage ganha arquivo
  for (const k in arquivos) localStorage.setItem(k, arquivos[k]);
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (/^hm_/.test(k) && !(k in arquivos)) ipcRenderer.send("hm:grava", k, localStorage.getItem(k));
  }
} catch (e) {}

// espelho: toda gravação hm_* vira arquivo
(function () {
  const P = Storage.prototype, set = P.setItem, rem = P.removeItem, clr = P.clear;
  P.setItem = function (k, v) {
    set.call(this, k, v);
    if (this === window.localStorage && /^hm_/.test(k)) ipcRenderer.send("hm:grava", k, String(v));
  };
  P.removeItem = function (k) {
    rem.call(this, k);
    if (this === window.localStorage && /^hm_/.test(k)) ipcRenderer.send("hm:apaga", k);
  };
  P.clear = function () {
    if (this === window.localStorage)
      for (let i = 0; i < this.length; i++) { const k = this.key(i); if (/^hm_/.test(k)) ipcRenderer.send("hm:apaga", k); }
    clr.call(this);
  };
})();

window.HM_DESKTOP = Object.freeze({
  versao: info.versao, dev: !!info.dev, steam: info.steam || { ok: false }, saves: info.saves,
  conquista(id) { ipcRenderer.send("hm:conquista", String(id)); },
  telaCheia(liga) { ipcRenderer.send("hm:telacheia", liga); },
  sair() { ipcRenderer.send("hm:sair"); },
});

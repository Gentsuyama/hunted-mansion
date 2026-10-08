"use strict";
// ==================================================================
// PLATAFORMA — a ponte fina com a edição desktop (desktop/preload.js
// expõe window.HM_DESKTOP). No navegador nada disto faz nada: o jogo
// é o mesmo nos dois lugares.
//   conquista(id)  — desbloqueia a conquista (desktop/conquistas.json
//                    traduz o id para o nome na Steam)
//   noDesktop()    — true dentro do executável (botão SAIR, tela cheia)
// Os ids das conquistas são chamados no próprio jogo: primeira_foto,
// alma_<id>, final_<tipo>, tomas_acudiu, loucura_sobreviveu, diario_assinatura.
// ==================================================================
function noDesktop() { return typeof window !== "undefined" && !!window.HM_DESKTOP; }
function conquista(id) {
  if (!noDesktop()) return;
  try { window.HM_DESKTOP.conquista(id); } catch (e) {}
}
function plataformaSair() { if (noDesktop()) window.HM_DESKTOP.sair(); }

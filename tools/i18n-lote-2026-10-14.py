# -*- coding: utf-8 -*-
# Lote 2026-10-14: "flash sem foto" no celular (Galaxy S20). A tampa já põe o rolo, mas o aviso
# mandava "tocar na câmera para pôr/tirar" — o toque TIRAVA. Agora: o aviso diz que o rolo está
# DENTRO, o cartão da câmera diz o que o toque faz (TIRAR/PÔR ROLO) e mostra ROLO FORA grande,
# e todo flash que não vira foto diz por quê (SÓ O FLASH — …).
# Gera tools/i18n-lote.json; aplicar com: python tools/i18n-extrai.py aplica tools/i18n-lote.json
import io, json, os

T = {
"TAMPA + FILME — o rolo já está DENTRO: agora a foto fica": [
    "COVER + FILM — the film is already IN: now the photo sticks",
    "TAPA + ROLLO — el rollo ya está DENTRO: ahora la foto queda",
    "CAPOT + FILM — le film est déjà DEDANS : maintenant la photo reste",
    "KLAPPE + FILM — der Film ist schon DRIN: jetzt bleibt das Foto",
    "后盖 + 胶卷 — 胶卷已经装好了：现在照片能留下了",
    "裏ぶた + フィルム — フィルムはもう入ってる：これで写真が残る"],
"[RB] tira o rolo: aí o flash só espanta, sem gastar filme": [
    "[RB] takes the film out: then the flash only repels, no film used",
    "[RB] saca el rollo: así el flash solo espanta, sin gastar rollo",
    "[RB] retire le film : le flash fait juste fuir, sans user de film",
    "[RB] nimmt den Film raus: dann scheucht der Blitz nur, ohne Film zu verbrauchen",
    "[RB] 取出胶卷：闪光只驱赶，不耗胶卷",
    "[RB]でフィルムを抜く：フラッシュは追い払うだけ、フィルムは減らない"],
"tocar na câmera do canto TIRA o rolo: aí o flash só espanta": [
    "tapping the corner camera TAKES the film OUT: then the flash only repels",
    "tocar la cámara de la esquina SACA el rollo: así el flash solo espanta",
    "toucher l'appareil dans le coin RETIRE le film : le flash fait juste fuir",
    "Tippen auf die Kamera in der Ecke NIMMT den Film RAUS: dann scheucht der Blitz nur",
    "点角落的相机会取出胶卷：之后闪光只驱赶",
    "隅のカメラをタップするとフィルムを抜く：フラッシュは追い払うだけになる"],
"[R] tira o rolo: aí o flash só espanta, sem gastar filme": [
    "[R] takes the film out: then the flash only repels, no film used",
    "[R] saca el rollo: así el flash solo espanta, sin gastar rollo",
    "[R] retire le film : le flash fait juste fuir, sans user de film",
    "[R] nimmt den Film raus: dann scheucht der Blitz nur, ohne Film zu verbrauchen",
    "[R] 取出胶卷：闪光只驱赶，不耗胶卷",
    "[R]でフィルムを抜く：フラッシュは追い払うだけ、フィルムは減らない"],
"ROLO DENTRO — agora a foto fica": [
    "FILM IN — now the photo sticks",
    "ROLLO DENTRO — ahora la foto queda",
    "FILM DEDANS — maintenant la photo reste",
    "FILM DRIN — jetzt bleibt das Foto",
    "胶卷已装 — 现在照片能留下",
    "フィルム装填 — これで写真が残る"],
"ROLO FORA — o flash só espanta, não sai foto": [
    "FILM OUT — the flash only repels, no photo comes out",
    "ROLLO FUERA — el flash solo espanta, no sale foto",
    "FILM DEHORS — le flash fait juste fuir, aucune photo ne sort",
    "FILM RAUS — der Blitz scheucht nur, es kommt kein Foto raus",
    "胶卷已取出 — 闪光只驱赶，不出照片",
    "フィルム未装填 — フラッシュは追い払うだけ、写真は出ない"],
# rótulo-botão do cartão da câmera no celular (cabe em ~11 letras)
"TIRAR ROLO": ["UNLOAD", "SACAR ROLLO", "RETIRER", "ENTNEHMEN", "取出胶卷", "フィルムを抜く"],
"PÔR ROLO": ["LOAD FILM", "PONER ROLLO", "CHARGER", "EINLEGEN", "装入胶卷", "フィルムを入れる"],
# faixa grande no cartão quando o rolo está fora
"ROLO FORA": ["FILM OUT", "ROLLO FUERA", "FILM DEHORS", "FILM RAUS", "未装胶卷", "フィルム未装填"],
"SÓ O FLASH — sem a TAMPA a câmera não guarda a foto": [
    "FLASH ONLY — without the BACK COVER the camera can't keep a photo",
    "SOLO EL FLASH — sin la TAPA la cámara no guarda la foto",
    "JUSTE LE FLASH — sans le CAPOT l'appareil ne garde pas la photo",
    "NUR DER BLITZ — ohne die KLAPPE behält die Kamera kein Foto",
    "只有闪光 — 没有后盖，相机留不住照片",
    "フラッシュだけ — 裏ぶたがないとカメラは写真を残せない"],
"SÓ O FLASH — acabaram os rolos: procure latinhas de filme": [
    "FLASH ONLY — out of film: look for film canisters",
    "SOLO EL FLASH — se acabaron los rollos: busca latitas de rollo",
    "JUSTE LE FLASH — plus de film : cherche des boîtes de film",
    "NUR DER BLITZ — kein Film mehr: such Filmdosen",
    "只有闪光 — 胶卷用完了：去找胶卷小罐",
    "フラッシュだけ — フィルム切れ：フィルム缶を探せ"],
"SÓ O FLASH — o rolo está FORA: [RB] põe o rolo": [
    "FLASH ONLY — the film is OUT: [RB] loads it",
    "SOLO EL FLASH — el rollo está FUERA: [RB] pone el rollo",
    "JUSTE LE FLASH — le film est DEHORS : [RB] le recharge",
    "NUR DER BLITZ — der Film ist RAUS: [RB] legt ihn ein",
    "只有闪光 — 胶卷没装：按 [RB] 装入",
    "フラッシュだけ — フィルムが入っていない：[RB]で入れる"],
"SÓ O FLASH — o rolo está FORA: toque na câmera do canto": [
    "FLASH ONLY — the film is OUT: tap the corner camera",
    "SOLO EL FLASH — el rollo está FUERA: toca la cámara de la esquina",
    "JUSTE LE FLASH — le film est DEHORS : touche l'appareil dans le coin",
    "NUR DER BLITZ — der Film ist RAUS: tipp auf die Kamera in der Ecke",
    "只有闪光 — 胶卷没装：点一下角落的相机",
    "フラッシュだけ — フィルムが入っていない：隅のカメラをタップ"],
"SÓ O FLASH — o rolo está FORA: [R] põe o rolo": [
    "FLASH ONLY — the film is OUT: [R] loads it",
    "SOLO EL FLASH — el rollo está FUERA: [R] pone el rollo",
    "JUSTE LE FLASH — le film est DEHORS : [R] le recharge",
    "NUR DER BLITZ — der Film ist RAUS: [R] legt ihn ein",
    "只有闪光 — 胶卷没装：按 [R] 装入",
    "フラッシュだけ — フィルムが入っていない：[R]で入れる"],
"agora a foto FICA, o rolo já tá dentro": [
    "now the photo STICKS, the film's already in",
    "ahora la foto QUEDA, el rollo ya está dentro",
    "maintenant la photo RESTE, le film est déjà dedans",
    "jetzt BLEIBT das Foto, der Film ist schon drin",
    "现在照片能留下了，胶卷已经装好了",
    "これで写真が「残る」、フィルムもう入ってるし"],
# faixa de baixo do cartão da câmera (depois da ampola): recarrega a bateria
"RECARREGAR": ["RECHARGE", "RECARGAR", "RECHARGER", "AUFLADEN", "充电", "チャージ"],
}

IDI = ["en", "es", "fr", "de", "zh", "ja"]
out = {i: {} for i in IDI}
for pt, lst in T.items():
    assert len(lst) == 6, pt
    for i, tx in zip(IDI, lst):
        out[i][pt] = tx
dst = os.path.join(os.path.dirname(os.path.abspath(__file__)), "i18n-lote.json")
io.open(dst, "w", encoding="utf-8", newline="\n").write(json.dumps(out, ensure_ascii=False, indent=1))
print("frases:", len(T), "->", dst)

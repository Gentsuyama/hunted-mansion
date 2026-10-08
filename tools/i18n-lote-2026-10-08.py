# -*- coding: utf-8 -*-
# Lote 2026-10-08: dicas do HUD e do diário para quem joga de CONTROLE (gamepad).
# Gera tools/i18n-lote.json; aplicar com: python tools/i18n-extrai.py aplica tools/i18n-lote.json
import io, json, os

T = {
"analógico esq. mover · LT = correr (faz barulho) · analógico dir. lanterna · X ou RT FOTO · RB filme · LB álbum · Y diário · A usar": [
 "left stick move · LT = run (it's loud) · right stick flashlight · X or RT PHOTO · RB film · LB album · Y diary · A use",
 "stick izq. mover · LT = correr (hace ruido) · stick der. linterna · X o RT FOTO · RB película · LB álbum · Y diario · A usar",
 "stick gauche déplacer · LT = courir (ça fait du bruit) · stick droit lampe · X ou RT PHOTO · RB pellicule · LB album · Y journal · A utiliser",
 "linker Stick gehen · LT = rennen (macht Lärm) · rechter Stick Taschenlampe · X oder RT FOTO · RB Film · LB Album · Y Tagebuch · A benutzen",
 "左摇杆 移动 · LT = 奔跑（有声响） · 右摇杆 手电 · X 或 RT 拍照 · RB 胶卷 · LB 相册 · Y 日记 · A 使用",
 "左スティック 移動 · LT = 走る（音が出る） · 右スティック ライト · X か RT 撮影 · RB フィルム · LB アルバム · Y 日記 · A 使う"],
"O DIÁRIO GANHOU UMA PÁGINA — [Y] para ler": [
 "THE DIARY GAINED A PAGE — [Y] to read",
 "EL DIARIO GANÓ UNA PÁGINA — [Y] para leer",
 "LE JOURNAL A GAGNÉ UNE PAGE — [Y] pour lire",
 "DAS TAGEBUCH HAT EINE SEITE DAZUBEKOMMEN — [Y] zum Lesen",
 "日记多了一页 — 按 [Y] 阅读",
 "日記にページが増えた — [Y] で読む"],
"UM DIÁRIO — [Y] para ler": [
 "A DIARY — [Y] to read",
 "UN DIARIO — [Y] para leer",
 "UN JOURNAL — [Y] pour lire",
 "EIN TAGEBUCH — [Y] zum Lesen",
 "一本日记 — 按 [Y] 阅读",
 "日記だ — [Y] で読む"],
"LB RB folhear · B fecha": [
 "LB RB turn pages · B closes",
 "LB RB pasar páginas · B cierra",
 "LB RB tourner les pages · B ferme",
 "LB RB blättern · B schließt",
 "LB RB 翻页 · B 关闭",
 "LB RB ページをめくる · B で閉じる"],
"CONTROLE CONECTADO": [
 "CONTROLLER CONNECTED",
 "MANDO CONECTADO",
 "MANETTE CONNECTÉE",
 "CONTROLLER VERBUNDEN",
 "手柄已连接",
 "コントローラー接続"],
"EFEITOS VISUAIS: LIGADOS": ["VISUAL EFFECTS: ON", "EFECTOS VISUALES: ACTIVADOS", "EFFETS VISUELS : ACTIVÉS", "VISUELLE EFFEKTE: AN", "视觉效果：开启", "映像効果：オン"],
"EFEITOS VISUAIS: LEVES": ["VISUAL EFFECTS: LIGHT", "EFECTOS VISUALES: LIGEROS", "EFFETS VISUELS : LÉGERS", "VISUELLE EFFEKTE: LEICHT", "视觉效果：轻度", "映像効果：軽め"],
"EFEITOS VISUAIS: DESLIGADOS": ["VISUAL EFFECTS: OFF", "EFECTOS VISUALES: DESACTIVADOS", "EFFETS VISUELS : DÉSACTIVÉS", "VISUELLE EFFEKTE: AUS", "视觉效果：关闭", "映像効果：オフ"],
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

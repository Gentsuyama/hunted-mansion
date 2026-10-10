# -*- coding: utf-8 -*-
# Lote 2026-10-10b: o aviso de quando a foto NÃO nasce (no celular ela falhava em silêncio:
# flash sem foto). O {0} é o motivo técnico (mensagem do navegador), fica sem tradução.
# Gera tools/i18n-lote.json; aplicar com: python tools/i18n-extrai.py aplica tools/i18n-lote.json
import io, json, os

T = {
"A FOTO NÃO SAIU — o rolo voltou ({0})": [
    "THE PHOTO DIDN'T COME OUT — film returned ({0})",
    "LA FOTO NO SALIÓ — el rollo volvió ({0})",
    "LA PHOTO N'EST PAS SORTIE — pellicule rendue ({0})",
    "DAS FOTO KAM NICHT RAUS — Film zurück ({0})",
    "照片没洗出来——胶卷退回了（{0}）",
    "写真が出なかった——フィルムは戻った（{0}）"],
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

# -*- coding: utf-8 -*-
"""
Gera as fontes embutidas do jogo (Assets/Fontes/*.woff2) a partir das fontes
OFL do Google Fonts, recortadas só aos caracteres que o jogo usa.

Por que: o jogo desenhava com 'Courier New' e 'Segoe Script', fontes do Windows.
Em Linux, Steam Deck ou macOS elas não existem (e os textos em chinês/japonês
viram caixinhas numa máquina sem fonte CJK). Com as fontes embutidas o jogo
fica igual em qualquer lugar.

Uso:  python tools/fontes-subset.py        (na pasta Hunted Mansion)
      RODAR DE NOVO sempre que js/lang/zh.js ou js/lang/ja.js mudarem — o
      recorte CJK só contém os ideogramas que aparecem nas traduções.

As fontes-fonte (TTF completos, ~36 MB) ficam FORA do repositório, em
../fontes-fonte/, e são baixadas daqui se faltarem.
"""
import io, os, re, sys, subprocess, urllib.request

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))   # Hunted Mansion/
FONTE = os.path.join(os.path.dirname(RAIZ), "fontes-fonte")          # fora do repo
SAIDA = os.path.join(RAIZ, "Assets", "Fontes")
GF = "https://raw.githubusercontent.com/google/fonts/main/ofl/"

# (pasta no Google Fonts, arquivo, nome de saída, quais textos definem o recorte)
FONTES = [
    ("courierprime", "CourierPrime-Regular.ttf",    "HM-Mono-Regular",     "latim"),
    ("courierprime", "CourierPrime-Bold.ttf",       "HM-Mono-Bold",        "latim"),
    ("courierprime", "CourierPrime-Italic.ttf",     "HM-Mono-Italic",      "latim"),
    ("courierprime", "CourierPrime-BoldItalic.ttf", "HM-Mono-BoldItalic",  "latim"),
    ("caveat",       "Caveat[wght].ttf",            "HM-Script",           "latim"),
    ("notosanssc",   "NotoSansSC[wght].ttf",        "HM-CJK-zh",           "zh"),
    ("notosansjp",   "NotoSansJP[wght].ttf",        "HM-CJK-ja",           "ja"),
    ("longcang",     "LongCang-Regular.ttf",        "HM-Script-zh",        "zh"),
    ("yomogi",       "Yomogi-Regular.ttf",          "HM-Script-ja",        "ja"),
]
LICENCAS = {"courierprime": "Courier Prime", "caveat": "Caveat", "notosanssc": "Noto Sans SC",
            "notosansjp": "Noto Sans JP", "longcang": "Long Cang", "yomogi": "Yomogi"}


def baixa(pasta, arq):
    dest = os.path.join(FONTE, pasta, arq)
    if not os.path.exists(dest):
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        url = GF + pasta + "/" + arq.replace("[", "%5B").replace("]", "%5D")
        print("baixando", url)
        urllib.request.urlretrieve(url, dest)
    lic = os.path.join(FONTE, pasta, "OFL.txt")
    if not os.path.exists(lic):
        urllib.request.urlretrieve(GF + pasta + "/OFL.txt", lic)
    return dest


def chars_de(*arquivos):
    s = set()
    for a in arquivos:
        p = os.path.join(RAIZ, "js", "lang", a)
        if os.path.exists(p):
            s |= set(io.open(p, encoding="utf-8").read())
    return s


def faixa(a, b):
    return set(chr(c) for c in range(a, b + 1))


def conjunto(tipo):
    ascii_ = faixa(0x20, 0x7E)
    if tipo == "latim":
        # tudo o que aparece nos seis idiomas de alfabeto latino + blocos inteiros
        # (acentos, aspas tipográficas, travessão, reticências, setas usadas no HUD)
        return (chars_de("chaves.js", "en.js", "es.js", "fr.js", "de.js") | ascii_
                | faixa(0xA0, 0x17F) | faixa(0x2010, 0x2027) | faixa(0x2030, 0x203A)
                | faixa(0x2190, 0x2199) | {"•", "…", "×", "★", "☆", "♥"})
    if tipo == "zh":
        return chars_de("zh.js") | ascii_ | faixa(0x3000, 0x303F) | faixa(0xFF01, 0xFF5E)
    if tipo == "ja":
        return (chars_de("ja.js") | ascii_ | faixa(0x3000, 0x303F) | faixa(0x3040, 0x30FF)
                | faixa(0xFF01, 0xFF5E))
    raise ValueError(tipo)


def main():
    os.makedirs(SAIDA, exist_ok=True)
    total = 0
    for pasta, arq, nome, tipo in FONTES:
        src = baixa(pasta, arq)
        dest = os.path.join(SAIDA, nome + ".woff2")
        chars = conjunto(tipo)
        txt = os.path.join(SAIDA, "_recorte.txt")
        io.open(txt, "w", encoding="utf-8").write("".join(sorted(chars)))
        cmd = [sys.executable, "-m", "fontTools.subset", src,
               "--text-file=" + txt, "--flavor=woff2", "--output-file=" + dest,
               "--layout-features=*", "--no-hinting", "--desubroutinize",
               "--name-IDs=*", "--notdef-outline"]
        subprocess.check_call(cmd)
        os.remove(txt)
        kb = os.path.getsize(dest) / 1024
        total += kb
        print("%-22s %6.0f KB  (%d caracteres)" % (nome + ".woff2", kb, len(chars)))
    # licenças junto das fontes (exigência da OFL ao redistribuir)
    for pasta, titulo in LICENCAS.items():
        lic = io.open(os.path.join(FONTE, pasta, "OFL.txt"), encoding="utf-8").read()
        io.open(os.path.join(SAIDA, "OFL-" + pasta + ".txt"), "w", encoding="utf-8").write(lic)
    io.open(os.path.join(SAIDA, "LEIAME.txt"), "w", encoding="utf-8").write(
        "Fontes embutidas do Hunted Mansion — todas sob SIL Open Font License 1.1 (OFL-*.txt).\n"
        "Fonte: Google Fonts (github.com/google/fonts/tree/main/ofl).\n"
        "  HM-Mono-*      = Courier Prime (Quote-Unquote Apps)   -> texto do jogo (no lugar de Courier New)\n"
        "  HM-Script      = Caveat (Impallari Type)              -> letra à mão: diário, legendas, polaroids\n"
        "  HM-CJK-zh/-ja  = Noto Sans SC / JP (Google)           -> ideogramas do chinês e do japonês\n"
        "  HM-Script-zh   = Long Cang (ZCOOL)                    -> letra à mão em chinês\n"
        "  HM-Script-ja   = Yomogi (Satsuyako)                   -> letra à mão em japonês\n"
        "Recortadas aos caracteres usados pelo jogo por tools/fontes-subset.py — rode-o de novo\n"
        "quando js/lang/zh.js ou js/lang/ja.js mudarem.\n")
    print("total %.0f KB" % total)


if __name__ == "__main__":
    main()

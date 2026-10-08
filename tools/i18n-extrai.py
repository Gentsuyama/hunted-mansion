# -*- coding: utf-8 -*-
"""Extrai os textos em português do jogo (as CHAVES de tradução).

O jogo traduz no ponto de saída (fillText / livePush), usando o próprio texto
em português como chave. Este script lista essas chaves em ordem estável e
grava js/lang/chaves.js. Os arquivos js/lang/<idioma>.js trazem as traduções
NA MESMA ORDEM (uma por linha, com o número da chave no comentário).

Uso:  python tools/i18n-extrai.py migra      -> USE ESTE ao criar/alterar texto: regrava
                                                chaves.js e REALINHA os seis arquivos de
                                                idioma pela frase (não pela posição). O que
                                                ficou sem tradução vira `null` (o jogo mostra
                                                português) e é listado em tools/i18n-faltam.json
      python tools/i18n-extrai.py aplica X.json -> grava traduções: {"en": {"frase pt": "..."}, ...}
      python tools/i18n-extrai.py confere    -> confere os arquivos de idioma
      python tools/i18n-extrai.py            -> só regrava chaves.js (NÃO usar com idiomas
                                                já traduzidos: desalinha tudo)
"""
import io, json, os, re, sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONTES = ["core.js", "intro.js", "game.js", "photo.js", "live.js", "souls.js",
          "puzzles.js", "mansion.js", "ritual.js", "energia.js", "album.js",
          "diario.js", "sanidade.js", "controle.js"]
IDIOMAS = ["en", "es", "fr", "de", "zh", "ja"]

NAO_TRADUZ = {
    "HUNTED MANSION", "use strict", "CanalDoPavor", "REC", "WASD",
}
# palavras soltas que SÃO texto de tela (nome de móvel dito pelo chat etc.)
FORCA = ["berço", "cama", "espelho", "piano", "relógio", "escrivaninha", "poltrona",
         "cadeira", "sofá", "mesa", "estante", "baú", "chão",
         "da DIREITA", "da ESQUERDA", "de BAIXO", "de CIMA", "CÂMERA", "ROLOS",
         "SEM", "TAMPA", "VAZIA", "S/ROLO", "DENTRO", "FORA", "S/ROLOS",
         "FOTO", "ÁLBUM", "USAR", "MENU", "SOBE", "DESCE", "GIRAR", "TENTAR",
         "LIGAR", "PARAR", "REVELAR", "QUEIMAR", "FECHAR", "ELEVADOR", "ENTRAR",
         "CONTINUAR", "SANIDADE", "REVELADOR", "INTERRUPTOR", "FIXADOR",
         "ALVORADA", "CINZAS", "IDIOMA", "kkkkkkk", "CORREEEE", "achooooou",
         "BLACKWOOD", "BATERIA", "alma", "almas", "pista:"]

TEC = re.compile(
    r"^(rgba?\(|#[0-9a-fA-F]{3,8}$|Assets/|hm_|Key[A-Z]$|Arrow|Shift|source-|"
    r"destination-|[a-z_]+$)")


def literais(src):
    src = re.sub(r"/\*.*?\*/", "", src, flags=re.S)
    out = []
    for linha in src.split("\n"):
        # tira comentário de linha (fora de string)
        limpa, em, i = "", None, 0
        while i < len(linha):
            ch = linha[i]
            if em:
                limpa += ch
                if ch == "\\" and i + 1 < len(linha):
                    limpa += linha[i + 1]; i += 1
                elif ch == em:
                    em = None
            else:
                if ch in "\"'`":
                    em = ch
                elif ch == "/" and linha[i + 1:i + 2] == "/":
                    break
                limpa += ch
            i += 1
        for m in re.finditer(r'"((?:[^"\\]|\\.)*)"', limpa):
            try:
                out.append(json.loads('"' + m.group(1) + '"'))
            except Exception:
                pass
        for m in re.finditer(r"`([^`$]*)`", limpa):
            out.append(m.group(1))
    return out


def ehTexto(s):
    if s in NAO_TRADUZ or len(s) < 2:
        return False
    if TEC.match(s):
        return False
    if "px " in s or "monospace" in s or "cursive" in s or ".jpg" in s or ".js" in s:
        return False
    if len(re.findall(r"[A-Za-zÀ-ÿ]", s)) < 2:
        return False
    if " " in s.strip():
        return True
    if re.search(r"[À-ÿ…]", s):
        return True
    return False


def chaves():
    vistos, lista = set(), []
    for nome in FONTES:
        src = io.open(os.path.join(RAIZ, "js", nome), encoding="utf-8").read()
        for s in literais(src):
            if ehTexto(s) and s not in vistos:
                vistos.add(s); lista.append(s)
    for s in FORCA:
        if s not in vistos:
            vistos.add(s); lista.append(s)
    return lista


def grava(lista):
    pasta = os.path.join(RAIZ, "js", "lang")
    os.makedirs(pasta, exist_ok=True)
    with io.open(os.path.join(pasta, "chaves.js"), "w", encoding="utf-8", newline="\n") as f:
        f.write('"use strict";\n// GERADO por tools/i18n-extrai.py — não editar à mão.\n')
        f.write("// Texto em português = chave. As traduções (js/lang/<idioma>.js) seguem\n")
        f.write("// EXATAMENTE esta ordem.\nconst I18N_KEYS = [\n")
        for i, s in enumerate(lista):
            f.write("/*%d*/ %s,\n" % (i, json.dumps(s, ensure_ascii=False)))
        f.write("];\n")


LINHA = re.compile(r'^/\*(\d+)\*/ ("(?:[^"\\]|\\.)*"|null),?.*$', re.M)


def le_idioma(lang):
    """devolve (cabecalho, [traducao ou None por indice])"""
    p = os.path.join(RAIZ, "js", "lang", lang + ".js")
    src = io.open(p, encoding="utf-8").read()
    cab = src[:src.index("I18N_T." + lang)]
    itens = LINHA.findall(src)
    return cab, [(int(n), None if t == "null" else json.loads(t)) for n, t in itens]


def grava_idioma(lang, cab, lista, mapa):
    p = os.path.join(RAIZ, "js", "lang", lang + ".js")
    with io.open(p, "w", encoding="utf-8", newline="\n") as f:
        f.write(cab)
        f.write("I18N_T.%s = [\n" % lang)
        for i, k in enumerate(lista):
            t = mapa.get(k)
            if t is None:
                f.write("/*%d*/ null,   // FALTA: %s\n" % (i, json.dumps(k, ensure_ascii=False)))
            else:
                f.write("/*%d*/ %s,\n" % (i, json.dumps(t, ensure_ascii=False)))
        f.write("];\n")


def chaves_gravadas():
    p = os.path.join(RAIZ, "js", "lang", "chaves.js")
    src = io.open(p, encoding="utf-8").read()
    return [json.loads(t) for _, t in re.findall(r'^/\*(\d+)\*/ ("(?:[^"\\]|\\.)*"),?\s*$', src, flags=re.M)]


def mapas_atuais():
    """traducoes atuais por FRASE (usa o chaves.js gravado, que casa com os idiomas)"""
    velhas = chaves_gravadas()
    out = {}
    for lang in IDIOMAS:
        cab, itens = le_idioma(lang)
        m = {}
        for n, t in itens:
            if t is not None and n < len(velhas):
                m[velhas[n]] = t
        out[lang] = (cab, m)
    return out


def migra(lista):
    atuais = mapas_atuais()
    grava(lista)
    faltam = {}
    for lang in IDIOMAS:
        cab, m = atuais[lang]
        grava_idioma(lang, cab, lista, m)
        falt = [k for k in lista if k not in m]
        sobra = [k for k in m if k not in set(lista)]
        faltam[lang] = falt
        print(lang, "realinhado:", len(lista) - len(falt), "traduzidos,", len(falt), "faltam,",
              len(sobra), "frases antigas descartadas")
    todas = []
    for lang in IDIOMAS:
        for k in faltam[lang]:
            if k not in todas:
                todas.append(k)
    with io.open(os.path.join(RAIZ, "tools", "i18n-faltam.json"), "w", encoding="utf-8",
                 newline="\n") as f:
        json.dump({"faltam": todas, "porIdioma": {l: len(faltam[l]) for l in IDIOMAS}}, f,
                  ensure_ascii=False, indent=1)
    print("faltam", len(todas), "frases -> tools/i18n-faltam.json")


def aplica(lista, arq):
    novo = json.load(io.open(arq, encoding="utf-8"))
    atuais = mapas_atuais()
    for lang in IDIOMAS:
        cab, m = atuais[lang]
        n = 0
        for k, t in (novo.get(lang) or {}).items():
            if k in lista and isinstance(t, str) and t:
                m[k] = t; n += 1
        grava_idioma(lang, cab, lista, m)
        print(lang, "aplicadas", n, "traduções; faltam", len([k for k in lista if k not in m]))


def confere(lista):
    ok = True
    if chaves_gravadas() != lista:
        print("chaves.js DESATUALIZADO em relação ao código: rode `python tools/i18n-extrai.py migra`")
        ok = False
    for lang in IDIOMAS:
        p = os.path.join(RAIZ, "js", "lang", lang + ".js")
        if not os.path.exists(p):
            print(lang, "FALTA o arquivo"); ok = False; continue
        _, itens = le_idioma(lang)
        nums = [n for n, _ in itens]
        if nums != list(range(len(lista))):
            falt = sorted(set(range(len(lista))) - set(nums))
            print(lang, "ORDEM/QUANTIDADE errada: tem", len(nums), "esperado", len(lista),
                  "faltam", falt[:12])
            ok = False
            continue
        ruins = 0
        vazias = [n for n, t in itens if t is None]
        for (n, tv), k in zip(itens, lista):
            if tv is None:
                continue
            if sorted(re.findall(r"\{\w\}", k)) != sorted(re.findall(r"\{\w\}", tv)) and \
               set(re.findall(r"\{\w\}", k)) != set(re.findall(r"\{\w\}", tv)):
                print(lang, "marcadores diferentes na", n, ":", k[:40], "=>", tv[:40])
                ruins += 1
        print(lang, "ok" if not vazias else "INCOMPLETO", len(nums), "textos" +
              (" · %d SEM tradução (ex.: %s)" % (len(vazias), vazias[:6]) if vazias else "") +
              (" · %d com marcador errado" % ruins if ruins else ""))
        ok = ok and not ruins and not vazias
    return ok


if __name__ == "__main__":
    L = chaves()
    sys.stdout.reconfigure(encoding="utf-8")
    if len(sys.argv) > 1 and sys.argv[1] == "confere":
        sys.exit(0 if confere(L) else 1)
    if len(sys.argv) > 1 and sys.argv[1] == "migra":
        migra(L); sys.exit(0)
    if len(sys.argv) > 2 and sys.argv[1] == "aplica":
        aplica(L, sys.argv[2]); sys.exit(0 if confere(L) else 1)
    grava(L)
    sys.stdout.reconfigure(encoding="utf-8")
    for i, s in enumerate(L):
        print("%d\t%s" % (i, s))
    print("TOTAL", len(L))

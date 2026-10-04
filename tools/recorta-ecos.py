# -*- coding: utf-8 -*-
"""
Recorte dos ECOS (guia, Etapa 8) fora do jogo.

    python tools/recorta-ecos.py              # todos de Originais/Ecos → Assets/Ecos/ecoNN.webp
    python tools/recorta-ecos.py eco03 eco14  # só esses
    python tools/recorta-ecos.py --folhas     # também grava folhas de contato em tools/recorte-ecos/

Por que fora do jogo: o recorte por "preto vira transparente" feito no navegador comia o que
é escuro de propósito (paletó, batina, cabelo, olhos fundos) e deixava o vulto vazado. Aqui o
recorte é analisado imagem a imagem (folhas de contato sobre verde e sobre madeira) e o jogo
recebe o WebP já com alfa — js/sprites.js só aplica o tom prata e dissolve os pés.

Regras do recorte:
 1. fundo = preto quase absoluto NO DESFOQUE (mata o ruído do JPEG), ligado à borda da imagem;
    o limiar é adaptativo: o que os cantos superiores mostram + 3 (teto 14)
 2. abertura morfológica do fundo tira os "dedos" que entram pela roupa escura
 3. dentro do vulto TUDO é opaco — nada de alfa por luminância no interior
 4. só uma faixa de BANDA px na borda tem alfa pela luminância (o esfumado de longa exposição),
    com a cor des-pré-multiplicada contra o preto (sem halo escuro)
 5. pedaços soltos menores que MIN_PECA px² são ruído e somem
Fonte: Originais/Ecos/ecoNN-<carimbo>.jpg (o que veio do Gemini, sem mexer).
"""
import os, sys, numpy as np, cv2
from PIL import Image, ImageDraw

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(RAIZ, "Originais", "Ecos")
DST = os.path.join(RAIZ, "Assets", "Ecos")
FOLHAS = os.path.join(RAIZ, "tools", "recorte-ecos")

ALTURA = 700    # px: o jogo não precisa de mais
T_BG = 14       # teto do limiar adaptativo (no desfoque)
BANDA = 7       # px da borda com alfa por luminância
LUM_HI = 96     # luminância que já é 100% opaca na banda
MIN_PECA = 160  # px²: pedaço solto menor que isso é ruído
WEBP_Q = 82


def recorta(rgb):
    h, w, _ = rgb.shape
    m = rgb.max(axis=2).astype(np.uint8)
    mb = cv2.GaussianBlur(m, (0, 0), 1.6)
    cantos = np.concatenate([mb[:60, :60].ravel(), mb[:60, -60:].ravel()])
    t_bg = int(min(T_BG, np.percentile(cantos, 99.9) + 3))
    escuro = (mb <= t_bg).astype(np.uint8)
    # componentes conexos do escuro; fundo = os que tocam a borda da imagem
    n, lab = cv2.connectedComponents(escuro, connectivity=4)
    toca = np.zeros(n, bool)
    for faixa in (lab[0, :], lab[-1, :], lab[:, 0], lab[:, -1]):
        toca[np.unique(faixa)] = True
    toca[0] = False
    fundo = toca[lab] & (escuro > 0)
    # abertura do fundo: tira dedos finos que entram na roupa escura
    r = 4
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1))
    fundo_ab = cv2.morphologyEx(fundo.astype(np.uint8), cv2.MORPH_OPEN, k)
    # perto da moldura da imagem continua fundo (não inventar vulto na borda)
    borda = np.zeros((h, w), np.uint8)
    borda[:6, :] = 1; borda[-6:, :] = 1; borda[:, :6] = 1; borda[:, -6:] = 1
    fundo_f = (fundo_ab > 0) | (fundo & (borda > 0))
    vulto = (~fundo_f).astype(np.uint8)
    n2, lab2, st, _ = cv2.connectedComponentsWithStats(vulto, connectivity=8)
    for i in range(1, n2):
        if st[i, cv2.CC_STAT_AREA] < MIN_PECA:
            vulto[lab2 == i] = 0
    dist = cv2.distanceTransform(vulto, cv2.DIST_L2, 3)
    lum = 0.3 * rgb[..., 0] + 0.59 * rgb[..., 1] + 0.11 * rgb[..., 2]
    lumb = cv2.GaussianBlur(lum.astype(np.float32), (0, 0), 1.0)
    a_lum = np.clip((lumb - 4) / (LUM_HI - 4), 0, 1)
    peso = np.clip(dist / BANDA, 0, 1)                 # 0 na borda, 1 no interior
    a = vulto * (peso + (1 - peso) * a_lum)
    a = np.minimum(a, np.clip(dist / 1.2, 0, 1))       # feather fino na borda geométrica
    div = np.where(peso < 1, np.maximum(a, 0.35), 1.0)  # des-pré-multiplica na banda
    rgbf = np.minimum(255, rgb.astype(np.float32) / div[..., None])
    out = np.dstack([rgbf, a * 255]).astype(np.uint8)
    return out, vulto, t_bg


def espectral(out):
    """o que js/sprites.js faz depois — só para a folha de contato parecer o jogo"""
    rgb = out[..., :3].astype(np.float32); a = out[..., 3].astype(np.float32)
    v = np.minimum(255, (0.3 * rgb[..., 0] + 0.59 * rgb[..., 1] + 0.11 * rgb[..., 2]) * 1.12)
    h = out.shape[0]
    ys = np.arange(h)[:, None].astype(np.float32)
    f = np.where(ys > h * 0.84, 1 - (ys - h * 0.84) / (h * 0.16), 1.0)
    return np.dstack([v, v, np.minimum(255, v * 1.04), a * f * f]).astype(np.uint8)


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    folhas = "--folhas" in sys.argv
    os.makedirs(DST, exist_ok=True)
    if folhas: os.makedirs(FOLHAS, exist_ok=True)
    files = sorted(f for f in os.listdir(SRC) if f.lower().endswith((".jpg", ".jpeg", ".png")))
    tiles = []
    for f in files:
        base = os.path.splitext(f)[0].split("-")[0]       # eco07-20261003214546.jpg → eco07
        if args and base not in args: continue
        im = Image.open(os.path.join(SRC, f)).convert("RGB")
        im = im.resize((round(im.width * ALTURA / im.height), ALTURA), Image.LANCZOS)
        out, vulto, t_bg = recorta(np.asarray(im))
        Image.fromarray(out, "RGBA").save(os.path.join(DST, base + ".webp"), "WEBP", quality=WEBP_Q, method=6)
        print("%s  limiar=%d  vulto=%.1f%%  opaco=%.1f%%" % (base, t_bg, vulto.mean() * 100, (out[..., 3] > 240).mean() * 100))
        if folhas:
            esp = Image.fromarray(espectral(out), "RGBA")
            for cor, tag in [((0, 200, 60, 255), "v"), ((78, 60, 44, 255), "m")]:
                bg = Image.new("RGBA", esp.size, cor); bg.alpha_composite(esp)
                tiles.append((base + tag, bg.convert("RGB")))
    if folhas and tiles:
        tw = 260; th = int(260 * tiles[0][1].height / tiles[0][1].width); per = 8
        for s in range(0, len(tiles), per):
            chunk = tiles[s:s + per]; cols = 4; rows = (len(chunk) + cols - 1) // cols
            sheet = Image.new("RGB", (cols * (tw + 6), rows * (th + 18)), (30, 30, 30))
            dr = ImageDraw.Draw(sheet)
            for i, (nome, t) in enumerate(chunk):
                x = (i % cols) * (tw + 6); y = (i // cols) * (th + 18)
                sheet.paste(t.resize((tw, th)), (x, y + 16)); dr.text((x + 4, y + 2), nome, fill=(255, 255, 255))
            sheet.save(os.path.join(FOLHAS, "folha%02d.png" % (s // per)))
        print("folhas em", FOLHAS)


if __name__ == "__main__":
    main()

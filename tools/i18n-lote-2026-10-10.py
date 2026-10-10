# -*- coding: utf-8 -*-
# Lote 2026-10-10: o TOQUE do eco (chat novo, página "vulto" reescrita) e a página da primeira
# SETA DE SANGUE no diário ("Corredor do térreo"). Saíram as falas do bote (inspirar/golpe/cortar).
# Gera tools/i18n-lote.json; aplicar com: python tools/i18n-extrai.py aplica tools/i18n-lote.json
import io, json, os

T = {
"ELE ENCOSTOU EM VOCÊ. olha a barra… olha a BARRA": [
    "IT TOUCHED YOU. look at the bar… look at the BAR",
    "TE TOCÓ. mira la barra… mira la BARRA",
    "IL T'A TOUCHÉ. regarde la barre… regarde la BARRE",
    "ES HAT DICH BERÜHRT. schau auf den balken… schau auf den BALKEN",
    "它碰到你了。看理智条……快看理智条",
    "あれに触られた。ゲージ見て…正気のゲージ見ろ"],
"ele tá vindo RETO em você. não deixa encostar": [
    "it's coming STRAIGHT at you. don't let it touch you",
    "viene DERECHO hacia ti. no dejes que te toque",
    "il vient DROIT sur toi. le laisse pas te toucher",
    "es kommt GERADEWEGS auf dich zu. lass es nicht an dich ran",
    "它正直直地朝你过来。别让它碰到你",
    "まっすぐこっちに来てる。触らせるな"],
"Corredor do térreo": ["Ground-floor corridor", "Pasillo de la planta baja", "Couloir du rez-de-chaussée",
                       "Flur im Erdgeschoss", "底层走廊", "一階の廊下"],
"A foto revelou o que o corredor escondia: uma seta na parede, de sangue, traçada com o dedo e ainda escorrendo. Eu tinha passado a mão ali um minuto antes, procurando onde me apoiar.": [
    "The photo revealed what the corridor was hiding: an arrow on the wall, in blood, traced with a finger and still running. I had run my hand over that spot a minute earlier, looking for something to lean on.",
    "La foto reveló lo que el pasillo escondía: una flecha en la pared, de sangre, trazada con el dedo y todavía chorreando. Yo había pasado la mano por ahí un minuto antes, buscando dónde apoyarme.",
    "La photo a révélé ce que le couloir cachait : une flèche sur le mur, en sang, tracée du doigt et qui coulait encore. J'y avais passé la main une minute plus tôt, en cherchant où m'appuyer.",
    "Das Foto zeigte, was der Flur verbarg: einen Pfeil an der Wand, aus Blut, mit dem Finger gezogen und noch rinnend. Eine Minute zuvor hatte ich genau dort mit der Hand nach Halt gesucht.",
    "照片显出了走廊藏着的东西：墙上有一个箭头，是血，用手指画的，还在往下淌。一分钟前，我才在那里摸索着找地方扶。",
    "写真は、廊下が隠していたものを暴いた。壁の矢印。血で、指でなぞられ、まだ垂れていた。その一分前、私はもたれる場所を探して、そこに手を這わせていたのに。"],
"Fotografei a parede seguinte, e a do canto. Cada uma tinha a sua, e todas apontavam para onde eu ainda não tinha ido. Segui, porque não havia mais nada a seguir.": [
    "I photographed the next wall, and the one at the corner. Each had its own, and they all pointed to where I had not yet been. I followed, because there was nothing else to follow.",
    "Fotografié la pared siguiente, y la de la esquina. Cada una tenía la suya, y todas apuntaban hacia donde yo aún no había ido. Las seguí, porque no había nada más que seguir.",
    "J'ai photographié le mur suivant, puis celui de l'angle. Chacun avait la sienne, et toutes pointaient vers là où je n'étais pas encore allé. J'ai suivi, parce qu'il n'y avait rien d'autre à suivre.",
    "Ich fotografierte die nächste Wand und die an der Ecke. Jede hatte ihren eigenen, und alle zeigten dorthin, wo ich noch nicht gewesen war. Ich folgte ihnen, weil es nichts anderes gab, dem ich folgen konnte.",
    "我拍了下一面墙，又拍了拐角那面。每面墙上都有一个，全都指向我还没去过的地方。我跟着走了，因为再没有别的可跟。",
    "次の壁を撮り、角の壁も撮った。どの壁にもひとつずつあって、どれも私がまだ行っていない方を指していた。私は従った。ほかに従うものなど、何もなかったから。"],
"Parecia que alguém queria me mostrar para onde eu deveria ir.": [
    "It was as if someone wanted to show me where I should go.",
    "Parecía que alguien quería mostrarme adónde debía ir.",
    "On aurait dit que quelqu'un voulait me montrer où je devais aller.",
    "Es war, als wollte mir jemand zeigen, wohin ich gehen sollte.",
    "好像有人想告诉我，我该往哪里走。",
    "まるで誰かが、私の行くべき場所を教えようとしているようだった。"],
"Fui eu quem desenhou.": ["I was the one who drew them.", "Fui yo quien las dibujó.", "C'est moi qui les ai dessinées.",
                          "Ich habe sie gezeichnet.", "是我画的。", "描いたのは私だ。"],
"Veio na minha direção sem pressa e sem desistir. Corri; quando parei, ele ainda vinha. Encostou em mim — frio, por dentro, como se levasse um pedaço. O clarão o tirou de cima de mim, e ele voltou assim que pôde.": [
    "It came toward me without hurry and without giving up. I ran; when I stopped, it was still coming. It touched me — cold, on the inside, as if it took a piece with it. The flash got it off me, and it came back as soon as it could.",
    "Vino hacia mí sin prisa y sin rendirse. Corrí; cuando me detuve, seguía viniendo. Me tocó — frío, por dentro, como si se llevara un pedazo. El destello me lo quitó de encima, y volvió en cuanto pudo.",
    "Il est venu vers moi sans hâte et sans renoncer. J'ai couru ; quand je me suis arrêté, il venait encore. Il m'a touché — froid, en dedans, comme s'il emportait un morceau. L'éclair me l'a ôté de dessus, et il est revenu dès qu'il a pu.",
    "Es kam ohne Eile und ohne aufzugeben auf mich zu. Ich rannte; als ich stehen blieb, kam es immer noch. Es berührte mich — kalt, von innen, als nähme es ein Stück mit. Der Blitz riss es von mir weg, und es kam zurück, sobald es konnte.",
    "它朝我走来，不急，也不放弃。我跑了；等我停下，它还在来。它碰到了我——冷，从里面冷，像是带走了我的一块。是闪光把它从我身上赶开的，而它一有机会就又回来了。",
    "それは急がず、諦めもせず、こちらへ来た。私は走った。止まると、まだ来ていた。それが私に触れた——冷たかった、内側から。何かをひとかけら持っていかれたように。閃光がそれを引き剥がしてくれたが、それはできるかぎりすぐに戻ってきた。"],
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

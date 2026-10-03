# -*- coding: utf-8 -*-
"""Lote de 2026-10-03 (tarde): chat sem instrução, pilhas, ampola por descoberta, dois ritmos.
Uso: python tools/i18n-lote-2026-10-03b.py && python tools/i18n-extrai.py aplica tools/i18n-lote.json"""
import io, json, os, sys
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
T = {
"cada golpe deixa MARCA… você não volta mais a ser o que era": {
  "en": "every hit leaves a MARK… you never go back to what you were", "es": "cada golpe deja MARCA… ya no vuelves a ser lo que eras",
  "fr": "chaque coup laisse une MARQUE… tu ne redeviens plus ce que tu étais", "de": "jeder Treffer hinterlässt eine SPUR… du wirst nie wieder, was du warst",
  "zh": "每一击都会留下印记……你再也回不到从前了", "ja": "一撃ごとに痕が残る…もう元には戻れない"},
"será que não dá pra acender aquele castiçal? tá muito escuro!": {
  "en": "can't you light that candelabrum? it's way too dark!", "es": "¿no se puede encender ese candelabro? ¡está muy oscuro!",
  "fr": "on peut pas allumer ce chandelier ? il fait trop noir !", "de": "kann man den Kandelaber nicht anzünden? es ist viel zu dunkel!",
  "zh": "那个烛台不能点亮吗？太黑了！", "ja": "あの燭台、灯せないの？暗すぎるよ！"},
"ELE TE PEGOU. os olhos dele acenderam antes… você viu?": {
  "en": "HE GOT YOU. his eyes lit up first… did you see?", "es": "TE AGARRÓ. sus ojos se encendieron antes… ¿lo viste?",
  "fr": "IL T'A EU. ses yeux se sont allumés avant… tu as vu ?", "de": "ER HAT DICH ERWISCHT. seine Augen haben vorher geleuchtet… hast du's gesehen?",
  "zh": "他抓到你了。他的眼睛之前亮了……你看见了吗？", "ja": "やられた。その前に目が光ってた…見えた？"},
"os olhos dele ACENDERAM. ele tá puxando o ar… SAI DAÍ": {
  "en": "his eyes LIT UP. he's drawing breath… GET AWAY", "es": "sus ojos se ENCENDIERON. está tomando aire… SAL DE AHÍ",
  "fr": "ses yeux se sont ALLUMÉS. il prend son souffle… DÉGAGE", "de": "seine Augen LEUCHTEN. er holt Luft… WEG DA",
  "zh": "他的眼睛亮了。他在吸气……快离开", "ja": "目が光った。息を吸ってる…そこから離れて"},
"PILHAS — o flash ganhou {0} cargas": {"en": "BATTERIES — the flash gained {0} charges", "es": "PILAS — el flash ganó {0} cargas", "fr": "PILES — le flash gagne {0} charges", "de": "BATTERIEN — der Blitz hat {0} Ladungen gewonnen", "zh": "电池 — 闪光灯获得 {0} 格电量", "ja": "乾電池 — フラッシュが{0}回分充電された"},
"pilha?? essa casa ainda tem coisa que funciona": {"en": "batteries?? this house still has stuff that works", "es": "¿¿pilas?? esta casa aún tiene cosas que funcionan", "fr": "des piles ?? y a encore des trucs qui marchent dans cette maison", "de": "Batterien?? in diesem Haus funktioniert noch was", "zh": "电池？？这房子里居然还有能用的东西", "ja": "電池？この家、まだ動くものがあるんだ"},
"que frasco é esse?? o vidro tá embaçado por dentro…": {"en": "what's that vial?? the glass is fogged from the inside…", "es": "¿¿qué frasco es ese?? el vidrio está empañado por dentro…", "fr": "c'est quoi cette fiole ?? le verre est embué de l'intérieur…", "de": "was ist das für eine Phiole?? das Glas ist von innen beschlagen…", "zh": "那是什么瓶子？？玻璃从里面雾了……", "ja": "その小瓶なに？？ガラスが内側から曇ってる…"},
"encaixou na câmera. ele guardava alguma coisa aí. alguma coisa que a câmera TIRAVA": {
  "en": "it fits the camera. he kept something in there. something the camera TOOK", "es": "encaja en la cámara. él guardaba algo ahí. algo que la cámara QUITABA",
  "fr": "ça s'emboîte sur l'appareil. il gardait quelque chose là-dedans. quelque chose que l'appareil PRENAIT", "de": "es passt an die Kamera. er hat da was aufbewahrt. etwas, das die Kamera NAHM",
  "zh": "它装到相机上了。他在里面存着什么。相机夺走的什么东西", "ja": "カメラにはまった。彼はそこに何かを溜めてた。カメラが奪ったものを"},
"AMPOLA DE PRATA — gelada, com um resíduo azul no fundo. Encaixa na câmera": {
  "en": "SILVER VIAL — ice cold, a blue residue at the bottom. It fits the camera", "es": "AMPOLLA DE PLATA — helada, con un residuo azul en el fondo. Encaja en la cámara",
  "fr": "FIOLE D'ARGENT — glacée, un résidu bleu au fond. Elle s'emboîte sur l'appareil", "de": "SILBERPHIOLE — eiskalt, ein blauer Rückstand am Boden. Passt an die Kamera",
  "zh": "银瓶 — 冰冷，瓶底有蓝色残留。能装到相机上", "ja": "銀のアンプル — 冷たく、底に青い残滓。カメラにはまる"},
"FILME NA CÂMERA": {"en": "FILM IN THE CAMERA", "es": "PELÍCULA EN LA CÁMARA", "fr": "PELLICULE DANS L'APPAREIL", "de": "FILM IN DER KAMERA", "zh": "胶卷已装入相机", "ja": "フィルム装填"},
"FILME FORA — só o flash": {"en": "FILM OUT — flash only", "es": "PELÍCULA FUERA — solo flash", "fr": "PELLICULE RETIRÉE — flash seul", "de": "FILM RAUS — nur Blitz", "zh": "胶卷已取出 — 只有闪光", "ja": "フィルム抜き — フラッシュのみ"},
"filme dentro. agora cada clique come um pedaço de rolo": {"en": "film's in. now every click eats a piece of the roll", "es": "película dentro. ahora cada clic se come un pedazo de rollo", "fr": "pellicule chargée. maintenant chaque clic mange un bout de rouleau", "de": "Film drin. jetzt frisst jeder Klick ein Stück Rolle", "zh": "胶卷装好了。现在每按一下都要吃掉一截胶卷", "ja": "フィルム入り。これで一枚撮るごとにロールが減る"},
"tirou o filme?? então é só o clarão. não vai sair foto nenhuma": {"en": "took the film out?? then it's just the flash. no photo's coming out", "es": "¿¿sacaste la película?? entonces es solo el destello. no va a salir ninguna foto", "fr": "t'as retiré la pellicule ?? alors c'est juste l'éclair. aucune photo ne sortira", "de": "Film rausgenommen?? dann ist es nur der Blitz. da kommt kein Foto raus", "zh": "把胶卷取出来了？？那就只有闪光了。不会有照片出来", "ja": "フィルム抜いた？？じゃあ光るだけ。写真は出ないよ"},
"WASD mover · toque duplo = correr (faz barulho) · mouse lanterna · botão direito FOTO · R filme · F álbum · E usar": {
  "en": "WASD move · double-tap = run (makes noise) · mouse flashlight · right click PHOTO · R film · F album · E use",
  "es": "WASD mover · doble toque = correr (hace ruido) · ratón linterna · clic derecho FOTO · R película · F álbum · E usar",
  "fr": "WASD bouger · double appui = courir (fait du bruit) · souris lampe · clic droit PHOTO · R pellicule · F album · E utiliser",
  "de": "WASD bewegen · Doppeltipp = rennen (macht Lärm) · Maus Taschenlampe · Rechtsklick FOTO · R Film · F Album · E benutzen",
  "zh": "WASD 移动 · 双击 = 奔跑（有声响） · 鼠标 手电 · 右键 拍照 · R 胶卷 · F 相簿 · E 使用",
  "ja": "WASD 移動 · 二度押し = 走る（音が出る） · マウス 懐中電灯 · 右クリック 撮影 · R フィルム · F アルバム · E 使う"},
"ele VOLTOU pra trás com o clarão!! mas não sumiu…": {"en": "the flash THREW him back!! but he didn't vanish…", "es": "¡¡el destello lo TIRÓ hacia atrás!! pero no desapareció…", "fr": "l'éclair l'a REPOUSSÉ !! mais il n'a pas disparu…", "de": "der Blitz hat ihn ZURÜCKGEWORFEN!! aber er ist nicht verschwunden…", "zh": "闪光把他推回去了！！但他没有消失……", "ja": "閃光で後ろに弾かれた!! でも消えてない…"},
"dá pra tirar o rolo da câmera, né? aí o flash não gasta nada": {"en": "you can take the roll out of the camera, right? then the flash costs nothing", "es": "se puede sacar el rollo de la cámara, ¿no? así el flash no gasta nada", "fr": "on peut retirer le rouleau de l'appareil, non ? comme ça le flash ne coûte rien", "de": "man kann die Rolle aus der Kamera nehmen, oder? dann kostet der Blitz nichts", "zh": "可以把胶卷从相机里取出来吧？那样闪光就不费胶卷了", "ja": "カメラからロール抜けるよね？そうすればフラッシュはタダ"},
"tinha umas PILHAS largadas no {0}, será que prestam?": {"en": "there were some BATTERIES lying around on the {0}, wonder if they still work?", "es": "había unas PILAS tiradas en el {0}, ¿servirán?", "fr": "il y avait des PILES qui traînaient au {0}, elles marchent encore ?", "de": "im {0} lagen BATTERIEN rum, ob die noch gehen?", "zh": "{0}那边扔着几节电池，不知道还能不能用？", "ja": "{0}に電池が転がってたけど、まだ使えるかな？"},
"tinha um frasco de prata numa sala do {0}… parecia peça da câmera": {"en": "there was a silver vial in a room on the {0}… looked like a camera part", "es": "había un frasco de plata en una sala del {0}… parecía pieza de la cámara", "fr": "il y avait une fiole d'argent dans une pièce du {0}… on aurait dit une pièce de l'appareil", "de": "in einem Raum im {0} lag eine silberne Phiole… sah aus wie ein Kamerateil", "zh": "{0}的某个房间里有个银瓶……看着像相机零件", "ja": "{0}の部屋に銀の小瓶があった…カメラの部品っぽかった"},
"BATERIA ACABOU — a ampola tem alma: [B] recarrega": {"en": "BATTERY DEAD — the vial holds a soul: [B] recharges", "es": "BATERÍA AGOTADA — la ampolla tiene alma: [B] recarga", "fr": "BATTERIE À PLAT — la fiole contient une âme : [B] recharge", "de": "BATTERIE LEER — die Phiole hält eine Seele: [B] lädt auf", "zh": "电池耗尽 — 银瓶里有灵魂：[B] 充电", "ja": "電池切れ — アンプルに魂がある：[B]で充電"},
"BATERIA ACABOU — a foto sai no escuro": {"en": "BATTERY DEAD — photos come out dark", "es": "BATERÍA AGOTADA — la foto sale a oscuras", "fr": "BATTERIE À PLAT — la photo sort dans le noir", "de": "BATTERIE LEER — das Foto wird dunkel", "zh": "电池耗尽 — 照片将在黑暗中拍出", "ja": "電池切れ — 写真は暗闇で写る"},
"o flash MORREU?? a última saiu preta": {"en": "the flash DIED?? the last one came out black", "es": "¿¿el flash MURIÓ?? la última salió negra", "fr": "le flash est MORT ?? la dernière est sortie toute noire", "de": "der Blitz ist TOT?? das letzte kam schwarz raus", "zh": "闪光灯死了？？最后一张全黑", "ja": "フラッシュ死んだ？？最後の一枚、真っ黒"},
"não tem pilha nessa casa? alguma coisa que guarde energia?": {"en": "no batteries in this house? anything that holds a charge?", "es": "¿no hay pilas en esta casa? ¿algo que guarde energía?", "fr": "pas de piles dans cette maison ? un truc qui garde de l'énergie ?", "de": "keine Batterien in diesem Haus? irgendwas, das Energie speichert?", "zh": "这房子里没有电池吗？有没有什么能储存能量的东西？", "ja": "この家に電池ないの？エネルギーを溜めるものとか"},
"A AMPOLA ESTÁ VAZIA": {"en": "THE VIAL IS EMPTY", "es": "LA AMPOLLA ESTÁ VACÍA", "fr": "LA FIOLE EST VIDE", "de": "DIE PHIOLE IST LEER", "zh": "银瓶是空的", "ja": "アンプルは空だ"},
"NADA PARA RECARREGAR": {"en": "NOTHING TO RECHARGE WITH", "es": "NADA PARA RECARGAR", "fr": "RIEN POUR RECHARGER", "de": "NICHTS ZUM AUFLADEN", "zh": "没有可用来充电的东西", "ja": "充電するものがない"},
"O VULTO SUMIU DA FOTO. pra onde ele foi??": {"en": "THE FIGURE VANISHED FROM THE PHOTO. where did it go??", "es": "LA FIGURA DESAPARECIÓ DE LA FOTO. ¿¿adónde fue??", "fr": "LA SILHOUETTE A DISPARU DE LA PHOTO. elle est passée où ??", "de": "DIE GESTALT IST AUS DEM FOTO VERSCHWUNDEN. wo ist sie hin??", "zh": "身影从照片里消失了。它去哪了？？", "ja": "影が写真から消えた。どこ行った？？"},
"o frasco da câmera acendeu azul. tem alguma coisa dentro dele agora": {"en": "the camera's vial lit up blue. there's something inside it now", "es": "el frasco de la cámara se encendió azul. ahora hay algo dentro", "fr": "la fiole de l'appareil s'est allumée en bleu. il y a quelque chose dedans maintenant", "de": "die Phiole an der Kamera leuchtet blau. jetzt ist etwas drin", "zh": "相机上的瓶子亮起了蓝光。现在里面有东西了", "ja": "カメラの小瓶が青く光った。今、中に何かいる"},
"FOGO AZUL?? isso não é fogo normal… e não apaga": {"en": "BLUE FIRE?? that's no normal fire… and it won't go out", "es": "¿¿FUEGO AZUL?? eso no es fuego normal… y no se apaga", "fr": "DU FEU BLEU ?? c'est pas du feu normal… et ça s'éteint pas", "de": "BLAUES FEUER?? das ist kein normales Feuer… und es geht nicht aus", "zh": "蓝色的火？？那不是普通的火……而且不会熄灭", "ja": "青い炎？？普通の火じゃない…しかも消えない"},
"a ampola vibra perto desta foto": {"en": "the vial trembles near this photo", "es": "la ampolla vibra cerca de esta foto", "fr": "la fiole vibre près de cette photo", "de": "die Phiole vibriert neben diesem Foto", "zh": "银瓶在这张照片旁边微微震动", "ja": "この写真のそばでアンプルが震える"},
"o frasco da câmera tá… tremendo?": {"en": "is the camera's vial… shaking?", "es": "¿el frasco de la cámara está… temblando?", "fr": "la fiole de l'appareil est en train de… trembler ?", "de": "zittert die Phiole an der Kamera… gerade?", "zh": "相机上的瓶子……在抖？", "ja": "カメラの小瓶…震えてない？"},
}
faltam = json.load(io.open(os.path.join(RAIZ, "tools", "i18n-faltam.json"), encoding="utf-8"))["faltam"]
sem = [k for k in faltam if k not in T]
if sem: print("SEM TRADUÇÃO:", sem); sys.exit(1)
lote = {l: {k: v[l] for k, v in T.items()} for l in ["en", "es", "fr", "de", "zh", "ja"]}
io.open(os.path.join(RAIZ, "tools", "i18n-lote.json"), "w", encoding="utf-8").write(json.dumps(lote, ensure_ascii=False, indent=1))
print("lote gerado:", len(T))

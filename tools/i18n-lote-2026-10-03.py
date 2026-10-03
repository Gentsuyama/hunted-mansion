# -*- coding: utf-8 -*-
"""Traduções do lote de 2026-10-03 (bateria, ampola, candelabros, álbum novo).
Gera tools/i18n-lote.json a partir de tools/i18n-faltam.json e confere que
nenhuma frase ficou de fora. Uso: python tools/i18n-lote-2026-10-03.py && python tools/i18n-extrai.py aplica tools/i18n-lote.json"""
import io, json, os, sys
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

T = {
"CANDELABRO ACESO — as cinco velas": {
    "en": "CANDELABRUM LIT — all five candles", "es": "CANDELABRO ENCENDIDO — las cinco velas",
    "fr": "CANDÉLABRE ALLUMÉ — les cinq bougies", "de": "KANDELABER BRENNT — alle fünf Kerzen",
    "zh": "烛台已点亮 — 五支蜡烛全亮", "ja": "燭台は満灯 — 五本すべて"},
"ACENDER UMA VELA COM UMA ALMA ({0}/{1})": {
    "en": "LIGHT A CANDLE WITH A SOUL ({0}/{1})", "es": "ENCENDER UNA VELA CON UN ALMA ({0}/{1})",
    "fr": "ALLUMER UNE BOUGIE AVEC UNE ÂME ({0}/{1})", "de": "EINE KERZE MIT EINER SEELE ANZÜNDEN ({0}/{1})",
    "zh": "用一个灵魂点燃一支蜡烛（{0}/{1}）", "ja": "魂でろうそくを灯す（{0}/{1}）"},
"CANDELABRO — {0}/{1} velas (precisa de alma guardada)": {
    "en": "CANDELABRUM — {0}/{1} candles (needs a stored soul)", "es": "CANDELABRO — {0}/{1} velas (necesita un alma guardada)",
    "fr": "CANDÉLABRE — {0}/{1} bougies (il faut une âme stockée)", "de": "KANDELABER — {0}/{1} Kerzen (braucht eine gespeicherte Seele)",
    "zh": "烛台 — {0}/{1} 支蜡烛（需要储存的灵魂）", "ja": "燭台 — {0}/{1} 本（保管した魂が必要）"},
"esse CASTIÇAL de cinco velas acende com alma guardada. quanto mais velas, mais longe ilumina": {
    "en": "that five-candle CANDELABRUM lights with a stored soul. more candles, farther it shines",
    "es": "ese CANDELABRO de cinco velas se enciende con alma guardada. cuantas más velas, más lejos ilumina",
    "fr": "ce CHANDELIER à cinq bougies s'allume avec une âme stockée. plus de bougies, plus loin ça éclaire",
    "de": "dieser fünfarmige KANDELABER brennt mit gespeicherten Seelen. mehr Kerzen, weiter leuchtet er",
    "zh": "那个五头烛台要用储存的灵魂点亮。蜡烛越多，照得越远",
    "ja": "あの五本立ての燭台は保管した魂で灯る。本数が多いほど遠くまで照らす"},
"a AMPOLA!! é nela que ele guardava o que a câmera tirava das pessoas": {
    "en": "the VIAL!! that's where he kept what the camera took from people",
    "es": "¡¡la AMPOLLA!! ahí guardaba lo que la cámara les quitaba a las personas",
    "fr": "la FIOLE !! c'est là qu'il gardait ce que l'appareil prenait aux gens",
    "de": "die PHIOLE!! darin bewahrte er auf, was die Kamera den Menschen nahm",
    "zh": "那个银瓶！！他就是用它装相机从人身上夺走的东西",
    "ja": "アンプルだ!! カメラが人から奪ったものを、彼はこれに溜めていた"},
"agora dá pra CONVERTER a alma de uma foto (clica no vulto, no álbum) e virar bateria": {
    "en": "now you can CONVERT a soul from a photo (click the figure, in the album) into battery",
    "es": "ahora puedes CONVERTIR el alma de una foto (clic en la figura, en el álbum) en batería",
    "fr": "maintenant tu peux CONVERTIR l'âme d'une photo (clique la silhouette, dans l'album) en batterie",
    "de": "jetzt kannst du die Seele eines Fotos UMWANDELN (die Gestalt im Album anklicken) — in Batterie",
    "zh": "现在可以把照片里的灵魂转化成电池了（在相簿里点那个身影）",
    "ja": "これで写真の魂を変換できる（アルバムで影をクリック）。電池になるぞ"},
"AMPOLA DE PRATA — no álbum, clique no vulto de uma foto para guardar a alma": {
    "en": "SILVER VIAL — in the album, click a photo's figure to store its soul",
    "es": "AMPOLLA DE PLATA — en el álbum, haz clic en la figura de una foto para guardar el alma",
    "fr": "FIOLE D'ARGENT — dans l'album, cliquez la silhouette d'une photo pour stocker l'âme",
    "de": "SILBERPHIOLE — im Album die Gestalt auf einem Foto anklicken, um die Seele zu speichern",
    "zh": "银瓶 — 在相簿中点击照片里的身影即可储存灵魂",
    "ja": "銀のアンプル — アルバムで写真の影をクリックすると魂を保管できる"},
"SEM BATERIA": {"en": "NO BATTERY", "es": "SIN BATERÍA", "fr": "PLUS DE BATTERIE", "de": "KEINE BATTERIE", "zh": "没电了", "ja": "電池切れ"},
"CÂMERA [ SEM BATERIA — FOTO NO ESCURO ]": {
    "en": "CAMERA [ NO BATTERY — PHOTO IN THE DARK ]", "es": "CÁMARA [ SIN BATERÍA — FOTO A OSCURAS ]",
    "fr": "APPAREIL [ PLUS DE BATTERIE — PHOTO DANS LE NOIR ]", "de": "KAMERA [ KEINE BATTERIE — FOTO IM DUNKELN ]",
    "zh": "相机 [ 没电 — 黑暗中拍照 ]", "ja": "カメラ［電池切れ — 暗闇で撮影］"},
"SEM BATERIA — e sem filme pra fotografar no escuro": {
    "en": "NO BATTERY — and no film to shoot in the dark", "es": "SIN BATERÍA — y sin película para fotografiar a oscuras",
    "fr": "PLUS DE BATTERIE — et pas de pellicule pour photographier dans le noir", "de": "KEINE BATTERIE — und kein Film, um im Dunkeln zu fotografieren",
    "zh": "没电了 — 也没有胶卷在黑暗中拍照", "ja": "電池切れ — 暗闇で撮るフィルムもない"},
"foto no ESCURO… saiu, mas só o que a lanterna pegou. e nada se assustou": {
    "en": "photo in the DARK… it came out, but only what the flashlight caught. and nothing got scared",
    "es": "foto a OSCURAS… salió, pero solo lo que la linterna alcanzó. y nada se asustó",
    "fr": "photo dans le NOIR… elle est sortie, mais juste ce que la lampe a attrapé. et rien n'a eu peur",
    "de": "Foto im DUNKELN… es kam raus, aber nur was die Taschenlampe traf. und nichts ist erschrocken",
    "zh": "黑暗中拍的照片……拍出来了，但只有手电照到的部分。而且什么都没被吓到",
    "ja": "暗闇の写真…写ったけど、懐中電灯が届いた所だけ。何も怯えなかった"},
"o reflexo no espelho": {"en": "the reflection in the mirror", "es": "el reflejo en el espejo", "fr": "le reflet dans le miroir", "de": "das Spiegelbild", "zh": "镜中的倒影", "ja": "鏡の中の影"},
"dígito nº {0} do cofre": {"en": "safe digit no. {0}", "es": "dígito n.º {0} de la caja fuerte", "fr": "chiffre nº {0} du coffre", "de": "Tresorziffer Nr. {0}", "zh": "保险箱第 {0} 位数字", "ja": "金庫の数字 {0} 番目"},
"retrato de {0}": {"en": "portrait of {0}", "es": "retrato de {0}", "fr": "portrait de {0}", "de": "Porträt von {0}", "zh": "{0}的肖像", "ja": "{0}の肖像"},
"as molduras do ateliê": {"en": "the frames in the studio", "es": "los marcos del taller", "fr": "les cadres de l'atelier", "de": "die Rahmen im Atelier", "zh": "画室里的相框", "ja": "アトリエの額縁"},
"quem veio antes": {"en": "who came before", "es": "quien vino antes", "fr": "ceux d'avant", "de": "wer vorher kam", "zh": "先来的人", "ja": "先に来た者"},
"as correntes da porta": {"en": "the chains on the door", "es": "las cadenas de la puerta", "fr": "les chaînes de la porte", "de": "die Ketten an der Tür", "zh": "门上的锁链", "ja": "扉の鎖"},
"a escada escondida": {"en": "the hidden staircase", "es": "la escalera oculta", "fr": "l'escalier caché", "de": "die versteckte Treppe", "zh": "隐藏的楼梯", "ja": "隠された階段"},
"o sinal do Hóspede": {"en": "the Guest's sign", "es": "la señal del Huésped", "fr": "le signe de l'Hôte", "de": "das Zeichen des Gastes", "zh": "房客的记号", "ja": "客人の印"},
"legenda do passado: {0}": {"en": "caption from the past: {0}", "es": "leyenda del pasado: {0}", "fr": "légende du passé : {0}", "de": "Beschriftung aus der Vergangenheit: {0}", "zh": "过去的题字：{0}", "ja": "過去の書き込み：{0}"},
"foto {0} — {1} · sem flash": {"en": "photo {0} — {1} · no flash", "es": "foto {0} — {1} · sin flash", "fr": "photo {0} — {1} · sans flash", "de": "Foto {0} — {1} · ohne Blitz", "zh": "照片 {0} — {1} · 无闪光", "ja": "写真 {0} — {1} · フラッシュなし"},
"a AMPOLA de prata (a que guarda almas) ficou numa sala do {0}": {
    "en": "the silver VIAL (the one that stores souls) is in a room on the {0}",
    "es": "la AMPOLLA de plata (la que guarda almas) quedó en una sala del {0}",
    "fr": "la FIOLE d'argent (celle qui stocke les âmes) est dans une pièce du {0}",
    "de": "die silberne PHIOLE (die Seelen speichert) liegt in einem Raum im {0}",
    "zh": "那个银瓶（储存灵魂用的）在{0}的某个房间里",
    "ja": "銀のアンプル（魂を保管するやつ）は{0}のどこかの部屋にある"},
"BATERIA ACABOU — a foto sai no escuro; alma guardada recarrega [B]": {
    "en": "BATTERY DEAD — photos come out dark; a stored soul recharges it [B]",
    "es": "BATERÍA AGOTADA — la foto sale a oscuras; un alma guardada la recarga [B]",
    "fr": "BATTERIE À PLAT — la photo sort dans le noir ; une âme stockée la recharge [B]",
    "de": "BATTERIE LEER — das Foto wird dunkel; eine gespeicherte Seele lädt sie auf [B]",
    "zh": "电池耗尽 — 照片会在黑暗中拍出；储存的灵魂可充电 [B]",
    "ja": "電池切れ — 写真は暗闇で写る。保管した魂で充電 [B]"},
"a bateria do flash ACABOU. sem flash a foto sai escura e não espanta nada": {
    "en": "the flash battery is DEAD. without flash the photo comes out dark and scares nothing",
    "es": "la batería del flash se ACABÓ. sin flash la foto sale oscura y no espanta nada",
    "fr": "la batterie du flash est À PLAT. sans flash la photo sort sombre et n'effraie rien",
    "de": "die Blitzbatterie ist LEER. ohne Blitz wird das Foto dunkel und verscheucht nichts",
    "zh": "闪光灯电池耗尽了。没有闪光，照片会很暗，也吓不走任何东西",
    "ja": "フラッシュの電池が切れた。フラッシュなしだと写真は暗いし、何も追い払えない"},
"você tem alma guardada na câmera: aperta B que ela vira bateria": {
    "en": "you have a soul stored in the camera: press B and it turns into battery",
    "es": "tienes un alma guardada en la cámara: pulsa B y se convierte en batería",
    "fr": "tu as une âme stockée dans l'appareil : appuie sur B et elle devient batterie",
    "de": "du hast eine Seele in der Kamera gespeichert: drück B, dann wird sie zur Batterie",
    "zh": "相机里有储存的灵魂：按 B 就能变成电池",
    "ja": "カメラに魂が保管されてる。Bを押せば電池になる"},
"SEM ALMAS GUARDADAS — fotografe vultos e ARMAZENE no álbum": {
    "en": "NO STORED SOULS — photograph figures and STORE them in the album",
    "es": "SIN ALMAS GUARDADAS — fotografía figuras y ALMACÉNALAS en el álbum",
    "fr": "AUCUNE ÂME STOCKÉE — photographiez des silhouettes et STOCKEZ-les dans l'album",
    "de": "KEINE SEELEN GESPEICHERT — fotografiere Gestalten und SPEICHERE sie im Album",
    "zh": "没有储存的灵魂 — 拍下身影并在相簿中储存",
    "ja": "保管した魂がない — 影を撮ってアルバムで保管しよう"},
"BATERIA CHEIA": {"en": "BATTERY FULL", "es": "BATERÍA LLENA", "fr": "BATTERIE PLEINE", "de": "BATTERIE VOLL", "zh": "电池已满", "ja": "電池は満タン"},
"BATERIA {0}/{1} — uma alma a menos": {"en": "BATTERY {0}/{1} — one soul less", "es": "BATERÍA {0}/{1} — un alma menos", "fr": "BATTERIE {0}/{1} — une âme de moins", "de": "BATTERIE {0}/{1} — eine Seele weniger", "zh": "电池 {0}/{1} — 少了一个灵魂", "ja": "電池 {0}/{1} — 魂がひとつ減った"},
"elas servem para alguma coisa, afinal.": {"en": "they're good for something, after all.", "es": "sirven para algo, después de todo.", "fr": "elles servent à quelque chose, finalement.", "de": "sie sind also doch zu etwas gut.", "zh": "它们总算有点用处。", "ja": "やはり、何かの役には立つ。"},
"SEM A AMPOLA a câmera não guarda alma nenhuma — procure a peça": {
    "en": "WITHOUT THE VIAL the camera stores no soul — find the part",
    "es": "SIN LA AMPOLLA la cámara no guarda ningún alma — busca la pieza",
    "fr": "SANS LA FIOLE l'appareil ne stocke aucune âme — trouvez la pièce",
    "de": "OHNE DIE PHIOLE speichert die Kamera keine Seele — such das Teil",
    "zh": "没有银瓶，相机无法储存灵魂 — 去找这个零件",
    "ja": "アンプルがないとカメラは魂を保管できない — 部品を探せ"},
"A AMPOLA ESTÁ CHEIA — gaste almas antes": {"en": "THE VIAL IS FULL — spend souls first", "es": "LA AMPOLLA ESTÁ LLENA — gasta almas antes", "fr": "LA FIOLE EST PLEINE — dépensez des âmes d'abord", "de": "DIE PHIOLE IST VOLL — erst Seelen ausgeben", "zh": "银瓶已满 — 先消耗一些灵魂", "ja": "アンプルは満杯 — 先に魂を使え"},
"GUARDOU a alma na câmera?? isso vira BATERIA. aperta B pra recarregar": {
    "en": "you STORED the soul in the camera?? that becomes BATTERY. press B to recharge",
    "es": "¿¿GUARDASTE el alma en la cámara?? eso se vuelve BATERÍA. pulsa B para recargar",
    "fr": "tu as STOCKÉ l'âme dans l'appareil ?? ça devient de la BATTERIE. appuie sur B pour recharger",
    "de": "du hast die Seele in der Kamera GESPEICHERT?? das wird zu BATTERIE. drück B zum Aufladen",
    "zh": "你把灵魂存进相机了？？那会变成电池。按 B 充电",
    "ja": "魂をカメラに保管した?? それ電池になるぞ。Bで充電"},
"e os CASTIÇAIS de cinco velas pela casa acendem com elas": {
    "en": "and the five-candle CANDELABRA around the house light up with them",
    "es": "y los CANDELABROS de cinco velas de la casa se encienden con ellas",
    "fr": "et les CHANDELIERS à cinq bougies de la maison s'allument avec",
    "de": "und die fünfarmigen KANDELABER im Haus brennen damit",
    "zh": "屋子里那些五头烛台也能用它们点亮",
    "ja": "それに屋敷の五本立て燭台も、それで灯せる"},
"FOGO AZUL. a alma virou luz… e essa luz não apaga": {
    "en": "BLUE FIRE. the soul became light… and that light never goes out",
    "es": "FUEGO AZUL. el alma se volvió luz… y esa luz no se apaga",
    "fr": "FEU BLEU. l'âme est devenue lumière… et cette lumière ne s'éteint pas",
    "de": "BLAUES FEUER. die Seele wurde Licht… und dieses Licht geht nicht aus",
    "zh": "蓝色的火。灵魂化作了光……而这光不会熄灭",
    "ja": "青い炎。魂が光になった…その光は消えない"},
"luz bonita. desperdício.": {"en": "pretty light. a waste.", "es": "luz bonita. un desperdicio.", "fr": "jolie lumière. du gâchis.", "de": "schönes Licht. Verschwendung.", "zh": "很美的光。浪费。", "ja": "きれいな光だ。無駄だが。"},
"PISTAS DA RUN": {"en": "RUN CLUES", "es": "PISTAS DE LA PARTIDA", "fr": "INDICES DE LA PARTIE", "de": "HINWEISE DES DURCHGANGS", "zh": "本局线索", "ja": "今回の手がかり"},
"CONVERTER ALMA": {"en": "CONVERT SOUL", "es": "CONVERTIR ALMA", "fr": "CONVERTIR L'ÂME", "de": "SEELE UMWANDELN", "zh": "转化灵魂", "ja": "魂を変換"},
"PRECISA DA AMPOLA": {"en": "NEEDS THE VIAL", "es": "NECESITA LA AMPOLLA", "fr": "IL FAUT LA FIOLE", "de": "BRAUCHT DIE PHIOLE", "zh": "需要银瓶", "ja": "アンプルが必要"},
"ARMAZENAR 1 ALMA": {"en": "STORE 1 SOUL", "es": "ALMACENAR 1 ALMA", "fr": "STOCKER 1 ÂME", "de": "1 SEELE SPEICHERN", "zh": "储存 1 个灵魂", "ja": "魂を1つ保管"},
"ARMAZENAR {0} ALMAS": {"en": "STORE {0} SOULS", "es": "ALMACENAR {0} ALMAS", "fr": "STOCKER {0} ÂMES", "de": "{0} SEELEN SPEICHERN", "zh": "储存 {0} 个灵魂", "ja": "魂を{0}つ保管"},
"alma guardada na câmera": {"en": "soul stored in the camera", "es": "alma guardada en la cámara", "fr": "âme stockée dans l'appareil", "de": "Seele in der Kamera gespeichert", "zh": "灵魂已存入相机", "ja": "魂はカメラに保管済み"},
"sem alma nesta foto": {"en": "no soul in this photo", "es": "sin alma en esta foto", "fr": "pas d'âme sur cette photo", "de": "keine Seele auf diesem Foto", "zh": "这张照片里没有灵魂", "ja": "この写真に魂はない"},
"SOLTAR DAS PISTAS": {"en": "UNPIN FROM CLUES", "es": "QUITAR DE LAS PISTAS", "fr": "RETIRER DES INDICES", "de": "AUS HINWEISEN LÖSEN", "zh": "移出线索", "ja": "手がかりから外す"},
"FIXAR NAS PISTAS": {"en": "PIN TO CLUES", "es": "FIJAR EN LAS PISTAS", "fr": "ÉPINGLER AUX INDICES", "de": "ZU HINWEISEN HEFTEN", "zh": "钉到线索页", "ja": "手がかりに留める"},
"TEM ALMA NA FOTO! JOGAR FORA MESMO?": {"en": "THERE'S A SOUL IN IT! REALLY THROW AWAY?", "es": "¡HAY UN ALMA EN LA FOTO! ¿TIRARLA DE VERDAD?", "fr": "IL Y A UNE ÂME DESSUS ! VRAIMENT JETER ?", "de": "DA IST EINE SEELE DRAUF! WIRKLICH WEGWERFEN?", "zh": "照片里有灵魂！真的要扔掉？", "ja": "魂が写ってる！本当に捨てる？"},
"JOGAR FORA MESMO?": {"en": "REALLY THROW AWAY?", "es": "¿TIRARLA DE VERDAD?", "fr": "VRAIMENT JETER ?", "de": "WIRKLICH WEGWERFEN?", "zh": "真的要扔掉？", "ja": "本当に捨てる？"},
"JOGAR FORA": {"en": "THROW AWAY", "es": "TIRAR", "fr": "JETER", "de": "WEGWERFEN", "zh": "扔掉", "ja": "捨てる"},
"BATERIA": {"en": "BATTERY", "es": "BATERÍA", "fr": "BATTERIE", "de": "BATTERIE", "zh": "电池", "ja": "電池"},
"alma": {"en": "soul", "es": "alma", "fr": "âme", "de": "Seele", "zh": "灵魂", "ja": "魂"},
"almas": {"en": "souls", "es": "almas", "fr": "âmes", "de": "Seelen", "zh": "灵魂", "ja": "魂"},
"pista:": {"en": "clue:", "es": "pista:", "fr": "indice :", "de": "Hinweis:", "zh": "线索：", "ja": "手がかり："},
}

faltam = json.load(io.open(os.path.join(RAIZ, "tools", "i18n-faltam.json"), encoding="utf-8"))["faltam"]
sem = [k for k in faltam if k not in T]
extra = [k for k in T if k not in faltam]
if sem:
    print("SEM TRADUÇÃO:", sem); sys.exit(1)
if extra:
    print("aviso — não estão na lista de faltantes:", extra)
lote = {lang: {k: v[lang] for k, v in T.items()} for lang in ["en", "es", "fr", "de", "zh", "ja"]}
io.open(os.path.join(RAIZ, "tools", "i18n-lote.json"), "w", encoding="utf-8").write(
    json.dumps(lote, ensure_ascii=False, indent=1))
print("lote gerado:", len(T), "frases × 6 idiomas")

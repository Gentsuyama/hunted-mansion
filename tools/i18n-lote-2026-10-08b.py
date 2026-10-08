# -*- coding: utf-8 -*-
# Lote 2026-10-08b: setas de sangue, saídas da loucura (olhos, espelho, vela sem alma) e as vozes.
# Gera tools/i18n-lote.json; aplicar com: python tools/i18n-extrai.py aplica tools/i18n-lote.json
import io, json, os

T = {
"O ESPELHO NÃO QUEBRA — tem alguém dentro": ["THE MIRROR WON'T BREAK — someone is inside", "EL ESPEJO NO SE ROMPE — hay alguien dentro", "LE MIROIR NE SE BRISE PAS — il y a quelqu'un dedans", "DER SPIEGEL BRICHT NICHT — da ist jemand drin", "镜子打不碎 — 里面有人", "鏡は割れない — 中に誰かいる"],
"QUEBRAR O ESPELHO": ["BREAK THE MIRROR", "ROMPER EL ESPEJO", "BRISER LE MIROIR", "DEN SPIEGEL ZERBRECHEN", "打碎镜子", "鏡を割る"],
"ACENDER COM O QUE RESTA DE VOCÊ": ["LIGHT IT WITH WHAT IS LEFT OF YOU", "ENCENDER CON LO QUE QUEDA DE TI", "ALLUMER AVEC CE QU'IL RESTE DE TOI", "MIT DEM ANZÜNDEN, WAS VON DIR ÜBRIG IST", "用你仅剩的部分点燃", "残ったあなたで灯す"],
"seta de sangue": ["blood arrow", "flecha de sangre", "flèche de sang", "Blutpfeil", "血箭头", "血の矢印"],
"isso é SANGUE?? tem uma SETA na parede… alguém desenhou isso": ["is that BLOOD?? there's an ARROW on the wall… someone drew that", "¿¿eso es SANGRE?? hay una FLECHA en la pared… alguien dibujó eso", "c'est du SANG ?? il y a une FLÈCHE sur le mur… quelqu'un a dessiné ça", "ist das BLUT?? da ist ein PFEIL an der Wand… jemand hat das gemalt", "那是血吗？？墙上有个箭头……有人画的", "それ血？？ 壁に矢印がある…誰かが描いた"],
"a casa escreve. já disse.": ["the house writes. I told you.", "la casa escribe. ya lo dije.", "la maison écrit. je l'ai dit.", "das Haus schreibt. sagte ich doch.", "房子会写字。我说过。", "家は書く。言ったはずだ。"],
"quando eu me escondia, fechava os olhos até passar": ["when I hid, I closed my eyes until it passed", "cuando me escondía, cerraba los ojos hasta que pasara", "quand je me cachais, je fermais les yeux jusqu'à ce que ça passe", "wenn ich mich versteckte, schloss ich die Augen, bis es vorbei war", "我躲起来的时候，会闭上眼睛直到它过去", "かくれんぼのとき、ぼくは通り過ぎるまで目をつぶってた"],
"não olha o espelho. ou quebra antes que ele te olhe": ["don't look at the mirror. or break it before it looks at you", "no mires el espejo. o rómpelo antes de que te mire", "ne regarde pas le miroir. ou brise-le avant qu'il te regarde", "schau nicht in den Spiegel. oder zerbrich ihn, bevor er dich ansieht", "别看镜子。要么在它看你之前打碎它", "鏡を見ないで。見られる前に割ってしまいなさい"],
"o sangue na parede. agora você vê.": ["the blood on the wall. now you see it.", "la sangre en la pared. ahora la ves.", "le sang sur le mur. maintenant tu le vois.", "das Blut an der Wand. jetzt siehst du es.", "墙上的血。现在你看见了。", "壁の血。いまなら見える。"],
"VOCÊ FECHOU OS OLHOS ATÉ PASSAR — mas ficou menos de você": ["YOU CLOSED YOUR EYES UNTIL IT PASSED — but there is less of you now", "CERRASTE LOS OJOS HASTA QUE PASÓ — pero quedó menos de ti", "TU AS FERMÉ LES YEUX JUSQU'À CE QUE ÇA PASSE — mais il reste moins de toi", "DU HAST DIE AUGEN GESCHLOSSEN, BIS ES VORBEI WAR — aber von dir ist weniger geblieben", "你闭上眼睛直到它过去 — 但你少了一些", "目を閉じてやり過ごした — でも、あなたは少し減った"],
"ficou PARADO no escuro de olho fechado?? e… funcionou??": ["you just STOOD there in the dark with your eyes shut?? and… it worked??", "¿¿te quedaste QUIETO a oscuras con los ojos cerrados?? ¿¿y… funcionó??", "tu es resté IMMOBILE dans le noir les yeux fermés ?? et… ça a marché ??", "du bist einfach im Dunkeln mit geschlossenen Augen STEHEN geblieben?? und… es hat funktioniert??", "你就那样闭着眼站在黑暗里？？而且……居然有用？？", "暗闇で目を閉じてじっとしてた？？ それで…効いたの？？"],
"O ESPELHO QUEBROU — e levou um pedaço de você": ["THE MIRROR BROKE — and took a piece of you", "EL ESPEJO SE ROMPIÓ — y se llevó un pedazo de ti", "LE MIROIR S'EST BRISÉ — et a emporté un morceau de toi", "DER SPIEGEL ZERBRACH — und nahm ein Stück von dir mit", "镜子碎了 — 带走了你的一部分", "鏡が割れた — あなたの一部を持っていった"],
"QUEBROU O ESPELHO. sete anos de azar numa casa dessas, boa sorte": ["BROKE THE MIRROR. seven years of bad luck in a house like this, good luck", "ROMPIÓ EL ESPEJO. siete años de mala suerte en una casa así, buena suerte", "IL A BRISÉ LE MIROIR. sept ans de malheur dans une maison pareille, bonne chance", "SPIEGEL ZERBROCHEN. sieben Jahre Pech in so einem Haus, viel Glück", "把镜子打碎了。在这种房子里要倒霉七年，祝好运", "鏡を割った。この家で七年の不運、がんばれ"],
"A VELA ACENDEU COM O QUE RESTA DE VOCÊ": ["THE CANDLE LIT WITH WHAT IS LEFT OF YOU", "LA VELA SE ENCENDIÓ CON LO QUE QUEDA DE TI", "LA BOUGIE S'EST ALLUMÉE AVEC CE QU'IL RESTE DE TOI", "DIE KERZE BRANNTE MIT DEM AN, WAS VON DIR ÜBRIG IST", "蜡烛用你仅剩的部分点燃了", "ろうそくは、残ったあなたで灯った"],
"acendeu com O QUÊ?? não tinha alma nenhuma na ampola": ["lit it with WHAT?? there was no soul in the vial", "¿¿lo encendió con QUÉ?? no había ninguna alma en la ampolla", "allumé avec QUOI ?? il n'y avait aucune âme dans la fiole", "womit hat er das ANGEZÜNDET?? in der Ampulle war keine Seele", "用什么点的？？安瓿里一个灵魂都没有", "何で灯したの？？ アンプルに魂なんてなかった"],
"cada atalho encurta o corredor.": ["every shortcut shortens the corridor.", "cada atajo acorta el pasillo.", "chaque raccourci raccourcit le couloir.", "jede Abkürzung verkürzt den Flur.", "每条捷径都会让走廊更短。", "近道をするたび、廊下は短くなる。"],
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

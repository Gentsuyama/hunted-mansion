# -*- coding: utf-8 -*-
# Lote 2026-10-09: a página da LOUCURA no diário ("Escrito no escuro"), que aparece na primeira loucura.
# A escalada vale em todos os idiomas: o 3º parágrafo sem pontuação e repetido, o 4º cortado no meio
# da última palavra (como "no c"), e o parágrafo calmo começa com "…".
# Gera tools/i18n-lote.json; aplicar com: python tools/i18n-extrai.py aplica tools/i18n-lote.json
import io, json, os

T = {
"Escrito no escuro": ["Written in the dark", "Escrito a oscuras", "Écrit dans le noir", "Im Dunkeln geschrieben", "写于黑暗中", "暗闇の中で書いた"],
"A casa entrou na minha cabeça. Escrevo para não ouvir: a imagem dobra nos cantos e as paredes respiram quando não olho.": [
    "The house got into my head. I write so I won't hear it: the image doubles at the edges, and the walls breathe when I'm not looking.",
    "La casa se me metió en la cabeza. Escribo para no oír: la imagen se dobla en los bordes y las paredes respiran cuando no miro.",
    "La maison est entrée dans ma tête. J'écris pour ne pas entendre : l'image se dédouble sur les bords et les murs respirent quand je ne regarde pas.",
    "Das Haus ist in meinen Kopf eingedrungen. Ich schreibe, um nicht zu hören: Das Bild verdoppelt sich an den Rändern, und die Wände atmen, wenn ich nicht hinsehe.",
    "房子钻进了我的脑子。我写字，是为了不去听：画面在角落里重影，我不看的时候，墙在呼吸。",
    "家が頭の中に入ってきた。聞かないために書いている。像は隅で二重になり、目を離すと壁が息をする。"],
"Há alguém atrás de mim desde o corredor. Não há ninguém. Há alguém atrás de mim.": [
    "Someone has been behind me since the corridor. There is no one. Someone is behind me.",
    "Hay alguien detrás de mí desde el pasillo. No hay nadie. Hay alguien detrás de mí.",
    "Il y a quelqu'un derrière moi depuis le couloir. Il n'y a personne. Il y a quelqu'un derrière moi.",
    "Seit dem Flur ist jemand hinter mir. Da ist niemand. Da ist jemand hinter mir.",
    "从走廊开始，就有人在我身后。没有人。有人在我身后。",
    "廊下からずっと、誰かが後ろにいる。誰もいない。誰かが後ろにいる。"],
"ela fala com a minha voz ela fala com a minha voz sai da minha cabeça sai sai": [
    "it speaks in my voice it speaks in my voice get out of my head get out get out",
    "habla con mi voz habla con mi voz sal de mi cabeza sal sal",
    "elle parle avec ma voix elle parle avec ma voix sors de ma tête sors sors",
    "es spricht mit meiner stimme es spricht mit meiner stimme raus aus meinem kopf raus raus",
    "它用我的声音说话它用我的声音说话滚出我的脑子滚出去滚出去",
    "私の声で話す私の声で話す頭から出ていけ出ていけ出ていけ"],
"noventa e oito noventa e nove ele me acha no cem no cem no cem no c": [
    "ninety-eight ninety-nine he finds me at a hundred at a hundred at a hundred at a hu",
    "noventa y ocho noventa y nueve me encuentra en el cien en el cien en el cien en el c",
    "quatre-vingt-dix-huit quatre-vingt-dix-neuf il me trouve à cent à cent à cent à c",
    "achtundneunzig neunundneunzig er findet mich bei hundert bei hundert bei hundert bei hu",
    "九十八九十九数到一百他就找到我一百一百一百一",
    "きゅうじゅうはちきゅうじゅうきゅうひゃくで見つかるひゃくでひゃくでひゃくでひゃ"],
"… finalmente encontrei a luz. Ela me salvou dessa loucura que eu estava sentindo. Fiquei junto dela até a imagem parar de dobrar.": [
    "… at last I found the light. It saved me from this madness I was feeling. I stayed beside it until the image stopped doubling.",
    "… por fin encontré la luz. Me salvó de esta locura que estaba sintiendo. Me quedé junto a ella hasta que la imagen dejó de doblarse.",
    "… enfin, j'ai trouvé la lumière. Elle m'a sauvé de cette folie que je ressentais. Je suis resté près d'elle jusqu'à ce que l'image cesse de se dédoubler.",
    "… endlich fand ich das Licht. Es hat mich vor diesem Wahnsinn gerettet, den ich spürte. Ich blieb bei ihm, bis das Bild aufhörte, sich zu verdoppeln.",
    "……终于，我找到了光。它把我从那种疯狂里救了出来。我一直守在它旁边，直到画面不再重影。",
    "……ようやく光を見つけた。光が、感じていたこの狂気から私を救ってくれた。像が二重に見えなくなるまで、そのそばを離れなかった。"],
"A voz era a minha.": ["The voice was mine.", "La voz era la mía.", "La voix était la mienne.", "Die Stimme war meine.", "那声音是我的。", "あの声は私のものだった。"],
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

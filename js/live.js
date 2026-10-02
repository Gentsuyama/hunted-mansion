"use strict";
// ==================================================================
// A LIVE — viewers, chat falso (dicas + lore), overlay pausado
// ==================================================================
const LIVE_PANEL = { x: 600, y: 8, w: 440, h: 84 };

const live = {
  viewers: 37, msgs: [], msgT: 4, loreIdx: 0, loreT: 40,
  hinted: new Set(), nag: new Map(), scroll: 0,
};

// cada run nova recomeça a live (dicas, lore e viewers zerados)
function liveReset() {
  live.viewers = 30 + (Math.random() * 20 | 0);
  live.msgs = []; live.msgT = 4; live.loreIdx = 0; live.loreT = 40;
  live.hinted = new Set(); live.nag = new Map(); live.scroll = 0;
}

// ------------------------------------------------------------------
// INSISTÊNCIA: se o jogador passa de novo por um segredo ignorado, o
// chat sobe o tom — 1ª vez dica, 2ª ênfase, 3ª+ vários GRITANDO
// ------------------------------------------------------------------
const NAGS = {
  wall: [
    ["essa parede aí perto tá ESTRANHA. tira uma foto dela"],
    ["ALI! ALI!! aquela parede de novo!! FOTOGRAFA ela",
     "cê passou DE NOVO reto na parede esquisita, foto nela!!"],
    ["VOCÊ TÁ CEGO?? A PAREDE!!!", "F O T O  N A  P A R E D E",
     "A PAREDEEEEE", "juro que saio da live se não fotografar essa parede",
     "TODO MUNDO VIU MENOS VOCÊ, A PAREDE!!"],
  ],
  mark: [
    ["fotografa essa parede!! juro que vi algo escrito"],
    ["tem ALGO ESCRITO aí nessa parede!! tira foto AGORA",
     "de novo essa sala… FOTOGRAFA a parede escrita!!"],
    ["A PAREDE COM O NÚMERO!!!", "FOTO!!! NA!!! PAREDE!!!",
     "eu NÃO acredito que passou reto DE NOVO", "O NÚMERO, PELO AMOR"],
  ],
  safe: [
    ["UM COFRE! os números com pontinhos das fotos, tenta aí"],
    ["o COFRE!! volta lá, os dígitos que saíram nas FOTOS!!",
     "passou direto pelo COFRE de novo???"],
    ["O COFREEEEE", "3 dígitos!! pontinhos = ordem!! VAI!!",
     "ABRE LOGO ESSE COFRE pelo amor de tudo"],
  ],
  fbox: [
    ["quadro de força! acho que precisa de 3 fusíveis"],
    ["o QUADRO DE FUSÍVEIS, de novo ele!! cadê os 3 fusíveis?",
     "sem luz no elevador até encaixar os fusíveis aí!!"],
    ["O QUADROOOO", "FUSÍVEL! QUADRO! ELEVADOR! nessa ordem!!",
     "ele passou reto DE NOVO eu desisto kkkkk (não desisto, VOLTA LÁ)"],
  ],
  ret: [
    ["o RETRATO!! tava escondido aí perto, pega ele"],
    ["VOLTA! o retrato escondido tá AÍ nessa sala!!",
     "cê vai deixar o retrato pra trás DE NOVO??"],
    ["O RETRATOOOO", "PEGA O RETRATO!!!", "A ALMA TÁ PRESA AÍ DO SEU LADO!!"],
  ],
  tampa: [
    ["tem algo brilhando ✦ aí perto, vai ver"],
    ["a PEÇA da câmera!! tá brilhando do seu lado!!",
     "sem essa peça a câmera não salva NADA, pega!!"],
    ["A PEÇA!!! ✦✦✦", "ELA TÁ BRILHANDO NA SUA CARA", "P E G A  A  P E Ç A"],
  ],
  mirror: [
    ["esse espelho… fotografa ele. minha avó dizia que espelho GUARDA gente"],
    ["o ESPELHO!! tira uma foto do espelho, confia em mim",
     "de novo esse espelho e NADA de foto??"],
    ["FOTOGRAFA O ESPELHO", "O ESPELHO!!! A FOTO!!!",
     "tem algo DENTRO desse espelho eu sinto daqui"],
  ],
  sinal: [
    ["tem um rabisco nessa parede que seu olho não pega. a CÂMERA pega"],
    ["essa parede tem um SÍMBOLO, fotografa com a lente nova!!",
     "passou de novo pelo símbolo sem fotografar…"],
    ["O SÍMBOLO NA PAREDE!!!", "FOTO! AQUI! AGORA!",
     "isso é um AVISO de alguém, fotografa!!"],
  ],
};

function liveNag(id, cat, dist, radius) {
  let n = live.nag.get(id);
  if (!n) { n = { lvl: 0, armed: true }; live.nag.set(id, n); }
  if (dist > radius + 5) { n.armed = true; return; }
  if (dist >= radius || !n.armed) return;
  n.armed = false;
  const lvl = Math.min(n.lvl, 2);
  const pool = NAGS[cat][lvl];
  if (lvl < 2) {
    livePush(liveRandUser(), pool[Math.random() * pool.length | 0]);
  } else {
    // GRITARIA: 2-3 viewers diferentes em rajada
    const burst = 2 + (Math.random() * 2 | 0);
    let d = 0;
    const usados = new Set();
    for (let i = 0; i < burst; i++) {
      let m = pool[Math.random() * pool.length | 0];
      while (usados.has(m) && usados.size < pool.length)
        m = pool[Math.random() * pool.length | 0];
      usados.add(m);
      setTimeout(((msg) => () => { if (world) livePush(liveRandUser(), msg); })(m),
                 d += 650);
    }
    live.viewers += 8;
  }
  n.lvl++;
}

const CHAT_USERS = ["ana_clips", "Dudu77", "spooky_fan", "Lari_br", "CanalDoPavor",
  "mateus.zzz", "vicky13", "olho_vivo", "GhostHunterBR", "janela13", "pipoca_doce",
  "renan_afk", "tia_do_zap", "xX_Dark_Xx", "medrosa_oficial"];

const CHAT_GENERIC = [
  "kkkkkkk", "isso é roteiro né", "aumenta o brilho pfv", "NÃO vai no porão",
  "primeira vez na live o", "que casa é essa mano", "like deixado",
  "to assistindo do banheiro com medo", "alguém mais ouviu isso??",
  "sdds luz do sol", "faz o L de lanterna", "esse jogo de câmera tá insano",
  "min viewers caindo não desiste", "corajoso demais pra quem tremeu no portão",
];

const CHAT_REACT = {
  photo:    ["QUE FOTO FOI ESSA", "zoom nisso DEPOIS", "revela essa no álbum",
             "a câmera viu algo que a gente não viu..."],
  dissolve: ["MANO ELE SUMIU", "O FLASH PEGOU ELE", "dissolveu na hora kkkk NERVOSO"],
  damage:   ["CORREEEE", "SAI DAÍ AGORA", "ele te TOCOU, eu vi"],
  ghost:    ["TEM ALGO AÍ DO SEU LADO", "atrás de você...", "aquilo é uma PESSOA?"],
  floor:    ["mudou de andar! marca aí: {f}", "cuidado nesse andar, ouvi falar dele"],
  secret:   ["PAREDE FALSA?? EU VI VOCÊ ATRAVESSAR", "como assim tinha uma sala aí???",
             "clipem isso AGORA"],
  doorlock: ["tenta a janela kkkk", "precisa de chave isso aí, procura na casa",
             "era ÓBVIO que ia trancar"],
  key:      ["A CHAVE!!!! CORRE PRA PORTA", "achooooou"],
  fuse:     ["fusível! o quadro de força deve ser no porão", "guarda isso"],
  elevator: ["ELEVADOR LIGADO, chique", "agora ficou fácil andar na casa"],
  safe:     ["ABRIU O COFRE!!", "o que tinha dentro?? mostra"],
  tampa:    ["ACHOU A TAMPA DA CÂMERA!!", "agora dá pra pôr FILME e salvar foto",
             "aperta R pra pôr/tirar o rolo (no celular toca na câmera)"],
  obturador:["o OBTURADOR DE PRATA…", "é com ISSO que a câmera prende espírito forte",
             "igual ao do Blackwood. arrepiei"],
  lente:    ["uma LENTE NOVA!! troca AGORA", "adeus lente rachada!!",
             "agora dá pra LER o que o borrão escondia — volta nas paredes escritas"],
  freed:    ["salvou uma ALMA ao vivo, esse canal é HISTÓRICO",
             "o chat inteiro chorando junto", "FAZ O L DE LIBERTADO"],
};

const CHAT_LORE = [
  "gente, essa é a casa do fotógrafo Blackwood. sumiu em 1954",
  "dizem que os clientes dele nunca saíam do estúdio",
  "meu avô jurava que as fotos dele PRENDIAM as pessoas",
  "teve outro streamer que entrou aí ano passado. o canal nunca mais postou",
  "procurem o estúdio no porão. mas não deixem ELE te enquadrar",
];

function livePush(user, text) {
  live.msgs.push({ user, text, t: time });
  if (live.msgs.length > 120) live.msgs.shift();
}
function liveRandUser() { return CHAT_USERS[Math.random() * CHAT_USERS.length | 0]; }

function liveEvent(type) {
  const pool = CHAT_REACT[type];
  if (pool) {
    let m = pool[Math.random() * pool.length | 0];
    m = m.replace("{f}", FLOOR_NAMES[world.cur]);
    livePush(liveRandUser(), m);
  }
  const bump = { photo: 8, dissolve: 22, damage: 30, ghost: 15, floor: 6,
                 secret: 45, doorlock: 10, key: 35, fuse: 12, elevator: 18,
                 safe: 40, tampa: 20, obturador: 35, lente: 25, freed: 90 }[type] || 5;
  live.viewers += bump + (Math.random() * bump | 0);
}

function liveTick(dt) {
  // deriva dos viewers: tende a uma base que cresce com o tempo de live
  const base = 30 + world.timeSec * 0.35;
  live.viewers += (base - live.viewers) * dt * 0.02 + (Math.random() - 0.5) * dt * 6;
  if (live.viewers < 7) live.viewers = 7;

  // mensagens genéricas
  live.msgT -= dt;
  if (live.msgT <= 0) {
    live.msgT = 4 + Math.random() * 7;
    livePush(liveRandUser(), CHAT_GENERIC[Math.random() * CHAT_GENERIC.length | 0]);
  }
  // lore em conta-gotas
  live.loreT -= dt;
  if (live.loreT <= 0 && live.loreIdx < CHAT_LORE.length) {
    livePush(liveRandUser(), CHAT_LORE[live.loreIdx++]);
    live.loreT = 75 + Math.random() * 40;
  }

  // dicas contextuais com INSISTÊNCIA: passou reto, o chat sobe o tom
  // parede falsa por perto
  for (const sr of fl().secretRooms) {
    if (world.flags.secretsFound.includes(sr.id)) continue;
    const cx2 = sr.x + sr.w / 2, cy2 = sr.y + sr.h / 2;
    liveNag("w" + world.cur + sr.id, "wall",
            Math.hypot(cx2 - player.x, cy2 - player.y), 11);
  }
  // marca de dígito por perto
  for (const mk of fl().marks) {
    if (mk.seen) continue;
    liveNag("m" + world.cur + mk.ord, "mark",
            Math.hypot(mk.x - player.x, mk.y - player.y), 9);
  }
  // cofre
  if (fl().safe && !world.flags.safeOpen)
    liveNag("safe", "safe",
            Math.hypot(fl().safe.x - player.x, fl().safe.y - player.y), 8);
  // quadro de fusíveis
  if (fl().fusebox && !world.flags.elevatorOn)
    liveNag("fbox", "fbox",
            Math.hypot(fl().fusebox.x - player.x, fl().fusebox.y - player.y), 8);
  // retrato já revelado pela foto mas deixado para trás
  for (const r of world.retratos) {
    if (r.floor !== world.cur || world.taken.has(r.id)) continue;
    if (!world.flags.retSeen.includes(r.id)) continue;
    liveNag(r.id, "ret", Math.hypot(r.x - player.x, r.y - player.y), 9);
  }
  // o espelho da Cecília (enquanto ela dorme)
  if (world.espelhoCecilia && world.espelhoCecilia.floor === world.cur &&
      world.flags.souls.cecilia && world.flags.souls.cecilia.state === "dormant") {
    const f2 = world.espelhoCecilia.furn;
    liveNag("espCeci", "mirror",
            Math.hypot(f2.x - player.x, f2.y - player.y), 8);
  }
  // o sinal do Hóspede (enquanto ele dorme; precisa ter a lente p/ valer)
  if (world.sinal && world.sinal.floor === world.cur && world.flags.cam.lente &&
      world.flags.souls.hospede && world.flags.souls.hospede.state === "dormant")
    liveNag("sinalHosp", "sinal",
            Math.hypot(world.sinal.x - player.x, world.sinal.y - player.y), 9);
  // peça da câmera brilhando no chão, ignorada (só se dá para VER)
  for (const it of world.items) {
    if (it.taken || it.floor !== world.cur || it.kind !== "campart") continue;
    if (!hasLOS(player.x, player.y, it.x, it.y)) continue;
    liveNag("pc" + it.id, "tampa",
            Math.hypot(it.x - player.x, it.y - player.y), 9);
  }
  if (world.flags.cam.tampa && film <= 0 && !live.hinted.has("film0")) {
    live.hinted.add("film0");
    livePush(liveRandUser(), "SEM FILME?? procura os rolos ¤ pelas salas");
  }
  // começo de run: a câmera veio sem tampa — aponta a peça no hall
  if (!world.flags.cam.tampa && world.timeSec > 6 && !live.hinted.has("tampa0")) {
    live.hinted.add("tampa0");
    livePush(liveRandUser(), "essa câmera tá SEM A TAMPA de trás, não salva nada assim");
    livePush(liveRandUser(), "tem algo brilhando ✦ aí no hall, olha a lanterna aí");
  }
}

function fmtViewers(v) {
  v = v | 0;
  return v > 999 ? (v / 1000).toFixed(1).replace(".", ",") + "k" : "" + v;
}

// painel compacto no HUD (clicar abre o chat completo e PAUSA)
function drawLivePanel() {
  const P = LIVE_PANEL;
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(P.x, P.y, P.w, P.h);
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 1;
  ctx.strokeRect(P.x, P.y, P.w, P.h);

  ctx.textAlign = "left"; ctx.textBaseline = "middle";
  ctx.fillStyle = `rgba(255,60,50,${0.6 + 0.4 * Math.sin(time * 4)})`;
  ctx.beginPath(); ctx.arc(P.x + 14, P.y + 14, 5, 0, 7); ctx.fill();
  ctx.font = "bold 13px 'Courier New', monospace";
  ctx.fillStyle = "rgba(235,235,235,0.9)";
  ctx.fillText(`AO VIVO · ${fmtViewers(live.viewers)} assistindo`, P.x + 26, P.y + 14);

  ctx.font = "bold 11px 'Courier New', monospace";
  const last = live.msgs.slice(-3);
  last.forEach((m, i) => {
    const y = P.y + 32 + i * 16;
    ctx.fillStyle = "rgba(140,180,255,0.75)";
    ctx.fillText(m.user + ":", P.x + 10, y);
    ctx.fillStyle = "rgba(210,210,210,0.85)";
    const ux = P.x + 14 + ctx.measureText(m.user + ":").width;
    let t = m.text;
    if (t.length > 44) t = t.slice(0, 43) + "…";
    ctx.fillText(t, ux, y);
  });
  ctx.restore();
}

function liveInPanel(px2, py2) {
  return px2 >= LIVE_PANEL.x && px2 <= LIVE_PANEL.x + LIVE_PANEL.w &&
         py2 >= LIVE_PANEL.y && py2 <= LIVE_PANEL.y + LIVE_PANEL.h;
}

// overlay de chat completo (jogo PAUSADO)
function drawChat() {
  ctx.fillStyle = "rgba(0,0,0,0.9)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = "left"; ctx.textBaseline = "middle";

  ctx.fillStyle = `rgba(255,60,50,0.9)`;
  ctx.beginPath(); ctx.arc(32, 36, 7, 0, 7); ctx.fill();
  ctx.font = "bold 20px 'Courier New', monospace";
  ctx.fillStyle = "rgba(235,235,235,0.95)";
  ctx.fillText(`AO VIVO — ${fmtViewers(live.viewers)} assistindo  (jogo pausado)`, 52, 36);

  // lista com rolagem (scroll 0 = fim/mais recentes)
  const lineH = 26, areaTop = 76, areaBot = canvas.height - 60;
  const maxLines = ((areaBot - areaTop) / lineH) | 0;
  const total = live.msgs.length;
  const start = Math.max(0, total - maxLines - live.scroll);
  const shown = live.msgs.slice(start, start + maxLines);
  ctx.font = "bold 15px 'Courier New', monospace";
  shown.forEach((m, i) => {
    const y = areaTop + i * lineH + 10;
    ctx.fillStyle = "rgba(140,180,255,0.8)";
    ctx.fillText(m.user + ":", 40, y);
    ctx.fillStyle = "rgba(220,220,220,0.9)";
    ctx.fillText(m.text, 40 + ctx.measureText(m.user + ": ").width, y);
  });
  if (live.scroll >= 1) {
    ctx.fillStyle = "rgba(160,160,160,0.7)";
    ctx.fillText(`▼ ${Math.round(live.scroll)} mensagens mais novas abaixo`, 40, areaBot + 18);
  }

  // FECHAR (mesmo lugar do álbum)
  const hovC = mouse.x >= ALB_CLOSE.x && mouse.x <= ALB_CLOSE.x + ALB_CLOSE.w &&
               mouse.y >= ALB_CLOSE.y && mouse.y <= ALB_CLOSE.y + ALB_CLOSE.h;
  ctx.fillStyle = "rgba(255,255,255,0.07)";
  ctx.fillRect(ALB_CLOSE.x, ALB_CLOSE.y, ALB_CLOSE.w, ALB_CLOSE.h);
  ctx.lineWidth = hovC ? 3 : 2;
  ctx.strokeStyle = hovC ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.5)";
  ctx.strokeRect(ALB_CLOSE.x, ALB_CLOSE.y, ALB_CLOSE.w, ALB_CLOSE.h);
  ctx.textAlign = "center";
  ctx.font = "bold 19px 'Courier New', monospace";
  ctx.fillStyle = "rgba(230,230,230,0.9)";
  ctx.fillText("FECHAR", ALB_CLOSE.x + ALB_CLOSE.w / 2, ALB_CLOSE.y + ALB_CLOSE.h / 2 + 1);

  ctx.font = "bold 12px 'Courier New', monospace";
  ctx.fillStyle = "rgba(140,140,140,0.7)";
  ctx.fillText(touchUI.seen ? "arraste para rolar · toque em FECHAR para voltar"
                            : "roda do mouse rola · ESC fecha",
               canvas.width / 2, canvas.height - 24);
  ctx.textAlign = "left";
}

function chatHit(px2, py2) {
  if (px2 >= ALB_CLOSE.x && px2 <= ALB_CLOSE.x + ALB_CLOSE.w &&
      py2 >= ALB_CLOSE.y && py2 <= ALB_CLOSE.y + ALB_CLOSE.h) {
    state = "play"; live.scroll = 0;
  }
}

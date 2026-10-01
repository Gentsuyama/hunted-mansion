"use strict";
// ==================================================================
// A LIVE — viewers, chat falso (dicas + lore), overlay pausado
// ==================================================================
const LIVE_PANEL = { x: 600, y: 8, w: 440, h: 84 };

const live = {
  viewers: 37, msgs: [], msgT: 4, loreIdx: 0, loreT: 40,
  hinted: new Set(), scroll: 0,
};

// cada run nova recomeça a live (dicas, lore e viewers zerados)
function liveReset() {
  live.viewers = 30 + (Math.random() * 20 | 0);
  live.msgs = []; live.msgT = 4; live.loreIdx = 0; live.loreT = 40;
  live.hinted = new Set(); live.scroll = 0;
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
                 secret: 45, doorlock: 10, key: 35, fuse: 12, elevator: 18, safe: 40 }[type] || 5;
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

  // dicas contextuais (uma vez por alvo)
  // parede falsa por perto
  for (const sr of fl().secretRooms) {
    const cx2 = sr.x + sr.w / 2, cy2 = sr.y + sr.h / 2;
    const dd = Math.hypot(cx2 - player.x, cy2 - player.y);
    const hid = "w" + world.cur + sr.id;
    if (dd < 11 && !live.hinted.has(hid) &&
        !world.flags.secretsFound.includes(sr.id)) {
      live.hinted.add(hid);
      livePush(liveRandUser(), "essa parede aí perto tá ESTRANHA. tira uma foto dela");
    }
  }
  // marca de dígito por perto
  for (const mk of fl().marks) {
    const dd = Math.hypot(mk.x - player.x, mk.y - player.y);
    const hid = "m" + world.cur + mk.ord;
    if (dd < 9 && !mk.seen && !live.hinted.has(hid)) {
      live.hinted.add(hid);
      livePush(liveRandUser(), "fotografa essa parede!! juro que vi algo escrito");
    }
  }
  // cofre
  if (fl().safe && !world.flags.safeOpen) {
    const dd = Math.hypot(fl().safe.x - player.x, fl().safe.y - player.y);
    if (dd < 8 && !live.hinted.has("safe")) {
      live.hinted.add("safe");
      livePush(liveRandUser(), "UM COFRE! os números com pontinhos das fotos, tenta aí");
    }
  }
  // quadro de fusíveis
  if (fl().fusebox && !world.flags.elevatorOn) {
    const dd = Math.hypot(fl().fusebox.x - player.x, fl().fusebox.y - player.y);
    if (dd < 8 && !live.hinted.has("fbox")) {
      live.hinted.add("fbox");
      livePush(liveRandUser(), "quadro de força! acho que precisa de 3 fusíveis");
    }
  }
  if (film <= 0 && !live.hinted.has("film0")) {
    live.hinted.add("film0");
    livePush(liveRandUser(), "SEM FILME?? procura os rolos ¤ pelas salas");
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

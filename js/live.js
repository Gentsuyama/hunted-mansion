"use strict";
// ==================================================================
// A LIVE — viewers, chat falso (dicas + lore), overlay pausado
// ==================================================================
const LIVE_PANEL = { x: 600, y: 8, w: 440, h: 84 };

const live = {
  viewers: 37, msgs: [], msgT: 4, loreIdx: 0, loreT: 40,
  hinted: new Set(), nag: new Map(), scroll: 0,
  tom: 0, pico: 37, almaT: 70, fixoT: 22, fixoFotoT: -99, filmeT: 0,
  progT: 0, progA: -1, progS: 0, empurrao: null,
};

// cada run nova recomeça a live (dicas, lore e viewers zerados)
function liveReset() {
  live.viewers = 30 + (Math.random() * 20 | 0);
  live.msgs = []; live.msgT = 4; live.loreIdx = 0; live.loreT = 40;
  live.hinted = new Set(); live.nag = new Map(); live.scroll = 0;
  live.tom = 0; live.pico = live.viewers; live.almaT = 70; live.fixoT = 22;
  live.fixoFotoT = -99; live.filmeT = 0;
  live.progT = 0; live.progA = -1; live.progS = 0; live.empurrao = null;
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

// lado da TELA em que a coisa está, visto de quem assiste à live
function liveLado(dx, dy) {
  return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "da DIREITA" : "da ESQUERDA")
                                     : (dy > 0 ? "de BAIXO" : "de CIMA");
}
// lado: opcional — quando o chat insiste (2ª vez em diante) ele passa a
// dizer DE QUE LADO está a parede, para a dica virar ação
function liveNag(id, cat, dist, radius, lado) {
  let n = live.nag.get(id);
  if (!n) { n = { lvl: 0, armed: true, t: -99 }; live.nag.set(id, n); }
  if (dist > radius + 5) { n.armed = true; return; }
  if (dist >= radius || !n.armed) return;
  if (world.timeSec - n.t < 14) return;      // não metralha a mesma dica
  n.armed = false; n.t = world.timeSec;
  const lvl = Math.min(n.lvl, 2);
  const pool = NAGS[cat][lvl];
  if (lvl < 2) {
    livePush(liveRandUser(), tr(pool[Math.random() * pool.length | 0]) +
             (lado && lvl === 1 ? tf(" — a parede {0}", tr(lado)) : ""));
  } else {
    if (lado) livePush(liveRandUser(), tf("A PAREDE {0}!! {0}!!!", tr(lado)));
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

// O TOM DA LIVE muda com a casa: começa zoeira (0); quando as almas acordam,
// o chat estranha (1); com três correntes caídas, as pessoas vão embora (2);
// quando ELE acorda, sobra quase só o espectador que nunca saiu (3).
const CHAT_INQUIETO = [
  "alguém mais tá com o áudio chiando?", "o contador de viewers travou aqui",
  "isso não tá mais com cara de roteiro", "eu ia dormir. não vou mais",
  "quem é esse estudio54 que quase não fala?", "a casa tá RESPIRANDO ou é impressão minha",
];
const CHAT_SAINDO = [
  "gente eu vou sair. desculpa", "não consigo mais assistir isso",
  "metade do chat sumiu, repararam?", "fechei a aba e a live continuou tocando",
  "alguém avisa a família dele", "por que o estudio54 só fala de foto?",
];
const CHAT_FIM = [
  "ainda tem alguém aí?", "só sobrou a gente", "eu não consigo fechar a aba",
];
// as almas acordadas também estão no chat — pedem, lembram, e nem sempre ajudam
const ALMA_USER = { tomas: "tomas_1951", cecilia: "cecilia__", bento: "seu.bento",
                    olivia: "olivia.52", hospede: "________", aurora: "aurora.b" };
const ALMA_FALA = {
  tomas:   ["97… 98… 99…", "não vale olhar", "você conta e eu me escondo?"],
  cecilia: ["não olha pra mim", "ele já chegou?", "alguém viu o meu buquê?"],
  bento:   ["quem acendeu a luz?", "a ronda é minha", "apaga esse flash, moço"],
  olivia:  ["compasso 44", "não para a música", "no silêncio eu não respondo por mim"],
  hospede: ["quanto pelo seu retrato?", "eu pago em prata", "não mostre o meu rosto"],
  aurora:  ["meu filho só queria me guardar", "por que você tirou eles de mim?",
            "eu vi você ali. na foto"],
};
const ALMA_ADEUS = {
  tomas: "achei a porta!", cecilia: "ele esperou.", bento: "ronda encerrada.",
  olivia: "fim da pauta.", hospede: "sem dívida.", aurora: "cuida dele por mim.",
};
function liveTom() {
  const S = world.flags.souls || {};
  if (S.blackwood && S.blackwood.state !== "dormant") return 3;
  const q = chainsBroken();
  if (q >= 3) return 2;
  let acordadas = 0;
  for (const id in S) if (S[id].state !== "dormant") acordadas++;
  return (q >= 1 || acordadas >= 2 || world.timeSec > 600) ? 1 : 0;
}
// com a cabeça no chão, o chat chega comido
function liveSujo(t, semente) {
  if (sanity >= 35 || !t) return t;
  const k = (35 - sanity) / 35 * 0.32, tk = Math.floor(time * 1.5);
  let o = "";
  for (let i = 0; i < t.length; i++)
    o += t[i] !== " " && hash(i + semente * 7, tk, 3) < k ? "▒" : t[i];
  return o;
}
// alma libertada ou queimada: a última palavra dela no chat
function liveAlmaFim(id, livre) {
  const u = ALMA_USER[id];
  if (!u) return;
  if (livre) livePush(u, ALMA_ADEUS[id]);
  else {
    livePush(u, "…");
    livePush(liveRandUser(), tf("o usuário {0} saiu da live. pra sempre", u));
  }
}

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

// o espectador que NUNCA sai: entrou no minuto zero, escreve pouco, sempre em
// minúsculas, e só fala de enquadramento. (Quem assiste a uma live dessas até o fim?)
const FIXO = "estudio54";
function liveFixo(text) { livePush(FIXO, text); }

const ALMA_USERS = new Set(Object.keys(ALMA_USER).map(k => ALMA_USER[k]));
function liveCorUser(u, a) {
  return u === FIXO ? `rgba(214,150,140,${a})`
    : ALMA_USERS.has(u) ? `rgba(196,214,236,${a})` : `rgba(140,180,255,${a})`;
}
function livePush(user, text) {
  live.msgs.push({ user, text: tr(text), t: time });   // o chat fala o idioma escolhido
  if (live.msgs.length > 120) live.msgs.shift();
}
function liveRandUser() { return CHAT_USERS[Math.random() * CHAT_USERS.length | 0]; }

function liveEvent(type) {
  const pool = CHAT_REACT[type];
  if (pool) {
    let m = tr(pool[Math.random() * pool.length | 0]);
    m = m.replace("{f}", tr(FLOOR_NAMES[world.cur]));
    livePush(liveRandUser(), m);
  }
  const bump = { photo: 8, dissolve: 22, damage: 30, ghost: 15, floor: 6,
                 secret: 45, doorlock: 10, key: 35, fuse: 12, elevator: 18,
                 safe: 40, tampa: 20, obturador: 35, lente: 25, freed: 90 }[type] || 5;
  live.viewers += bump + (Math.random() * bump | 0);
}

function liveTick(dt) {
  // o tom muda com a casa
  const tom = liveTom();
  if (tom !== live.tom) {
    if (tom === 3) liveFixo("pode subir. o estúdio está pronto.");
    else if (tom === 2 && live.tom < 2) livePush(liveRandUser(), "o chat tá ESVAZIANDO. eu fico, mas tô com medo");
    live.tom = tom;
  }
  // deriva dos viewers: tende a uma base que cresce com o tempo de live —
  // e encolhe quando as pessoas começam a ir embora
  const base = (30 + world.timeSec * 0.35) * (tom === 3 ? 0.5 : tom === 2 ? 0.75 : 1);
  live.viewers += (base - live.viewers) * dt * 0.02 + (Math.random() - 0.5) * dt * 6;
  if (live.viewers < 7) live.viewers = 7;
  if (live.viewers > live.pico) live.pico = live.viewers;

  // mensagens genéricas — no pico da tensão, o chat se cala
  const tenso = bossWarnT > 0 || fl().ghosts.some(g => g.bote && g.respawn <= 0);
  if (!tenso) live.msgT -= dt;
  if (live.msgT <= 0) {
    live.msgT = (4 + Math.random() * 7) * (tom === 3 ? 3.5 : tom === 2 ? 1.6 : 1);
    const r = Math.random();
    const pool = tom === 3 ? CHAT_FIM
      : tom === 2 ? (r < 0.65 ? CHAT_SAINDO : CHAT_GENERIC)
      : tom === 1 ? (r < 0.4 ? CHAT_INQUIETO : CHAT_GENERIC) : CHAT_GENERIC;
    livePush(liveRandUser(), pool[Math.random() * pool.length | 0]);
  }
  // o espectador fixo cumprimenta quem entra (ele estava aqui antes de você)
  if (live.fixoT > 0) {
    live.fixoT -= dt;
    if (live.fixoT <= 0)
      liveFixo((world.flags.anteriores || []).length ? "bem-vindo de volta." : "boa noite.");
  }
  // as almas acordadas escrevem
  live.almaT -= dt;
  if (live.almaT <= 0) {
    live.almaT = 60 + Math.random() * 50;
    const ids = Object.keys(ALMA_FALA).filter(id =>
      world.flags.souls[id] && world.flags.souls[id].state === "awake");
    if (ids.length) {
      const id = ids[Math.random() * ids.length | 0], falas = ALMA_FALA[id];
      livePush(ALMA_USER[id], falas[Math.random() * falas.length | 0]);
      if (!live.hinted.has("almaChat")) {
        live.hinted.add("almaChat");
        const u = ALMA_USER[id];
        setTimeout(() => { if (world) livePush(liveRandUser(),
          tf("quem deixou {0} entrar no chat???", u)); }, 2400);
      }
    }
  }
  // lore em conta-gotas
  live.loreT -= dt;
  if (live.loreT <= 0 && live.loreIdx < CHAT_LORE.length) {
    livePush(liveRandUser(), CHAT_LORE[live.loreIdx++]);
    live.loreT = 75 + Math.random() * 40;
  }

  liveEmpurra(dt);

  // dicas contextuais com INSISTÊNCIA: passou reto, o chat sobe o tom
  // parede falsa por perto
  // (só vale se dá para VER a parede de onde ele está: medido em 25 casas,
  // metade das broncas saía de um ponto sem visão nenhuma do vão)
  for (const sr of fl().secretRooms) {
    if (world.flags.secretsFound.includes(sr.id)) continue;
    const v = sr.frente || { x: sr.x + sr.w / 2, y: sr.y + sr.h / 2 };
    const dv = Math.hypot(v.x - player.x, v.y - player.y);
    const ve = !sr.frente || (dv < 13 && hasLOS(player.x, player.y, v.x, v.y));
    liveNag("w" + world.cur + sr.id, "wall", ve ? dv : (dv > 16 ? dv : 13), 11,
            liveLado(v.x - player.x, v.y - player.y));
  }
  // marca de dígito por perto — e à vista
  for (const mk of fl().marks) {
    if (mk.seen) continue;
    const dm = Math.hypot(mk.x - player.x, mk.y - player.y);
    const ve = dm < 12 && hasLOS(player.x, player.y, mk.x, mk.y);
    liveNag("m" + world.cur + mk.ord, "mark", ve ? dm : (dm > 14 ? dm : 11), 9,
            liveLado(mk.x - player.x, mk.y - 1.6 - player.y));
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
  { const ds = Math.hypot(world.sinal.x - player.x, world.sinal.y - player.y);
    const ve = ds < 12 && hasLOS(player.x, player.y, world.sinal.x, world.sinal.y);
    liveNag("sinalHosp", "sinal", ve ? ds : (ds > 14 ? ds : 11), 9,
            liveLado(world.sinal.x - player.x, world.sinal.y - 1.6 - player.y)); }
  // peça da câmera brilhando no chão, ignorada (só se dá para VER)
  for (const it of world.items) {
    if (it.taken || it.floor !== world.cur || it.kind !== "campart") continue;
    if (!hasLOS(player.x, player.y, it.x, it.y)) continue;
    liveNag("pc" + it.id, "tampa",
            Math.hypot(it.x - player.x, it.y - player.y), 9);
  }
  if (world.flags.cam.tampa && film <= 0 && !live.hinted.has("film0")) {
    live.hinted.add("film0");
    livePush(liveRandUser(), "SEM FILME?? procura as latinhas verdes de rolo pelas salas");
    live.filmeT = 35;
  }
  // sem rolo há um tempo: o chat (que vê a tela inteira) aponta o mais próximo
  if (world.flags.cam.tampa && film <= 0) {
    live.filmeT -= dt;
    if (live.filmeT <= 0) {
      live.filmeT = 50;
      let bf = null, bd = 1e9;
      for (const f of fl().films) {
        if (f.taken) continue;
        const d = Math.hypot(f.x - player.x, f.y - player.y);
        if (d < bd) { bd = d; bf = f; }
      }
      if (bf)
        livePush(liveRandUser(), tf(bd < 22 ? "tem uma latinha de rolo PERTO, pro lado {0} da tela"
                                            : "rolo de filme lá pro lado {0} da tela, longe",
                 tr(liveLado(bf.x - player.x, bf.y - player.y))));
    }
  } else live.filmeT = Math.min(live.filmeT, 20);
  // começo de run: a câmera veio sem tampa — aponta a peça no hall
  if (!world.flags.cam.tampa && world.timeSec > 6 && !live.hinted.has("tampa0")) {
    live.hinted.add("tampa0");
    livePush(liveRandUser(), "essa câmera tá SEM A TAMPA de trás, não salva nada assim");
    livePush(liveRandUser(), "tem algo brilhando ✦ aí no hall, olha a lanterna aí");
  }
}

// ------------------------------------------------------------------
// O EMPURRÃO: se a run fica minutos sem avançar, um viewer que "pesquisou a
// casa" diz o ANDAR do próximo passo (nunca o lugar exato — isso é da foto).
// É o piso de justiça: ninguém fica preso sem saber para onde ir.
// ------------------------------------------------------------------
const EMPURRA = { primeiro: 240, depois: 150, quem: "GhostHunterBR" };
function progAssinatura() {
  const F = world.flags;
  let s = F.marksSeen.length * 5 + F.secretsFound.length * 7 + (F.safeOpen ? 11 : 0) +
          (F.elevatorOn ? 13 : 0) + F.fusesIn * 17 + F.fuses * 3 + F.retSeen.length * 19 +
          (F.ecosFotografados || 0);
  for (const it of world.items) if (it.taken) s += 41;
  for (const r of world.retratos) if (world.taken.has(r.id)) s += 43;
  let k = 1;
  for (const id in F.souls)
    s += ({ dormant: 0, awake: 23, captured: 29, freed: 31, burned: 37 }[F.souls[id].state] || 0) * (k++);
  return s;
}
function liveProximoPasso() {
  const F = world.flags, cam = F.cam, S = F.souls;
  const an = (f) => tr(FLOOR_NAMES[f]);
  const it = (id) => world.items.find(i => i.id === id && !i.taken);
  if (!cam.tampa)
    return { m: "a TAMPA da câmera tá no hall de entrada, brilhando no chão", f: 1 };
  if (it("lente"))
    return { m: tf("pesquisei a casa: a LENTE nova ficou no {0}, numa sala atrás de PAREDE FALSA. fotografa as paredes", an(1)), f: 1 };
  if (it("key") || it("obturador"))
    return { m: tf("a CHAVE e o OBTURADOR ficaram no {0}, numa sala atrás de parede falsa", an(0)), f: 0 };
  // uma alma já no retrato vem antes de tudo
  if (soulCaptured())
    return { m: tf("tem alma presa no retrato. leva pro quarto escuro, no {0}", an(0)), f: 0 };
  for (const id of SOUL_IDS_ACTIVE) {
    const s = S[id], def = SOUL_DEFS[id];
    if (!s || s.state !== "awake") continue;
    const r = world.retratos.find(q => q.soul === id);
    if (r && !world.taken.has(r.id)) {
      if (F.retSeen.includes(r.id))
        return { m: tf("o retrato de {0} que a foto mostrou ficou pra trás, no {1}", tr(def.nome), an(r.floor)), f: r.floor };
      return { m: tf("o retrato de {0} tá escondido no {1}", tr(def.nome), an(r.floor)),
               m2: def.dicaRetrato, f: r.floor };
    }
    return { m: tf("{0} tá vagando no {1}. fotografa com o retrato na mão", tr(def.nome), an(s.floor)), f: s.floor };
  }
  for (const f of [1, 2, 4])
    for (const mk of world.floors[f].marks)
      if (!mk.seen && !F.safeOpen)
        return { m: tf("falta um NÚMERO do cofre: tá escrito numa parede do {0}. só a câmera enxerga", an(f)), f };
  if (!F.safeOpen)
    return { m: tf("você já tem os 3 números. o COFRE fica no {0}", an(3)), f: 3 };
  if (!F.elevatorOn) {
    const f0 = it("fuse0");
    if (f0) return { m: tf("tem um FUSÍVEL no {0}, escondido atrás de parede falsa", an(f0.floor)), f: f0.floor };
    if (it("fuse1")) return { m: tf("tem um FUSÍVEL solto no {0}", an(0)), f: 0 };
    return { m: tf("os fusíveis vão no QUADRO DE FORÇA: poço do elevador, no {0}", an(0)), f: 0 };
  }
  // quem ainda dorme
  if (S.cecilia && S.cecilia.state === "dormant" && world.espelhoCecilia)
    return { m: tf("tem um ESPELHO no {0} pedindo uma foto. espelho guarda gente", an(world.espelhoCecilia.floor)),
             f: world.espelhoCecilia.floor };
  if (S.hospede && S.hospede.state === "dormant" && world.sinal)
    return { m: tf("tem um SÍMBOLO riscado numa parede do {0}. só sai na foto", an(world.sinal.floor)),
             f: world.sinal.floor };
  if (S.olivia && S.olivia.state === "dormant" && (F.ecosFotografados || 0) < 7)
    return { m: tf("fotografa os VULTOS com filme na câmera: faltam {0} pra alguém na casa acordar",
                   7 - (F.ecosFotografados || 0)), f: -1 };
  if (S.blackwood && S.blackwood.state === "awake")
    return { m: tf("ELE tá no ateliê, no {0}. só o elevador sobe", an(NFLOORS - 1)), f: NFLOORS - 1 };
  if (chainsBroken() >= CHAINS_NEEDED)
    return { m: tf("as sete correntes caíram. a PORTA da frente, no {0}. VAI", an(1)), f: 1 };
  return null;
}
function liveEmpurra(dt) {
  live.progS -= dt;
  if (live.progS > 0) return;
  live.progS = 1;
  const a = progAssinatura();
  if (a !== live.progA) { live.progA = a; live.progT = 0; live.progProx = EMPURRA.primeiro; return; }
  live.progT += 1;
  if (live.progT < (live.progProx || EMPURRA.primeiro)) return;
  live.progProx = live.progT + EMPURRA.depois;
  const p = liveProximoPasso();
  if (!p) return;
  livePush(EMPURRA.quem, p.m);
  if (p.m2) livePush(EMPURRA.quem, p.m2);
  live.empurrao = { f: p.f, t: world.timeSec };
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
  // de vez em quando o contador mostra quantos estão assistindo DE VERDADE
  const soUm = live.tom >= 2 && (time % 13) < 0.9;
  ctx.fillText(tf("AO VIVO · {0} assistindo", soUm ? "1" : fmtViewers(live.viewers)),
               P.x + 26, P.y + 14);

  ctx.font = "bold 11px 'Courier New', monospace";
  const last = live.msgs.slice(-3);
  last.forEach((m, i) => {
    const y = P.y + 32 + i * 16;
    ctx.fillStyle = liveCorUser(m.user, 0.8);
    ctx.fillText(m.user + ":", P.x + 10, y);
    ctx.fillStyle = "rgba(210,210,210,0.85)";
    const ux = P.x + 14 + ctx.measureText(m.user + ":").width;
    let t = liveSujo(m.text, i + live.msgs.length);
    const lim = (LANG === "zh" || LANG === "ja") ? 26 : 44;   // ideograma ocupa o dobro
    if (t.length > lim) t = t.slice(0, lim - 1) + "…";
    ctx.fillText(t, ux, y);
  });
  ctx.restore();
}

function liveInPanel(px2, py2) {
  return px2 >= LIVE_PANEL.x && px2 <= LIVE_PANEL.x + LIVE_PANEL.w &&
         py2 >= LIVE_PANEL.y && py2 <= LIVE_PANEL.y + LIVE_PANEL.h;
}

// parte um texto em linhas que cabem em maxW (com a fonte já posta no ctx)
function liveQuebra(t, maxW) {
  if (ctx.measureText(t).width <= maxW) return [t];
  const out = [];
  let cur = "";
  if (LANG === "zh" || LANG === "ja") {          // sem espaços: quebra por caractere
    for (const ch of t) {
      if (cur && ctx.measureText(cur + ch).width > maxW) { out.push(cur); cur = ch; }
      else cur += ch;
    }
  } else {
    for (const w of t.split(" ")) {
      const tent = cur ? cur + " " + w : w;
      if (cur && ctx.measureText(tent).width > maxW) { out.push(cur); cur = w; }
      else cur = tent;
    }
  }
  if (cur) out.push(cur);
  return out;
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
  ctx.fillText(tf("AO VIVO — {0} assistindo  (jogo pausado)", fmtViewers(live.viewers)), 52, 36);

  // lista com rolagem (scroll 0 = fim/mais recentes); mensagem longa QUEBRA em
  // linhas — nenhum idioma pode perder o fim de uma dica na borda da tela
  const lineH = 26, areaTop = 76, areaBot = canvas.height - 60;
  const maxLines = ((areaBot - areaTop) / lineH) | 0;
  ctx.font = "bold 15px 'Courier New', monospace";
  const linhas = [];
  for (const m of live.msgs) {
    const wPre = ctx.measureText(m.user + ": ").width;
    liveQuebra(m.text, canvas.width - 80 - wPre)
      .forEach((t, i) => linhas.push({ user: i ? null : m.user, wPre, t }));
  }
  const start = Math.max(0, linhas.length - maxLines - Math.round(live.scroll));
  linhas.slice(start, start + maxLines).forEach((l, i) => {
    const y = areaTop + i * lineH + 10;
    if (l.user) {
      ctx.fillStyle = liveCorUser(l.user, 0.88);
      ctx.fillText(l.user + ":", 40, y);
    }
    ctx.fillStyle = "rgba(220,220,220,0.9)";
    ctx.fillText(l.t, 40 + l.wPre, y);
  });
  if (live.scroll >= 1) {
    ctx.fillStyle = "rgba(160,160,160,0.7)";
    ctx.fillText(tf("▼ {0} mensagens mais novas abaixo", Math.round(live.scroll)), 40, areaBot + 18);
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

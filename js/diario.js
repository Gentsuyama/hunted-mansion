"use strict";
// ==================================================================
// O DIÁRIO — achado ao lado da câmera, na soleira. Vem quase em branco e as
// páginas APARECEM conforme a casa é descoberta: cada peça, cada alma, cada
// sala. É o guia do jogador… escrito por BLACKWOOD. Ele conduz quem lê a
// prender as outras seis almas (queimar, nunca libertar: as livres o
// enfraquecem) e a SENTAR na cadeira dele com o negativo — a troca de corpo
// (o final "O Novo Fotógrafo"). O jogador descobre a autoria de dois jeitos:
//  · capturado o Blackwood, a última página se escreve na frente dele e vem
//    ASSINADA (o chat explode) — antes da escolha cadeira/porta. Nesse momento
//    a tinta escondida das outras páginas também aparece: a marca d'água e as
//    frases dele por baixo do relato ("Mãe.", "Encha-o para mim.").
// Pistas para o leitor atento: "o último s̶o̶u̶ é o Fotógrafo", a hostilidade
// às velas e à libertação, saber demais sobre cada retrato.
// ==================================================================
const DIARIO_PAGINAS = [
  // relato de quem viveu a casa (primeira pessoa; o que ensina vem do que aconteceu, nunca de ordem)
  { id: "inicio", titulo: "Na soleira",
    texto: ["Escrevo com a câmera no colo, sentado onde a encontrei. A porta fechou sozinha atrás de mim; empurrei até os braços doerem e ela nem rangeu.",
            "Não é a fechadura que prende. A casa guarda sete retratos, e enquanto eles estiverem aqui, quem entra também fica. Levei uma noite inteira para entender isso.",
            "Deixo este caderno onde deixaram a câmera. Quem pegar uma, que pegue o outro."],
    oculto: "Cuide dela. Ela é minha — e em breve você também." },
  { id: "tampa", titulo: "Hall de entrada",
    texto: ["Achei a tampa do filme a dois passos de onde a câmera caiu, como se tivesse esperado por mim. Com ela a câmera fechou, e pela primeira vez a foto guardou algo além do clarão.",
            "Fotografei a parede do corredor por desespero e a emulsão mostrou um número riscado que meus olhos nunca viram. A casa escreve nas paredes.",
            "Gastei três rolos fotografando o escuro vazio antes de aprender. A casa repõe o filme, mas devagar — e sempre longe de onde estou."] },
  { id: "vulto", titulo: "Corredor, não sei qual",
    texto: ["Havia um deles no fim do corredor. Não é dos sete: é um resto, um hóspede que a casa não achou digno de moldura.",
            "Veio na minha direção sem pressa e sem desistir. Corri; quando parei, ele ainda vinha. Chegou colado e puxou o ar — e aí já era tarde para andar. O clarão o tirou de cima de mim.",
            "Não senti pena. Não há rosto ali para se ter pena."] },
  { id: "ampola", titulo: "Primeiro andar",
    texto: ["Tropecei no frasco. Prata, gelado, um resíduo azul no fundo; encaixou na câmera como se fosse dela.",
            "Entendi o que ele guarda quando fotografei um vulto e o vi sumir da foto: o que a emulsão tira cabe no frasco, e o frasco devolve luz ao flash. Luz é tempo.",
            "Acendi um castiçal com a primeira alma, por fraqueza, pela luz bonita. Não me levou a lugar nenhum. Desde então encho o frasco. Um frasco cheio pesa diferente."],
    oculto: "Encha-o para mim." },
  { id: "lente", titulo: "Atrás da parede, térreo",
    texto: ["A parede do térreo era falsa; atravessei-a com o ombro. Dentro, embrulhada num pano, uma lente nova.",
            "A rachada só borrava os números que a casa risca nas paredes; esta lê. São três, e abrem o cofre — e no cofre estava o que me faltava.",
            "Achei as marcas onde o papel de parede está mais gasto. A casa esconde mal o que ela mesma escreveu."] },
  { id: "segredo", titulo: "Dentro da parede",
    texto: ["Há um menino nos vãos. Ri de mim e corre, e eu, idiota, corri atrás até perder o fôlego.",
            "Na terceira vez deixei que corresse: crianças cansam. Parou ofegante num canto e me olhou como se ainda fosse brincadeira. Fotografei.",
            "Não é perigoso. Só é lento para entender que a brincadeira acabou."] },
  { id: "obturador", titulo: "Porão",
    texto: ["O obturador de prata estava junto da chave, no fundo do porão, frio como a mão de quem o apertava. Com ele a câmera parou de apenas espantar.",
            "Hoje, com o retrato certo na mão, vi o clarão devolver um deles à moldura de onde saiu.",
            "É preciso fazer isso com os sete. Procurei outro caminho para fora durante noites. Não há."] },
  { id: "alma_tomas", titulo: "Quarto das crianças",
    texto: ["O retrato do menino estava no berço, debaixo de um lençol que ninguém mexia há setenta anos. Ele dorme onde dormia.",
            "Quando parou de correr, hesitei um segundo. Perdi uma noite por causa desse segundo."] },
  { id: "alma_cecilia", titulo: "Diante do espelho",
    texto: ["A noiva não suporta ser olhada: enquanto a enquadrei, ficou imóvel como um retrato. No instante em que desviei para trocar o rolo, avançou dois passos sem som.",
            "O retrato dela estava atrás do espelho onde se mostrou. Acho que foi ela mesma quem o pendurou ali."] },
  { id: "alma_bento", titulo: "Casa das máquinas",
    texto: ["Quando a energia voltou, o zelador voltou com ela. Anda pesado e vai atrás de qualquer clarão: disparei num canto e ele foi para o canto.",
            "O retrato dele caiu junto com ele, no fundo do poço do elevador. Desci ao porão para pegá-lo com as mãos tremendo."] },
  { id: "alma_olivia", titulo: "Sala de música",
    texto: ["Enquanto ela tocava, eu estava seguro; aprendi a andar no compasso dela. Quando o piano calou, corri.",
            "O retrato estava dentro do piano, sob a tampa, no meio de coisas que não eram dela. Ela guardava tudo ali."] },
  { id: "alma_hospede", titulo: "Escritório",
    texto: ["Ele nunca aceitou aparecer em retrato. Por isso o dele estava atrás do relógio que parou na hora em que ele chegou.",
            "Olhei a foto dele por tempo demais. Ele devolveu o olhar, e dormi mal pela primeira vez desde que entrei."] },
  { id: "alma_aurora", titulo: "Sala de estar",
    texto: ["Ela veio me perguntar por quê. Não respondi.",
            "O retrato estava na poltrona em que ninguém mais sentou. Foi o primeiro de todos; as bordas estão gastas de tanto ser segurado. Peguei-o com mais cuidado do que os outros, e não sei explicar por quê."],
    oculto: "Mãe." },
  { id: "quarto", titulo: "Quarto escuro",
    texto: ["Revelei o primeiro negativo: três banhos, a agulha tremendo, e um erro que acordou a casa inteira por uma hora.",
            "O segundo eu queimei. Um fósforo, um instante, e a corrente da porta quebrou igual.",
            "Não vi mérito em devolver ao mundo o que já estava morto. Vi pressa. Desde então, queimo."],
    oculto: "Queime. Os livres me enfraquecem." },
  { id: "tomas_ajuda", titulo: "Não sei onde escrevi isto",
    texto: ["Caí. Lembro do escuro e de uma voz de criança contando. O menino me achou antes que a casa me achasse, e levantei.",
            "Ele não devia ter se apegado: a casa cobra o que empresta. Da segunda vez que caí, ele não estava lá."] },
  { id: "loucura", titulo: "Depois",
    texto: ["Ouvi a casa falar com a minha voz. Vi vultos onde não havia vultos e li palavras que ninguém tinha escrito.",
            "Foi a luz que me segurou: fiquei junto de uma vela acesa até a imagem parar de dobrar. É assim que ela começa a morar em alguém.",
            "Da próxima vez, confesso, pensei em deixar. É mais rápido."],
    oculto: "Eu estava quase dentro." },
  { id: "final", titulo: "Ateliê",
    // "~eu~" é RISCADO na página: o deslize dele é a pista
    texto: ["Seis. Falta o último — ~eu~, o Fotógrafo. Espera no ateliê, e só o elevador chega lá.",
            "Ele enquadra antes de disparar: ouvi a carga, pus uma parede entre nós e o flash dele queimou só a porta. Com o autorretrato na mão, fotografei-o até caber no negativo.",
            "Amanhã não vou à porta; a porta é para quem foge. Vou sentar na cadeira dele com o negativo e o frasco cheio, e a casa — que sempre precisou de um dono — vai me deixar sair como dono.",
            "Se eu não voltar para escrever, deu certo."],
    oculto: "Sente-se, e eu me levanto." },
  // a última página deixa de ser diário: ele fala com quem lê
  { id: "assinatura", titulo: "",
    texto: ["Você leu até aqui. Eu sabia que leria: escrevi cada página enquanto você a vivia.",
            "Não houve ninguém antes de você. Só eu, esperando.",
            "Os seis se foram e o sétimo está na sua mão. Agora sente-se. A cadeira está morna porque eu a aqueci para você.",
            "Foi um bom modelo. Vai ser um corpo melhor ainda."],
    assinado: true },
];
const DIARIO_IDS = Object.fromEntries(DIARIO_PAGINAS.map(p => [p.id, p]));

function diarioFlags() {
  if (!world.flags.diario) world.flags.diario = { paginas: [], novas: 0, revelado: false };
  return world.flags.diario;
}
function diarioTem() { return !!world && !!world.flags.diarioPego; }
function diarioNovas() { return world && world.flags.diario ? world.flags.diario.novas : 0; }

// uma página "aparece": grava, avisa (se o diário já foi pego) e guarda
function diarioEvento(id) {
  if (!world || !DIARIO_IDS[id]) return false;
  const d = diarioFlags();
  if (d.paginas.includes(id)) return false;
  d.paginas.push(id);
  if (world.flags.diarioPego) {
    d.novas++;
    sfxPage();
    toast(controle.ativo ? "O DIÁRIO GANHOU UMA PÁGINA — [Y] para ler"
        : touchUI.seen ? "O DIÁRIO GANHOU UMA PÁGINA — toque no caderno para ler"
                       : "O DIÁRIO GANHOU UMA PÁGINA — [J] para ler", 5);
  }
  if (id === "assinatura") diarioAssinou();
  saveRun();
  return true;
}
// o diário veio junto com a câmera, na soleira: a live começa com ele
function diarioEntrega(comVinheta) {
  world.flags.diarioPego = true;
  const d = diarioFlags();
  diarioEvento("inicio");
  d.novas = d.paginas.length;
  sfxPage();
  toast(controle.ativo ? "UM DIÁRIO — [Y] para ler"
      : touchUI.seen ? "UM DIÁRIO — toque no caderno para ler" : "UM DIÁRIO — [J] para ler", 7);
  livePush(liveRandUser(), "um DIÁRIO?? tava do lado da câmera… de quem é isso");
  livePush(liveRandUser(), "a letra é antiga. caneta-tinteiro. e as páginas tão quase todas em branco");
  liveFixo("leia com atenção.");
  if (comVinheta) showVinheta("diario");          // o painel (quando a arte existir)
  saveRun();
}
// a última página veio ASSINADA: a descoberta garantida, antes da cadeira
function diarioAssinou() {
  const d = diarioFlags();
  if (d.revelado) return;
  d.revelado = true;
  let dly = 1200;
  for (const [u, l] of [[null, "a última página do diário… apareceu uma ASSINATURA"],
                        [null, "Blackwood?? o diário era DELE esse tempo todo??"],
                        [null, "ele escreveu o caminho que você seguiu. PRA QUÊ?"],
                        [FIXO, "você leu tudo o que ele escreveu. e obedeceu."]]) {
    setTimeout(() => { if (world) livePush(u || liveRandUser(), l); }, dly);
    dly += 2400;
  }
  live.viewers += 120;
}
// ------------------------------------------------------------------
// A TELA do diário (estado "diario")
// ------------------------------------------------------------------
let diarioSpread = 0, diarioReturn = "play";
function openDiario(ret) {
  if (!diarioTem()) return;
  state = "diario"; diarioReturn = ret || "play";
  const d = diarioFlags();
  diarioSpread = Math.max(0, Math.ceil(d.paginas.length / 2) - 1);   // abre na última escrita
  diarioFlip = null;
  d.novas = 0;
  sfxPage();
}
function diarioRect() { return { x: canvas.width / 2 - 440, y: 54, w: 880, h: 566 }; }
function diarioSpreads() { return Math.max(1, Math.ceil(diarioFlags().paginas.length / 2)); }
function diarioPaginaAberta(lado) {       // lado 0 = esquerda, 1 = direita
  const id = diarioFlags().paginas[diarioSpread * 2 + lado];
  return id ? DIARIO_IDS[id] : null;
}
// quebra em linhas que cabem (idiomas sem espaço quebram por caractere)
function diarioLinhas(g, txt, maxW) {
  const out = [];
  for (const par of txt.split("\n")) {
    const palavras = par.split(" ");
    let linha = "";
    for (const p of palavras) {
      const tenta = linha ? linha + " " + p : p;
      if (g.measureText(tenta).width <= maxW) { linha = tenta; continue; }
      if (linha) out.push(linha);
      if (g.measureText(p).width <= maxW) { linha = p; continue; }
      let pedaco = "";                                   // palavra (ou frase chinesa) maior que a linha
      for (const ch of p) {
        if (g.measureText(pedaco + ch).width > maxW && pedaco) { out.push(pedaco); pedaco = ""; }
        pedaco += ch;
      }
      linha = pedaco;
    }
    out.push(linha);
  }
  return out;
}
// desenha UMA página num contexto; devolve a altura usada
function diarioDesenhaPagina(g, pg, x, y, w, h, opts) {
  opts = opts || {};
  const d = world.flags.diario || { revelado: false };
  const foto = diarioFotoPagina(pg);                     // a foto presa com clipe (se a página tem)
  g.save();
  g.textAlign = "left"; g.textBaseline = "alphabetic";
  // o cabeçalho é lugar/momento, à mão — como quem data uma página (à esquerda quando há foto)
  if (pg.titulo) {
    g.font = "italic 15px 'HM Script', 'HM Script CJK', 'HM CJK', 'Segoe Script', 'Comic Sans MS', cursive";
    g.fillStyle = "rgba(90,70,50,0.7)";
    if (foto) g.fillText(tr(pg.titulo), x, y + 14);
    else { g.textAlign = "right"; g.fillText(tr(pg.titulo), x + w, y + 14); g.textAlign = "left"; }
    g.strokeStyle = "rgba(90,70,50,0.22)"; g.lineWidth = 1;
    g.beginPath();
    if (foto) { g.moveTo(x, y + 22); g.lineTo(x + w * 0.5, y + 22); }
    else { g.moveTo(x + w * 0.45, y + 22); g.lineTo(x + w, y + 22); }
    g.stroke();
  }
  // o texto, à mão; encolhe a letra até caber. Com foto no alto à direita, as primeiras
  // linhas são mais curtas (contornam a foto)
  // ~palavra~ = riscada na página (cada idioma risca a sua): marca a palavra com um sinal
  // invisível para riscar SÓ aquela ocorrência (o "私" do deslize, não o "私" de três linhas abaixo)
  const MARCA = "\u200b";
  const riscos = [];
  const pars = pg.texto.map(p => tr(p).replace(/~([^~]+)~/g, (m, w) => { riscos.push(w); return MARCA + w + MARCA; }));
  const fotoFim = foto ? y - 6 + foto.height + 14 : 0;        // até onde a foto desce na página
  let tam = 19, linhas = [], alt = 0, lh = 0;
  for (; tam >= 13; tam -= 1.5) {
    g.font = `italic ${tam}px 'HM Script', 'HM Script CJK', 'HM CJK', 'Segoe Script', 'Comic Sans MS', cursive`;
    lh = tam * 1.38;
    linhas = [];
    for (const p of pars) {
      const larg = (i) => (foto && y + 48 + (linhas.length + i) * lh - tam < fotoFim) ? w - foto.width - 14 : w;
      linhas.push(...diarioLinhasVar(g, p, larg)); linhas.push("");
    }
    alt = linhas.length * lh;
    if (alt <= h - 70) break;
  }
  let yy = y + 48;
  g.fillStyle = opts.tinta || "rgba(52,38,30,0.92)";
  for (const ln of linhas) {
    if (ln) {
      g.fillText(ln, x, yy);
      for (const risco of riscos) {                      // o deslize riscado
        const i0 = ln.indexOf(MARCA + risco + MARCA);
        if (i0 < 0) continue;
        const x0 = x + g.measureText(ln.slice(0, i0)).width, x1 = x0 + g.measureText(risco).width;
        g.strokeStyle = "rgba(52,38,30,0.85)"; g.lineWidth = 2;
        g.beginPath(); g.moveTo(x0 - 1, yy - tam * 0.32); g.lineTo(x1 + 1, yy - tam * 0.38); g.stroke();
      }
    }
    yy += lh;
  }
  // a assinatura dele (só na última página)
  if (pg.assinado) {
    g.font = "italic 30px 'HM Script', 'HM Script CJK', 'HM CJK', 'Segoe Script', 'Comic Sans MS', cursive";
    g.fillStyle = "rgba(60,30,26,0.9)";
    g.save(); g.translate(x + w - 10, Math.min(y + h - 30, yy + 26)); g.rotate(-0.06);
    g.textAlign = "right"; g.fillText("— Blackwood", 0, 0); g.restore();
  }
  // a tinta escondida: aparece em TODAS as páginas quando a assinatura surge
  if (d.revelado && !pg.assinado) {
    g.save();
    g.globalAlpha = 0.13;
    g.font = "italic 44px 'HM Script', 'HM Script CJK', 'HM CJK', 'Segoe Script', 'Comic Sans MS', cursive";
    g.fillStyle = "rgb(110,30,26)";
    g.translate(x + w / 2, y + h / 2); g.rotate(-0.45);
    g.textAlign = "center";
    for (let k = -2; k <= 2; k++) g.fillText("Blackwood", 0, k * 120);
    g.restore();
    if (pg.oculto) {
      g.font = "italic 21px 'HM Script', 'HM Script CJK', 'HM CJK', 'Segoe Script', 'Comic Sans MS', cursive";
      g.fillStyle = "rgba(120,30,26,0.8)";
      const ls = diarioLinhas(g, tr(pg.oculto), w);
      let y2 = Math.min(y + h - 20 - (ls.length - 1) * 28, yy + 10);
      for (const ln of ls) { g.fillText(ln, x + 6, y2); y2 += 28; }
    }
  }
  if (foto) {                                           // no alto, à direita, presa pelo clipe na borda da página
    const fx = x + w - foto.width + 10, fy = y - 6;
    g.save();
    g.translate(fx + foto.width / 2, fy + foto.height / 2); g.rotate(0.035);
    g.shadowColor = "rgba(0,0,0,0.35)"; g.shadowBlur = 8; g.shadowOffsetY = 3;
    g.drawImage(foto, -foto.width / 2, -foto.height / 2);
    g.shadowColor = "rgba(0,0,0,0)"; g.shadowBlur = 0; g.shadowOffsetY = 0;
    g.restore();
    diarioClipe(g, fx + foto.width / 2 - 2, y - 30 + 6);   // o clipe abraça a borda de cima da folha
  }
  g.restore();
  return yy - y;
}
// quebra em linhas com largura que pode variar por linha (contorno da foto)
function diarioLinhasVar(g, txt, larg) {
  const out = [];
  for (const par of txt.split("\n")) {
    const palavras = par.split(" ");
    let linha = "";
    for (const p of palavras) {
      const maxW = larg(out.length);
      const tenta = linha ? linha + " " + p : p;
      if (g.measureText(tenta).width <= maxW) { linha = tenta; continue; }
      if (linha) out.push(linha);
      if (g.measureText(p).width <= larg(out.length)) { linha = p; continue; }
      let pedaco = "";                                   // palavra (ou frase chinesa) maior que a linha
      for (const ch of p) {
        if (g.measureText(pedaco + ch).width > larg(out.length) && pedaco) { out.push(pedaco); pedaco = ""; }
        pedaco += ch;
      }
      linha = pedaco;
    }
    out.push(linha);
  }
  return out;
}
// ------------------------------------------------------------------
// as FOTOS presas com clipe: a coisa de que o relato fala, fotografada por quem escreveu
// ------------------------------------------------------------------
const DIARIO_FOTOS = {
  inicio: ["cam", "corpo"], tampa: ["digito"], vulto: ["eco"], ampola: ["prop", "candelabro"],
  lente: ["cam", "lente"], segredo: ["alma", "tomas"], obturador: ["cam", "obturador"],
  alma_tomas: ["furn", "berco"], alma_cecilia: ["furn", "espelho"], alma_bento: ["prop", "grade"],
  alma_olivia: ["furn", "piano"], alma_hospede: ["furn", "relogio"], alma_aurora: ["furn", "poltrona"],
  quarto: ["prop", "bancada"], final: ["prop", "cavalete"],
};
const DIARIO_FOTO_CACHE = {};
function diarioFotoSprite(spec) {
  try {
    switch (spec[0]) {
      case "furn":   return furnSprite(spec[1]);
      case "prop":   return propSprite(spec[1]);
      case "cam":    return (typeof CAM_IMGS !== "undefined" && CAM_IMGS[spec[1]]) || null;
      case "eco":    return ghostSprite(0.37);
      case "alma":   return soulSprite(spec[1]);
      case "digito": return digitSprite(7, 1);
    }
  } catch (e) {}
  return null;
}
function diarioFotoPagina(pg) {
  const spec = DIARIO_FOTOS[pg.id];
  if (!spec) return null;
  const chave = pg.id + ":" + (typeof CAM_IMGS !== "undefined" && CAM_IMGS.corpo ? "a" : "p");
  if (DIARIO_FOTO_CACHE[chave]) return DIARIO_FOTO_CACHE[chave];
  const spr = diarioFotoSprite(spec);
  if (!spr || !(spr.width || spr.naturalWidth)) return null;
  const W = 150, H = 122, FR = 7, BOT = 20, pw = W - FR * 2, ph = H - FR - BOT;
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const c = cv.getContext("2d");
  c.fillStyle = "#ebe5d6"; c.fillRect(0, 0, W, H);
  c.strokeStyle = "rgba(90,80,60,0.3)"; c.lineWidth = 1; c.strokeRect(0.5, 0.5, W - 1, H - 1);
  c.fillStyle = "#17140f"; c.fillRect(FR, FR, pw, ph);
  c.save();
  c.beginPath(); c.rect(FR, FR, pw, ph); c.clip();
  const sw = spr.width || spr.naturalWidth, sh = spr.height || spr.naturalHeight;
  const esc = Math.min((pw - 14) / sw, (ph - 10) / sh);
  const dw = sw * esc, dh = sh * esc;
  const vg = c.createRadialGradient(W / 2, FR + ph * 0.55, 6, W / 2, FR + ph * 0.55, pw * 0.7);   // o flash no escuro
  vg.addColorStop(0, "rgba(120,104,80,0.55)"); vg.addColorStop(1, "rgba(0,0,0,0)");
  c.fillStyle = vg; c.fillRect(FR, FR, pw, ph);
  c.drawImage(spr, FR + (pw - dw) / 2, FR + ph - dh - 4, dw, dh);
  c.globalCompositeOperation = "multiply";              // banho de sépia, como as fotos antigas
  c.fillStyle = "rgb(222,196,150)"; c.fillRect(FR, FR, pw, ph);
  c.globalCompositeOperation = "source-over";
  for (let i = 0; i < 260; i++) {                       // grão
    const v = (Math.random() * 90) | 0;
    c.fillStyle = `rgba(${v},${v},${v},0.18)`;
    c.fillRect(FR + Math.random() * pw, FR + Math.random() * ph, 1.2, 1.2);
  }
  c.restore();
  return (DIARIO_FOTO_CACHE[chave] = cv);
}
// o clipe de metal que prende a foto na página
function diarioClipe(g, x, y) {
  g.save();
  g.translate(x, y); g.rotate(0.04);
  g.lineCap = "round"; g.lineJoin = "round";
  g.shadowColor = "rgba(0,0,0,0.35)"; g.shadowBlur = 3; g.shadowOffsetY = 1;
  g.strokeStyle = "rgba(70,68,64,0.95)"; g.lineWidth = 3;
  g.beginPath(); g.roundRect(-6, 0, 12, 40, 6); g.stroke();
  g.shadowColor = "rgba(0,0,0,0)";
  g.strokeStyle = "rgba(215,213,205,0.95)"; g.lineWidth = 1.6;
  g.beginPath(); g.roundRect(-6, 0, 12, 40, 6); g.stroke();
  g.beginPath(); g.roundRect(-2.6, 8, 5.2, 26, 2.6); g.stroke();
  g.restore();
}
// tudo o que está no livro (capa, folhas, texto, fotos) num contexto qualquer — a tela ou
// as duas fotografias da virada de página
function diarioDesenhaLivro(g, spread, b) {
  const d = diarioFlags();
  g.save();
  g.shadowColor = "rgba(0,0,0,0.7)"; g.shadowBlur = 40; g.shadowOffsetY = 12;
  g.fillStyle = "#2a1d14";
  g.beginPath(); g.roundRect(b.x - 22, b.y - 18, b.w + 44, b.h + 36, 10); g.fill();
  g.restore();
  g.strokeStyle = "rgba(120,90,60,0.35)"; g.lineWidth = 1.5;
  g.beginPath(); g.roundRect(b.x - 14, b.y - 10, b.w + 28, b.h + 20, 7); g.stroke();
  const meio = b.x + b.w / 2;
  for (const lado of [0, 1]) {
    const px = lado === 0 ? b.x : meio + 6, pw = b.w / 2 - 6;
    const pap = g.createLinearGradient(px, 0, px + pw, 0);
    if (lado === 0) { pap.addColorStop(0, "#e4dac2"); pap.addColorStop(0.85, "#ebe2cc"); pap.addColorStop(1, "#cfc3a8"); }
    else { pap.addColorStop(0, "#cfc3a8"); pap.addColorStop(0.15, "#ebe2cc"); pap.addColorStop(1, "#e4dac2"); }
    g.fillStyle = pap; g.fillRect(px, b.y, pw, b.h);
    g.strokeStyle = "rgba(90,70,50,0.07)"; g.lineWidth = 1;                 // pautas fracas
    for (let yy = b.y + 70; yy < b.y + b.h - 30; yy += 26) { g.beginPath(); g.moveTo(px + 30, yy); g.lineTo(px + pw - 30, yy); g.stroke(); }
    g.fillStyle = "rgba(120,90,40,0.06)";                                   // manchas de idade
    g.beginPath(); g.ellipse(px + pw * (lado ? 0.8 : 0.2), b.y + b.h * 0.85, 60, 30, 0.4, 0, 7); g.fill();
    g.beginPath(); g.ellipse(px + pw * (lado ? 0.3 : 0.7), b.y + 40, 40, 18, -0.3, 0, 7); g.fill();
  }
  const sp = g.createLinearGradient(meio - 30, 0, meio + 30, 0);           // o vinco
  sp.addColorStop(0, "rgba(40,28,16,0)"); sp.addColorStop(0.5, "rgba(40,28,16,0.55)"); sp.addColorStop(1, "rgba(40,28,16,0)");
  g.fillStyle = sp; g.fillRect(meio - 30, b.y, 60, b.h);
  g.fillStyle = "rgba(120,30,30,0.85)";                                     // a fita marcadora
  g.fillRect(meio + b.w / 2 - 70, b.y - 18, 14, 60);
  const mg = 48, pw2 = b.w / 2 - 6 - mg * 2;
  for (const lado of [0, 1]) {
    const id = d.paginas[spread * 2 + lado], pg = id ? DIARIO_IDS[id] : null;
    const px = (lado === 0 ? b.x : meio + 6) + mg;
    if (pg) diarioDesenhaPagina(g, pg, px, b.y + 30, pw2, b.h - 60);
    else if (lado === 1 || !d.paginas.length) {
      g.font = "italic 16px 'HM Script', 'HM Script CJK', 'HM CJK', 'Segoe Script', 'Comic Sans MS', cursive";
      g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "rgba(90,78,62,0.45)";
      g.fillText(d.paginas.length ? "(em branco — por enquanto)" : "(em branco)", px + pw2 / 2, b.y + b.h / 2);
    }
    g.font = "italic 13px 'HM Script', 'HM Script CJK', 'HM CJK', 'Segoe Script', 'Comic Sans MS', cursive";          // número da página
    g.textAlign = lado ? "right" : "left"; g.textBaseline = "middle"; g.fillStyle = "rgba(90,78,62,0.55)";
    g.fillText(String(spread * 2 + lado + 1), lado ? px + pw2 : px, b.y + b.h - 18);
  }
}
// a VIRADA: fotografa o livro antes e depois e anima só a folha de papel (como no álbum)
let diarioFlip = null;
function diarioVira(dir) {
  if (diarioFlip) return;
  const n = diarioSpread + dir;
  if (n < 0 || n >= diarioSpreads()) return;
  const b = diarioRect();
  const snap = (sp) => {
    const cv = document.createElement("canvas");
    cv.width = b.w + 60; cv.height = b.h + 60;
    const g = cv.getContext("2d");
    g.translate(-(b.x - 30), -(b.y - 30));
    diarioDesenhaLivro(g, sp, b);
    return cv;
  };
  diarioFlip = { dir, t: 0, antes: snap(diarioSpread), depois: snap(n) };
  diarioSpread = n;
  sfxPage();
}
function diarioDesenhaFlip(b) {
  const F = diarioFlip, X = b.x - 30, Y = b.y - 30, W = b.w + 60, H = b.h + 60;
  const w2 = W / 2, meio = X + w2;
  const u = Math.min(1, F.t / ALB_FLIP_T), t = u * u * (3 - 2 * u);
  const th = t * Math.PI, c = Math.cos(th), s = Math.sin(th), k = Math.abs(c);
  if (F.dir > 0) {
    ctx.drawImage(F.antes, 0, 0, w2, H, X, Y, w2, H);
    ctx.drawImage(F.depois, w2, 0, w2, H, meio, Y, w2, H);
  } else {
    ctx.drawImage(F.depois, 0, 0, w2, H, X, Y, w2, H);
    ctx.drawImage(F.antes, w2, 0, w2, H, meio, Y, w2, H);
  }
  // a folha: do vinco (6 px) até a borda do papel (metade do livro)
  const P = { dx0: 6, dx1: b.w / 2, y0: b.y, y1: b.y + b.h }, pw = P.dx1 - P.dx0, ph = P.y1 - P.y0;
  const frente = t < 0.5;
  let src, lado;
  if (F.dir > 0) { if (frente) { src = F.antes; lado = 1; } else { src = F.depois; lado = -1; } }
  else           { if (frente) { src = F.antes; lado = -1; } else { src = F.depois; lado = 1; } }
  const N = 26, sw = pw / N;
  for (let i = 0; i < N; i++) {
    const u0 = i / N, u1 = (i + 1) / N;
    const p0 = 1 + 0.15 * u0 * s, p1 = 1 + 0.15 * u1 * s;
    const sx = (lado > 0 ? w2 + P.dx0 + u0 * pw : w2 - P.dx0 - u1 * pw);
    const x0 = lado > 0 ? meio + (P.dx0 + u0 * pw) * k : meio - (P.dx0 + u1 * pw) * k;
    const x1 = lado > 0 ? meio + (P.dx0 + u1 * pw) * k : meio - (P.dx0 + u0 * pw) * k;
    const hh = ph * (p0 + p1) / 2;
    ctx.drawImage(src, sx, P.y0 - Y, sw, ph, x0, P.y0 - (hh - ph) / 2, Math.max(1, x1 - x0 + 0.8), hh);
  }
  const xa = lado > 0 ? meio + P.dx0 * k : meio - P.dx1 * k, xb = lado > 0 ? meio + P.dx1 * k : meio - P.dx0 * k;
  if (xb - xa > 1) {
    const g = ctx.createLinearGradient(xa, 0, xb, 0), e = 0.5 * s;
    g.addColorStop(0, `rgba(0,0,0,${(lado > 0 ? e : e * 0.2).toFixed(3)})`);
    g.addColorStop(1, `rgba(0,0,0,${(lado > 0 ? e * 0.2 : e).toFixed(3)})`);
    ctx.fillStyle = g; ctx.fillRect(xa, P.y0 - ph * 0.08, xb - xa, ph * 1.16);
  }
  albumSombraDobra(lado > 0 ? xb : xa, P.y0, ph, lado > 0 ? 1 : -1, t);
}
function drawDiario() {
  const b = diarioRect(), d = diarioFlags();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "rgba(0,0,0,0.88)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (diarioFlip) {
    diarioFlip.t += frameDt;
    diarioDesenhaFlip(b);
    if (diarioFlip.t >= ALB_FLIP_T) diarioFlip = null;
  } else diarioDesenhaLivro(ctx, diarioSpread, b);
  // nome do caderno (muda quando a autoria aparece)
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.font = "bold 13px 'HM Mono', 'HM CJK', 'Courier New', monospace";
  ctx.fillStyle = d.revelado ? "rgba(214,120,110,0.95)" : "rgba(200,190,170,0.8)";
  ctx.fillText(d.revelado ? "DIÁRIO DE BLACKWOOD" : "DIÁRIO", canvas.width / 2, b.y - 34);
  // setas
  const total = diarioSpreads();
  ctx.font = "bold 40px 'HM Mono', 'HM CJK', 'Courier New', monospace"; ctx.textAlign = "center";
  ctx.fillStyle = diarioSpread > 0 ? "rgba(230,220,200,0.85)" : "rgba(230,220,200,0.2)";
  ctx.fillText("‹", b.x - 50, b.y + b.h / 2);
  ctx.fillStyle = diarioSpread < total - 1 ? "rgba(230,220,200,0.85)" : "rgba(230,220,200,0.2)";
  ctx.fillText("›", b.x + b.w + 50, b.y + b.h / 2);
  drawOverlayClose();
  ctx.font = "bold 11px 'HM Mono', 'HM CJK', 'Courier New', monospace"; ctx.fillStyle = "rgba(190,170,140,0.75)";   // na borda de couro
  ctx.fillText(controle.ativo ? "LB RB folhear · B fecha"
             : touchUI.seen ? "toque nas bordas para folhear" : "← → folhear · J ou ESC fecha", canvas.width / 2, b.y + b.h + 9);
}
function diarioHit(mx, my) {
  if (overlayCloseHit(mx, my)) { state = diarioReturn; return; }
  const b = diarioRect();
  if (my >= b.y - 20 && my <= b.y + b.h + 20) {
    if (mx < b.x + 30) { diarioFolheia(-1); return; }
    if (mx > b.x + b.w - 30) { diarioFolheia(1); return; }
  }
}
function diarioFolheia(dir) { diarioVira(dir); }
function diarioTecla(code) {
  if (code === "Escape" || code === "KeyJ" || code === "KeyF") { state = diarioReturn; return; }
  if (code === "ArrowLeft" || code === "KeyA") diarioFolheia(-1);
  else if (code === "ArrowRight" || code === "KeyD") diarioFolheia(1);
}

// ------------------------------------------------------------------
// o ícone do caderno no HUD (pisca quando há página nova)
// ------------------------------------------------------------------
function drawDiarioIcone(x, y, s, destaque) {
  ctx.save();
  ctx.translate(x, y);
  const pul = destaque ? 0.7 + 0.3 * Math.sin(time * 5) : 1;
  ctx.globalAlpha = destaque ? pul : 0.75;
  ctx.fillStyle = "#3a281b"; ctx.strokeStyle = "rgba(220,200,160,0.8)"; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(-s * 0.7, -s, s * 1.4, s * 2, 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "rgba(230,220,200,0.9)"; ctx.fillRect(-s * 0.45, -s * 0.8, s * 1.0, s * 1.6);
  ctx.fillStyle = "rgba(120,30,30,0.9)"; ctx.fillRect(s * 0.25, -s, s * 0.14, s * 1.1);
  if (destaque) {
    ctx.fillStyle = "rgba(255,90,70,0.95)";
    ctx.beginPath(); ctx.arc(s * 0.75, -s * 0.9, s * 0.3, 0, 7); ctx.fill();
  }
  ctx.restore();
}

"use strict";
// ==================================================================
// O DIÁRIO — achado ao lado da câmera, na soleira. Vem quase em branco e as
// páginas APARECEM conforme a casa é descoberta: cada peça, cada alma, cada
// sala. É o guia do jogador… escrito por BLACKWOOD. Ele conduz quem lê a
// prender as outras seis almas (queimar, nunca libertar: as livres o
// enfraquecem) e a SENTAR na cadeira dele com o negativo — a troca de corpo
// (o final "O Novo Fotógrafo"). O jogador descobre a autoria de dois jeitos:
//  · no FIM, garantido: capturado o Blackwood, a última página se escreve
//    na frente dele e vem ASSINADA (o chat explode) — antes da escolha
//    cadeira/porta;
//  · antes, por mérito: FOTOGRAFAR uma página (gasta rolo e flash) revela
//    a tinta escondida — a assinatura e uma frase que vira o sentido.
// Pistas para o leitor atento: "o último s̶o̶u̶ é o Fotógrafo", a hostilidade
// às velas e à libertação, saber demais sobre cada retrato.
// ==================================================================
const DIARIO_PAGINAS = [
  { id: "inicio", titulo: "Para quem achar esta câmera",
    texto: ["Se você está lendo, a porta já se fechou. Não gaste força nela: esta casa não prende por fechadura.",
            "Prende por retrato. Sete deles. Enquanto os sete estiverem aqui, você também está.",
            "A câmera na sua mão é a única coisa aqui dentro que sabe tirar alguém de um retrato. Cuide dela mais do que de si.",
            "As outras páginas estão em branco porque você ainda não precisa delas. Elas vão aparecer."],
    oculto: "Cuide dela. Ela é minha — e em breve você também." },
  { id: "tampa", titulo: "A tampa",
    texto: ["Agora a câmera fecha, e o filme serve para alguma coisa.",
            "Com filme, a foto guarda o que viu. Sem filme, o clarão apenas assusta — e assustar também tem seu uso.",
            "Fotografe as paredes. A casa escreve nelas o que não quer que se leia; só a emulsão enxerga.",
            "Não desperdice rolos com o escuro vazio. A casa repõe o filme, mas devagar, e nunca onde você está."] },
  { id: "vulto", titulo: "Os sem nome",
    texto: ["Os vultos sem nome não são os sete. São restos: hóspedes que a casa não achou dignos de moldura.",
            "Eles vêm. Sempre vêm. Não correm — mas também não desistem.",
            "Quando um deles puxa o ar perto de você, é tarde para andar. É a hora do clarão.",
            "Não tenha pena do que não tem rosto."] },
  { id: "ampola", titulo: "O frasco",
    texto: ["Você achou o frasco. Eu sabia que acharia: a casa o deixa onde se tropeça nele.",
            "O que a foto tira de um vulto cabe aí dentro. Guarde. Cada alma guardada é luz para o flash — e luz é tempo.",
            "Encha-o. Não o gaste com velas por sentimento: um castiçal aceso não tira ninguém daqui.",
            "Um frasco cheio, sim."],
    oculto: "Encha-o para mim." },
  { id: "lente", titulo: "A lente",
    texto: ["A lente certa lê o que a rachada só borra: os números que a casa risca nas paredes.",
            "São o segredo do cofre, e dentro do cofre há sempre o que falta.",
            "Procure as marcas onde o papel de parede está mais gasto. A casa esconde mal o que ela mesma escreveu."] },
  { id: "segredo", titulo: "As paredes a mais",
    texto: ["Então você achou um vão. Há outros: a casa foi erguida com o dobro das paredes necessárias.",
            "O menino gosta deles. Vai correr de você, e rir. Deixe-o correr: crianças cansam.",
            "Quando ele parar, fotografe. Não é perigoso — só é lento para entender que a brincadeira acabou."] },
  { id: "obturador", titulo: "O obturador",
    texto: ["O obturador de prata. Sem ele a câmera só espanta; com ele, prende.",
            "Com o retrato certo na mão, o clarão devolve cada um deles à moldura de onde saiu.",
            "Faça isso com os sete. Não há outro caminho para fora — e, acredite, eu procurei."] },
  { id: "alma_tomas", titulo: "O menino",
    texto: ["O retrato dele está no berço, debaixo do que ninguém mexe há setenta anos.",
            "Ele dorme onde dormia. Quando parar de correr, não hesite."] },
  { id: "alma_cecilia", titulo: "A noiva",
    texto: ["Ela não suporta ser olhada: enquadre-a e ela congela. Desvie, e ela avança.",
            "O retrato está atrás do espelho onde ela se mostrou. Ela própria o pendurou ali, creio."] },
  { id: "alma_bento", titulo: "O zelador",
    texto: ["Ele faz a ronda quando há energia e vem atrás de qualquer clarão. Use isso: leve-o aonde quiser.",
            "O retrato caiu junto com ele, no fundo do poço do elevador. No porão."] },
  { id: "alma_olivia", titulo: "A pianista",
    texto: ["Enquanto ela toca, ela não vem. No silêncio, corra.",
            "O retrato está dentro do piano, sob a tampa. Ela guardava tudo ali — até o que não era dela."] },
  { id: "alma_hospede", titulo: "O hóspede",
    texto: ["Ele nunca aceitou aparecer em retrato; por isso o dele está atrás do relógio que parou quando ele chegou.",
            "Não olhe a foto dele mais do que o necessário. Ele devolve o olhar."] },
  { id: "alma_aurora", titulo: "A senhora",
    texto: ["Ela vem perguntar por quê. Não responda.",
            "O retrato está na poltrona em que ninguém mais sentou. Foi o primeiro de todos; trate-o com cuidado."],
    oculto: "Mãe." },
  { id: "quarto", titulo: "A bancada",
    texto: ["Três banhos para revelar; um fósforo para queimar. A corrente quebra igual.",
            "Revelar é lento, e cada erro acorda a casa. Queimar leva um instante.",
            "Não há mérito em devolver ao mundo o que já estava morto. Há pressa."],
    oculto: "Queime. Os livres me enfraquecem." },
  { id: "tomas_ajuda", titulo: "O menino se apegou",
    texto: ["Ele contou até cem para você. Não devia: a casa cobra o que empresta.",
            "Da próxima vez ele não estará lá. Não zere de novo."] },
  { id: "loucura", titulo: "A voz",
    texto: ["Você ouviu a casa falar com a sua voz. É assim que ela começa a morar em alguém.",
            "Da próxima vez, deixe. É mais rápido."],
    oculto: "Eu estava quase dentro." },
  { id: "final", titulo: "O último",
    // "o último ~sou~" — a palavra entre tis é RISCADA na página: o deslize dele é a pista
    texto: ["Seis. O último ~sou~ é o Fotógrafo. Ele espera no ateliê, e só o elevador chega lá.",
            "Ele enquadra antes de disparar: quando ouvir a carga, ponha uma parede entre vocês. Com o autorretrato na mão, fotografe-o até caber no negativo.",
            "Depois, não vá à porta. A porta é para quem foge. Sente-se na cadeira dele, com o negativo e o frasco cheio, e a casa — que sempre precisou de um dono — deixará você sair como dono.",
            "Eu nunca consegui. Você vai."],
    oculto: "Sente-se, e eu me levanto." },
  { id: "assinatura", titulo: "Está feito",
    texto: ["Os seis se foram e o sétimo está na sua mão. Você fez tudo como estava escrito.",
            "Agora sente-se. A cadeira está morna porque eu a aqueci para você.",
            "Foi um bom modelo. Vai ser um corpo melhor ainda."],
    assinado: true },
];
const DIARIO_IDS = Object.fromEntries(DIARIO_PAGINAS.map(p => [p.id, p]));
const DIA_FOTO  = { x: 20, y: 20, w: 330, h: 56 };          // botão: fotografar a página aberta
const DIA_SETA  = 46;                                       // meia-largura da zona das setas

function diarioFlags() {
  if (!world.flags.diario) world.flags.diario = { paginas: [], novas: 0, revelado: false, fotos: [], lidas: [] };
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
    toast(touchUI.seen ? "O DIÁRIO GANHOU UMA PÁGINA — toque no caderno para ler"
                       : "O DIÁRIO GANHOU UMA PÁGINA — [J] para ler", 5);
  }
  if (id === "assinatura") diarioAssinou();
  saveRun();
  return true;
}
// pegou o diário na soleira (ao lado de onde a câmera estava)
function diarioPega() {
  world.flags.diarioPego = true;
  const d = diarioFlags();
  diarioEvento("inicio");
  d.novas = d.paginas.length;
  sfxPage();
  toast(touchUI.seen ? "UM DIÁRIO — toque no caderno para ler" : "UM DIÁRIO — [J] para ler", 7);
  livePush(liveRandUser(), "um DIÁRIO?? tava do lado da câmera… de quem é isso");
  livePush(liveRandUser(), "a letra é antiga. caneta-tinteiro. e as páginas tão quase todas em branco");
  liveFixo("leia com atenção.");
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
// a FOTO de uma página revelou a tinta escondida (a descoberta por mérito)
function diarioRevelouPorFoto() {
  const d = diarioFlags();
  if (d.revelado) return;
  d.revelado = true;
  let dly = 2600;                                   // depois de a polaroid revelar
  for (const [u, l] of [[null, "PERA. a foto do diário tem OUTRA escrita por baixo da tinta"],
                        [null, "tá assinado… gente. BLACKWOOD. o diário é do BLACKWOOD"],
                        [null, "ele tá te GUIANDO. desde o começo"],
                        [FIXO, "finalmente leu direito."]]) {
    setTimeout(() => { if (world) livePush(u || liveRandUser(), l); }, dly);
    dly += 2400;
  }
  live.viewers += 150;
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
// desenha UMA página de texto num contexto (tela ou foto); devolve a altura usada
function diarioDesenhaPagina(g, pg, x, y, w, h, opts) {
  opts = opts || {};
  const d = world.flags.diario || { fotos: [], revelado: false };
  g.save();
  g.textAlign = "left"; g.textBaseline = "alphabetic";
  // título
  g.font = "bold 12px 'Courier New', monospace";
  g.fillStyle = "rgba(90,70,50,0.75)";
  g.fillText(tr(pg.titulo).toUpperCase(), x, y + 14);
  g.strokeStyle = "rgba(90,70,50,0.25)"; g.lineWidth = 1;
  g.beginPath(); g.moveTo(x, y + 22); g.lineTo(x + w, y + 22); g.stroke();
  // o texto, à mão; encolhe a letra até caber
  // ~palavra~ = riscada na página (cada idioma risca a sua): marca a palavra com um sinal
  // invisível para riscar SÓ aquela ocorrência (o "私" do deslize, não o "私" de três linhas abaixo)
  const MARCA = "​";
  const riscos = [];
  const pars = pg.texto.map(p => tr(p).replace(/~([^~]+)~/g, (m, w) => { riscos.push(w); return MARCA + w + MARCA; }));
  let tam = 19, linhas = [], alt = 0;
  for (; tam >= 13; tam -= 1.5) {
    g.font = `italic ${tam}px 'Segoe Script', 'Comic Sans MS', cursive`;
    linhas = [];
    for (const p of pars) { linhas.push(...diarioLinhas(g, p, w)); linhas.push(""); }
    alt = linhas.length * tam * 1.38;
    if (alt <= h - 70) break;
  }
  const lh = tam * 1.38;
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
    g.font = "italic 30px 'Segoe Script', 'Comic Sans MS', cursive";
    g.fillStyle = "rgba(60,30,26,0.9)";
    g.save(); g.translate(x + w - 10, Math.min(y + h - 30, yy + 26)); g.rotate(-0.06);
    g.textAlign = "right"; g.fillText("— Blackwood", 0, 0); g.restore();
  }
  // a tinta escondida: na FOTO sempre; na tela, só depois de fotografada (como lembrança)
  if (opts.revela || d.fotos.includes(pg.id)) {
    const forca = opts.revela ? 1 : 0.55;
    g.save();
    g.globalAlpha = 0.18 * forca;
    g.font = "italic 44px 'Segoe Script', 'Comic Sans MS', cursive";
    g.fillStyle = "rgb(110,30,26)";
    g.translate(x + w / 2, y + h / 2); g.rotate(-0.45);
    g.textAlign = "center";
    for (let k = -2; k <= 2; k++) g.fillText("Blackwood", 0, k * 120);
    g.restore();
    if (pg.oculto) {
      g.font = "italic 21px 'Segoe Script', 'Comic Sans MS', cursive";
      g.fillStyle = `rgba(120,30,26,${(0.85 * forca).toFixed(2)})`;
      const ls = diarioLinhas(g, tr(pg.oculto), w);
      let y2 = Math.min(y + h - 20 - (ls.length - 1) * 28, yy + 10);
      for (const ln of ls) { g.fillText(ln, x + 6, y2); y2 += 28; }
    }
  }
  g.restore();
  return yy - y;
}
function drawDiario() {
  const b = diarioRect(), d = diarioFlags();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "rgba(0,0,0,0.88)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // capa de couro
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.7)"; ctx.shadowBlur = 40; ctx.shadowOffsetY = 12;
  ctx.fillStyle = "#2a1d14";
  ctx.beginPath(); ctx.roundRect(b.x - 22, b.y - 18, b.w + 44, b.h + 36, 10); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = "rgba(120,90,60,0.35)"; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(b.x - 14, b.y - 10, b.w + 28, b.h + 20, 7); ctx.stroke();
  // as duas folhas
  const meio = b.x + b.w / 2;
  for (const lado of [0, 1]) {
    const px = lado === 0 ? b.x : meio + 6, pw = b.w / 2 - 6;
    const pap = ctx.createLinearGradient(px, 0, px + pw, 0);
    if (lado === 0) { pap.addColorStop(0, "#e4dac2"); pap.addColorStop(0.85, "#ebe2cc"); pap.addColorStop(1, "#cfc3a8"); }
    else { pap.addColorStop(0, "#cfc3a8"); pap.addColorStop(0.15, "#ebe2cc"); pap.addColorStop(1, "#e4dac2"); }
    ctx.fillStyle = pap; ctx.fillRect(px, b.y, pw, b.h);
    // pautas fracas
    ctx.strokeStyle = "rgba(90,70,50,0.07)"; ctx.lineWidth = 1;
    for (let yy = b.y + 70; yy < b.y + b.h - 30; yy += 26) { ctx.beginPath(); ctx.moveTo(px + 30, yy); ctx.lineTo(px + pw - 30, yy); ctx.stroke(); }
    // manchas de idade
    ctx.fillStyle = "rgba(120,90,40,0.06)";
    ctx.beginPath(); ctx.ellipse(px + pw * (lado ? 0.8 : 0.2), b.y + b.h * 0.85, 60, 30, 0.4, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(px + pw * (lado ? 0.3 : 0.7), b.y + 40, 40, 18, -0.3, 0, 7); ctx.fill();
  }
  // o vinco
  const sp = ctx.createLinearGradient(meio - 30, 0, meio + 30, 0);
  sp.addColorStop(0, "rgba(40,28,16,0)"); sp.addColorStop(0.5, "rgba(40,28,16,0.55)"); sp.addColorStop(1, "rgba(40,28,16,0)");
  ctx.fillStyle = sp; ctx.fillRect(meio - 30, b.y, 60, b.h);
  // a fita marcadora
  ctx.fillStyle = "rgba(120,30,30,0.85)";
  ctx.fillRect(meio + b.w / 2 - 70, b.y - 18, 14, 60);
  // nome do caderno (muda quando a autoria aparece)
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.font = "bold 13px 'Courier New', monospace";
  ctx.fillStyle = d.revelado ? "rgba(214,120,110,0.95)" : "rgba(200,190,170,0.8)";
  ctx.fillText(d.revelado ? "DIÁRIO DE BLACKWOOD" : "DIÁRIO", canvas.width / 2, b.y - 34);
  // as páginas
  const mg = 48, pw2 = b.w / 2 - 6 - mg * 2;
  for (const lado of [0, 1]) {
    const pg = diarioPaginaAberta(lado);
    const px = (lado === 0 ? b.x : meio + 6) + mg;
    if (pg) diarioDesenhaPagina(ctx, pg, px, b.y + 30, pw2, b.h - 60);
    else if (lado === 1 || !d.paginas.length) {
      ctx.font = "italic 16px 'Segoe Script', 'Comic Sans MS', cursive";
      ctx.textAlign = "center"; ctx.fillStyle = "rgba(90,78,62,0.45)";
      ctx.fillText(d.paginas.length ? "(em branco — por enquanto)" : "(em branco)", px + pw2 / 2, b.y + b.h / 2);
    }
    // número da página
    const n = diarioSpread * 2 + lado + 1;
    ctx.font = "italic 13px 'Segoe Script', 'Comic Sans MS', cursive";
    ctx.textAlign = lado ? "right" : "left"; ctx.fillStyle = "rgba(90,78,62,0.55)";
    ctx.fillText(String(n), lado ? px + pw2 : px, b.y + b.h - 18);
  }
  // setas
  const total = diarioSpreads();
  ctx.font = "bold 40px 'Courier New', monospace"; ctx.textAlign = "center";
  ctx.fillStyle = diarioSpread > 0 ? "rgba(230,220,200,0.85)" : "rgba(230,220,200,0.2)";
  ctx.fillText("‹", b.x - 50, b.y + b.h / 2);
  ctx.fillStyle = diarioSpread < total - 1 ? "rgba(230,220,200,0.85)" : "rgba(230,220,200,0.2)";
  ctx.fillText("›", b.x + b.w + 50, b.y + b.h / 2);
  // botão FOTOGRAFAR A PÁGINA
  const pode = diarioPodeFotografar(), F = DIA_FOTO;
  const hov = mouse.x >= F.x && mouse.x <= F.x + F.w && mouse.y >= F.y && mouse.y <= F.y + F.h;
  ctx.fillStyle = pode ? (hov ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)") : "rgba(255,255,255,0.03)";
  ctx.fillRect(F.x, F.y, F.w, F.h);
  ctx.strokeStyle = pode ? (hov ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.5)") : "rgba(255,255,255,0.2)";
  ctx.lineWidth = 2; ctx.strokeRect(F.x, F.y, F.w, F.h);
  ctx.font = "bold 15px 'Courier New', monospace";
  ctx.fillStyle = pode ? "rgba(235,235,235,0.95)" : "rgba(160,160,160,0.6)";
  ctx.fillText(!pode ? "FOTOGRAFAR — precisa de flash e filme"
               : touchUI.seen ? "FOTOGRAFAR A PÁGINA" : "FOTOGRAFAR A PÁGINA (P)",
               F.x + F.w / 2, F.y + F.h / 2 + 1, F.w - 16);
  // fechar (o mesmo botão dos outros painéis)
  drawOverlayClose();
  ctx.font = "bold 11px 'Courier New', monospace"; ctx.fillStyle = "rgba(190,170,140,0.75)";   // na borda de couro
  ctx.fillText(touchUI.seen ? "toque nas bordas para folhear" : "← → folhear · J ou ESC fecha", canvas.width / 2, b.y + b.h + 9);
}
function diarioHit(mx, my) {
  if (overlayCloseHit(mx, my)) { state = diarioReturn; return; }
  const F = DIA_FOTO;
  if (mx >= F.x && mx <= F.x + F.w && my >= F.y && my <= F.y + F.h) { diarioFotografa(); return; }
  const b = diarioRect();
  if (my >= b.y - 20 && my <= b.y + b.h + 20) {
    if (mx < b.x + 30) { diarioFolheia(-1); return; }
    if (mx > b.x + b.w - 30) { diarioFolheia(1); return; }
  }
}
function diarioFolheia(dir) {
  const n = Math.max(0, Math.min(diarioSpreads() - 1, diarioSpread + dir));
  if (n !== diarioSpread) { diarioSpread = n; sfxPage(); }
}
function diarioTecla(code) {
  if (code === "Escape" || code === "KeyJ" || code === "KeyF") { state = diarioReturn; return; }
  if (code === "ArrowLeft" || code === "KeyA") diarioFolheia(-1);
  else if (code === "ArrowRight" || code === "KeyD") diarioFolheia(1);
  else if (code === "KeyP") diarioFotografa();
}

// ------------------------------------------------------------------
// FOTOGRAFAR A PÁGINA: a emulsão lê a tinta que o olho não lê
// ------------------------------------------------------------------
function diarioPodeFotografar() {
  const cm = world.flags.cam;
  return !!(cm.tampa && world.flags.filmLoaded && film > 0 && bateria > 0 && flashCd <= 0 &&
            (diarioPaginaAberta(0) || diarioPaginaAberta(1)));
}
function diarioFotografa() {
  if (!diarioPodeFotografar()) { sfxDry(); return false; }
  const pg = diarioPaginaAberta(0) || diarioPaginaAberta(1);
  film--; bateria--; photoCount++;
  flashCd = FLASH.cooldown; flashT = 0.6; attractT = ECO.atraiFlash;   // é um clarão: a casa ouve
  sfxCamera();
  if (bateria <= 0) bateriaAcabou();
  const cv = diarioFotoCanvas(pg);
  const ent = { cv, caption: `FOTO ${photoCount} · ${FLOOR_NAMES[world.cur]}`,
                almas: 0, armazenadas: 0, marcas: [], t: world.timeSec,
                pistas: ["o diário"], pista: true, fita: "diario",
                escuro: false, sepia: true, quimica: null, semFilme: !!FOTO.rapido };
  album.push(ent); albumLimita();
  if (typeof polaroidEjeta === "function") polaroidEjeta(cv);
  const d = diarioFlags();
  if (!d.fotos.includes(pg.id)) d.fotos.push(pg.id);
  diarioRevelouPorFoto();
  saveRun();
  return true;
}
// a polaroid da página: o papel do caderno com a tinta escondida por cima
function diarioFotoCanvas(pg) {
  const PW = 576, PH = 406, FR = 22, BOT = 66;
  const cv = document.createElement("canvas");
  cv.width = PW + FR * 2; cv.height = PH + FR + BOT;
  const c = cv.getContext("2d");
  const pap = c.createLinearGradient(0, 0, 0, cv.height);
  pap.addColorStop(0, "#efe9db"); pap.addColorStop(1, "#e2dac6");
  c.fillStyle = pap; c.fillRect(0, 0, cv.width, cv.height);
  c.strokeStyle = "rgba(90,80,60,0.25)"; c.lineWidth = 1.5;
  c.strokeRect(0.75, 0.75, cv.width - 1.5, cv.height - 1.5);
  // a página, de perto, meio torta sobre o escuro
  c.fillStyle = "#0a0806"; c.fillRect(FR, FR, PW, PH);
  c.save();
  c.beginPath(); c.rect(FR, FR, PW, PH); c.clip();
  c.translate(FR + PW / 2, FR + PH / 2); c.rotate(-0.04);
  const fw = PW * 0.86, fh = PH * 1.25;
  const fol = c.createLinearGradient(-fw / 2, 0, fw / 2, 0);
  fol.addColorStop(0, "#d9cfb6"); fol.addColorStop(0.5, "#e6dcc5"); fol.addColorStop(1, "#cdbfa2");
  c.fillStyle = fol; c.fillRect(-fw / 2, -fh / 2, fw, fh);
  diarioDesenhaPagina(c, pg, -fw / 2 + 34, -fh / 2 + 70, fw - 68, fh - 90, { revela: true, tinta: "rgba(40,30,24,0.8)" });
  // a luz dura do flash no papel
  const vg = c.createRadialGradient(0, 0, PH * 0.2, 0, 0, PH * 0.75);
  vg.addColorStop(0, "rgba(255,250,235,0.12)"); vg.addColorStop(1, "rgba(0,0,0,0.55)");
  c.fillStyle = vg; c.fillRect(-PW, -PH, PW * 2, PH * 2);
  c.restore();
  if (typeof filmePass === "function" && !FOTO.rapido) filmePass(cv, FR, FR, PW, PH, false);
  c.strokeStyle = "rgba(60,52,40,0.5)"; c.lineWidth = 1;
  c.strokeRect(FR - 0.5, FR - 0.5, PW + 1, PH + 1);
  return cv;
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

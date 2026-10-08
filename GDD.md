# HUNTED MANSION — Documento de Design

> Base: protótipo OBSCURA (index.html desta pasta). O jogo publicado fica congelado;
> este é testado localmente.

## Premissa
Cinco amigos influencers invadem uma mansão "mal assombrada" para gravar conteúdo.
A casa é assombrada DE VERDADE. As portas trancam. Para sair, é preciso vasculhar,
fotografar, resolver os enigmas da casa — e entender o que aconteceu ali.

## Tema que amarra tudo: A CÂMERA APRISIONA
O antigo dono era um fotógrafo obcecado: suas fotos **capturavam almas**. Os
fantasmas da casa são as vítimas presas no filme dele. O grupo encontra o
portão e a porta da mansão ABERTOS — e a câmera antiga **caída na entrada,
como se esperasse por eles**. É a câmera do Fotógrafo: a casa a oferece para
atrair o próximo retratista (isso alimenta o final ruim). Por isso o flash
machuca os espíritos. O enredo, as mecânicas e o final fecham nesse tema.

---

## 1. A CASA (procedural, persistente, 5 andares + porão)
- Gerada inteira por seed no início da run: 6 grades (porão, térreo, 1º-4º).
- **Persistente**: tudo que mudou (porta aberta, item pego, puzzle resolvido,
  parede revelada) fica salvo no estado da run. Ir e vir é o jogo.
- Conexões verticais:
  - **Escadaria principal** (térreo→4º, mas degraus quebrados bloqueiam trechos
    até achar tábuas/atalho);
  - **Elevador antigo central** — só liga com fusíveis achados (3 espalhados);
    range: porão→4º; é barulhento: usar o elevador ATRAI a entidade;
  - **Dumbwaiter** (elevadorzinho de comida): só itens — manda objetos entre
    cozinha (térreo) e quartos (3º) sem carregar;
  - **Passagens secretas**: atrás de estantes/lareiras, reveladas por foto ou
    pela vela (ver §4).
- Cada andar tem identidade e UMA REGRA própria (ver §6).
- **Porão**: breu absoluto, zona final, quarto escuro de revelação (§3.6).
- **Sala da Live** (térreo): sala segura — luz, tomada, mural de pistas (§5),
  único lugar onde o grupo "respira".

## 2. PROTAGONISTA SOLO (decisão: jogo solo por enquanto)
UM youtuber sozinho na mansão. As habilidades que seriam dos amigos viram
EQUIPAMENTOS encontráveis pela casa — deixados por exploradores anteriores
que nunca saíram (lore de graça: outros influencers vieram antes):
- **Headphone quebrado**: capta sussurros → "radar" sonoro de entidades;
- **Espelhinho de bolso**: olhar rápido para trás;
- **Powerbank**: recarrega a bateria da câmera;
- **Lupa de joalheiro**: zoom/aprimoramento na análise de fotos do álbum.
Cada equipamento achado perto dos pertences de um "explorador anterior"
(mochila abandonada, tripé caído…) — e a foto DELE pode estar no estúdio do
porão, entre as fotos-prisão. (A ideia de party/amigos fica no banco §9 para
um futuro modo cooperativo.)

## 3. A CÂMERA (mecânica central, expandida)
1. **Fotos revelam o invisível**: símbolos, mensagens, passagens e entidades que
   NÃO aparecem no mapa aparecem na foto. Paredes "vazias" no jogo escondem
   coisas que só o filme enxerga.
1b. **Paredes FALSAS (inverso)**: no jogo parecem parede normal, mas NA FOTO o
   lugar aparece vazio/como passagem — a foto denuncia que dá para atravessar.
   É o principal jeito de achar passagens secretas ao longo da run.
2. **Álbum analisável**: zoom/pan dentro da foto; pontos de interesse clicáveis
   (um código riscado, um rosto na janela, um quadro torto) viram pistas
   anotadas no mural. A Nina melhora a resolução da análise.
3. **Fotos que MUDAM**: certas fotos se alteram entre visitas ao álbum — uma
   figura mais perto a cada reabertura; uma mensagem que se completa. Rever o
   álbum é assustador por design.
4. **Lentes/filtros encontráveis**:
   - **UV**: mensagens invisíveis (sangue/tinta);
   - **Infravermelho**: "calor" residual — mostra por onde algo passou há pouco;
   - **Lente rachada do Fotógrafo**: fotografa O PASSADO da sala (a sala
     mobiliada de 1950) — compare com o presente para achar o que mudou.
5. **Timer/autofoto**: apoiar a câmera e disparar com atraso — fotografa o que
   está ATRÁS de você / te seguindo.
6. **Quarto escuro (porão)**: fotos especiais saem "não reveladas" (quadro
   preto no álbum); precisam ser reveladas nas bacias do porão. Risco:
   carregar filme não revelado até lá; morrer no caminho perde o filme.
7. **Flash tático** (herdado do protótipo): dissolve espíritos, MAS atrai; e
   congela as **estátuas** (weeping angels) que só andam no escuro.
8. **Bateria** no lugar de "filme": fotos, lanterna e filtros gastam bateria;
   tomadas funcionais são raras e marcadas no automapa.

## 4. LUZ E PERCEPÇÃO
- **Lanterna** (cone, como hoje) vs **vela**: a vela ilumina 360º fraco e a
  CHAMA INCLINA com corrente de ar → detector de passagem secreta.
- **Ecolocalização**: no breu total (porão), bater palmas/arremessar objeto
  "acende" o ASCII ao redor por 1s em onda.
- **O Fotógrafo** (entidade principal): silhueta com tripé. Ele te ENQUADRA
  (um retângulo de luz varre a sala); se o flash DELE dispara com você no
  quadro, parte de você é capturada (sanidade máxima diminui e uma foto SUA
  aparece no álbum… tirada por ele). Esconder-se/quebrar linha de visão.

## 5. PUZZLES (overlay que pausa o jogo)
Âncora: todo puzzle resolvido dispara um **flash do passado** — uma foto antiga
surge sozinha no álbum, contando um capítulo da família (enredo sem diálogo).
Lista inicial (cada um numa tela própria):
- **Cofre de dial** (código espalhado em 3 fotos de cantos diferentes da casa);
- **Piano** (ouvir a melodia fantasma, repetir as teclas);
- **Relógio de pé** (ajustar para a hora vista na lápide/fotografia);
- **Quadro de fusíveis** (mini circuito: ligar porão→elevador sem estourar);
- **Retratos da família** (reordenar na parede por idade — os olhos seguem);
- **Caixa de música** (engrenagens faltando, ordenar cilindro);
- **Espelho quebrado** (girar cacos até recompor o reflexo — que não é o seu);
- **Lanterna mágica** (sobrepor 2 slides no projetor forma o símbolo da adega);
- **Tabuleiro ouija** (soletra dica quando perguntado no lugar certo — input de
  palavras simples, dicionário mínimo).
- **Mural de pistas** (meta-puzzle na Sala da Live): fixar fotos e ligar com
  barbante; ligações corretas desbloqueiam deduções ("o quarto do menino fica
  ATRÁS da estante do estúdio").

## 6. REGRAS POR ANDAR (variedade barata e tensão)
Cada andar tem uma regra arranhada em algum lugar — quebrar chama a entidade:
- Térreo: "NÃO DEIXE PORTAS ABERTAS" (portas abertas atraem);
- 1º: "ELA ODEIA LUZ FORTE" (flash proibido fora de emergência);
- 2º: "NÃO CORRA" (andar range, correr acorda o chão);
- 3º: "NÃO FOTOGRAFE OS ESPELHOS";
- 4º: "APAGUE SUA LUZ QUANDO O RELÓGIO BATER" (badaladas periódicas);
- Porão: sem regra escrita. (A regra é: não haja regra que te salve.)

## 6b. MOBÍLIA E SALAS MAIORES
- Salas bem maiores que no protótipo (a casa precisa parecer uma mansão).
- **Móveis como obstáculos**: no mapa aparecem como caracteres próprios em
  AMARELO (mesma família visual das paredes) — ex.: ▬ sofá, ◘ mesa, ♪ piano,
  ▯ estante, † cadeira. Têm colisão (ou cobertura para se esconder).
- **Na foto, o móvel aparece de verdade**: o raycaster desenha o sprite real
  (sofá, estante, piano...) no lugar do caractere — a foto "traduz" a casa.
- Móveis participam das mecânicas: estante esconde passagem, sofá serve de
  esconderijo do Fotógrafo, espelho de parede entra na regra do 3º andar.

## 7. A LIVE (HUD diegético + dicas + economia)
- Canto da tela: contador de **viewers** + um **chat falso** rolando.
- **Clicar/tocar na live PAUSA o jogo** e abre o chat em tela cheia: histórico
  completo rolável (as dicas que passaram não se perdem), fechar despausa.
- O chat é o sistema de dicas: mensagens curtas misturam troll e verdade
  ("ATRÁS DE VOCÊ", "esse quadro tava torto na outra sala", "volta no piano").
- Viewers sobem quando algo assustador acontece perto → tensão recompensada.
  Views = "engajamento" que desbloqueia cosméticos/upgrades leves da câmera.
- O chat também é o VEÍCULO DA LORE: espectadores especulam a história em
  1 linha ("gente a família sumiu em 54, procurem no jornal").

## 8. HISTÓRIA (ambiental, progressiva, sem textões)
- Ato 1 — Portas trancam; achar os amigos; aprender a câmera. Lore: a casa era
  de um retratista famoso; clientes "nunca mais foram vistos".
- Ato 2 — Os flashes do passado (puzzles) montam a tragédia: o Fotógrafo
  descobriu que o filme certo PRENDE a alma; a própria família foi o teste.
- Ato 3 — O estúdio secreto no porão: as fotos-prisão na parede (cada fantasma
  do jogo tem SUA foto lá). A câmera que o grupo CARREGA é a do Fotógrafo —
  encontrada "largada" na entrada. A casa a entregou de propósito.

## 8b. INTRO EM QUADRINHOS (6 painéis, imagens geradas no Gemini)
Sequência de abertura, uma imagem por vez com fade, falas CURTAS desenhadas
PELO JOGO por cima (não gerar texto na imagem).
**MIGRAÇÃO DE ESTILO**: o painel 1 é 100% CARTOON colorido e alegre; a cada
painel a cor é drenada, o traço fica nervoso e a hachura toma conta, até o
painel 6 ser 100% o estilo do jogo (nanquim rabiscado, P&B + acento âmbar,
grão pesado). O jogador VÊ o mundo escurecendo conforme entra.
1. (cartoon total, fim de tarde dourado) ele animado diante do portão aberto;
2. (cartoon desbotando, sombras compridas) gravando a abertura do vlog no
   terreno, a sombra da mansão sobre ele — painel das falas;
3. (meio-termo: nanquim entrando, cor escorrendo) PORTA ABERTA e a câmera
   antiga CAÍDA na soleira — painel-chave, sem pessoas;
4. (quase nanquim, resta o âmbar) close das mãos pegando a câmera;
5. (estilo do jogo ~90%) ele atravessando a porta, sombra esticada errada;
6. (estilo do jogo 100%) por dentro: a fresta de luz se FECHANDO, o celular
   no gimbal caído iluminando de baixo.
Prompts prontos em `intro-prompts.md` (bloco de gradiente por painel).
- **Finais**:
  1. **Fuga** — abrir a porta e sair: os amigos escapam, a casa continua;
  2. **Libertação** — queimar as fotos-prisão no quarto escuro: fantasmas
     libertos ajudam na fuga final (perseguição com aliados);
  3. **O Novo Fotógrafo** (ruim) — se você "capturou" espíritos demais na run,
     a câmera não te solta: a última foto do álbum é você, de dentro da parede.

## 9. EXTRAS (banco de ideias)
- NG+ com mesma seed: a casa "lembra"; suas fotos da run anterior aparecem
  espalhadas pela casa.
- Álbum com espaço limitado: descartar fotos é decisão (pista vs prova).
- Entidades menores temáticas por andar (a Governanta no 2º, o Menino no 3º…),
  cada uma com comportamento e contramedida próprios.
- Fotografar TODOS os fantasmas (bestiário fotográfico) = conquista/galeria.
- Modo foto "selfie com fantasma" raríssimo: se um espírito aparece no quadro
  sem te ver, a foto vale o dobro de viewers.

## 10. PRIMEIRO MARCO (fatia vertical sugerida)
1. Mansão 6 andares persistente + escadaria + elevador com fusíveis;
2. Câmera expandida: foto revela o invisível + álbum com zoom/análise;
3. 2 puzzles (cofre de dial + quadro de fusíveis) com overlay;
4. Chat da live básico (dicas + lore em 1 linha);
5. 1 entidade (o Fotógrafo) + estátuas congeláveis.

## 11. AS 7 CORRENTES (sistema central — decidido 2026-10-02)
A porta da frente tem, além da fechadura, um SELO: 7 correntes espectrais
visíveis SÓ NA FOTO (uma por alma presa). Chave + todas as correntes
quebradas = saída. Cada alma resolvida (libertada OU queimada) quebra uma.

### A câmera por PEÇAS (HUD no canto, silhueta que se completa)
- Início: corpo + flash. Flash ESPANTA (arremessa/atordoa) mas nada salva.
- TAMPA (hall de entrada, minutos iniciais): fotos salvam/revelam/capturam.
- LENTE NOVA (sala secreta do TÉRREO — fora do cofre: o código do cofre
  vem das marcas, e marca sem lente é ilegível, seria beco sem saída):
  antes dela a foto sai RACHADA — vê-se que há algo escrito, não O QUÊ.
  Destrava dígitos e sinais.
- OBTURADOR DE PRATA (junto da chave, secreta do porão): capturar ALMAS.
- LENTE DO PASSADO (fatia 3, ateliê): foto mostra o cômodo décadas atrás.
- FILME É ESCOLHA: R (ou toque na câmera) põe/tira o rolo. SEM filme =
  flash de graça que só espanta; COM filme = registra/captura e gasta 1.
  Fantasma forte sem filme no clique: só é jogado para trás.

### O loop de resgate (ensina o tema "a câmera aprisiona")
1. CONDIÇÃO desperta a alma (ela passa a vagar);
2. achar o RETRATO aprisionador (invisível; a foto denuncia; chat insiste);
3. com retrato na mão + obturador + filme: FOTOGRAFAR a alma = sugá-la
   para o retrato (você faz o MESMO que o Blackwood; o chat nota);
4. QUARTO ESCURO (porão, sala fixa ao lado do poço): REVELAR (minigame
   3 banhos com agulha/zona; liberta, +1 filme máx, apazigua o andar da
   alma, quebra corrente) ou QUEIMAR (atalho sem puzzle; quebra corrente,
   destrói a alma, chat horrorizado, andar NÃO apazigua) ou GUARDAR
   (não revelar nada = caminho do final secreto).

### As 7 almas (nome · despertar · nota)
1. TOMÁS, menino do esconde-esconde · entrar na 1ª sala secreta · FOGE,
   nunca ataca; retrato no berço. [IMPLEMENTADO fatia 1]
2. CECÍLIA, a noiva · fotografar um espelho específico (aparece primeiro
   no REFLEXO da foto) · só se aproxima quando não enquadrada.
3. SEU BENTO, o zelador · ligar o quadro (3/3) · passos pesados, atraído
   pelo som do flash; retrato no poço do elevador.
4. OLÍVIA, a pianista · fotografar 7 ECOS · um piano toca sozinho — siga
   o som; segura enquanto a música toca, ataca no silêncio.
5. O HÓSPEDE SEM ROSTO · fotografar o SINAL na parede (olho riscado, só
   sai na foto) · na foto ele tem o SEU rosto.
6. MADAME AURORA, a mãe · libertar 3 almas · aparece onde você já
   fotografou; a primeira presa, origem de tudo.
7. BLACKWOOD, o fotógrafo · quebrar as outras 6 · boss no ATELIÊ (5º
   andar, escada selada, SÓ elevador) — elevador vira obrigatório; cada
   alma livre reduz as fotos necessárias para encurralá-lo.

### Fantasmas comuns = ECOS
Vultos sem história (os atuais). Flash sem filme: empurrão+stun. Com
filme: capturados (somem e respawnam). Andar de alma LIBERTADA fica
apaziguado: ecos não perseguem nem machucam.

### Chat com INSISTÊNCIA (decidido 2026-10-02)
Dica de proximidade não é mais única: a cada nova passada pelo segredo
ignorado o tom sobe — 1ª dica normal, 2ª com ênfase ("ALI! ALI!!"),
3ª+ rajada de 2-3 viewers GRITANDO. Rearma quando o jogador se afasta.
Categorias: parede falsa, marca, cofre, quadro, retrato visto, peça ✦.

### Finais (fatia 3)
- REVELAR todos → "Alvorada": as almas abrem a porta com você.
- QUEIMAR (qualquer) → mancha a rota; todos queimados = "Cinzas".
- GUARDAR tudo e aceitar a câmera de Blackwood → "O Novo Fotógrafo".

### Fatias
1. [FEITA] peças tampa/lente/obturador + filme pôr/tirar + HUD câmera +
   selo 7 correntes + Tomás completo + quarto escuro + insistência.
   CHAINS_NEEDED=1 (sobe conforme almas entram).
2. [FEITA] Almas 2-6: Cecília (espelho/reflexo, congela sob mira), Seu Bento
   (chave geral, passos pesados, flash o enfurece), Olívia (7 ecos, ciclo
   música-segura/silêncio-caça, sfxPiano), Hóspede (sinal na parede c/
   lente, rosto liso SEU na foto), Aurora (3 resolvidas, teleporta perto,
   nasce num andar já fotografado). CHAINS_NEEDED=6. Móveis-chave
   garantidos na geração (ensureFurn); retratos: berço/espelho/poço/
   piano/relógio/poltrona.
3. [FEITA] Ateliê no último andar (escada emparedada: penúltimo sem SOBE,
   último sem DESCE — só elevador), Blackwood boss (te enquadra: vinheta
   vermelha de aviso + flash dele rouba 15 de sanidade se houver LOS;
   capturável com autorretrato do cavalete; fotos necessárias = 1 +
   (6 - almas LIBERTADAS)), lente do passado (item no ateliê; foto perto
   de lugar de alma ganha lavagem sépia + legenda datada), 3 finais:
   ALVORADA (porta, todas livres) · CINZAS (porta, alguma queimada) ·
   O NOVO FOTÓGRAFO (sentar na cadeira com Blackwood no negativo).

## 12. A CASA REAGE (leva de 2026-10-02 — vinda dos estudos de Fear & Hunger e Inscryption)

Princípio: ameaça ANUNCIADA, rara e cara; perda que fica; refúgio que cobra; a morte vira
conteúdo. Constantes em `js/core.js` (`BOTE`, `ECO`, `SAN_*`, `LAMP_*`); lógica nova em
`js/ritual.js`.

- **Bote dos ecos.** O eco não fere por encostar. A 4,8 células, com linha de visão, ele
  INSPIRA 1,15 s (olhos acendem, um aro vermelho se fecha, o som vem do lado dele) e salta em
  linha reta. Flash durante a inspiração corta o bote; sair da frente também. Um por vez — com
  dois ecos, o segundo salta antes de o flash recarregar. Menos ecos (3 porão, 1 térreo, 2 nos
  demais); fotografado, some por 50–80 s; ele só se arrasta até você se você faz barulho.
- **Feridas e lamparina.** A sanidade só volta sozinha até um teto (60). Cada golpe baixa o
  teto em 10 (marca âmbar na barra). A lamparina do hall de entrada cura tudo, tem 3 doses de
  óleo e cada descanso acorda mais um eco na casa. Os ecos não entram na luz dela. Quando o
  Blackwood acorda, ela apaga de vez.
- **A queda e o ritual.** Primeira vez que a sanidade zera: o visor do Fotógrafo se fecha, vem
  o clarão e o streamer acorda no hall com metade do filme — "ele já tem um negativo seu".
  Segunda vez: morte. A polaroid dele revela devagar e o jogador escreve a legenda do próprio
  retrato (uma de três frases).
- **Arquivo do canal.** O título é a página da live: lista as lives arquivadas e como cada uma
  terminou. Quem caiu vira quadro na parede do hall (só a foto mostra; atrás da moldura há um
  rolo) e um vulto de moletom no andar onde a live caiu.
- **O chat muda de tom.** Zoeira → inquieto → esvaziando → quase só ELE. `estudio54` é o
  espectador que nunca sai: escreve pouco, em minúsculas, só sobre enquadramento ("boa luz.",
  "essa ficou boa."). As almas acordadas escrevem com o próprio usuário. Com a sanidade no
  chão o chat chega comido; de relance, o contador mostra "1 assistindo".
- **Empurrão.** Quatro minutos sem progresso e um viewer que "pesquisou a casa" diz o ANDAR do
  próximo passo. Nunca o lugar: isso é da foto.
- **Únicos.** Cada alma tem corpo próprio na foto (o busto do retrato aprovado + corpo a
  nanquim com o traço dela), um traço no mapa e um som. O Hóspede, sem rosto, usa na foto o
  rosto do streamer. Cenários únicos: quarto escuro em vermelho, parede de sete molduras no
  ateliê (o placar da casa), grade do elevador, hall de ladrilho xadrez, sala secreta de tijolo.
- **Pistas no mundo.** Pegadas pequenas que entram na parede falsa; memória de planta (parede
  já vista fica como fantasma e apodrece em minutos); olhos que não existem com sanidade < 28.

## 13. O DIÁRIO, O MENINO E A LOUCURA (leva de 2026-10-05 — pedidos do Rodolfo)

- **O diário** (`js/diario.js`). Veio junto com a câmera, na soleira: a live já começa com ele
  (vinheta VIN-008). As páginas são RELATO em primeira pessoa de quem viveu a casa (lugar à mão no
  alto; nada de instrução — o que ensina vem do que aconteceu), muitas com uma foto pequena presa
  por um clipe na borda de cima da página (o texto contorna) mostrando a coisa de que falam;
  viram com a animação do álbum. Vem quase em branco e
  as páginas APARECEM conforme a casa é descoberta (tampa, lente, obturador,
  frasco, primeira sala secreta, primeiro vulto fotografado, a bancada, cada alma que acorda,
  o Blackwood acordando, o menino que acode, a primeira loucura). É o guia do jogador — e é
  do BLACKWOOD: conduz a prender os seis (queimar, nunca libertar: os livres o enfraquecem no
  ateliê), a encher o frasco "para ele" e, no fim, a SENTAR na cadeira com o negativo — a troca
  de corpo ("O Novo Fotógrafo"). Descoberta: capturado o Blackwood, a última página se
  escreve na frente do jogador e vem ASSINADA, o chat explode antes da escolha cadeira/porta —
  e nesse momento a tinta escondida das outras páginas aparece: a marca d'água "Blackwood" e
  frases que viram o sentido ("Encha-o para mim.", "Queime. Os livres me enfraquecem.", "Mãe."
  na página da Aurora). (O botão "fotografar a página" da 1ª versão saiu: o Rodolfo não o quis.) Pistas no texto: o deslize riscado "o último ~~sou~~ é o Fotógrafo", a
  hostilidade às velas e à libertação, saber demais sobre cada retrato. Tecla J; no toque, o
  botão do caderno. Os finais sabem do diário (linha extra; o chat cobra quem leu e sentou).
- **Velocidade dos ecos de volta a 3,6** (os 2,4 "não ficaram bons"). **Baralho das imagens dos
  ecos**: nenhuma figura repete na foto até todas as 23 terem saído; só então embaralha de novo
  (`ecoCarta`/`ecoSpriteDe`, `flags.ecoBaralho`).
- **Sanidade zero não derruba na hora** (`js/sanidade.js`):
  1. **Tomás acode** — uma vez por live, enquanto o menino ainda está na casa (nem preso,
     nem livre, nem queimado): tudo para, o breu fecha, ele aparece ao lado e conta
     ("…noventa e sete… cem. achei você."); a sanidade sobe até 45. Se ele ainda dormia,
     acorda ali. O diário avisa: "da próxima vez ele não estará lá".
  2. **Loucura** — a casa entra na cabeça: a imagem dobra e rasga, vinheta que pulsa com o
     coração, olhos e vultos que não existem, o chat com as vozes das almas (e "você"), a
     live esvaziando, o corpo tropeçando. A barra vira LOUCURA: o que resta de você em 70 s
     (cada alma da ampola é comida antes e compra 12 s). A LUZ segura: velas acesas e a
     lamparina (+6/s), cada clarão do flash (+10). Sanidade de volta a 30 = "você respira"
     (fica uma ferida). O tempo acaba = a queda e o ritual de sempre.
     A PRIMEIRA loucura escreve no diário "Escrito no escuro" (`louco: true`): a letra desanda a cada
     parágrafo (cresce, treme, engrossa, dobra), para num risco de tinta e, após um silêncio, volta calma com a luz.

## 14. O SANGUE NAS PAREDES E AS SAÍDAS DA LOUCURA (leva de 2026-10-08 — ideias do Rodolfo com ajustes meus)

- **Setas de sangue** (`js/sangue.js`). A casa escreve nas paredes para onde a história segue:
  `objetivoAtual()` (tampa → lente → marcas → cofre → obturador → ampola → bancada → retratos
  acordados → fusíveis/quadro → chave → espelho da Cecília → sinal → ateliê → porta) e, quando o
  objetivo é noutro andar, a escada ou o elevador. Até 5 setas por andar, nas curvas e bifurcações
  do caminho da escada ao objetivo, 8 células entre uma e outra, sempre numa parede lateral. Em sã
  consciência obedecem à **visão de cima abstrata**: o mapa não mostra nada; só a FOTO revela
  (sprite de sangue escorrido de 160×110, pista "seta de sangue", o chat reage na primeira:
  "isso é SANGUE?? tem uma SETA na parede…" / "a casa escreve. já disse.").
- **Na loucura você vê o que não via.** As setas trocam de dono: deixam de apontar a história e
  passam a apontar a **luz mais perto** (candelabro aceso ou apagável, lamparina) a partir de onde
  você está, e BRILHAM no mapa (clarão vermelho pulsando, até 14 células) — a casa te mostra a
  saída porque quer que você volte para ser pego de novo. Recalcula a cada 2 s.
- **Três saídas novas da loucura**, além da luz com alma e do flash:
  1. **Fechar os olhos** — parado (sem entrada de movimento), no escuro, sem flash nem golpe, por 10 s:
     as pálpebras fecham na tela e a casa perde o interesse. De olhos fechados (mais de 1,5 s) o eco
     não enxerga você nem dá o bote: vagueia e PASSA (é o que o Tomás fazia: "fechava os olhos até
     passar"). Ao abrir, quem estava em cima vai embora gasto. Um golpe zera a contagem.
  2. **Quebrar o espelho** — qualquer espelho da casa, só na loucura (`QUEBRAR O ESPELHO`); o da
     Cecília, enquanto ela dorme, não quebra ("tem alguém dentro").
  3. **Acender a vela com o que resta de você** — candelabro sem alma guardada, só na loucura.
  **O preço** (pedido do Rodolfo: "quebrar a loucura com esses métodos diminui a barra"): a ferida de
  sempre (teto −10) e a PRÓXIMA loucura 10 s mais curta (70 → 60 → 50 → … piso 30). Usar sempre o
  atalho é uma espiral: menos tempo são, menos tempo para sair. Medido (lote 8): duas feridas por
  atalho levavam o teto 60 ao piso 20 em dois usos — penhasco; ficou uma. Com dois atalhos o chat
  fixo avisa: "cada atalho encurta o corredor."
- **A borda vermelha** (`drawLoucuraTela`): a vinheta vira sangue que respira com o coração e AVANÇA
  para o centro conforme a loucura cresce (raio interno de 0,74·H até 0,24·H), com gotas escorrendo
  das três bordas, mais compridas quanto pior; o WebGL soma vinheta. De olhos fechando, duas pálpebras
  pretas descem/sobem até se encontrarem.
- Vozes novas da loucura: Tomás ("quando eu me escondia, fechava os olhos até passar"), Cecília ("não
  olha o espelho. ou quebra antes que ele te olhe"), o estúdio ("o sangue na parede. agora você vê.").
- O robô humano conhece as três saídas (`humLoucura`); resultados em `estudos/robo-humano-resultados.md`.

# Prompts para o Gemini — 12 MÓVEIS (sprites das fotos)

## Como funciona no jogo
O jogo recorta o fundo PRETO automaticamente e usa a imagem como objeto na
foto 3D. Por isso as regras de imagem são rígidas (estão no bloco de estilo).

## Como usar
- Gere UMA imagem por prompt, em formato **QUADRADO (1:1)**.
- Gere a primeira (sofá) e **ANEXE ela em todas as seguintes** para manter o
  mesmo traço ("mesmo estilo de desenho da imagem anexada").
- Se sair texto, sombra no chão ou fundo que não seja preto puro, peça para
  regenerar citando a regra.
- Salve com ESTES nomes exatos (minúsculos) em `Hunted Mansion/Assets/Furniture/`:
  `sofa.png · mesa.png · estante.png · cadeira.png · piano.png · cama.png ·
   poltrona.png · bau.png · escrivaninha.png · relogio.png · espelho.png · berco.png`
- Colocou os arquivos → o jogo passa a usá-los sozinho (sem mexer em código).

## BLOCO DE ESTILO (cole no início de TODOS os prompts)
> Desenho de UM único objeto, centralizado, visto DE FRENTE ao nível dos olhos,
> estilo graphic novel de terror a nanquim: traço rabiscado nervoso e hachura
> densa. REGRAS OBRIGATÓRIAS: o fundo é PRETO ABSOLUTO (#000000), vazio, sem
> chão, sem parede, sem sombra projetada; o corpo do objeto é totalmente
> PREENCHIDO com cinza bem escuro (quase preto, mas nunca preto puro), e todo o
> traço, contorno e hachura são BRANCOS por cima; sem nenhum texto e sem marca
> d'água. O objeto ocupa quase todo o quadro. Formato quadrado 1:1.

## OS 12 OBJETOS (um prompt = bloco de estilo + a linha do objeto)

1. **sofa.png** — Um sofá vitoriano antigo de três lugares, estofado rasgado em
   alguns pontos, molas aparecendo em um assento, madeira entalhada nos braços.
2. **mesa.png** — Uma mesa de jantar quadrada robusta de madeira maciça, pernas
   torneadas grossas, tampo riscado e empoeirado.
3. **estante.png** — Uma estante alta e larga abarrotada de livros antigos
   tortos e apodrecidos, algumas prateleiras cedendo com o peso.
4. **cadeira.png** — Uma cadeira de madeira de encosto alto, levemente torta,
   com um dos pés lascado.
5. **piano.png** — Um piano vertical antigo com a tampa aberta, teclas
   amareladas faltando algumas, castiçal apagado em cima.
6. **cama.png** — Uma cama de casal antiga com cabeceira de ferro retorcido,
   colchão afundado e lençol caído de um lado.
7. **poltrona.png** — Uma poltrona de couro rasgada com enchimento saltando,
   marcas de unhas nos braços.
8. **bau.png** — Um baú de viagem antigo com reforços de metal, cadeado grande
   fechado, couro descascando.
9. **escrivaninha.png** — Uma escrivaninha de tampo inclinado com papéis
   amarelados espalhados e um tinteiro derrubado.
10. **relogio.png** — Um relógio de pé (grandfather clock) alto e estreito,
    mostrador com os ponteiros PARADOS, pêndulo imóvel visível pelo vidro.
11. **espelho.png** — Um espelho de pé oval com moldura ornamentada, o reflexo
    é apenas um borrão escuro e enevoado que não mostra nada definido.
12. **berco.png** — Um berço vitoriano de grades de madeira, um móbile parado
    pendurado acima, cobertor pequeno caído para fora.

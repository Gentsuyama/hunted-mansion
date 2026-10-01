# Prompts para o Gemini — 12 MÓVEIS (sprites das fotos do jogo)

## A direção de arte (importante entender)
Na FOTO do jogo, o cenário é realista (paredes de reboco, assoalho sujo) e
recebe por cima um tratamento de FITA VHS (tom âmbar lavado, scanlines, grão,
leve borrão). Os FANTASMAS são desenho a nanquim de propósito — eles são o
elemento "errado" na cena. Os MÓVEIS pertencem à casa: precisam parecer
MÓVEIS DE VERDADE fotografados no escuro com flash, para se fundirem ao
cenário depois do VHS. Portanto: nada de desenho/cartoon/nanquim aqui —
fotorrealismo sombrio.

## Regras técnicas (o jogo recorta o fundo sozinho)
- Formato **QUADRADO (1:1)**, objeto ÚNICO centralizado ocupando quase todo o quadro.
- Fundo **PRETO ABSOLUTO**, vazio: sem chão, sem parede, sem sombra projetada
  no chão, sem reflexo de ambiente.
- O objeto NÃO pode ter áreas em preto 100% (o recorte usa o preto do fundo):
  mesmo as sombras do próprio móvel devem ficar num cinza-escuro visível.
- Sem texto, sem marca d'água, sem moldura.

## Como usar
- Gere o **sofá primeiro**; nas 11 seguintes, **ANEXE a imagem do sofá** e
  escreva "mesmo estilo fotográfico, mesma iluminação da imagem anexada".
- 2-3 variações por objeto, escolha a melhor.
- Salve com ESTES nomes exatos (minúsculos) em `Hunted Mansion/Assets/Furniture/`:
  `sofa.png · mesa.png · estante.png · cadeira.png · piano.png · cama.png ·
   poltrona.png · bau.png · escrivaninha.png · relogio.png · espelho.png · berco.png`
- Colocou os arquivos → o jogo passa a usá-los automaticamente.

## BLOCO DE ESTILO (cole no início de TODOS os prompts)
> Fotografia analógica dos anos 1970 de um único móvel antigo, visto DE FRENTE
> ao nível dos olhos, num ambiente completamente escuro: o móvel é iluminado
> apenas por um FLASH frontal duro de câmera, que o deixa claro no centro com
> as bordas escurecendo. Preto e branco com leve tom quente envelhecido,
> contraste forte mas com meios-tons ricos, grão de filme bem visível, foco
> levemente suave como lente antiga. O móvel é de uma mansão vitoriana
> abandonada há 70 anos: madeira escura, poeira, teias finas, desgaste real.
> REGRAS: fundo preto absoluto e vazio (sem chão, sem parede, sem sombra
> projetada); nenhuma parte do móvel em preto 100% — sombras do móvel em
> cinza-escuro visível; objeto único centralizado ocupando quase todo o
> quadro; sem texto, sem marca d'água. Formato quadrado 1:1.

## OS 12 OBJETOS (um prompt = bloco de estilo + a linha do objeto)

1. **sofa.png** — O móvel é um sofá vitoriano de três lugares com estofado de
   veludo surrado e rasgado em dois pontos, uma mola exposta num assento,
   madeira entalhada escura nos braços e pés.
2. **mesa.png** — O móvel é uma mesa de jantar quadrada e robusta de madeira
   maciça escura, pernas torneadas grossas, tampo coberto por uma camada fina
   de poeira com riscos antigos.
3. **estante.png** — O móvel é uma estante alta abarrotada de livros antigos
   de couro, tortos e inchados de umidade, com uma prateleira cedendo e teias
   finas entre os volumes.
4. **cadeira.png** — O móvel é uma cadeira de jantar de madeira escura com
   encosto alto entalhado, levemente inclinada por causa de um pé lascado.
5. **piano.png** — O móvel é um piano vertical antigo com a tampa aberta,
   teclas de marfim amareladas com duas faltando, e um castiçal de latão
   escurecido em cima.
6. **cama.png** — O móvel é uma cama de casal com cabeceira alta de ferro
   retorcido, colchão listrado afundado no meio e um lençol encardido caindo
   por um dos lados.
7. **poltrona.png** — O móvel é uma poltrona de couro escuro rachado com o
   enchimento saltando por um rasgo no braço, assento afundado com a marca de
   alguém que sentou ali por décadas.
8. **bau.png** — O móvel é um baú de viagem antigo com reforços e cantoneiras
   de metal oxidado, couro descascando e um cadeado pesado fechado na frente.
9. **escrivaninha.png** — O móvel é uma escrivaninha antiga de tampo
   inclinado com papéis amarelados espalhados e um tinteiro de vidro tombado,
   com a mancha seca de tinta.
10. **relogio.png** — O móvel é um relógio de pé (grandfather clock) alto e
    estreito de madeira escura, mostrador de esmalte rachado com os ponteiros
    PARADOS, pêndulo de latão imóvel visível pelo vidro empoeirado.
11. **espelho.png** — O móvel é um espelho de pé oval com moldura dourada
    ornamentada e manchada; o vidro está embaçado e manchado de forma que o
    reflexo é só um borrão escuro indistinto — sem mostrar nada reconhecível.
12. **berco.png** — O móvel é um berço vitoriano de grades de madeira torneada
    com um móbile parado pendurado acima e um cobertor pequeno de tricô caído
    para fora, metade dentro metade fora.

"use strict";
// ==================================================================
// INTERIORES — cada sala vira um CÔMODO com a lógica de uma casa.
//
// Antes, cada sala sorteava um tipo e espalhava 1–5 móveis ao acaso pelo
// meio. Agora:
//   1. o PROGRAMA da casa dá um cômodo a cada sala conforme o andar e o
//      tamanho (térreo: estar, jantar, biblioteca, copa; andares: quartos,
//      berçário, sala de música, escritório; porão: adega e depósito;
//      último andar: sótão) — e garante as peças de que as almas precisam
//      onde a história as procura (berço no 1º andar, espelho no 2º, piano
//      e poltrona no 3º);
//   2. cada cômodo é MOBILIADO por regras: móvel de parede com as costas na
//      parede (cama pela cabeceira, piano pelo tampo, estante pelo fundo),
//      conjuntos no centro (mesa de jantar com cadeiras em volta, sofá
//      virado para a parede de foco com a mesinha e as poltronas), nada na
//      frente de uma porta nem da passagem secreta;
//   3. a circulação é conferida: todo chão livre do cômodo continua ligado
//      às portas; peça que fecha um canto é retirada.
// Cada móvel ganha `rot` (0–3, quartos de volta no sentido horário) e o mapa
// o desenha girado; o footprint gira junto. A foto continua mostrando o
// móvel como ele é — só a posição vem daqui.
// ==================================================================

// para onde ficam as COSTAS de cada móvel no desenho sem giro (rot 0):
// N = topo. O piano tem o teclado à esquerda, logo as costas à direita.
const FURN_COSTAS = { sofa: 0, cadeira: 0, poltrona: 0, cama: 0, escrivaninha: 0, estante: 0,
                      relogio: 0, espelho: 0, bau: 0, berco: 0, mesa: 0, piano: 1 };
const DIR_N = 0, DIR_E = 1, DIR_S = 2, DIR_W = 3;

// o que cada cômodo tem: `parede` (lista de [tipo, chance]) e `centro`
// com o que cada cômodo se COMPLETA quando a sala é grande (sorteado até o alvo)
const COMPLEMENTO = {
  estar: ["estante", "poltrona", "cadeira", "mesa", "bau"],
  jantar: ["estante", "cadeira", "bau", "relogio"],
  biblioteca: ["estante", "estante", "cadeira", "poltrona", "bau"],
  escritorio: ["estante", "cadeira", "bau", "poltrona"],
  copa: ["estante", "bau", "cadeira", "mesa"],
  saleta: ["poltrona", "cadeira", "estante", "mesa", "bau"],
  quarto: ["estante", "cadeira", "bau", "poltrona", "espelho", "mesa"],
  bercario: ["cadeira", "bau", "estante", "poltrona", "espelho"],
  musica: ["cadeira", "cadeira", "poltrona", "estante", "bau"],
  banheiro: ["cadeira", "bau"],
  deposito: ["bau", "estante", "cadeira", "bau", "mesa", "espelho"],
  adega: ["estante", "bau", "bau", "cadeira"],
  sotao: ["bau", "estante", "cadeira", "espelho", "bau", "poltrona", "mesa"],
};
const COMODOS = {
  estar:      { parede: [["relogio", 0.9], ["estante", 0.8], ["piano", 0.45], ["estante", 0.4], ["poltrona", 0.5]], centro: "estar" },
  jantar:     { parede: [["estante", 0.9], ["relogio", 0.5], ["estante", 0.5]], centro: "jantar" },
  biblioteca: { parede: [["estante", 1], ["estante", 1], ["estante", 0.8], ["escrivaninha", 0.95], ["poltrona", 0.7], ["relogio", 0.4], ["estante", 0.5]] },
  escritorio: { parede: [["escrivaninha", 1], ["estante", 0.9], ["relogio", 0.6], ["bau", 0.5], ["poltrona", 0.4], ["estante", 0.4]] },
  copa:       { parede: [["estante", 1], ["estante", 0.8], ["bau", 0.7], ["cadeira", 0.4]], centro: "copa" },
  saleta:     { parede: [["relogio", 0.9], ["poltrona", 0.9], ["poltrona", 0.7], ["estante", 0.5], ["espelho", 0.4]], centro: "mesinha" },
  quarto:     { parede: [["cama", 1], ["espelho", 0.8], ["estante", 0.6], ["poltrona", 0.5], ["cadeira", 0.5], ["bau", 0.4]] },
  bercario:   { parede: [["berco", 1], ["poltrona", 0.95], ["bau", 0.7], ["cadeira", 0.5], ["espelho", 0.5]] },
  musica:     { parede: [["piano", 1], ["poltrona", 0.8], ["poltrona", 0.5], ["estante", 0.6], ["cadeira", 0.5]] },
  banheiro:   { parede: [["espelho", 1], ["cadeira", 0.7], ["bau", 0.6]] },
  deposito:   { parede: [["bau", 1], ["bau", 0.9], ["estante", 0.9], ["bau", 0.7], ["estante", 0.6], ["cadeira", 0.5], ["espelho", 0.3], ["bau", 0.5]], junto: true },
  adega:      { parede: [["estante", 1], ["estante", 0.9], ["estante", 0.7], ["bau", 0.8], ["bau", 0.5]], centro: "mesinha", junto: true },
  sotao:      { parede: [["bau", 1], ["estante", 0.8], ["espelho", 0.6], ["cadeira", 0.6], ["bau", 0.6], ["berco", 0.25], ["poltrona", 0.4], ["bau", 0.4]], junto: true },
};

// o PROGRAMA por andar: a ordem vale para as salas da MAIOR para a menor;
// o que sobra repete o fim da lista
const PROGRAMA = {
  0: ["adega", "deposito", "deposito", "adega", "deposito"],
  1: ["estar", "jantar", "biblioteca", "copa", "saleta", "escritorio", "saleta"],
  2: ["quarto", "bercario", "quarto", "saleta", "escritorio", "quarto"],      // Tomás (berço) e o relógio do Hóspede
  3: ["quarto", "quarto", "biblioteca", "quarto", "saleta", "quarto"],        // o espelho da Cecília
  4: ["musica", "saleta", "quarto", "escritorio", "quarto", "quarto"],        // o piano da Olívia e a poltrona da Aurora
  5: ["sotao", "deposito", "sotao", "deposito"],
};

// ------------------------------------------------------------------
function interioresMobilia(floor, g, rng) {
  const furnGrid = floor.furnGrid, f = floor.idx;
  const comuns = floor.rooms.filter(r => !r.fixed && !floor.banheiros.includes(r))
    .sort((a, b) => b.w * b.h - a.w * a.h);
  const prog = PROGRAMA[f] || PROGRAMA[3];
  floor.comodos = new Map();
  comuns.forEach((r, i) => floor.comodos.set(r, prog[Math.min(i, prog.length - 1)]));
  for (const r of floor.banheiros) floor.comodos.set(r, "banheiro");
  for (const r of floor.rooms) if (!r.fixed) interioresComodo(floor, g, furnGrid, r, floor.comodos.get(r), rng);
}

// cada cômodo: portas → zonas livres → peças de parede → conjunto do centro
function interioresComodo(floor, g, furnGrid, r, tipo, rng) {
  const def = COMODOS[tipo] || COMODOS.saleta;
  const dentro = (x, y) => x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h;
  const chao = (x, y) => x > 0 && y > 0 && x < COLS - 1 && y < ROWS - 1 && g[y * COLS + x] === T_FLOOR;
  // bloqueado = porta (vão para fora) + 2 células de folga; frente da sala secreta
  const bloq = new Uint8Array(COLS * ROWS);
  const marca = (x, y, rad) => { for (let j = y - rad; j <= y + rad; j++) for (let i = x - rad; i <= x + rad; i++)
    if (dentro(i, j)) bloq[j * COLS + i] = 1; };
  const portas = [];
  for (let j = r.y; j < r.y + r.h; j++) for (let i = r.x; i < r.x + r.w; i++) {
    if (!chao(i, j)) continue;
    const borda = i === r.x || j === r.y || i === r.x + r.w - 1 || j === r.y + r.h - 1;
    if (!borda) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = i + dx, ny = j + dy;
      if (!dentro(nx, ny) && chao(nx, ny)) { portas.push([i, j]); marca(i, j, 2); break; }
    }
  }
  for (const sr of floor.secretRooms || []) if (sr.frente && dentro(sr.frente.x | 0, sr.frente.y | 0))
    marca(sr.frente.x | 0, sr.frente.y | 0, 2);
  if (!portas.length) return;                         // sala sem porta: não existe de verdade

  const livre = (x, y) => dentro(x, y) && chao(x, y) && !furnGrid[y * COLS + x] && !bloq[y * COLS + x];
  // a parede atrás tem de ser parede de verdade (não um vão)
  const paredeAtras = (x, y, dir) => {
    const [dx, dy] = [[0, -1], [1, 0], [0, 1], [-1, 0]][dir];
    return g[(y + dy) * COLS + (x + dx)] === T_WALL;
  };
  const colocados = [];
  function poe(tipo, x0, y0, rot) {
    const ft = FURN_TYPES[tipo];
    const w = rot % 2 ? ft.h : ft.w, h = rot % 2 ? ft.w : ft.h;
    const cells = [];
    for (let j = y0; j < y0 + h; j++) for (let i = x0; i < x0 + w; i++) {
      if (!livre(i, j)) return null;
      cells.push([i, j]);
    }
    for (const [i, j] of cells) furnGrid[j * COLS + i] = ft.id;
    const p = { type: tipo, x: x0 + w / 2, y: y0 + h / 2, cells, rot };
    if (!circulaOk()) { tira(p); return null; }
    floor.furn.push(p); colocados.push(p);
    return p;
  }
  function tira(p) {
    for (const [i, j] of p.cells) furnGrid[j * COLS + i] = 0;
    const k = floor.furn.indexOf(p); if (k >= 0) floor.furn.splice(k, 1);
  }
  // todo chão livre do cômodo continua ligado às portas? (flood a partir da 1ª porta)
  function circulaOk() {
    const seen = new Uint8Array(COLS * ROWS);
    const [px, py] = portas[0];
    if (furnGrid[py * COLS + px]) return false;
    const q = [py * COLS + px]; seen[q[0]] = 1;
    let n = 1;
    while (q.length) {
      const cu = q.pop(), cx = cu % COLS, cy = (cu / COLS) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, ny = cy + dy;
        if (!dentro(nx, ny)) continue;
        const ni = ny * COLS + nx;
        if (seen[ni] || !chao(nx, ny) || furnGrid[ni]) continue;
        seen[ni] = 1; n++; q.push(ni);
      }
    }
    for (let j = r.y; j < r.y + r.h; j++) for (let i = r.x; i < r.x + r.w; i++)
      if (chao(i, j) && !furnGrid[j * COLS + i] && !seen[j * COLS + i]) return false;
    return true;
  }

  // ---- peças de PAREDE: costas na parede, à escolha de uma parede sem porta ali ----
  const paredes = [DIR_N, DIR_E, DIR_S, DIR_W];
  function poeNaParede(tipo, prefer) {
    const ft = FURN_TYPES[tipo];
    const ordem = paredes.slice().sort(() => rng() - 0.5);
    if (prefer !== undefined) { ordem.splice(ordem.indexOf(prefer), 1); ordem.unshift(prefer); }
    for (const dir of ordem) {
      const rot = (dir - FURN_COSTAS[tipo] + 4) % 4;
      const w = rot % 2 ? ft.h : ft.w, h = rot % 2 ? ft.w : ft.h;
      const vagas = [];
      if (dir === DIR_N || dir === DIR_S) {
        const y0 = dir === DIR_N ? r.y : r.y + r.h - h;
        for (let x0 = r.x; x0 + w <= r.x + r.w; x0++) {
          let ok = true;
          for (let i = x0; i < x0 + w && ok; i++) {
            if (!paredeAtras(i, dir === DIR_N ? r.y : r.y + r.h - 1, dir)) ok = false;
            for (let j = y0; j < y0 + h && ok; j++) if (!livre(i, j)) ok = false;
          }
          // respiro de uma célula entre peças (menos onde o cômodo é amontoado)
          if (ok && !def.junto) {
            for (let j = y0; j < y0 + h; j++)
              if ((dentro(x0 - 1, j) && furnGrid[j * COLS + x0 - 1]) || (dentro(x0 + w, j) && furnGrid[j * COLS + x0 + w])) ok = false;
          }
          if (ok) vagas.push([x0, y0]);
        }
      } else {
        const x0 = dir === DIR_W ? r.x : r.x + r.w - w;
        for (let y0 = r.y; y0 + h <= r.y + r.h; y0++) {
          let ok = true;
          for (let j = y0; j < y0 + h && ok; j++) {
            if (!paredeAtras(dir === DIR_W ? r.x : r.x + r.w - 1, j, dir)) ok = false;
            for (let i = x0; i < x0 + w && ok; i++) if (!livre(i, j)) ok = false;
          }
          if (ok && !def.junto) {
            for (let i = x0; i < x0 + w; i++)
              if ((dentro(i, y0 - 1) && furnGrid[(y0 - 1) * COLS + i]) || (dentro(i, y0 + h) && furnGrid[(y0 + h) * COLS + i])) ok = false;
          }
          if (ok) vagas.push([x0, y0]);
        }
      }
      // tenta algumas vagas (sorteadas) até uma passar na circulação
      for (let t = 0; t < 4 && vagas.length; t++) {
        const k = rng() * vagas.length | 0, [x0, y0] = vagas.splice(k, 1)[0];
        const p = poe(tipo, x0, y0, rot);
        if (p) { p.parede = dir; return p; }
      }
    }
    return null;
  }

  // ---- conjuntos do CENTRO ----
  const cx = r.x + (r.w >> 1), cy = r.y + (r.h >> 1);
  function conjuntoJantar() {
    const horiz = r.w >= r.h;
    const n = Math.max(2, Math.min(3, ((horiz ? r.w : r.h) - 8) / 3 | 0));   // 2 ou 3 mesas em fila
    const tw = horiz ? 2 * n : 2, th = horiz ? 2 : 2 * n;
    const x0 = cx - (tw >> 1), y0 = cy - (th >> 1);
    const mesas = [];
    for (let k = 0; k < n; k++) {
      const p = poe("mesa", horiz ? x0 + 2 * k : x0, horiz ? y0 : y0 + 2 * k, 0);
      if (!p) { for (const m of mesas) tira(m); return false; }
      mesas.push(p);
    }
    // cadeiras ao redor, uma célula afastadas, viradas para a mesa
    const cad = [];
    if (horiz) { for (let i = x0; i < x0 + tw; i += 2) { cad.push([i, y0 - 1, DIR_S], [i + 1, y0 - 1, DIR_S], [i, y0 + th, DIR_N], [i + 1, y0 + th, DIR_N]); }
                 cad.push([x0 - 1, y0, DIR_E], [x0 + tw, y0 + 1, DIR_W]); }
    else { for (let j = y0; j < y0 + th; j += 2) { cad.push([x0 - 1, j, DIR_E], [x0 - 1, j + 1, DIR_E], [x0 + tw, j, DIR_W], [x0 + tw, j + 1, DIR_W]); }
           cad.push([x0, y0 - 1, DIR_S], [x0 + 1, y0 + th, DIR_N]); }
    for (const [x, y, frente] of cad) if (rng() < 0.85) poe("cadeira", x, y, (frente + 2) % 4);   // costas = oposto da frente
    return true;
  }
  function conjuntoEstar() {
    // parede de foco: a maior sem porta (onde ficaria a lareira); o sofá olha para ela
    const semPorta = paredes.filter(dir => {
      if (dir === DIR_N || dir === DIR_S) { const y = dir === DIR_N ? r.y : r.y + r.h - 1;
        for (let i = r.x; i < r.x + r.w; i++) if (!paredeAtras(i, y, dir)) return false; return true; }
      const x = dir === DIR_W ? r.x : r.x + r.w - 1;
      for (let j = r.y; j < r.y + r.h; j++) if (!paredeAtras(x, j, dir)) return false; return true;
    });
    const foco = semPorta.length ? semPorta[rng() * semPorta.length | 0] : DIR_N;
    // o sofá fica a meio caminho do centro para a parede de foco, de costas para o resto
    const costas = (foco + 2) % 4, rot = (costas - FURN_COSTAS.sofa + 4) % 4;
    const d = Math.max(3, Math.min(5, (foco % 2 ? r.w : r.h) / 2 - 2 | 0));
    let sx, sy, mx, my, p1, p2;
    if (foco === DIR_N) { sx = cx - 1; sy = r.y + d; mx = cx - 1; my = sy - 3; p1 = [mx - 2, my, DIR_E]; p2 = [mx + 2, my, DIR_W]; }
    else if (foco === DIR_S) { sx = cx - 1; sy = r.y + r.h - 1 - d; mx = cx - 1; my = sy + 2; p1 = [mx - 2, my + 1, DIR_E]; p2 = [mx + 2, my + 1, DIR_W]; }
    else if (foco === DIR_W) { sx = r.x + d; sy = cy - 1; mx = sx - 3; my = cy - 1; p1 = [mx, my - 2, DIR_S]; p2 = [mx, my + 2, DIR_N]; }
    else { sx = r.x + r.w - 1 - d; sy = cy - 1; mx = sx + 2; my = cy - 1; p1 = [mx + 1, my - 2, DIR_S]; p2 = [mx + 1, my + 2, DIR_N]; }
    const sofa = poe("sofa", sx, sy, rot);
    if (!sofa) return false;
    poe("mesa", mx, my, 0);                             // a mesinha diante do sofá
    for (const [x, y, frente] of [p1, p2]) poe("poltrona", x, y, (frente + 2) % 4);
    return true;
  }
  function conjuntoCopa() {
    const p = poe("mesa", cx - 1, cy - 1, 0);
    if (!p) return false;
    for (const [x, y, frente] of [[cx - 1, cy - 2, DIR_S], [cx, cy + 1, DIR_N], [cx - 2, cy, DIR_E], [cx + 1, cy - 1, DIR_W]])
      if (rng() < 0.8) poe("cadeira", x, y, (frente + 2) % 4);
    return true;
  }
  function conjuntoMesinha() {
    const p = poe("mesa", cx - 1, cy - 1, 0);
    if (p && rng() < 0.6) poe("cadeira", cx + 1, cy - 1, (DIR_W + 2) % 4);
    return !!p;
  }

  // ---- monta o cômodo ----
  // quantas peças de parede o tamanho comporta: perímetro/5 (amontoado: /3,5)
  const perim = (r.w + r.h) * 2;
  const alvo = def.junto ? Math.min(22, Math.max(4, perim / 3.5 | 0)) : Math.min(16, Math.max(3, perim / 5 | 0));
  let n = 0;
  const poeComAcompanhantes = (tipo) => {
    const p = poeNaParede(tipo);
    if (!p) return false;
    n++;
    // a cama ganha o baú aos pés e uma cadeira ao lado; escrivaninha e piano, a cadeira na frente
    if (tipo === "cama") acompanha(p, "bau", rng() < 0.7);
    if (tipo === "cama" && rng() < 0.6) acompanhaLado(p, "cadeira");
    if (tipo === "escrivaninha") acompanha(p, "cadeira", true, true);
    if (tipo === "piano") acompanha(p, "cadeira", true, true);
    return true;
  };
  for (const [tipo, chance] of def.parede) {
    if (n >= alvo) break;
    if (rng() > chance) continue;
    poeComAcompanhantes(tipo);
  }
  // sala grande: completa com o que o cômodo costuma ter, até o alvo
  const compl = COMPLEMENTO[tipo] || COMPLEMENTO.saleta;
  for (let t = 0; t < 24 && n < alvo; t++) poeComAcompanhantes(compl[rng() * compl.length | 0]);
  if (def.centro === "jantar" && r.w >= 10 && r.h >= 8) conjuntoJantar();
  else if (def.centro === "estar" && r.w >= 11 && r.h >= 9) conjuntoEstar();
  else if (def.centro === "copa" && r.w >= 8 && r.h >= 7) conjuntoCopa();
  else if (def.centro === "mesinha" && r.w >= 9 && r.h >= 8) conjuntoMesinha();

  // peça que fica na frente de outra (pés da cama / cadeira da escrivaninha, virada para ela)
  function acompanha(p, tipo, quer, virada) {
    if (!quer) return;
    const [dx, dy] = [[0, 1], [-1, 0], [0, -1], [1, 0]][p.parede];      // "para dentro" da parede
    const ft = FURN_TYPES[tipo];
    // virada = de frente para a peça (costas para dentro do cômodo); senão, alinhada a ela
    const frenteRot = virada ? (((p.parede + 2) % 4) - FURN_COSTAS[tipo] + 4) % 4 : p.rot;
    const w = frenteRot % 2 ? ft.h : ft.w, h = frenteRot % 2 ? ft.w : ft.h;
    const minx = Math.min(...p.cells.map(c => c[0])), maxx = Math.max(...p.cells.map(c => c[0]));
    const miny = Math.min(...p.cells.map(c => c[1])), maxy = Math.max(...p.cells.map(c => c[1]));
    let x0, y0;
    if (dy === 1) { x0 = minx + ((maxx - minx + 1 - w) >> 1); y0 = maxy + 1; }
    else if (dy === -1) { x0 = minx + ((maxx - minx + 1 - w) >> 1); y0 = miny - h; }
    else if (dx === 1) { x0 = maxx + 1; y0 = miny + ((maxy - miny + 1 - h) >> 1); }
    else { x0 = minx - w; y0 = miny + ((maxy - miny + 1 - h) >> 1); }
    poe(tipo, x0, y0, frenteRot);
  }
  function acompanhaLado(p, tipo) {
    const ft = FURN_TYPES[tipo];
    const minx = Math.min(...p.cells.map(c => c[0])), maxx = Math.max(...p.cells.map(c => c[0]));
    const miny = Math.min(...p.cells.map(c => c[1])), maxy = Math.max(...p.cells.map(c => c[1]));
    const lados = p.parede % 2 === 0
      ? [[minx - ft.w, miny], [maxx + 1, miny]]                        // cabeceira ao norte/sul: lados leste/oeste
      : [[minx, miny - ft.h], [minx, maxy + 1]];
    for (const [x0, y0] of lados.sort(() => rng() - 0.5)) if (poe(tipo, x0, y0, p.rot)) return;
  }
}

// --- depois de mobiliar o andar inteiro: a alcançabilidade real, COM móveis ---
// (o flood da geração ignora móveis; aqui um móvel que fechou passagem é retirado)
function interioresConfere(floor, g) {
  const furnGrid = floor.furnGrid;
  const flood = () => {
    const seen = new Uint8Array(COLS * ROWS);
    const c0 = roomCenter(STAIR_ROOM);
    const q = [(c0.y | 0) * COLS + (c0.x | 0)]; seen[q[0]] = 1;
    while (q.length) {
      const cu = q.pop(), cx = cu % COLS, cy = (cu / COLS) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 1 || ny < 1 || nx >= COLS - 1 || ny >= ROWS - 1) continue;
        const ni = ny * COLS + nx;
        if (seen[ni] || g[ni] === T_WALL || furnGrid[ni]) continue;
        seen[ni] = 1; q.push(ni);
      }
    }
    return seen;
  };
  for (let passo = 0; passo < 12; passo++) {
    const seen = flood();
    // célula de chão que o flood SEM móveis alcançava e agora não: algum móvel fechou
    let culpado = null;
    for (let id = 0; id < seen.length && !culpado; id++) {
      if (!floor.reach[id] || seen[id] || furnGrid[id] || g[id] === T_WALL) continue;
      const x = id % COLS, y = (id / COLS) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const ni = (y + dy) * COLS + (x + dx);
        if (furnGrid[ni]) { culpado = floor.furn.find(p => p.cells.some(([i, j]) => j * COLS + i === ni)); if (culpado) break; }
      }
    }
    if (!culpado) { floor.reach = seen; return; }
    for (const [i, j] of culpado.cells) furnGrid[j * COLS + i] = 0;
    floor.furn.splice(floor.furn.indexOf(culpado), 1);
  }
  floor.reach = flood();
}

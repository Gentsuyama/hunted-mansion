"use strict";
// ==================================================================
// MAPA — a visão de cima como PLANTA A NANQUIM
// Continua abstrata de propósito: parede é bloco mudo, móvel é símbolo
// de planta, item é ícone. O que existe NAS paredes só a FOTO mostra.
// ==================================================================
let LUZ_CV = null, LUZ_IMG = null;

function mapaRR(x, y, w, h, r) {           // retângulo arredondado (no path atual)
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
}
function mapaParedeLike(cx, cy) {
  if (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS) return true;
  const t = grid[cy * COLS + cx];
  return t === T_WALL || t === T_FAKE || t === T_DOOR;
}

// ------------------------------------------------------------------
// CHÃO: a luz vira uma mancha contínua (1 px por célula, ampliado com
// suavização) — sem serrilhado de grade. A cor só SUGERE o material.
// ------------------------------------------------------------------
function lzChao(i) {
  const t = grid[i];
  return (t === T_WALL || t === T_FAKE || t === T_DOOR) ? 0 : light[i];
}
function mapaLuzChao(c0, c1, r0, r1) {
  const w = c1 - c0 + 1, h = r1 - r0 + 1;
  if (w <= 0 || h <= 0) return;
  if (!LUZ_CV) LUZ_CV = document.createElement("canvas");
  if (LUZ_CV.width !== w || LUZ_CV.height !== h) {
    LUZ_CV.width = w; LUZ_CV.height = h;
    LUZ_IMG = new ImageData(w, h);
  }
  const d = LUZ_IMG.data;
  const RG = fl().rugGrid;
  const porao = world.cur === 0;
  const lp = lampAcesa() ? world.lamp : null;
  const CANDS = [];                                // fogo azul: candelabros acesos deste andar
  for (const cd of fl().candelabros || []) {
    const n = world.flags.velas[cd.id] || 0;
    if (n) CANDS.push({ x: cd.x, y: cd.y, r: velaRaio(n) + 1 });
  }
  for (let cy = r0; cy <= r1; cy++)
    for (let cx = c0; cx <= c1; cx++) {
      const idx = cy * COLS + cx, o = ((cy - r0) * w + (cx - c0)) << 2;
      const t = grid[idx];
      if (t === T_WALL || t === T_FAKE || t === T_DOOR) { d[o + 3] = 0; continue; }
      // média 3×3 da luz: tira o granulado dos raios e escurece junto às paredes
      // (vizinho que é PAREDE conta como escuro: a luz batida na parede não
      // pode clarear o chão que fica do outro lado dela)
      let L = light[idx] * 2, n = 2;
      if (cx > 0 && cx < COLS - 1 && cy > 0 && cy < ROWS - 1) {
        L += lzChao(idx - 1) + lzChao(idx + 1) + lzChao(idx - COLS) + lzChao(idx + COLS)
           + 0.5 * (lzChao(idx - COLS - 1) + lzChao(idx - COLS + 1) +
                    lzChao(idx + COLS - 1) + lzChao(idx + COLS + 1));
        n += 6;
      }
      L /= n;
      if (L <= 0.012) { d[o + 3] = 0; continue; }
      let r = 150, g = 138, b = 116, k = 0.42;
      const rg = RG ? RG[idx] : 0;
      if (t === T_ELEV) { r = 122; g = 130; b = 146; k = 0.44; }
      else if (rg === 1) { r = 150; g = 74; b = 66; k = 0.44; }          // passadeira
      else if (rg === 2) { r = 92; g = 118; b = 130; k = 0.42; }         // tapete
      else if (rg === 3) {                                                // ladrilho
        if ((cx + cy) & 1) { r = 176; g = 182; b = 176; k = 0.44; }
        else { r = 104; g = 110; b = 108; k = 0.38; }
      } else if (porao) { r = 128; g = 130; b = 126; k = 0.40; }
      if (porao && cx >= DARKROOM.x && cx < DARKROOM.x + DARKROOM.w &&
          cy >= DARKROOM.y && cy < DARKROOM.y + DARKROOM.h) { r = 206; g = 50; b = 42; k = 0.5; }
      for (const cd of CANDS) {                      // o fogo azul esfria o chão
        const q = 1 - Math.hypot(cx + 0.5 - cd.x, cy + 0.5 - cd.y) / cd.r;
        if (q > 0) { r += (96 - r) * q * 0.75; g += (150 - g) * q * 0.75; b += (255 - b) * q * 0.75; k += 0.12 * q; }
      }
      if (lp) {                                      // a lamparina aquece o chão
        const q = 1 - Math.hypot(cx + 0.5 - lp.x, cy + 0.5 - lp.y) / LAMP_RAIO;
        if (q > 0) { r += (236 - r) * q * 0.8; g += (168 - g) * q * 0.8; b += (84 - b) * q * 0.8; k += 0.14 * q; }
      }
      d[o] = r; d[o + 1] = g; d[o + 2] = b;
      d[o + 3] = Math.min(1, L) * k * 255;
    }
  LUZ_CV.getContext("2d").putImageData(LUZ_IMG, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(LUZ_CV, c0 * CELL, r0 * CELL, w * CELL, h * CELL);
}

// ------------------------------------------------------------------
// PAREDES: bloco com hachura de planta; o contorno claro só aparece na
// face voltada para chão ILUMINADO (a parede não conta o que há atrás).
// Parede falsa é desenhada IGUAL — só a foto a denuncia.
// ------------------------------------------------------------------
function mapaParedes(c0, c1, r0, r1) {
  const NB = 8, C = CELL, H = CELL / 2;
  const P = [];
  for (let i = 0; i < NB; i++)
    P.push({ f: new Path2D(), h: new Path2D(), e: new Path2D(), n: 0 });
  const lit = (cx, cy) => cx >= 0 && cy >= 0 && cx < COLS && cy < ROWS &&
                          light[cy * COLS + cx] > 0.02 && !mapaParedeLike(cx, cy);
  for (let cy = r0; cy <= r1; cy++)
    for (let cx = c0; cx <= c1; cx++) {
      const idx = cy * COLS + cx;
      const raw = light[idx];
      if (raw <= 0.02) continue;
      const t = grid[idx];
      if (t !== T_WALL && t !== T_FAKE) continue;
      const k = Math.min(NB - 1, (Math.min(1, raw) * NB) | 0);
      const p = P[k], x = cx * C, y = cy * C;
      p.n++;
      p.f.rect(x, y, C, C);
      p.h.moveTo(x, y + C); p.h.lineTo(x + C, y);
      p.h.moveTo(x, y + H); p.h.lineTo(x + H, y);
      p.h.moveTo(x + H, y + C); p.h.lineTo(x + C, y + H);
      if (lit(cx - 1, cy)) { p.e.moveTo(x + 0.7, y); p.e.lineTo(x + 0.7, y + C); }
      if (lit(cx + 1, cy)) { p.e.moveTo(x + C - 0.7, y); p.e.lineTo(x + C - 0.7, y + C); }
      if (lit(cx, cy - 1)) { p.e.moveTo(x, y + 0.7); p.e.lineTo(x + C, y + 0.7); }
      if (lit(cx, cy + 1)) { p.e.moveTo(x, y + C - 0.7); p.e.lineTo(x + C, y + C - 0.7); }
    }
  ctx.lineCap = "butt";
  for (let k = 0; k < NB; k++) {
    const p = P[k];
    if (!p.n) continue;
    const b = (k + 0.6) / NB;
    ctx.fillStyle = `rgb(${(8 + 46 * b) | 0},${(7 + 40 * b) | 0},${(6 + 31 * b) | 0})`;
    ctx.fill(p.f);
    ctx.strokeStyle = `rgb(${(20 + 112 * b) | 0},${(18 + 98 * b) | 0},${(14 + 74 * b) | 0})`;
    ctx.lineWidth = 0.7;
    ctx.stroke(p.h);
    const e = 70 + 185 * b;
    ctx.strokeStyle = `rgb(${e | 0},${(e * 0.88) | 0},${(e * 0.66) | 0})`;
    ctx.lineWidth = 1.5;
    ctx.stroke(p.e);
  }

  // porta da frente e piso do elevador (símbolos de planta)
  for (let cy = r0; cy <= r1; cy++)
    for (let cx = c0; cx <= c1; cx++) {
      const idx = cy * COLS + cx;
      const raw = light[idx];
      if (raw <= 0.02) continue;
      const t = grid[idx];
      if (t !== T_DOOR && t !== T_ELEV) continue;
      const b = Math.min(1, raw), x = cx * C, y = cy * C;
      if (t === T_DOOR) {
        ctx.fillStyle = `rgb(${(30 + 120 * b) | 0},${(18 + 72 * b) | 0},${(10 + 36 * b) | 0})`;
        ctx.fillRect(x, y + 2, C, C - 4);
        ctx.strokeStyle = `rgba(20,10,4,${(0.5 + 0.4 * b).toFixed(2)})`;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x + H, y + 2); ctx.lineTo(x + H, y + C - 2); ctx.stroke();
        ctx.strokeStyle = `rgba(232,196,120,${b.toFixed(2)})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(x, y + 2); ctx.lineTo(x + C, y + 2);
        ctx.moveTo(x, y + C - 2); ctx.lineTo(x + C, y + C - 2); ctx.stroke();
      } else {
        // o ELEVADOR: a grade pantográfica na parede (acima ou abaixo) e a placa de chamada no piso
        const sul = fl().elev && fl().elev.lado === "S";
        const gx = x - C, gy = sul ? y + C : y - C + C * 0.42, gw = 3 * C, gh = C * 0.58;
        ctx.save();
        ctx.beginPath(); ctx.rect(gx, gy, gw, gh); ctx.clip();
        ctx.fillStyle = `rgba(150,160,180,${(0.25 + 0.6 * b).toFixed(2)})`;
        ctx.fillRect(gx, gy, gw, gh);
        ctx.strokeStyle = `rgba(22,24,30,${(0.45 + 0.5 * b).toFixed(2)})`;
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        for (let i = -1; i <= 6; i++) {
          ctx.moveTo(gx + i * (C / 2), gy); ctx.lineTo(gx + (i + 1) * (C / 2), gy + gh);
          ctx.moveTo(gx + (i + 1) * (C / 2), gy); ctx.lineTo(gx + i * (C / 2), gy + gh);
        }
        ctx.stroke();
        ctx.restore();
        ctx.strokeStyle = `rgba(232,196,120,${b.toFixed(2)})`; ctx.lineWidth = 1.2;
        ctx.strokeRect(gx + 0.6, gy + 0.6, gw - 1.2, gh - 1.2);
        ctx.fillStyle = `rgba(232,196,120,${(0.3 + 0.6 * b).toFixed(2)})`;
        ctx.fillRect(x + C * 0.32, sul ? y + C * 0.68 : y + C * 0.12, C * 0.36, C * 0.2);   // a placa de chamada
      }
    }
}

// ------------------------------------------------------------------
// MÓVEIS em planta: silhueta de cima em traço grosso (diz "há um piano
// aqui" — como ele É, só a foto conta)
// ------------------------------------------------------------------
function mapaMoveis() {
  const C = CELL;
  for (const fu of fl().furn) {
    let L = 0;
    for (const [ci, cj] of fu.cells) L = Math.max(L, light[cj * COLS + ci]);
    if (L <= 0.03) continue;
    const ft = FURN_TYPES[fu.type];
    // móvel pequeno é desenhado um pouco maior que o footprint: símbolo tem que ler
    const esc = ft.w * ft.h <= 1 ? 1.4 : ft.w * ft.h <= 2 ? 1.2 : 1.06;
    const spr = plantaSprite(fu.type);
    // a imagem cabe no footprint SEM deformar (um berço 9:16 num footprint 2×2 fica estreito)
    let dw = ft.w * esc, dh = ft.h * esc;
    const ar = spr.width / spr.height;
    if (ar > dw / dh) dh = dw / ar; else dw = dh * ar;
    ctx.globalAlpha = Math.min(1, L * 1.3);
    if (fu.rot) {                                     // girado conforme a parede em que encosta
      ctx.save(); ctx.translate(fu.x * C, fu.y * C); ctx.rotate(fu.rot * Math.PI / 2);
      ctx.drawImage(spr, -dw / 2 * C, -dh / 2 * C, dw * C, dh * C); ctx.restore();
    } else ctx.drawImage(spr, (fu.x - dw / 2) * C, (fu.y - dh / 2) * C, dw * C, dh * C);
  }
  ctx.globalAlpha = 1;
}

// ------------------------------------------------------------------
// ÍCONES de item (traço grosso, no mundo). s = meia-altura em px
// ------------------------------------------------------------------
function mapaIcone(kind, x, y, s, rgb, a) {
  if (a <= 0.03) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = Math.min(1, a);
  // halo: item é coisa que se PEGA
  const hg = ctx.createRadialGradient(0, 0, 1, 0, 0, s * 2.4);
  hg.addColorStop(0, `rgba(${rgb},0.30)`);
  hg.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = hg;
  ctx.fillRect(-s * 2.4, -s * 2.4, s * 4.8, s * 4.8);
  ctx.lineWidth = 1.5; ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.strokeStyle = `rgb(${rgb})`;
  if (kind === "pilha") {                          // duas pilhas deitadas, com o polo
    ctx.fillStyle = `rgba(${rgb},0.25)`;
    for (const dy of [-2.6, 2.6]) {
      ctx.fillRect(-s * 0.9, dy - 1.9, s * 1.6, 3.8); ctx.strokeRect(-s * 0.9, dy - 1.9, s * 1.6, 3.8);
      ctx.fillRect(s * 0.7, dy - 0.9, 1.6, 1.8);
    }
    ctx.restore(); return;
  }
  ctx.fillStyle = "rgba(8,8,10,0.9)";
  ctx.beginPath();
  switch (kind) {
    case "film":                           // lata do rolo + língua do filme
      mapaRR(-s * 0.9, -s * 0.7, s * 1.0, s * 1.5, 1.2);
      ctx.fill(); ctx.stroke(); ctx.beginPath();
      ctx.moveTo(-s * 0.72, -s * 0.98); ctx.lineTo(-s * 0.08, -s * 0.98);
      ctx.rect(s * 0.1, -s * 0.3, s * 0.85, s * 0.8);
      ctx.moveTo(s * 0.35, -s * 0.05); ctx.lineTo(s * 0.36, -s * 0.05);
      ctx.moveTo(s * 0.7, -s * 0.05); ctx.lineTo(s * 0.71, -s * 0.05);
      break;
    case "fuse":                           // cartucho com duas capas e filamento
      mapaRR(-s, -s * 0.42, s * 2, s * 0.84, s * 0.3);
      ctx.fill(); ctx.stroke(); ctx.beginPath();
      ctx.moveTo(-s * 0.5, -s * 0.42); ctx.lineTo(-s * 0.5, s * 0.42);
      ctx.moveTo(s * 0.5, -s * 0.42); ctx.lineTo(s * 0.5, s * 0.42);
      ctx.moveTo(-s * 0.3, 0); ctx.lineTo(-s * 0.1, -s * 0.2);
      ctx.lineTo(s * 0.1, s * 0.2); ctx.lineTo(s * 0.3, 0);
      break;
    case "key":                            // argola, haste e dois dentes
      ctx.arc(-s * 0.55, 0, s * 0.45, 0, 7);
      ctx.fill(); ctx.stroke(); ctx.beginPath();
      ctx.moveTo(-s * 0.1, 0); ctx.lineTo(s, 0);
      ctx.moveTo(s * 0.55, 0); ctx.lineTo(s * 0.55, s * 0.5);
      ctx.moveTo(s * 0.9, 0); ctx.lineTo(s * 0.9, s * 0.42);
      break;
    case "diario":                         // caderno fechado: capa, lombada e a fita
      mapaRR(-s * 0.8, -s, s * 1.6, s * 2, 1.5);
      ctx.fill(); ctx.stroke(); ctx.beginPath();
      ctx.moveTo(-s * 0.5, -s); ctx.lineTo(-s * 0.5, s);
      ctx.moveTo(s * 0.35, -s); ctx.lineTo(s * 0.35, s * 0.3);
      ctx.moveTo(-s * 0.2, -s * 0.4); ctx.lineTo(s * 0.1, -s * 0.4);
      ctx.moveTo(-s * 0.2, 0); ctx.lineTo(s * 0.1, 0);
      break;
    case "campart":                        // uma lente: aro, vidro e o reflexo
      ctx.arc(0, 0, s * 0.9, 0, 7);
      ctx.fill(); ctx.stroke(); ctx.beginPath();
      ctx.arc(0, 0, s * 0.5, 0, 7);
      ctx.moveTo(-s * 0.2, -s * 0.24); ctx.arc(0, 0, s * 0.28, 3.6, 4.9);
      ctx.moveTo(s * 0.95, -s * 1.25); ctx.lineTo(s * 0.95, -s * 0.75);   // faísca
      ctx.moveTo(s * 0.7, -s); ctx.lineTo(s * 1.2, -s);
      break;
    case "ret":                            // moldura com o oval do retrato
      ctx.rect(-s * 0.7, -s, s * 1.4, s * 2);
      ctx.fill(); ctx.stroke(); ctx.beginPath();
      ctx.ellipse(0, -s * 0.05, s * 0.36, s * 0.56, 0, 0, 7);
      break;
    case "safe":                           // caixa-forte com o disco
      mapaRR(-s, -s, s * 2, s * 2, 1.4);
      ctx.fill(); ctx.stroke(); ctx.beginPath();
      ctx.arc(0, 0, s * 0.46, 0, 7);
      ctx.moveTo(0, 0); ctx.lineTo(s * 0.3, -s * 0.3);
      break;
    case "fusebox":                        // quadro com o raio
      ctx.rect(-s * 0.8, -s, s * 1.6, s * 2);
      ctx.fill(); ctx.stroke(); ctx.beginPath();
      ctx.moveTo(s * 0.2, -s * 0.62); ctx.lineTo(-s * 0.26, s * 0.06);
      ctx.lineTo(s * 0.2, s * 0.06); ctx.lineTo(-s * 0.2, s * 0.66);
      break;
    case "bench":                          // bandeja de revelação com a gota
      mapaRR(-s, -s * 0.6, s * 2, s * 1.2, 1.4);
      ctx.fill(); ctx.stroke(); ctx.beginPath();
      ctx.moveTo(0, -s * 0.34); ctx.quadraticCurveTo(s * 0.34, s * 0.16, 0, s * 0.3);
      ctx.quadraticCurveTo(-s * 0.34, s * 0.16, 0, -s * 0.34);
      break;
    case "easel":                          // cavalete com a tela
      ctx.rect(-s * 0.6, -s * 0.9, s * 1.2, s * 1.1);
      ctx.fill(); ctx.stroke(); ctx.beginPath();
      ctx.moveTo(-s * 0.4, s * 0.2); ctx.lineTo(-s * 0.8, s);
      ctx.moveTo(s * 0.4, s * 0.2); ctx.lineTo(s * 0.8, s);
      ctx.moveTo(0, s * 0.2); ctx.lineTo(0, s * 0.9);
      break;
    case "lamp":                           // lamparina: alça, vidro e a chama
      ctx.arc(0, s * 0.1, s * 0.62, 0, 7);
      ctx.fill(); ctx.stroke(); ctx.beginPath();
      ctx.moveTo(-s * 0.5, s * 0.78); ctx.lineTo(s * 0.5, s * 0.78);
      ctx.moveTo(-s * 0.3, -s * 0.5); ctx.lineTo(s * 0.3, -s * 0.5);
      ctx.moveTo(-s * 0.55, -s * 0.5); ctx.quadraticCurveTo(0, -s * 1.45, s * 0.55, -s * 0.5);
      ctx.moveTo(0, s * 0.42); ctx.quadraticCurveTo(s * 0.3, s * 0.05, 0, -s * 0.26);
      ctx.quadraticCurveTo(-s * 0.3, s * 0.05, 0, s * 0.42);
      break;
    case "chair":                          // a cadeira do Fotógrafo
      mapaRR(-s * 0.7, -s * 0.5, s * 1.4, s * 1.4, 1.4);
      ctx.fill(); ctx.stroke(); ctx.beginPath();
      ctx.moveTo(-s * 0.8, -s * 0.85); ctx.lineTo(s * 0.8, -s * 0.85);
      ctx.moveTo(-s * 0.8, -s * 0.85); ctx.lineTo(-s * 0.8, s * 0.2);
      ctx.moveTo(s * 0.8, -s * 0.85); ctx.lineTo(s * 0.8, s * 0.2);
      break;
  }
  ctx.stroke();
  ctx.restore();
}

// ------------------------------------------------------------------
// O STREAMER visto de cima: capuz vinho, mochila, a polaroid no peito e
// o celular (a lanterna) no braço estendido. Ele ANDA: pés e ombros.
// ------------------------------------------------------------------
function mapaJogador(px, py, dir, passo, movendo, agachado, tremor) {
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(dir + (tremor ? (Math.random() - 0.5) * 0.06 * tremor : 0));
  const sw = movendo ? Math.sin(passo) : 0;         // balanço do passo
  const k = agachado ? 0.86 : 1;                    // encolhe ao se esgueirar
  ctx.scale(k, k);
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  // sombra de contato
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.beginPath(); ctx.ellipse(-0.6, 0, 6.2, 7, 0, 0, 7); ctx.fill();
  // pés alternando
  ctx.fillStyle = "#15110e";
  ctx.beginPath(); ctx.ellipse(1.2 + sw * 2.8, -2.7, 2.7, 1.5, 0, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(1.2 - sw * 2.8, 2.7, 2.7, 1.5, 0, 0, 7); ctx.fill();
  // mochila
  ctx.fillStyle = "#34383d"; ctx.strokeStyle = "#0c0d0f"; ctx.lineWidth = 0.8;
  ctx.beginPath(); mapaRR(-6.6, -3.5, 3.8, 7, 1.5); ctx.fill(); ctx.stroke();
  // ombros (moletom vinho) — giram um pouco contra os pés
  ctx.save();
  ctx.rotate(-sw * 0.10);
  ctx.fillStyle = "#6f2632"; ctx.strokeStyle = "#1f0a0e"; ctx.lineWidth = 0.9;
  ctx.beginPath(); ctx.ellipse(-0.8, 0, 3.9, 6.3, 0, 0, 7); ctx.fill(); ctx.stroke();
  // braço do celular (direito) esticado para a frente
  ctx.strokeStyle = "#1f0a0e"; ctx.lineWidth = 3.6;
  ctx.beginPath(); ctx.moveTo(0.2, 4.9); ctx.quadraticCurveTo(4.6, 5.6, 7.3, 2.4); ctx.stroke();
  ctx.strokeStyle = "#6f2632"; ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.moveTo(0.2, 4.9); ctx.quadraticCurveTo(4.6, 5.6, 7.3, 2.4); ctx.stroke();
  // braço esquerdo dobrado, segurando a polaroid contra o peito
  ctx.strokeStyle = "#1f0a0e"; ctx.lineWidth = 3.4;
  ctx.beginPath(); ctx.moveTo(0.2, -4.9); ctx.quadraticCurveTo(3.4, -5.0, 3.9, -2.2); ctx.stroke();
  ctx.strokeStyle = "#6f2632"; ctx.lineWidth = 2.2;
  ctx.beginPath(); ctx.moveTo(0.2, -4.9); ctx.quadraticCurveTo(3.4, -5.0, 3.9, -2.2); ctx.stroke();
  ctx.restore();
  // a polaroid (creme) no peito
  ctx.fillStyle = "#d6cdb8"; ctx.strokeStyle = "#17120e"; ctx.lineWidth = 0.7;
  ctx.beginPath(); mapaRR(2.5, -3.3, 3.5, 4.2, 0.8); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#17120e";
  ctx.beginPath(); ctx.arc(4.9, -1.2, 1.0, 0, 7); ctx.fill();
  // mão + celular aceso
  ctx.fillStyle = "#d9b99c";
  ctx.beginPath(); ctx.arc(7.5, 2.2, 1.3, 0, 7); ctx.fill();
  ctx.fillStyle = "#f2f5fa"; ctx.strokeStyle = "#0c0d0f"; ctx.lineWidth = 0.6;
  ctx.beginPath(); mapaRR(8.1, 0.5, 1.8, 3.4, 0.5); ctx.fill(); ctx.stroke();
  // capuz
  ctx.fillStyle = "#812d3a"; ctx.strokeStyle = "#1f0a0e"; ctx.lineWidth = 0.9;
  ctx.beginPath(); ctx.arc(0.5, 0, 3.4, 0, 7); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "rgba(20,6,9,0.55)";
  ctx.beginPath(); ctx.arc(0.5, 0, 3.4, Math.PI * 0.5, Math.PI * 1.5); ctx.fill();
  ctx.fillStyle = "#e0c0a4";                          // nesga de rosto na frente
  ctx.beginPath(); ctx.ellipse(2.9, 0, 0.9, 1.7, 0, 0, 7); ctx.fill();
  ctx.restore();
}

// ------------------------------------------------------------------
// ECOS e ALMAS: FUMAÇA PRETA vista de cima, com dois olhos vermelhos dentro
// ------------------------------------------------------------------
// ruído barato e determinístico por eco (a fumaça de cada um ferve diferente)
function fumacaRuido(k, t) { return Math.sin(t * 1.7 + k * 12.9898) * 0.5 + Math.sin(t * 2.9 + k * 78.233) * 0.3 + Math.sin(t * 0.7 + k * 3.3) * 0.2; }
function mapaVulto(x, y, L, bob, raio, rgb, caca, semOlhos, veu, fx) {
  const a = 0.3 + 0.6 * L;
  const insp = fx && fx.insp !== undefined ? fx.insp : -1;   // 0..1: puxando o ar
  const ang = Math.atan2(y - player.y * CELL, x - player.x * CELL);   // de onde você o vê
  const t = time * 0.9 + bob;
  ctx.save();
  ctx.translate(x, y);
  if (insp >= 0) {                                    // o AVISO: um aro que se fecha
    ctx.strokeStyle = `rgba(255,74,60,${(0.22 + 0.6 * insp).toFixed(3)})`;
    ctx.lineWidth = 1.2 + insp;
    ctx.beginPath(); ctx.arc(0, 0, raio * (3.5 - 2.4 * insp), 0, 7); ctx.stroke();
  }
  // halo frio bem fraco em volta (é o que diferencia as almas, pelo tom)
  const ag = ctx.createRadialGradient(0, 0, raio * 0.4, 0, 0, raio * 2.4);
  ag.addColorStop(0, `rgba(${rgb},${(a * 0.16).toFixed(3)})`);
  ag.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = ag;
  ctx.fillRect(-raio * 2.4, -raio * 2.4, raio * 4.8, raio * 4.8);
  // a FUMAÇA: novelos pretos que fervem; os de trás (longe de você) se soltam e esgarçam
  const bx = -Math.cos(ang), by = -Math.sin(ang);            // "frente" = o lado virado para você
  const sopro = insp >= 0 ? 1 - 0.25 * insp : 1;             // ao inspirar ela se contrai
  const novelo = (cx, cy, rr, al, cor) => {
    const c = cor || "6,4,8";
    const sg = ctx.createRadialGradient(cx, cy, 0, cx, cy, rr);
    sg.addColorStop(0, `rgba(${c},${al.toFixed(3)})`);
    sg.addColorStop(0.5, `rgba(${c},${(al * 0.75).toFixed(3)})`);
    sg.addColorStop(1, `rgba(${c},0)`);
    ctx.fillStyle = sg;
    ctx.fillRect(cx - rr, cy - rr, rr * 2, rr * 2);
  };
  for (let i = 0; i < 11; i++) {                            // o corpo, da frente para a cauda
    const f = i / 10;
    const r1 = fumacaRuido(i, t), r2 = fumacaRuido(i + 40, t * 1.3);
    const d = (f * 3.0 - 0.6) * raio * sopro;
    const lado = r1 * raio * (0.45 + f * 1.1);
    const cx = -bx * d - by * lado, cy = -by * d + bx * lado;
    novelo(cx, cy, raio * (1.1 - f * 0.65) * (0.8 + 0.25 * r2) * sopro, Math.min(1, a * (1 - f * 0.8) * (0.75 + 0.25 * r1)));
  }
  for (let i = 0; i < 6; i++) {                             // a borda fervendo: novelos pequenos em volta
    const r1 = fumacaRuido(i + 20, t * 1.6), r2 = fumacaRuido(i + 60, t);
    const th = i / 6 * 6.283 + r1 * 0.6, rd = raio * (0.85 + 0.35 * r2);
    novelo(Math.cos(th) * rd, Math.sin(th) * rd * 0.9, raio * (0.4 + 0.15 * r1), a * (0.45 + 0.2 * r2));
  }
  for (let i = 0; i < 3; i++) {                             // pedaços que já se soltaram, atrás
    const r1 = fumacaRuido(i + 90, t * 0.8), r2 = fumacaRuido(i + 120, t * 1.1);
    const d = raio * (2.6 + 1.2 * i + 0.5 * r2), lado = r1 * raio * 1.6;
    novelo(-bx * d - by * lado, -by * d + bx * lado, raio * (0.35 + 0.12 * r2), a * 0.3 * (1 - i * 0.25));
  }
  // volume: a lanterna pega o lado virado para você — novelos cinza, rentes à borda da frente
  for (let i = 0; i < 4; i++) {
    const r1 = fumacaRuido(i + 150, t * 1.4), r2 = fumacaRuido(i + 170, t);
    const th = ang + (i - 1.5) * 0.55 + r1 * 0.3, rd = raio * (0.55 + 0.25 * r2);
    novelo(-Math.cos(th) * rd, -Math.sin(th) * rd * 0.9, raio * (0.3 + 0.1 * r1), a * L * (0.2 + 0.1 * r2), "150,142,150");
  }
  // fiapos discretos que se desprendem da cauda
  ctx.strokeStyle = `rgba(10,8,12,${(a * 0.22).toFixed(3)})`; ctx.lineWidth = 1.6; ctx.lineCap = "round";
  ctx.beginPath();
  for (let i = 0; i < 2; i++) {
    const r1 = fumacaRuido(i + 80, t), f0 = raio * (1.6 + 0.5 * i);
    const sx = -bx * f0 - by * r1 * raio * 0.9, sy = -by * f0 + bx * r1 * raio * 0.9;
    const ex = sx - bx * raio * 1.1 - by * r1 * raio * 1.3, ey = sy - by * raio * 1.1 + bx * r1 * raio * 1.3;
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo((sx + ex) / 2 - by * raio * 0.5 * r1, (sy + ey) / 2 + bx * raio * 0.5 * r1, ex, ey);
  }
  ctx.stroke();
  if (veu) {                                          // véu que arrasta atrás
    ctx.strokeStyle = `rgba(${rgb},${(a * 0.45).toFixed(3)})`; ctx.lineWidth = 0.8;
    ctx.beginPath();
    for (let i = -1; i <= 1; i++) {
      const sx = -bx * raio * 0.9 - by * i * raio * 0.5, sy = -by * raio * 0.9 + bx * i * raio * 0.5;
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(sx - bx * raio * 1.4 - by * Math.sin(bob + i) * 2, sy - by * raio * 1.4 + bx * Math.sin(bob + i) * 2,
                           sx - bx * raio * 2.3 - by * i * raio * 0.3, sy - by * raio * 2.3 + bx * i * raio * 0.3);
    }
    ctx.stroke();
  }
  // os OLHOS: dois pontos vermelhos dentro da fumaça, virados para você; brasa que pulsa
  // e, quando ele puxa o ar, cresce e acende de vez
  if (!semOlhos) {
    const pulso = 0.75 + 0.25 * Math.sin(time * 5.3 + bob * 3);
    const forca = insp >= 0 ? 0.9 + 0.5 * insp : (caca ? 0.85 : 0.55) * pulso;
    const ke = raio * (0.17 + (insp >= 0 ? 0.09 * insp : 0));
    const ox = bx * raio * 0.3, oy = by * raio * 0.3;            // um pouco à frente do centro
    const ex = -by * raio * 0.3, ey = bx * raio * 0.3;            // separação, perpendicular
    novelo(ox, oy, raio * 0.75, Math.min(1, a * 0.3 * forca), "255,60,40");   // a brasa acende a fumaça por dentro
    ctx.shadowColor = `rgba(255,50,30,${(0.9 * forca).toFixed(3)})`; ctx.shadowBlur = 7 + 7 * forca;
    ctx.fillStyle = `rgba(255,${(70 + 50 * forca) | 0},${(40 + 30 * forca) | 0},${Math.min(1, a * 0.4 + forca * 0.7).toFixed(3)})`;
    ctx.beginPath();
    ctx.ellipse(ox + ex, oy + ey, ke * 1.3, ke * 0.85, ang, 0, 7);
    ctx.ellipse(ox - ex, oy - ey, ke * 1.3, ke * 0.85, ang, 0, 7);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
  if (fx && fx.alma) mapaTraco(fx.alma, fx.ent, raio, a, bob, rgb);
  ctx.restore();
}
// o TRAÇO de cada alma na planta: continua abstrato, mas é só dela
function mapaTraco(id, e, raio, a, bob, rgb) {
  ctx.lineCap = "round";
  if (id === "tomas") {                    // riscos de contagem ao lado: ele conta até cem
    ctx.strokeStyle = `rgba(${rgb},${(a * 0.8).toFixed(3)})`; ctx.lineWidth = 0.8;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) { ctx.moveTo(raio * 1.5 + i * 1.6, -3); ctx.lineTo(raio * 1.5 + i * 1.6, 3); }
    ctx.moveTo(raio * 1.5 - 1, 2); ctx.lineTo(raio * 1.5 + 6, -2);
    ctx.stroke();
  } else if (id === "bento") {             // a lamparina do zelador: um ponto quente
    const lx = raio * 1.05, ly = raio * 0.2;
    const lg = ctx.createRadialGradient(lx, ly, 0.5, lx, ly, 9);
    lg.addColorStop(0, `rgba(255,214,140,${Math.min(1, a * 1.3).toFixed(3)})`);
    lg.addColorStop(1, "rgba(255,214,140,0)");
    ctx.fillStyle = lg; ctx.fillRect(lx - 9, ly - 9, 18, 18);
  } else if (id === "olivia") {            // enquanto ela toca, o som faz ondas (é o seguro)
    if (e && e.tocando) {
      ctx.lineWidth = 0.9;
      for (let k = 0; k < 3; k++) {
        const ph = (time * 0.7 + k / 3) % 1;
        ctx.strokeStyle = `rgba(${rgb},${(a * 0.6 * (1 - ph)).toFixed(3)})`;
        ctx.beginPath(); ctx.arc(0, 0, raio * (1.2 + ph * 2.4), 0, 7); ctx.stroke();
      }
    }
  } else if (id === "hospede") {           // a aba do chapéu
    ctx.strokeStyle = `rgba(${rgb},${Math.min(1, a * 1.1).toFixed(3)})`; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.ellipse(0, -raio * 0.62, raio * 1.15, raio * 0.24, 0, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, -raio * 0.62, raio * 0.55, Math.PI, 0); ctx.stroke();
  } else if (id === "aurora") {            // o camafeu
    ctx.fillStyle = `rgba(255,236,170,${Math.min(1, a * 1.3).toFixed(3)})`;
    ctx.beginPath(); ctx.arc(0, raio * 0.25, 1.5, 0, 7); ctx.fill();
  } else if (id === "blackwood") {         // um olho só — a lente — e o tripé
    ctx.fillStyle = `rgba(255,74,60,${Math.min(1, a * 1.4).toFixed(3)})`;
    ctx.beginPath(); ctx.arc(0, -raio * 0.15, raio * 0.26, 0, 7); ctx.fill();
    ctx.strokeStyle = `rgba(${rgb},${(a * 0.8).toFixed(3)})`; ctx.lineWidth = 1;
    ctx.beginPath();
    for (const dx of [-0.9, 0, 0.9]) { ctx.moveTo(dx * raio * 0.3, raio * 0.8); ctx.lineTo(dx * raio * 1.3, raio * 2); }
    ctx.stroke();
  }
}

// ------------------------------------------------------------------
// POEIRA no facho: grãos que só existem onde a luz bate
// ------------------------------------------------------------------
function mapaPoeira(dir) {
  const t = time;
  ctx.fillStyle = "rgba(255,244,214,0.5)";
  for (let i = 0; i < 26; i++) {
    const ph = nzHash(i * 17, 3) * 6.283, d0 = 2 + nzHash(i * 31, 7) * 20;
    const ang = dir + (nzHash(i * 13, 11) - 0.5) * 0.7 + Math.sin(t * 0.3 + ph) * 0.05;
    const dd = d0 + Math.sin(t * 0.21 + ph) * 1.4;
    const x = player.x + Math.cos(ang) * dd, y = player.y + Math.sin(ang) * dd;
    const L = lightAt(x, y);
    if (L <= 0.12 || mapaParedeLike(x | 0, y | 0)) continue;
    ctx.globalAlpha = Math.min(0.55, L * 0.5) * (0.5 + 0.5 * Math.sin(t * 1.7 + ph * 3));
    ctx.fillRect(x * CELL, y * CELL + Math.sin(t * 0.5 + ph) * 3, 0.9, 0.9);
  }
  ctx.globalAlpha = 1;
}

// ------------------------------------------------------------------
// ÍCONES DE HUD (tela): elo de corrente, fusível, chave
// ------------------------------------------------------------------
function hudElo(x, y, quebrado) {
  ctx.lineWidth = 2.4; ctx.lineCap = "round";
  if (quebrado) {
    ctx.strokeStyle = "rgba(120,132,150,0.45)";
    ctx.beginPath(); ctx.arc(x - 2, y, 5.5, 0.9, 5.4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 5, y - 5); ctx.lineTo(x + 8, y - 8);
    ctx.moveTo(x + 6, y + 4); ctx.lineTo(x + 9, y + 7); ctx.stroke();
  } else {
    ctx.strokeStyle = "rgba(190,212,250,0.95)";
    ctx.beginPath(); ctx.ellipse(x - 3, y, 5.5, 3.6, 0, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(x + 4, y, 5.5, 3.6, 0, 0, 7); ctx.stroke();
  }
}
function hudFusivel(x, y, estado) {       // 0 falta · 1 na mão · 2 no quadro
  ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.strokeStyle = estado === 2 ? "rgba(130,225,130,0.95)"
    : estado === 1 ? "rgba(255,176,96,0.95)" : "rgba(130,130,130,0.4)";
  ctx.fillStyle = estado === 2 ? "rgba(130,225,130,0.25)"
    : estado === 1 ? "rgba(255,176,96,0.22)" : "rgba(0,0,0,0)";
  ctx.beginPath(); mapaRR(x - 10, y - 5, 20, 10, 3.4); ctx.fill(); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - 5, y - 5); ctx.lineTo(x - 5, y + 5);
  ctx.moveTo(x + 5, y - 5); ctx.lineTo(x + 5, y + 5);
  if (estado) {
    ctx.moveTo(x - 3, y); ctx.lineTo(x - 1, y - 2.4);
    ctx.lineTo(x + 1, y + 2.4); ctx.lineTo(x + 3, y);
  }
  ctx.stroke();
}
// "ele já tem um negativo seu": um quadrinho de filme com uma figura dentro
function hudNegativo(x, y) {
  const p = 0.7 + 0.3 * Math.sin(time * 2.4);
  ctx.save();
  ctx.lineWidth = 1.6; ctx.lineJoin = "round";
  ctx.strokeStyle = `rgba(226,84,70,${p.toFixed(2)})`;
  ctx.fillStyle = "rgba(40,8,6,0.75)";
  ctx.beginPath(); ctx.rect(x, y - 8, 20, 16); ctx.fill(); ctx.stroke();
  ctx.fillStyle = `rgba(226,84,70,${p.toFixed(2)})`;
  for (let i = 0; i < 4; i++) { ctx.fillRect(x + 2 + i * 4.6, y - 7, 2, 1.6); ctx.fillRect(x + 2 + i * 4.6, y + 5.4, 2, 1.6); }
  ctx.beginPath(); ctx.arc(x + 10, y - 1.6, 2.2, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + 10, y + 3.6, 3.6, 2.2, 0, Math.PI, 0); ctx.fill();
  ctx.restore();
}
function hudChave(x, y, tem) {
  ctx.lineWidth = 2.2; ctx.lineCap = "round";
  ctx.strokeStyle = tem ? "rgba(244,214,116,0.98)" : "rgba(130,130,130,0.4)";
  ctx.beginPath(); ctx.arc(x - 6, y, 4.6, 0, 7); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - 1.4, y); ctx.lineTo(x + 11, y);
  ctx.moveTo(x + 6, y); ctx.lineTo(x + 6, y + 5);
  ctx.moveTo(x + 10, y); ctx.lineTo(x + 10, y + 4);
  ctx.stroke();
}

// ------------------------------------------------------------------
// PEGADAS: alguém pequeno andou até a parede… e não parou nela.
// É a pista DENTRO do mundo para a parede falsa (só aparece sob a luz, e
// some quando a sala secreta é achada). O que há atrás continua sendo da foto.
// ------------------------------------------------------------------
// (as pegadas até a parede falsa foram retiradas em 2026-10-03: facilitavam demais)

// (a memória de planta — paredes já vistas em cinza — foi retirada em 2026-10-03)

// a cabeça no chão vê o que não está lá: um par de olhos no escuro
function mapaOlhosFalsos(f) {
  const a = Math.min(1, f.t / 0.25) * Math.min(1, (f.dur - f.t) / 0.3);
  if (a <= 0) return;
  ctx.save();
  ctx.translate(f.x * CELL, f.y * CELL);
  ctx.shadowColor = "rgba(255,60,40,0.9)"; ctx.shadowBlur = 8;
  ctx.fillStyle = `rgba(255,92,70,${(0.85 * a).toFixed(3)})`;
  ctx.beginPath();
  ctx.ellipse(-2.0, 0, 1.3, 1.7, 0, 0, 7);
  ctx.ellipse(2.0, 0, 1.3, 1.7, 0, 0, 7);
  ctx.fill();
  ctx.restore();
}

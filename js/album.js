"use strict";
// ==================================================================
// O ÁLBUM — livro de polaroids, páginas duplas com 4 fotos. No FIM, as
// páginas de PISTAS (cor diferente) guardam as fotos que importam para os
// puzzles da run (a foto que mostrou um dígito, um retrato, o sinal…).
// A foto com fantasma pode ter a alma CONVERTIDA: clique no vulto, ele some
// da foto e a alma vai para a ampola da câmera. Dá para jogar foto fora.
// E as páginas são FOLHEADAS de verdade.
// ==================================================================
let albumPage = 0, albumZoom = -1, albumFlip = null, albumJogaFora = 0;
const ALB_GUARDA = { x: 20, y: 20, w: 300, h: 56 };          // zoom: converter as almas da foto
const ALB_PISTA  = { x: 340, y: 20, w: 280, h: 56 };         // zoom: fixar / soltar das pistas
const ALB_FORA   = { x: 640, y: 20, w: 220, h: 56 };         // zoom: jogar fora
const ALB_FLIP_T = 0.85;                                      // segundos para virar a página

// as fotos comuns (ordem do tempo) e, depois, as pistas
function albumOrdem() {
  return album.filter(e => !e.pista).concat(album.filter(e => e.pista));
}
function albumPaginas() {
  const n = album.filter(e => !e.pista).length, p = album.filter(e => e.pista).length;
  return { normais: Math.max(1, Math.ceil(n / 4)), pistas: Math.ceil(p / 4) };
}
function albumTotalPaginas() { const q = albumPaginas(); return q.normais + q.pistas; }
function albumEhPista(page) { return page >= albumPaginas().normais; }
function albumFotosDaPagina(page) {
  const q = albumPaginas();
  const lista = album.filter(e => !!e.pista === (page >= q.normais));
  const i0 = (page >= q.normais ? page - q.normais : page) * 4;
  return lista.slice(i0, i0 + 4);
}
function albumPaginaDe(e) {
  const q = albumPaginas();
  const lista = album.filter(x => !!x.pista === !!e.pista);
  const i = Math.max(0, lista.indexOf(e));
  return (e.pista ? q.normais : 0) + ((i / 4) | 0);
}
// o álbum enche: sai a foto comum mais antiga (pista nunca sai sozinha)
function albumLimita() {
  while (album.length > ALBUM_MAX) {
    const i = album.findIndex(e => !e.pista);
    if (i < 0) break;
    album.splice(i, 1);
  }
}

function openAlbum(ret, foto) {
  state = "album"; albumReturn = ret;
  albumZoom = -1; albumFlip = null; albumJogaFora = 0;
  if (foto && album.includes(foto)) {
    albumPage = albumPaginaDe(foto);
    albumZoom = albumOrdem().indexOf(foto);
    return;
  }
  albumPage = Math.max(0, albumPaginas().normais - 1);     // a última página comum
}
function albumBookRect() {
  return { x: canvas.width / 2 - 505, y: 64, w: 1010, h: 578 };
}
function albumSlots(b) {
  b = b || albumBookRect();
  const out = [], tw = 300, th = tw * 0.80;
  for (let i = 0; i < 4; i++) {
    const col = i % 2, row = (i / 2) | 0;
    out.push({
      x: b.x + (col === 0 ? 92 : b.w / 2 + 102) + (row === 1 ? 10 - col * 16 : 0),
      y: b.y + 38 + row * 262, w: tw, h: th, rot: [-0.028, 0.024, 0.02, -0.023][i],
    });
  }
  return out;
}

// ------------------------------------------------------------------
// a PÁGINA DUPLA desenhada num contexto qualquer (ao vivo, ou para a
// virada de página): capa, papel, tinta das pistas e as quatro fotos
// ------------------------------------------------------------------
function albumDesenhaSpread(g, page, b, hover) {
  const pista = albumEhPista(page);
  if (ALBUM_IMG) {
    g.drawImage(ALBUM_IMG, b.x - 56, b.y - 42, b.w + 112, b.h + 84);
  } else {
    g.fillStyle = "#241b13";
    g.fillRect(b.x - 16, b.y - 12, b.w + 32, b.h + 24);
    g.fillStyle = "#e6dec9";
    g.fillRect(b.x, b.y, b.w / 2 - 3, b.h);
    g.fillRect(b.x + b.w / 2 + 3, b.y, b.w / 2 - 3, b.h);
    const sp = g.createLinearGradient(b.x + b.w / 2 - 36, 0, b.x + b.w / 2 + 36, 0);
    sp.addColorStop(0, "rgba(60,45,30,0)");
    sp.addColorStop(0.5, "rgba(60,45,30,0.5)");
    sp.addColorStop(1, "rgba(60,45,30,0)");
    g.fillStyle = sp;
    g.fillRect(b.x + b.w / 2 - 36, b.y, 72, b.h);
  }
  if (pista) {                            // páginas de outra cor: papel vinho, cantos dourados
    g.save();
    g.globalCompositeOperation = "multiply";
    g.fillStyle = "rgba(150,74,78,0.9)";
    g.fillRect(b.x + 18, b.y + 10, b.w / 2 - 36, b.h - 20);
    g.fillRect(b.x + b.w / 2 + 18, b.y + 10, b.w / 2 - 36, b.h - 20);
    g.restore();
    g.strokeStyle = "rgba(230,196,120,0.75)"; g.lineWidth = 1.5;
    for (const [px, py, sx, sy] of [[b.x + 30, b.y + 22, 1, 1], [b.x + b.w / 2 - 30, b.y + 22, -1, 1],
        [b.x + 30, b.y + b.h - 22, 1, -1], [b.x + b.w / 2 - 30, b.y + b.h - 22, -1, -1],
        [b.x + b.w / 2 + 30, b.y + 22, 1, 1], [b.x + b.w - 30, b.y + 22, -1, 1],
        [b.x + b.w / 2 + 30, b.y + b.h - 22, 1, -1], [b.x + b.w - 30, b.y + b.h - 22, -1, -1]]) {
      g.beginPath(); g.moveTo(px + sx * 22, py); g.lineTo(px, py); g.lineTo(px, py + sy * 22); g.stroke();
    }
    g.font = "italic 20px 'Segoe Script', 'Comic Sans MS', cursive";
    g.textAlign = "center"; g.textBaseline = "middle";
    g.fillStyle = "rgba(240,214,150,0.9)";
    g.fillText("PISTAS DA RUN", b.x + b.w / 4, b.y + b.h - 18);
  }
  const fotos = albumFotosDaPagina(page);
  if (!album.length) {
    g.font = "italic 24px 'Segoe Script', 'Comic Sans MS', cursive";
    g.textAlign = "center"; g.textBaseline = "middle";
    g.fillStyle = "rgba(90,78,62,0.75)";
    g.fillText("nenhuma foto colada ainda…", b.x + b.w / 2, b.y + b.h / 2);
  }
  const slots = albumSlots(b);
  fotos.forEach((e, i) => {
    const s = slots[i], ph = e.cv;
    const hov = hover && mouse.x > s.x && mouse.x < s.x + s.w && mouse.y > s.y && mouse.y < s.y + s.h;
    g.save();
    g.translate(s.x + s.w / 2, s.y + s.h / 2);
    g.rotate(s.rot + (hov ? 0.012 : 0));
    g.shadowColor = "rgba(0,0,0,0.45)"; g.shadowBlur = 14; g.shadowOffsetY = 5;
    const sc = (hov ? 1.045 : 1) * s.w / ph.width;
    g.drawImage(ph, -ph.width * sc / 2, -ph.height * sc / 2, ph.width * sc, ph.height * sc);
    g.shadowColor = "rgba(0,0,0,0)"; g.shadowBlur = 0; g.shadowOffsetY = 0;
    // orelha vermelha: esta foto é PISTA; chama azul: tem alma para converter
    if (e.pistas && e.pistas.length) {
      g.fillStyle = "rgba(190,40,34,0.9)";
      g.beginPath(); g.moveTo(ph.width * sc / 2 - 26, -ph.height * sc / 2);
      g.lineTo(ph.width * sc / 2, -ph.height * sc / 2); g.lineTo(ph.width * sc / 2, -ph.height * sc / 2 + 26);
      g.closePath(); g.fill();
    }
    if (almasSoltas(e) > 0) {
      const fx = -ph.width * sc / 2 + 16, fy = -ph.height * sc / 2 + 16;
      const fg = g.createRadialGradient(fx, fy, 1, fx, fy, 11);
      fg.addColorStop(0, "rgba(225,242,255,0.95)"); fg.addColorStop(0.45, "rgba(110,170,255,0.8)");
      fg.addColorStop(1, "rgba(110,170,255,0)");
      g.fillStyle = fg; g.fillRect(fx - 11, fy - 11, 22, 22);
    }
    g.restore();
  });
}

// virar a página: guarda a página de agora e a de depois, e anima entre elas
function albumVira(dir) {
  if (albumFlip) return;
  const total = albumTotalPaginas();
  const nova = albumPage + dir;
  if (nova < 0 || nova >= total) return;
  const b = albumBookRect();
  const snap = (page) => {
    const cv = document.createElement("canvas");
    cv.width = b.w + 112; cv.height = b.h + 84;
    const g = cv.getContext("2d");
    g.translate(-(b.x - 56), -(b.y - 42));
    albumDesenhaSpread(g, page, b, false);
    return cv;
  };
  albumFlip = { dir, t: 0, antes: snap(albumPage), depois: snap(nova) };
  albumPage = nova;
  sfxPage();
}
function albumDesenhaFlip(b) {
  const F = albumFlip, X = b.x - 56, Y = b.y - 42, W = b.w + 112, H = b.h + 84;
  const w2 = W / 2, meio = X + w2;
  const u = Math.min(1, F.t / ALB_FLIP_T), t = u * u * (3 - 2 * u);      // arranca e assenta macio
  const th = t * Math.PI, c = Math.cos(th), s = Math.sin(th), k = Math.abs(c);
  // as páginas que ficam paradas: a VELHA do lado de onde a folha sai (a folha cai por cima
  // dela no fim) e a NOVA do lado para onde ela vai (aparece conforme a folha levanta)
  if (F.dir > 0) {
    ctx.drawImage(F.antes, 0, 0, w2, H, X, Y, w2, H);
    ctx.drawImage(F.depois, w2, 0, w2, H, meio, Y, w2, H);
  } else {
    ctx.drawImage(F.depois, 0, 0, w2, H, X, Y, w2, H);
    ctx.drawImage(F.antes, w2, 0, w2, H, meio, Y, w2, H);
  }
  // a FOLHA que vira: frente até 90°, depois o verso (que é a página nova)
  const frente = t < 0.5;
  let src, srcX0, lado;                   // lado +1: a folha está à direita do vinco
  if (F.dir > 0) { if (frente) { src = F.antes; srcX0 = w2; lado = 1; } else { src = F.depois; srcX0 = 0; lado = -1; } }
  else           { if (frente) { src = F.antes; srcX0 = 0; lado = -1; } else { src = F.depois; srcX0 = w2; lado = 1; } }
  const N = 28, sw = w2 / N;
  for (let i = 0; i < N; i++) {           // tiras verticais: a borda livre vem para perto (cresce)
    const u0 = i / N, u1 = (i + 1) / N;
    const p0 = 1 + 0.17 * u0 * s, p1 = 1 + 0.17 * u1 * s;
    const sx = lado > 0 ? srcX0 + u0 * w2 : srcX0 + (1 - u1) * w2;
    const x0 = lado > 0 ? meio + u0 * w2 * k : meio - u1 * w2 * k;
    const x1 = lado > 0 ? meio + u1 * w2 * k : meio - u0 * w2 * k;
    const hh = H * (p0 + p1) / 2;
    ctx.drawImage(src, sx, 0, sw, H, x0, Y - (hh - H) / 2, Math.max(1, x1 - x0 + 0.8), hh);
  }
  // a folha escurece ao se levantar e a luz volta quando assenta
  const xa = lado > 0 ? meio : meio - w2 * k, xb = lado > 0 ? meio + w2 * k : meio;
  if (xb - xa > 1) {
    const g = ctx.createLinearGradient(xa, 0, xb, 0), e = 0.5 * s;
    g.addColorStop(0, `rgba(0,0,0,${(lado > 0 ? e : e * 0.2).toFixed(3)})`);
    g.addColorStop(1, `rgba(0,0,0,${(lado > 0 ? e * 0.2 : e).toFixed(3)})`);
    ctx.fillStyle = g; ctx.fillRect(xa, Y - H * 0.1, xb - xa, H * 1.2);
  }
  albumSombraDobra(lado > 0 ? xb : xa, Y, H, lado > 0 ? 1 : -1, t);   // sombra na página de baixo
}
function albumSombraDobra(x, y, h, lado, t) {
  const k = Math.sin(t * Math.PI);        // mais sombra no meio da virada
  const g = ctx.createLinearGradient(x, 0, x + lado * 90, 0);
  g.addColorStop(0, `rgba(0,0,0,${(0.42 * k).toFixed(3)})`);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(lado > 0 ? x : x - 90, y, 90, h);
}

// ------------------------------------------------------------------
// desenhar o álbum (livro aberto, ou uma foto em zoom)
// ------------------------------------------------------------------
function albumRetZoom(ph) {
  const sc = Math.min(536 / ph.height, 980 / ph.width);
  return { x: canvas.width / 2 - ph.width * sc / 2, y: 88, w: ph.width * sc, h: ph.height * sc, sc };
}
// o retângulo do vulto na tela, cortado no "vidro" da polaroid (o vulto grande vaza)
function albumMarcaRect(R, m) {
  const FR = FOTO_MOLDURA.FR, gw = R.w / R.sc - FR * 2, gh = R.h / R.sc - FR - FOTO_MOLDURA.BOT;
  const x0 = Math.max(FR, m.x - m.w / 2), x1 = Math.min(FR + gw, m.x + m.w / 2);
  const y0 = Math.max(FR, m.y), y1 = Math.min(FR + gh, m.y + m.h);
  return { x: R.x + x0 * R.sc, y: R.y + y0 * R.sc, w: Math.max(0, x1 - x0) * R.sc, h: Math.max(0, y1 - y0) * R.sc };
}
function albumBotao(B, texto, ativo, cor, hov, atalho) {
  ctx.fillStyle = ativo ? cor : "rgba(0,0,0,0.45)";
  ctx.fillRect(B.x, B.y, B.w, B.h);
  ctx.lineWidth = hov && ativo ? 3 : 2;
  ctx.strokeStyle = ativo ? (hov ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.55)") : "rgba(255,255,255,0.2)";
  ctx.strokeRect(B.x, B.y, B.w, B.h);
  ctx.font = "bold 17px 'Courier New', monospace";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = ativo ? "rgba(235,235,235,0.95)" : "rgba(170,170,170,0.6)";
  ctx.fillText(texto, B.x + B.w / 2, B.y + B.h / 2 + 1, B.w - 16);
  if (atalho && !touchUI.seen) {               // a tecla, miúda, no canto do botão
    ctx.font = "bold 10px 'Courier New', monospace";
    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(200,200,200,0.5)";
    ctx.fillText(atalho, B.x + B.w - 6, B.y + B.h - 8);
    ctx.textAlign = "center";
  }
}
function drawAlbum() {
  ctx.fillStyle = "rgba(0,0,0,0.9)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const b = albumBookRect();
  const total = albumTotalPaginas();
  if (albumPage > total - 1) albumPage = total - 1;
  const ord = albumOrdem();
  if (albumZoom >= ord.length) albumZoom = ord.length - 1;

  if (albumZoom < 0) {
    if (albumFlip) {
      albumFlip.t += frameDt;
      albumDesenhaFlip(b);
      if (albumFlip.t >= ALB_FLIP_T) albumFlip = null;
    } else albumDesenhaSpread(ctx, albumPage, b, true);
    if (total > 1) {
      ctx.font = "bold 70px 'Courier New', monospace";
      ctx.fillStyle = albumPage > 0
        ? `rgba(255,255,255,${0.5 + 0.25 * Math.sin(time * 4)})` : "rgba(255,255,255,0.1)";
      ctx.fillText("<", 56, canvas.height / 2);
      ctx.fillStyle = albumPage < total - 1
        ? `rgba(255,255,255,${0.5 + 0.25 * Math.sin(time * 4)})` : "rgba(255,255,255,0.1)";
      ctx.fillText(">", canvas.width - 56, canvas.height / 2);
    }
    ctx.font = "italic 17px 'Segoe Script', 'Comic Sans MS', cursive";
    ctx.fillStyle = albumEhPista(albumPage) ? "rgba(240,214,150,0.9)" : "rgba(200,190,170,0.8)";
    ctx.fillText(tf("página {0} de {1}", albumPage + 1, total) +
                 (albumEhPista(albumPage) ? " · " + tr("PISTAS DA RUN") : ""),
                 canvas.width / 2, canvas.height - 16);
  } else {
    // ZOOM numa foto
    const e = ord[albumZoom], ph = e.cv, R = albumRetZoom(ph);
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 26; ctx.shadowOffsetY = 8;
    ctx.drawImage(ph, R.x, R.y, R.w, R.h);
    ctx.restore();
    // os vultos que ainda têm alma: contorno azul; o do mouse, pedindo o clique
    const temAmpola = !!world.flags.cam.ampola;
    for (const m of e.marcas || []) {
      if (m.guardada) continue;
      const q = albumMarcaRect(R, m);
      const hov = mouse.x >= q.x && mouse.x <= q.x + q.w && mouse.y >= q.y && mouse.y <= q.y + q.h;
      ctx.save();
      ctx.setLineDash([6, 5]);
      ctx.lineWidth = hov ? 2.5 : 1.5;
      ctx.strokeStyle = temAmpola ? `rgba(120,180,255,${(hov ? 0.95 : 0.45 + 0.25 * Math.sin(time * 4)).toFixed(2)})`
                                  : "rgba(200,200,200,0.35)";
      ctx.strokeRect(q.x - 4, q.y - 4, q.w + 8, q.h + 8);
      ctx.restore();
      if (hov) {
        ctx.font = "bold 13px 'Courier New', monospace";
        ctx.fillStyle = "rgba(0,0,0,0.75)";
        const tx = tr(temAmpola ? "CONVERTER ALMA" : "PRECISA DA AMPOLA");
        const tw = ctx.measureText(tx).width;
        ctx.fillRect(q.x + q.w / 2 - tw / 2 - 8, q.y - 28, tw + 16, 22);
        ctx.fillStyle = temAmpola ? "rgba(190,220,255,0.95)" : "rgba(200,200,200,0.8)";
        ctx.fillText(tx, q.x + q.w / 2, q.y - 17);
      }
    }
    if (ord.length > 1) {
      ctx.font = "bold 70px 'Courier New', monospace";
      ctx.fillStyle = albumZoom > 0 ? "rgba(255,255,255,0.65)" : "rgba(255,255,255,0.1)";
      ctx.fillText("<", 56, canvas.height / 2);
      ctx.fillStyle = albumZoom < ord.length - 1 ? "rgba(255,255,255,0.65)" : "rgba(255,255,255,0.1)";
      ctx.fillText(">", canvas.width - 56, canvas.height / 2);
    }
    // as pistas que esta foto guarda, à mão, embaixo
    if (e.pistas && e.pistas.length) {
      ctx.font = "italic 16px 'Segoe Script', 'Comic Sans MS', cursive";
      ctx.fillStyle = "rgba(240,214,150,0.9)";
      ctx.fillText(tr("pista:") + " " + e.pistas.map(p => tr(p)).join(" · "),
                   canvas.width / 2, R.y + R.h + 16, 980);
    }
    ctx.font = "bold 13px 'Courier New', monospace";
    ctx.fillStyle = "rgba(170,170,170,0.8)";
    ctx.fillText(`${albumZoom + 1} / ${ord.length}   ·   ` +
                 tr(touchUI.seen ? "toque fora para voltar ao álbum"
                                 : "clique fora volta ao álbum · ← →"),
                 canvas.width / 2, canvas.height - 20);
    // botões: converter alma(s), fixar/soltar das pistas, jogar fora
    const nS = almasSoltas(e), hv = (B) => mouse.x >= B.x && mouse.x <= B.x + B.w && mouse.y >= B.y && mouse.y <= B.y + B.h;
    albumBotao(ALB_GUARDA,
      nS > 0 ? tr(temAmpola ? "CONVERTER A ALMA DA FOTO" : "PRECISA DA AMPOLA")
             : tr((e.armazenadas || 0) > 0 ? "alma convertida" : "sem alma nesta foto"),
      nS > 0 && temAmpola, "rgba(20,40,70,0.75)", hv(ALB_GUARDA), "A");
    albumBotao(ALB_PISTA, tr(e.pista ? "SOLTAR DAS PISTAS" : "FIXAR NAS PISTAS"), true,
      e.pista ? "rgba(70,30,30,0.75)" : "rgba(40,30,20,0.75)", hv(ALB_PISTA), "P");
    albumBotao(ALB_FORA, tr(albumJogaFora > time ? (nS > 0 ? "TEM ALMA NA FOTO! JOGAR FORA MESMO?" : "JOGAR FORA MESMO?") : "JOGAR FORA"),
      true, albumJogaFora > time ? "rgba(90,20,16,0.85)" : "rgba(30,30,30,0.7)", hv(ALB_FORA), "DEL");
  }

  const hovC = mouse.x >= ALB_CLOSE.x && mouse.x <= ALB_CLOSE.x + ALB_CLOSE.w &&
               mouse.y >= ALB_CLOSE.y && mouse.y <= ALB_CLOSE.y + ALB_CLOSE.h;
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(ALB_CLOSE.x, ALB_CLOSE.y, ALB_CLOSE.w, ALB_CLOSE.h);
  ctx.lineWidth = hovC ? 3 : 2;
  ctx.strokeStyle = hovC ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.5)";
  ctx.strokeRect(ALB_CLOSE.x, ALB_CLOSE.y, ALB_CLOSE.w, ALB_CLOSE.h);
  ctx.font = "bold 19px 'Courier New', monospace";
  ctx.fillStyle = "rgba(230,230,230,0.9)";
  ctx.fillText("FECHAR", ALB_CLOSE.x + ALB_CLOSE.w / 2, ALB_CLOSE.y + ALB_CLOSE.h / 2 + 1);
}

// ------------------------------------------------------------------
// entradas do álbum
// ------------------------------------------------------------------
function albumJogarFora(e) {
  if (albumJogaFora <= time) { albumJogaFora = time + 3; sfxDry(); return; }   // pede confirmação
  const i = album.indexOf(e);
  if (i >= 0) album.splice(i, 1);
  albumJogaFora = 0;
  sfxPage();
  const ord = albumOrdem();
  if (!ord.length) { albumZoom = -1; albumPage = 0; return; }
  if (albumZoom >= ord.length) albumZoom = ord.length - 1;
}
// sai do zoom: o livro abre na página da foto que estava aberta
function albumSaiZoom() {
  const e = albumOrdem()[albumZoom];
  if (e) albumPage = albumPaginaDe(e);
  albumZoom = -1; albumJogaFora = 0;
}
function albumAlternaPista(e) {
  e.pista = !e.pista;
  sfxPage();
  if (albumZoom >= 0) albumZoom = albumOrdem().indexOf(e);   // o zoom continua NESTA foto
  albumPage = albumPaginaDe(e);                               // e o livro abre na página dela
}
function albumHit(px2, py2) {
  if (px2 >= ALB_CLOSE.x && px2 <= ALB_CLOSE.x + ALB_CLOSE.w &&
      py2 >= ALB_CLOSE.y && py2 <= ALB_CLOSE.y + ALB_CLOSE.h) {
    if (albumZoom >= 0) albumSaiZoom();
    else state = albumReturn;
    return;
  }
  const ord = albumOrdem();
  if (albumZoom >= 0) {
    const e = ord[albumZoom];
    const em = (B) => px2 >= B.x && px2 <= B.x + B.w && py2 >= B.y && py2 <= B.y + B.h;
    if (em(ALB_GUARDA)) { armazenarFoto(e); return; }
    if (em(ALB_PISTA)) { albumAlternaPista(e); return; }
    if (em(ALB_FORA)) { albumJogarFora(e); return; }
    // clicou num vulto da foto: converte aquela alma
    const R = albumRetZoom(e.cv);
    for (const m of e.marcas || []) {
      if (m.guardada) continue;
      const q = albumMarcaRect(R, m);
      if (px2 >= q.x - 6 && px2 <= q.x + q.w + 6 && py2 >= q.y - 6 && py2 <= q.y + q.h + 6) {
        armazenarAlma(e); return;
      }
    }
    // laterais navegam, o resto volta ao livro
    if (px2 > canvas.width * 0.8 && albumZoom < ord.length - 1) { albumZoom++; albumJogaFora = 0; }
    else if (px2 < canvas.width * 0.2 && albumZoom > 0) { albumZoom--; albumJogaFora = 0; }
    else albumSaiZoom();
    return;
  }
  if (albumFlip) return;                 // folheando: espera a página cair
  const fotos = albumFotosDaPagina(albumPage), slots = albumSlots();
  for (let i = 0; i < fotos.length; i++) {
    const s = slots[i];
    if (px2 > s.x - 8 && px2 < s.x + s.w + 8 && py2 > s.y - 8 && py2 < s.y + s.h + 8) {
      albumZoom = ord.indexOf(fotos[i]); return;
    }
  }
  if (px2 > canvas.width - 120) { albumVira(1); return; }
  if (px2 < 120) { albumVira(-1); return; }
  const b = albumBookRect();
  if (px2 < b.x || px2 > b.x + b.w || py2 < b.y || py2 > b.y + b.h) state = albumReturn;
}
function albumTecla(code) {
  const ord = albumOrdem();
  if (code === "Escape") {
    if (albumZoom >= 0) albumSaiZoom();
    else state = albumReturn;
    return;
  }
  if (albumZoom >= 0) {
    const e = ord[albumZoom];
    if (code === "ArrowLeft"  && albumZoom > 0) { albumZoom--; albumJogaFora = 0; }
    if (code === "ArrowRight" && albumZoom < ord.length - 1) { albumZoom++; albumJogaFora = 0; }
    if ((code === "KeyA" || code === "Enter") && e) armazenarFoto(e);
    if (code === "KeyP" && e) albumAlternaPista(e);
    if ((code === "Delete" || code === "Backspace") && e) albumJogarFora(e);
  } else {
    if (code === "ArrowLeft") albumVira(-1);
    if (code === "ArrowRight") albumVira(1);
  }
}

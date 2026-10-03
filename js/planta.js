"use strict";
// ==================================================================
// PLANTA — os móveis vistos de cima, como numa planta antiga a nanquim:
// corpo escuro, contorno claro, detalhe que diz O QUE é (almofadas,
// teclas, travesseiros, lombadas) sem contar como o móvel É — isso é da
// foto. Cada tipo vira um sprite (4 px por... 40 px por célula) uma vez só.
// Assets/Planta/<tipo>.jpg (fundo preto, visto de cima) substitui o desenho.
// Aqui também vivem o CANDELABRO (mapa e foto).
// ==================================================================
const PLANTA_IMGS = {}, PLANTA_SPRS = {};
(function loadPlantaImgs() {
  for (const k in FURN_TYPES) {
    const im = new Image();
    im.onload = () => { PLANTA_IMGS[k] = keyBlackToAlpha(im); };
    im.onerror = () => {};
    im.src = "Assets/Planta/" + k + ".jpg";
  }
})();

function plantaSprite(tipo) {
  if (PLANTA_IMGS[tipo]) return PLANTA_IMGS[tipo];
  if (PLANTA_SPRS[tipo]) return PLANTA_SPRS[tipo];
  const ft = FURN_TYPES[tipo], S = 40;
  const cv = document.createElement("canvas");
  cv.width = ft.w * S; cv.height = ft.h * S;
  const g = cv.getContext("2d");
  g.scale(S, S);
  g.lineCap = "round"; g.lineJoin = "round";
  const r = mulberry32(tipo.length * 977 + tipo.charCodeAt(0));
  const CLARO = "rgba(236,218,184,", MEIO = "rgba(176,160,130,";
  // corpo em madeira escura (não preto: no chão apagado o móvel ainda é um VOLUME)
  const corpo = () => { g.fillStyle = "rgba(62,48,34,0.94)"; g.fill(); };
  const traco = (a, w) => { g.strokeStyle = CLARO + (a === undefined ? 0.95 : a) + ")"; g.lineWidth = w || 0.11; g.stroke(); };
  const fino = (a, w) => { g.strokeStyle = MEIO + (a === undefined ? 0.7 : a) + ")"; g.lineWidth = w || 0.05; g.stroke(); };
  const rr = (x, y, w, h, rad) => {
    g.beginPath();
    g.moveTo(x + rad, y); g.lineTo(x + w - rad, y); g.quadraticCurveTo(x + w, y, x + w, y + rad);
    g.lineTo(x + w, y + h - rad); g.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
    g.lineTo(x + rad, y + h); g.quadraticCurveTo(x, y + h, x, y + h - rad);
    g.lineTo(x, y + rad); g.quadraticCurveTo(x, y, x + rad, y); g.closePath();
  };
  const hachura = (x, y, w, h, passo, a) => {   // sombreado a 45°, recortado na caixa
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
    g.strokeStyle = MEIO + a + ")"; g.lineWidth = 0.035;
    g.beginPath();
    for (let d = -h; d < w + h; d += passo) { g.moveTo(x + d, y + h); g.lineTo(x + d + h, y); }
    g.stroke(); g.restore();
  };
  const pontos = (xs, ys, rad) => { for (const x of xs) for (const y of ys) { g.beginPath(); g.arc(x, y, rad, 0, 7); g.fillStyle = CLARO + "0.9)"; g.fill(); } };

  switch (tipo) {
    case "sofa": {
      rr(0.08, 0.1, 2.84, 0.8, 0.14); corpo(); traco();
      hachura(0.1, 0.12, 2.8, 0.28, 0.14, 0.45);              // o encosto
      g.beginPath(); g.moveTo(0.1, 0.4); g.lineTo(2.9, 0.4); fino(0.8, 0.05);
      for (let i = 0; i < 3; i++) { rr(0.38 + i * 0.76, 0.46, 0.68, 0.38, 0.09); fino(0.9, 0.055); }
      rr(0.1, 0.34, 0.24, 0.54, 0.08); fino(0.9, 0.055);       // braços
      rr(2.66, 0.34, 0.24, 0.54, 0.08); fino(0.9, 0.055);
      break;
    }
    case "mesa": {
      rr(0.14, 0.14, 1.72, 1.72, 0.12); corpo(); traco();
      rr(0.3, 0.3, 1.4, 1.4, 0.08); fino(0.6, 0.04);
      g.beginPath();
      for (let i = 0; i < 4; i++) {                              // veios da madeira
        const y = 0.5 + i * 0.32;
        g.moveTo(0.36, y); g.quadraticCurveTo(1.0, y + (r() - 0.5) * 0.16, 1.64, y);
      }
      fino(0.35, 0.035);
      pontos([0.3, 1.7], [0.3, 1.7], 0.07);                     // as quatro pernas
      break;
    }
    case "estante": {
      rr(0.06, 0.12, 2.88, 0.76, 0.06); corpo(); traco();
      g.beginPath(); g.moveTo(0.1, 0.78); g.lineTo(2.9, 0.78); fino(0.8, 0.05);  // a prateleira
      for (let x = 0.2; x < 2.82; x += 0.13) {                  // lombadas, de alturas diferentes
        const h = 0.3 + r() * 0.3, w = 0.05 + r() * 0.05;
        g.beginPath(); g.rect(x, 0.76 - h, w, h);
        g.fillStyle = CLARO + (0.35 + r() * 0.5) + ")"; g.fill();
      }
      break;
    }
    case "cadeira": {
      rr(0.2, 0.3, 0.6, 0.56, 0.1); corpo(); traco();
      rr(0.16, 0.12, 0.68, 0.2, 0.06); corpo(); traco(0.9, 0.07);
      hachura(0.18, 0.13, 0.64, 0.18, 0.1, 0.5);              // o espaldar
      pontos([0.26, 0.74], [0.36, 0.8], 0.045);
      break;
    }
    case "piano": {
      g.beginPath();
      g.moveTo(0.1, 0.16); g.lineTo(1.22, 0.16); g.quadraticCurveTo(1.92, 0.16, 1.9, 0.86);
      g.quadraticCurveTo(1.9, 1.3, 1.5, 1.6); g.quadraticCurveTo(1.1, 1.9, 0.6, 1.88);
      g.quadraticCurveTo(0.1, 1.86, 0.1, 1.5); g.closePath();
      corpo(); traco();
      g.beginPath(); g.rect(0.1, 0.16, 0.26, 1.34); g.fillStyle = CLARO + "0.85)"; g.fill();   // teclas
      g.fillStyle = "rgba(24,19,14,0.95)";
      for (let i = 0; i < 14; i++) {                              // as pretas, em 2+3
        const k = i % 7; if (k === 2 || k === 6) continue;
        g.fillRect(0.1, 0.22 + i * 0.09, 0.15, 0.045);
      }
      g.beginPath(); g.moveTo(0.36, 0.16); g.lineTo(0.36, 1.5); fino(0.9, 0.04);
      g.beginPath(); g.moveTo(0.7, 0.5); g.quadraticCurveTo(1.5, 0.55, 1.62, 1.3); fino(0.6, 0.045);   // o tampo erguido
      g.beginPath(); g.moveTo(0.52, 0.3); g.lineTo(0.52, 1.36); fino(0.5, 0.03);                      // a estante de partitura
      break;
    }
    case "cama": {
      rr(0.1, 0.1, 1.8, 2.8, 0.1); corpo(); traco();
      g.beginPath(); g.rect(0.1, 0.1, 1.8, 0.2); g.fillStyle = CLARO + "0.35)"; g.fill();   // cabeceira
      hachura(0.1, 0.1, 1.8, 0.2, 0.08, 0.6);
      rr(0.24, 0.4, 0.66, 0.42, 0.1); fino(0.95, 0.06);          // travesseiros
      rr(1.1, 0.4, 0.66, 0.42, 0.1); fino(0.95, 0.06);
      rr(0.14, 0.98, 1.72, 1.88, 0.08); fino(0.9, 0.06);         // a coberta
      g.beginPath(); g.moveTo(0.14, 1.16); g.lineTo(1.86, 1.16); fino(0.9, 0.06);   // a dobra
      hachura(0.14, 0.98, 1.72, 0.18, 0.08, 0.5);
      g.beginPath(); g.moveTo(1.86, 2.4); g.lineTo(1.42, 2.86); fino(0.7, 0.045);   // a ponta virada
      break;
    }
    case "poltrona": {
      g.beginPath(); g.arc(0.5, 0.56, 0.42, Math.PI, 0); g.lineTo(0.92, 0.9); g.lineTo(0.08, 0.9); g.closePath();
      corpo(); traco();
      hachura(0.08, 0.14, 0.84, 0.3, 0.09, 0.5);              // o encosto envolvente
      rr(0.3, 0.44, 0.4, 0.42, 0.09); fino(0.95, 0.055);        // o assento
      rr(0.1, 0.44, 0.17, 0.44, 0.06); fino(0.8, 0.05);         // os braços
      rr(0.73, 0.44, 0.17, 0.44, 0.06); fino(0.8, 0.05);
      break;
    }
    case "bau": {
      rr(0.08, 0.12, 1.84, 0.76, 0.07); corpo(); traco();
      g.beginPath(); g.moveTo(0.1, 0.5); g.lineTo(1.9, 0.5); fino(0.9, 0.05);     // a linha da tampa
      for (const x of [0.5, 1.5]) { g.beginPath(); g.rect(x - 0.07, 0.12, 0.14, 0.76); g.fillStyle = CLARO + "0.5)"; g.fill(); }  // as cintas
      g.beginPath(); g.rect(0.9, 0.4, 0.2, 0.2); g.fillStyle = CLARO + "0.95)"; g.fill();       // a fechadura
      hachura(0.1, 0.14, 1.8, 0.34, 0.12, 0.3);
      break;
    }
    case "escrivaninha": {
      rr(0.06, 0.1, 1.88, 0.8, 0.06); corpo(); traco();
      g.beginPath(); g.moveTo(1.28, 0.12); g.lineTo(1.28, 0.88); fino(0.8, 0.05);
      for (let i = 0; i < 2; i++) { rr(1.36, 0.18 + i * 0.36, 0.5, 0.28, 0.04); fino(0.9, 0.045); pontos([1.61], [0.32 + i * 0.36], 0.035); }
      g.save(); g.translate(0.62, 0.5); g.rotate(-0.12); rr(-0.26, -0.18, 0.52, 0.36, 0.02); g.fillStyle = CLARO + "0.55)"; g.fill(); g.restore();   // uma folha
      g.beginPath(); g.arc(1.1, 0.3, 0.07, 0, 7); g.fillStyle = CLARO + "0.9)"; g.fill();   // o tinteiro
      break;
    }
    case "relogio": {
      rr(0.1, 0.1, 0.8, 0.8, 0.08); corpo(); traco();
      g.beginPath(); g.arc(0.5, 0.5, 0.3, 0, 7); g.fillStyle = CLARO + "0.85)"; g.fill();
      g.strokeStyle = "rgba(24,19,14,0.95)"; g.lineWidth = 0.035; g.beginPath();
      for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; g.moveTo(0.5 + Math.cos(a) * 0.24, 0.5 + Math.sin(a) * 0.24); g.lineTo(0.5 + Math.cos(a) * 0.29, 0.5 + Math.sin(a) * 0.29); }
      g.stroke();
      g.lineWidth = 0.05; g.beginPath(); g.moveTo(0.5, 0.5); g.lineTo(0.5 + 0.16, 0.5 + 0.02); g.stroke();        // horas (parado às 3)
      g.lineWidth = 0.035; g.beginPath(); g.moveTo(0.5, 0.5); g.lineTo(0.5 + 0.05, 0.5 - 0.25); g.stroke();      // minutos
      break;
    }
    case "espelho": {
      g.beginPath(); g.ellipse(0.5, 0.48, 0.3, 0.4, 0, 0, 7); corpo(); traco();
      g.beginPath(); g.ellipse(0.5, 0.48, 0.2, 0.3, 0, 0, 7); fino(0.75, 0.04);
      g.beginPath(); g.moveTo(0.4, 0.32); g.lineTo(0.5, 0.2); fino(0.9, 0.05);     // o reflexo
      g.beginPath(); g.moveTo(0.22, 0.92); g.lineTo(0.78, 0.92); g.moveTo(0.5, 0.88); g.lineTo(0.5, 0.92); traco(0.8, 0.07);   // o pé
      break;
    }
    case "berco": {
      rr(0.1, 0.1, 1.8, 1.8, 0.06); corpo(); traco();
      rr(0.32, 0.32, 1.36, 1.36, 0.05); fino(0.8, 0.05);
      g.strokeStyle = CLARO + "0.85)"; g.lineWidth = 0.05; g.beginPath();
      for (let t = 0.26; t < 1.76; t += 0.18) {               // as grades, nos quatro lados
        g.moveTo(t, 0.1); g.lineTo(t, 0.32); g.moveTo(t, 1.68); g.lineTo(t, 1.9);
        g.moveTo(0.1, t); g.lineTo(0.32, t); g.moveTo(1.68, t); g.lineTo(1.9, t);
      }
      g.stroke();
      rr(0.6, 0.42, 0.8, 0.3, 0.08); fino(0.95, 0.05);          // o travesseirinho
      break;
    }
    default:
      rr(0.08, 0.08, ft.w - 0.16, ft.h - 0.16, 0.08); corpo(); traco();
  }
  return (PLANTA_SPRS[tipo] = cv);
}

// --- CANDELABRO no mapa: base, cinco velas, fogo azul nas acesas ---------
function mapaCandelabro(x, y, n, a) {
  if (a <= 0.03) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = Math.min(1, a);
  if (n > 0) {                                     // o halo azul das almas
    const hg = ctx.createRadialGradient(0, 0, 1, 0, 0, 9 + n * 1.5);
    hg.addColorStop(0, `rgba(110,170,255,${(0.22 + n * 0.05).toFixed(2)})`);
    hg.addColorStop(1, "rgba(110,170,255,0)");
    ctx.fillStyle = hg; ctx.fillRect(-18, -18, 36, 36);
  }
  ctx.lineCap = "round"; ctx.lineWidth = 1.2;
  ctx.strokeStyle = "rgba(216,206,186,0.95)"; ctx.fillStyle = "rgba(14,12,10,0.92)";
  ctx.beginPath(); ctx.arc(0, 3.2, 3.4, 0, 7); ctx.fill(); ctx.stroke();        // a base
  ctx.beginPath(); ctx.moveTo(0, 3); ctx.lineTo(0, -1.5); ctx.stroke();           // a haste
  ctx.beginPath(); ctx.moveTo(-6, -1.5); ctx.quadraticCurveTo(0, -4.5, 6, -1.5); ctx.stroke();   // os braços
  for (let i = 0; i < 5; i++) {
    const cx = -6 + i * 3, cy = -2.2 - Math.sin(i / 4 * Math.PI) * 1.6;
    ctx.fillStyle = "rgba(236,226,206,0.95)";
    ctx.fillRect(cx - 0.6, cy - 2.2, 1.2, 2.4);                                   // a vela
    if (i < n) {                                   // a chama azul, que treme
      const tr2 = 0.8 + 0.2 * hash(i, Math.floor(time * 11), 2);
      const fg = ctx.createRadialGradient(cx, cy - 3.2, 0.2, cx, cy - 3.2, 2.6 * tr2);
      fg.addColorStop(0, "rgba(230,245,255,0.98)");
      fg.addColorStop(0.35, "rgba(120,180,255,0.9)");
      fg.addColorStop(1, "rgba(80,140,255,0)");
      ctx.fillStyle = fg; ctx.fillRect(cx - 3, cy - 6.2, 6, 6);
    } else {
      ctx.fillStyle = "rgba(60,54,48,0.9)";
      ctx.fillRect(cx - 0.4, cy - 3, 0.8, 0.8);                                   // o pavio frio
    }
  }
  ctx.restore();
}

// --- CANDELABRO na foto: ferro alto, cinco braços, chamas azuis ----------
const CANDE_SPRS = {};
// as cinco chamas, em frações da arte (x, y do topo da vela) — valem para a
// imagem do guia (PROP-008) e para o desenho por código
const CANDE_CHAMAS = [[0.08, 0.26], [0.29, 0.21], [0.5, 0.18], [0.71, 0.21], [0.92, 0.26]];
function candelabroSprite(n) {
  const img = PROP_IMGS.candelabro;
  const chave = (img ? "img" : "cod") + n;
  if (CANDE_SPRS[chave]) return CANDE_SPRS[chave];
  if (img) {                                  // a arte (apagada) + chamas azuis por código
    const cv = document.createElement("canvas");
    cv.width = img.width; cv.height = img.height;
    const g = cv.getContext("2d");
    g.drawImage(img, 0, 0);
    CANDE_CHAMAS.slice(0, n).forEach(([fx, fy]) => {
      const x = fx * cv.width, y = fy * cv.height, R = cv.width * 0.13;
      const fg = g.createRadialGradient(x, y - R * 0.3, 1, x, y - R * 0.3, R);
      fg.addColorStop(0, "rgba(235,248,255,1)");
      fg.addColorStop(0.3, "rgba(140,190,255,0.9)");
      fg.addColorStop(1, "rgba(90,150,255,0)");
      g.fillStyle = fg; g.fillRect(x - R, y - R * 1.3, R * 2, R * 2);
      g.fillStyle = "rgba(240,250,255,0.95)";
      g.beginPath(); g.ellipse(x, y - R * 0.25, R * 0.16, R * 0.42, 0, 0, 7); g.fill();
    });
    return (CANDE_SPRS[chave] = cv);
  }
  const cv = document.createElement("canvas");
  cv.width = 170; cv.height = 280;
  const g = cv.getContext("2d");
  g.lineCap = "round"; g.lineJoin = "round";
  const ferro = "rgb(58,54,50)", borda = "rgba(8,7,6,0.9)";
  const peca = (fn) => { g.fillStyle = ferro; g.strokeStyle = borda; g.lineWidth = 2; g.beginPath(); fn(); g.fill(); g.stroke(); };
  peca(() => g.ellipse(85, 262, 40, 12, 0, 0, 7));                    // a base
  peca(() => g.rect(80, 150, 10, 110));                                // a haste
  peca(() => g.ellipse(85, 150, 14, 6, 0, 0, 7));
  g.strokeStyle = ferro; g.lineWidth = 6;
  g.beginPath(); g.moveTo(85, 150); g.quadraticCurveTo(20, 150, 14, 110); g.stroke();   // os braços
  g.beginPath(); g.moveTo(85, 150); g.quadraticCurveTo(50, 140, 50, 98); g.stroke();
  g.beginPath(); g.moveTo(85, 150); g.quadraticCurveTo(150, 150, 156, 110); g.stroke();
  g.beginPath(); g.moveTo(85, 150); g.quadraticCurveTo(120, 140, 120, 98); g.stroke();
  g.strokeStyle = borda; g.lineWidth = 1.2;
  const velas = [[14, 110], [50, 98], [85, 88], [120, 98], [156, 110]];
  velas.forEach(([x, y], i) => {
    peca(() => g.ellipse(x, y, 10, 4, 0, 0, 7));                        // o prato
    g.fillStyle = "rgb(214,206,186)"; g.strokeStyle = borda; g.lineWidth = 1.4;
    g.beginPath(); g.rect(x - 5, y - 38, 10, 38); g.fill(); g.stroke();   // a vela
    if (i < n) {
      const fg = g.createRadialGradient(x, y - 50, 1, x, y - 50, 22);
      fg.addColorStop(0, "rgba(235,248,255,1)");
      fg.addColorStop(0.3, "rgba(140,190,255,0.9)");
      fg.addColorStop(1, "rgba(90,150,255,0)");
      g.fillStyle = fg; g.fillRect(x - 22, y - 72, 44, 44);
      g.fillStyle = "rgba(240,250,255,0.95)";
      g.beginPath(); g.ellipse(x, y - 48, 3.5, 9, 0, 0, 7); g.fill();     // a chama
    } else {
      g.fillStyle = "rgba(30,26,22,0.9)"; g.fillRect(x - 1, y - 43, 2, 5);   // o pavio
    }
  });
  return (CANDE_SPRS[chave] = cv);
}

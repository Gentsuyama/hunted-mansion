"use strict";
// ==================================================================
// TEXTURAS DA FOTO — ladrilháveis, com mipmaps e filtro bilinear.
// Tudo nasce por código; se existir Assets/Tex/<nome>.jpg (Gemini),
// a imagem substitui a procedural (espelhada 2×2: nunca tem emenda).
// ==================================================================
const TEX = {};
const TEX_S = 256;
let TR = 0, TG = 0, TB = 0, TA = 0;     // saída do amostrador (sem alocar)

// ruído de valor (compartilhado com o shader da foto)
function nzHash(x, y) {
  let n = x * 374761393 + y * 668265263 + 1013904223;
  n = (n ^ (n >> 13)) * 1274126177;
  return ((n ^ (n >> 16)) >>> 0) / 4294967295;
}
function nzVal(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const fx = x - xi, fy = y - yi;
  const a = nzHash(xi, yi), b = nzHash(xi + 1, yi);
  const e = nzHash(xi, yi + 1), f = nzHash(xi + 1, yi + 1);
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  return a + (b - a) * sx + (e - a) * sy + (a - b - e + f) * sx * sy;
}
function nzFbm(x, y) {
  return 0.62 * nzVal(x, y) + 0.27 * nzVal(x * 2.1 + 13.7, y * 2.1 + 7.3)
       + 0.11 * nzVal(x * 4.3 + 31.1, y * 4.3 + 17.9);
}

// canvas quadrado (potência de 2) -> textura com cadeia de mipmaps
function texBuild(cv, cells) {
  const mips = [];
  let src = cv, w = cv.width;
  for (;;) {
    mips.push({ w, d: src.getContext("2d").getImageData(0, 0, w, w).data });
    if (w <= 8) break;
    const nx = document.createElement("canvas");
    nx.width = nx.height = w >> 1;
    const ng = nx.getContext("2d");
    ng.imageSmoothingEnabled = true;
    ng.drawImage(src, 0, 0, w >> 1, w >> 1);
    src = nx; w >>= 1;
  }
  return { cells, inv: 1 / cells, dens: cv.width / cells,
           mips, maxLod: mips.length - 1 };
}

// amostra REPETINDO: u, v em células do mundo
function texS(T, u, v, lod) {
  const l = lod <= 0 ? 0 : lod >= T.maxLod ? T.maxLod : lod | 0;
  const m = T.mips[l], w = m.w, d = m.d, mask = w - 1;
  let x = u * T.inv; x = (x - Math.floor(x)) * w - 0.5;
  let y = v * T.inv; y = (y - Math.floor(y)) * w - 0.5;
  const xf = Math.floor(x), yf = Math.floor(y);
  const fx = x - xf, fy = y - yf;
  const x0 = xf & mask, y0 = yf & mask;
  const x1 = (x0 + 1) & mask, y1 = (y0 + 1) & mask;
  const i00 = (y0 * w + x0) << 2, i10 = (y0 * w + x1) << 2;
  const i01 = (y1 * w + x0) << 2, i11 = (y1 * w + x1) << 2;
  const a = (1 - fx) * (1 - fy), b = fx * (1 - fy), c = (1 - fx) * fy, e = fx * fy;
  TR = d[i00] * a + d[i10] * b + d[i01] * c + d[i11] * e;
  TG = d[i00 + 1] * a + d[i10 + 1] * b + d[i01 + 1] * c + d[i11 + 1] * e;
  TB = d[i00 + 2] * a + d[i10 + 2] * b + d[i01 + 2] * c + d[i11 + 2] * e;
}
// amostra SEM repetir: s, t em 0..1 (porta, quadros) — devolve também o alpha
function texN(T, s, t, lod) {
  const l = lod <= 0 ? 0 : lod >= T.maxLod ? T.maxLod : lod | 0;
  const m = T.mips[l], w = m.w, d = m.d;
  let x = s * w - 0.5, y = t * w - 0.5;
  if (x < 0) x = 0; else if (x > w - 1.001) x = w - 1.001;
  if (y < 0) y = 0; else if (y > w - 1.001) y = w - 1.001;
  const x0 = x | 0, y0 = y | 0, fx = x - x0, fy = y - y0;
  const i = (y0 * w + x0) << 2, j = i + (w << 2);
  const a = (1 - fx) * (1 - fy), b = fx * (1 - fy), c = (1 - fx) * fy, e = fx * fy;
  TR = d[i] * a + d[i + 4] * b + d[j] * c + d[j + 4] * e;
  TG = d[i + 1] * a + d[i + 5] * b + d[j + 1] * c + d[j + 5] * e;
  TB = d[i + 2] * a + d[i + 6] * b + d[j + 2] * c + d[j + 6] * e;
  TA = d[i + 3] * a + d[i + 7] * b + d[j + 3] * c + d[j + 7] * e;
}

// ------------------------------------------------------------------
// utilitários de desenho ladrilhável
// ------------------------------------------------------------------
function texWrap9(S, fn) {
  for (const oy of [-S, 0, S]) for (const ox of [-S, 0, S]) fn(ox, oy);
}
function texSpeck(g, S, r, n, rgb, aMax, sz) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = `rgba(${rgb},${(r() * aMax).toFixed(3)})`;
    g.fillRect(r() * S, r() * S, 1 + r() * sz, 1 + r() * sz);
  }
}
function texBlotch(g, S, r, n, rgb, a, rad) {
  for (let i = 0; i < n; i++) {
    const bx = r() * S, by = r() * S, br = rad * (0.5 + r());
    const al = a * (0.4 + 0.6 * r());
    texWrap9(S, (ox, oy) => {
      const gr = g.createRadialGradient(bx + ox, by + oy, 1, bx + ox, by + oy, br);
      gr.addColorStop(0, `rgba(${rgb},${al.toFixed(3)})`);
      gr.addColorStop(1, `rgba(${rgb},0)`);
      g.fillStyle = gr;
      g.fillRect(bx + ox - br, by + oy - br, br * 2, br * 2);
    });
  }
}
// faixa de peças com larguras aleatórias que FECHAM o ciclo (ladrilhável)
function texCourse(S, r, nMin, nVar, fn) {
  const n = nMin + (r() * nVar | 0), ws = [];
  let sum = 0;
  for (let i = 0; i < n; i++) { const w = 0.6 + r(); ws.push(w); sum += w; }
  let x = r() * S;
  for (let i = 0; i < n; i++) {
    const w = ws[i] / sum * S;
    fn(x, w); fn(x - S, w);
    x += w; if (x >= S) x -= S;
  }
}
// painel almofadado (rebaixo com luz em baixo/direita, sombra em cima/esquerda)
function texPainel(g, x0, y0, w, h, inset) {
  g.fillStyle = "rgba(104,76,52,0.30)"; g.fillRect(x0, y0, w, h);
  g.lineWidth = 3;
  g.strokeStyle = "rgba(10,5,2,0.78)";
  g.beginPath(); g.moveTo(x0, y0 + h); g.lineTo(x0, y0); g.lineTo(x0 + w, y0); g.stroke();
  g.strokeStyle = "rgba(176,136,96,0.55)";
  g.beginPath(); g.moveTo(x0 + w, y0); g.lineTo(x0 + w, y0 + h); g.lineTo(x0, y0 + h); g.stroke();
  g.lineWidth = 2;
  g.strokeStyle = "rgba(176,136,96,0.42)";
  g.beginPath(); g.moveTo(x0 + inset, y0 + h - inset); g.lineTo(x0 + inset, y0 + inset);
  g.lineTo(x0 + w - inset, y0 + inset); g.stroke();
  g.strokeStyle = "rgba(10,5,2,0.62)";
  g.beginPath(); g.moveTo(x0 + w - inset, y0 + inset);
  g.lineTo(x0 + w - inset, y0 + h - inset); g.lineTo(x0 + inset, y0 + h - inset); g.stroke();
}
function texVeios(g, r, x0, w, S, n) {
  for (let i = 0; i < n; i++) {
    const x = x0 + 2 + r() * (w - 4);
    g.strokeStyle = r() < 0.6 ? `rgba(14,8,4,${(0.10 + r() * 0.2).toFixed(3)})`
                              : `rgba(156,116,78,${(0.05 + r() * 0.1).toFixed(3)})`;
    g.lineWidth = 0.6 + r() * 1.4;
    g.beginPath(); g.moveTo(x, 0);
    g.bezierCurveTo(x + (r() - 0.5) * 8, S * 0.33, x + (r() - 0.5) * 8, S * 0.66, x, S);
    g.stroke();
  }
}

// ------------------------------------------------------------------
// as texturas
// ------------------------------------------------------------------
(function texInit() {
  const mk = (name, cells, draw, size) => {
    const S = size || TEX_S;
    const cv = document.createElement("canvas");
    cv.width = cv.height = S;
    const g = cv.getContext("2d");
    let h = 7;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
    g.lineCap = "round";
    draw(g, S, mulberry32(h));
    TEX[name] = texBuild(cv, cells);
  };

  // TÉRREO — listras verde-musgo com filete dourado e raminho
  mk("wp1", 2, (g, S, r) => {
    const bw = S / 4;
    for (let i = 0; i < 4; i++) {
      g.fillStyle = i % 2 ? "#66745a" : "#8a9777";
      g.fillRect(i * bw, 0, bw, S);
    }
    for (let i = 0; i <= 4; i++) {
      g.fillStyle = "rgba(190,168,104,0.8)"; g.fillRect(i * bw - 1.5, 0, 3, S);
      g.fillStyle = "rgba(30,40,26,0.4)";    g.fillRect(i * bw + 2.5, 0, 1.5, S);
      g.fillStyle = "rgba(30,40,26,0.25)";   g.fillRect(i * bw - 4, 0, 1.5, S);
    }
    for (const bx of [bw * 0.5, bw * 2.5])
      for (let k = 0; k < 4; k++) {
        const cy = k * 64 + 32;
        g.strokeStyle = "rgba(52,66,42,0.6)"; g.lineWidth = 2;
        g.beginPath(); g.moveTo(bx, cy - 20);
        g.quadraticCurveTo(bx + 6, cy, bx, cy + 22); g.stroke();
        g.fillStyle = "rgba(60,78,46,0.62)";
        for (const [dy, sd] of [[-10, 1], [0, -1], [10, 1]]) {
          g.beginPath(); g.ellipse(bx + sd * 9, cy + dy, 8, 3.4, sd * 0.6, 0, 7); g.fill();
        }
        g.fillStyle = "rgba(214,196,138,0.8)";
        g.beginPath(); g.arc(bx, cy - 24, 4, 0, 7); g.fill();
      }
    texSpeck(g, S, r, 900, "20,24,16", 0.10, 2);
  });

  // 1º ANDAR — damasco vinho (medalhões em meio-salto)
  mk("wp2", 2, (g, S, r) => {
    g.fillStyle = "#74514f"; g.fillRect(0, 0, S, S);
    const medal = (cx, cy, w, h) => {
      g.fillStyle = "rgba(176,132,124,0.55)";
      g.strokeStyle = "rgba(44,22,22,0.5)"; g.lineWidth = 1.6;
      g.beginPath();
      g.moveTo(cx, cy - h);
      g.bezierCurveTo(cx + w * 1.3, cy - h * 0.45, cx + w * 1.3, cy + h * 0.45, cx, cy + h);
      g.bezierCurveTo(cx - w * 1.3, cy + h * 0.45, cx - w * 1.3, cy - h * 0.45, cx, cy - h);
      g.fill(); g.stroke();
      g.fillStyle = "rgba(92,56,56,0.75)";
      g.beginPath(); g.ellipse(cx, cy, w * 0.42, h * 0.5, 0, 0, 7); g.fill();
      g.fillStyle = "rgba(196,156,146,0.6)";
      g.beginPath(); g.ellipse(cx, cy, w * 0.16, h * 0.2, 0, 0, 7); g.fill();
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
        g.beginPath();
        g.ellipse(cx + sx * w * 1.05, cy + sy * h * 0.62, w * 0.5, h * 0.15,
                  sx * sy * 0.85, 0, 7);
        g.fill();
      }
      g.beginPath(); g.arc(cx, cy - h * 1.2, w * 0.2, 0, 7); g.fill();
      g.beginPath(); g.arc(cx, cy + h * 1.2, w * 0.2, 0, 7); g.fill();
    };
    texWrap9(S, (ox, oy) => {
      for (const [mx, my] of [[0, 0], [128, 0], [64, 64], [192, 64],
                              [0, 128], [128, 128], [64, 192], [192, 192]])
        medal(mx + ox, my + oy, 17, 24);
    });
    texSpeck(g, S, r, 900, "26,12,12", 0.12, 2);
  });

  // 2º ANDAR — floral ocre (flores e botões em meio-salto)
  mk("wp3", 2, (g, S, r) => {
    g.fillStyle = "#a89163"; g.fillRect(0, 0, S, S);
    g.strokeStyle = "rgba(90,74,44,0.16)"; g.lineWidth = 1;
    for (let i = 0; i < S; i += 4) {
      g.beginPath(); g.moveTo(i + 0.5, 0); g.lineTo(i + 0.5, S); g.stroke();
    }
    const flor = (cx, cy, rot, bud) => {
      g.save(); g.translate(cx, cy); g.rotate(rot);
      g.strokeStyle = "rgba(78,84,48,0.7)"; g.lineWidth = 1.8;
      g.beginPath(); g.moveTo(0, 6); g.quadraticCurveTo(5, 16, -2, 26); g.stroke();
      g.fillStyle = "rgba(84,92,52,0.7)";
      g.beginPath(); g.ellipse(7, 16, 7, 3, 0.7, 0, 7); g.fill();
      g.beginPath(); g.ellipse(-7, 21, 6, 2.6, -0.8, 0, 7); g.fill();
      if (bud) {
        g.fillStyle = "rgba(214,190,150,0.85)";
        g.beginPath(); g.ellipse(0, -2, 5, 8, 0, 0, 7); g.fill();
      } else {
        g.fillStyle = "rgba(226,206,168,0.85)";
        for (let p = 0; p < 5; p++) {
          const a = p / 5 * 6.283;
          g.beginPath();
          g.ellipse(Math.cos(a) * 7, Math.sin(a) * 7, 6, 3.6, a, 0, 7); g.fill();
        }
        g.fillStyle = "rgba(118,64,40,0.85)";
        g.beginPath(); g.arc(0, 0, 3, 0, 7); g.fill();
      }
      g.restore();
    };
    texWrap9(S, (ox, oy) => {
      for (let gy = 0; gy < 4; gy++) for (let gx = 0; gx < 4; gx++)
        flor(gx * 64 + (gy % 2 ? 32 : 0) + 16 + ox, gy * 64 + 20 + oy,
             (gx + gy) % 2 ? 0.35 : -0.3, (gx + gy * 2) % 3 === 0);
    });
    texSpeck(g, S, r, 900, "50,38,18", 0.12, 2);
  });

  // 3º ANDAR — listras finas frias com losangos
  mk("wp4", 2, (g, S, r) => {
    g.fillStyle = "#77808f"; g.fillRect(0, 0, S, S);
    for (let x = 0; x < S; x += 32) {
      g.fillStyle = "rgba(44,52,70,0.55)"; g.fillRect(x + 4, 0, 2, S);
      g.fillStyle = "rgba(44,52,70,0.4)";  g.fillRect(x + 9, 0, 1.2, S);
      g.fillStyle = "rgba(205,212,226,0.3)"; g.fillRect(x + 14, 0, 1, S);
      g.fillStyle = "rgba(200,208,224,0.5)";
      for (let y = ((x / 32) % 2) * 16; y < S; y += 32) {
        g.beginPath(); g.moveTo(x + 23, y + 10); g.lineTo(x + 27, y + 16);
        g.lineTo(x + 23, y + 22); g.lineTo(x + 19, y + 16); g.closePath(); g.fill();
      }
    }
    texSpeck(g, S, r, 900, "20,24,34", 0.12, 2);
  });

  // lambri de madeira (dois painéis almofadados, 1 célula cada)
  mk("lambri", 2, (g, S, r) => {
    g.fillStyle = "#4b3625"; g.fillRect(0, 0, S, S);
    texVeios(g, r, 0, S, S, 240);
    for (let p = 0; p < 2; p++) texPainel(g, p * 128 + 16, 22, 96, 212, 12);
    texSpeck(g, S, r, 500, "10,6,3", 0.16, 2);
  });

  // tábuas verticais escuras (paredes do ateliê, rodapés, guarnições)
  mk("madeira", 2, (g, S, r) => {
    for (let b = 0; b < 4; b++) {
      const tone = 0.8 + r() * 0.4;
      g.fillStyle = `rgb(${66 * tone | 0},${47 * tone | 0},${32 * tone | 0})`;
      g.fillRect(b * 64, 0, 64, S);
      texVeios(g, r, b * 64, 64, S, 44);
      g.fillStyle = "rgba(6,3,2,0.85)"; g.fillRect(b * 64, 0, 2.5, S);
      g.fillStyle = "rgba(150,112,76,0.25)"; g.fillRect(b * 64 + 2.5, 0, 1.5, S);
    }
    for (let k = 0; k < 3; k++) {
      const x = 10 + r() * (S - 20), y = 20 + r() * (S - 40);
      g.strokeStyle = "rgba(10,6,3,0.3)"; g.lineWidth = 1.2;
      for (let q = 3; q > 0; q--) {
        g.beginPath(); g.ellipse(x, y, q * 3, q * 5, 0, 0, 7); g.stroke();
      }
    }
  });

  // pedra em fiadas (paredes do porão)
  mk("pedra", 4, (g, S, r) => {
    g.fillStyle = "#34312c"; g.fillRect(0, 0, S, S);
    for (let row = 0; row < 8; row++) {
      const y = row * 32;
      texCourse(S, r, 4, 2, (bx, w) => {
        const tone = 0.7 + nzHash((((bx % S) + S) % S) | 0, row * 17) * 0.5;
        g.fillStyle = `rgb(${120 * tone | 0},${114 * tone | 0},${102 * tone | 0})`;
        g.fillRect(bx + 2, y + 2, w - 4, 28);
        g.fillStyle = "rgba(214,208,192,0.14)"; g.fillRect(bx + 2, y + 2, w - 4, 2);
        g.fillStyle = "rgba(0,0,0,0.30)"; g.fillRect(bx + 2, y + 27, w - 4, 3);
      });
    }
    texBlotch(g, S, r, 10, "14,20,14", 0.4, 40);
    texSpeck(g, S, r, 1600, "0,0,0", 0.22, 2.5);
    texSpeck(g, S, r, 600, "220,214,196", 0.12, 2);
  });

  // gesso (teto, faixa alta dos banheiros, reboco exposto)
  mk("gesso", 4, (g, S, r) => {
    g.fillStyle = "#bdb6a6"; g.fillRect(0, 0, S, S);
    texBlotch(g, S, r, 14, "70,62,48", 0.22, 50);
    texBlotch(g, S, r, 8, "232,228,216", 0.2, 40);
    for (let k = 0; k < 4; k++) {
      let x = r() * S, y = r() * S;
      g.strokeStyle = "rgba(40,34,26,0.45)"; g.lineWidth = 1;
      g.beginPath(); g.moveTo(x, y);
      for (let i = 0; i < 9; i++) { x += (r() - 0.5) * 34; y += (r() - 0.3) * 26; g.lineTo(x, y); }
      g.stroke();
    }
    texSpeck(g, S, r, 1400, "40,34,26", 0.10, 2);
  });

  // azulejo esmaltado (banheiros) — 4×4 peças por célula
  mk("azulejo", 1, (g, S, r) => {
    g.fillStyle = "#5a615c"; g.fillRect(0, 0, S, S);
    for (let ty = 0; ty < 4; ty++) for (let tx = 0; tx < 4; tx++) {
      const tone = 0.86 + r() * 0.2, x = tx * 64 + 2.5, y = ty * 64 + 2.5, w = 59;
      g.fillStyle = `rgb(${190 * tone | 0},${204 * tone | 0},${196 * tone | 0})`;
      g.fillRect(x, y, w, w);
      const sh = g.createLinearGradient(x, y, x + w, y + w);
      sh.addColorStop(0, "rgba(255,255,255,0.22)");
      sh.addColorStop(0.5, "rgba(255,255,255,0)");
      sh.addColorStop(1, "rgba(0,0,0,0.12)");
      g.fillStyle = sh; g.fillRect(x, y, w, w);
      if (r() < 0.2) {
        g.strokeStyle = "rgba(40,44,40,0.6)"; g.lineWidth = 1;
        g.beginPath(); g.moveTo(x + r() * w, y);
        g.lineTo(x + r() * w, y + w * 0.5); g.lineTo(x + r() * w, y + w); g.stroke();
      }
      if (r() < 0.12) { g.fillStyle = "rgba(60,54,40,0.35)"; g.fillRect(x, y, w, w); }
    }
  });

  // assoalho de tábuas corridas (ao longo de u)
  mk("assoalho", 4, (g, S, r) => {
    for (let b = 0; b < 8; b++) {
      const y = b * 32;
      texCourse(S, r, 2, 2, (bx, w) => {
        const tone = 0.72 + nzHash((((bx % S) + S) % S) | 0, b * 31) * 0.5;
        g.fillStyle = `rgb(${112 * tone | 0},${84 * tone | 0},${58 * tone | 0})`;
        g.fillRect(bx, y, w + 1, 32);
        g.fillStyle = "rgba(8,5,3,0.8)"; g.fillRect(bx, y, 2, 32);
        g.fillStyle = "rgba(20,14,8,0.7)";
        g.fillRect(bx + 5, y + 8, 2, 2); g.fillRect(bx + 5, y + 22, 2, 2);
      });
      for (let i = 0; i < 16; i++) {
        const yy = y + 3 + r() * 26;
        g.strokeStyle = r() < 0.6 ? `rgba(14,9,5,${(0.1 + r() * 0.18).toFixed(3)})`
                                  : `rgba(190,150,104,${(0.05 + r() * 0.08).toFixed(3)})`;
        g.lineWidth = 0.6 + r() * 1.2;
        g.beginPath(); g.moveTo(0, yy);
        g.bezierCurveTo(S * 0.33, yy + (r() - 0.5) * 5, S * 0.66, yy + (r() - 0.5) * 5, S, yy);
        g.stroke();
      }
      g.fillStyle = "rgba(6,4,2,0.85)"; g.fillRect(0, y, S, 2);
      g.fillStyle = "rgba(190,150,104,0.14)"; g.fillRect(0, y + 2, S, 1.2);
    }
    texBlotch(g, S, r, 6, "10,7,4", 0.3, 44);
  });

  // laje de pedra/cimento (piso do porão)
  mk("laje", 4, (g, S, r) => {
    g.fillStyle = "#24231f"; g.fillRect(0, 0, S, S);
    for (let ty = 0; ty < 2; ty++) for (let tx = 0; tx < 2; tx++) {
      const tone = 0.8 + r() * 0.35;
      g.fillStyle = `rgb(${96 * tone | 0},${94 * tone | 0},${88 * tone | 0})`;
      g.fillRect(tx * 128 + 3, ty * 128 + 3, 122, 122);
    }
    texBlotch(g, S, r, 12, "8,10,8", 0.4, 46);
    for (let k = 0; k < 5; k++) {
      let x = r() * S, y = r() * S;
      g.strokeStyle = "rgba(10,10,8,0.6)"; g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(x, y);
      for (let i = 0; i < 7; i++) { x += (r() - 0.5) * 40; y += (r() - 0.5) * 40; g.lineTo(x, y); }
      g.stroke();
    }
    texSpeck(g, S, r, 1800, "0,0,0", 0.2, 2.5);
  });

  // passadeira vinho (treliça de losangos dourados com rosetas)
  mk("passadeira", 2, (g, S, r) => {
    g.fillStyle = "#5e2424"; g.fillRect(0, 0, S, S);
    g.strokeStyle = "rgba(186,146,84,0.55)"; g.lineWidth = 2.2;
    for (let k = -4; k <= 8; k++) {
      g.beginPath(); g.moveTo(k * 64, 0); g.lineTo(k * 64 + S, S); g.stroke();
      g.beginPath(); g.moveTo(k * 64, 0); g.lineTo(k * 64 - S, S); g.stroke();
    }
    texWrap9(S, (ox, oy) => {
      for (let gy = 0; gy < 4; gy++) for (let gx = 0; gx < 4; gx++) {
        const cx = gx * 64 + 32 + ox, cy = gy * 64 + oy;
        g.fillStyle = "rgba(196,160,98,0.6)";
        for (let p = 0; p < 4; p++) {
          const a = p * 1.5708;
          g.beginPath();
          g.ellipse(cx + Math.cos(a) * 7, cy + Math.sin(a) * 7, 6, 3, a, 0, 7); g.fill();
        }
        g.fillStyle = "rgba(40,14,14,0.8)";
        g.beginPath(); g.arc(cx, cy, 2.6, 0, 7); g.fill();
      }
    });
    texBlotch(g, S, r, 8, "16,6,6", 0.35, 40);        // desgaste
    texSpeck(g, S, r, 1200, "10,4,4", 0.18, 2);
  });

  // tapete azul-petróleo (medalhões octogonais)
  mk("tapete", 4, (g, S, r) => {
    g.fillStyle = "#34434a"; g.fillRect(0, 0, S, S);
    texWrap9(S, (ox, oy) => {
      for (const [mx, my] of [[64, 64], [192, 64], [64, 192], [192, 192],
                              [128, 128], [0, 0], [128, 0], [0, 128]]) {
        const cx = mx + ox, cy = my + oy, big = (mx + my) % 128 === 0 && mx % 128 === 64;
        const R = big ? 40 : 22;
        g.strokeStyle = "rgba(150,136,104,0.5)"; g.lineWidth = 2.4;
        g.beginPath();
        for (let p = 0; p <= 8; p++) {
          const a = p / 8 * 6.283 + 0.3927;
          p ? g.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R)
            : g.moveTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
        }
        g.stroke();
        g.fillStyle = "rgba(92,52,48,0.55)";
        g.beginPath(); g.arc(cx, cy, R * 0.45, 0, 7); g.fill();
        g.fillStyle = "rgba(150,136,104,0.5)";
        for (let p = 0; p < 8; p++) {
          const a = p / 8 * 6.283;
          g.beginPath();
          g.ellipse(cx + Math.cos(a) * R * 0.66, cy + Math.sin(a) * R * 0.66,
                    R * 0.16, R * 0.07, a, 0, 7);
          g.fill();
        }
      }
    });
    texBlotch(g, S, r, 8, "8,12,14", 0.35, 50);
    texSpeck(g, S, r, 1400, "8,12,14", 0.18, 2);
  });

  // ladrilho xadrez de mármore (piso dos banheiros)
  mk("xadrez", 2, (g, S, r) => {
    for (let ty = 0; ty < 4; ty++) for (let tx = 0; tx < 4; tx++) {
      const dark = (tx + ty) & 1, tone = 0.9 + r() * 0.2;
      g.fillStyle = dark ? `rgb(${44 * tone | 0},${44 * tone | 0},${46 * tone | 0})`
                         : `rgb(${196 * tone | 0},${194 * tone | 0},${184 * tone | 0})`;
      g.fillRect(tx * 64, ty * 64, 64, 64);
      g.strokeStyle = dark ? "rgba(150,150,150,0.16)" : "rgba(60,60,60,0.2)";
      g.lineWidth = 1;
      for (let k = 0; k < 2; k++) {
        g.beginPath(); g.moveTo(tx * 64 + r() * 64, ty * 64);
        g.quadraticCurveTo(tx * 64 + r() * 64, ty * 64 + 32, tx * 64 + r() * 64, ty * 64 + 64);
        g.stroke();
      }
      g.strokeStyle = "rgba(20,20,20,0.6)"; g.lineWidth = 1.5;
      g.strokeRect(tx * 64 + 0.75, ty * 64 + 0.75, 62.5, 62.5);
    }
    texBlotch(g, S, r, 6, "30,26,18", 0.25, 40);
  });

  // PORTA DA FRENTE (3 células × 4,6): duas folhas, bandeira de vidro
  mk("porta", 1, (g, S, r) => {
    g.fillStyle = "#23170e"; g.fillRect(0, 0, S, S);
    g.fillStyle = "#07090c"; g.fillRect(22, 14, S - 44, 34);          // bandeira
    g.strokeStyle = "rgba(120,90,60,0.85)"; g.lineWidth = 3;
    for (let i = 1; i < 4; i++) {
      const x = 22 + i * (S - 44) / 4;
      g.beginPath(); g.moveTo(x, 14); g.lineTo(x, 48); g.stroke();
    }
    g.strokeRect(22, 14, S - 44, 34);
    for (let f = 0; f < 2; f++) {
      const x0 = 22 + f * 106, w = 106, y0 = 56;
      g.fillStyle = f ? "#3a291b" : "#40301f"; g.fillRect(x0, y0, w, S - y0);
      g.save(); g.beginPath(); g.rect(x0, y0, w, S - y0); g.clip();
      texVeios(g, r, x0, w, S, 40);
      g.restore();
      for (const [py, ph] of [[12, 54], [78, 54], [144, 44]])
        texPainel(g, x0 + 14, y0 + py, w - 28, ph, 8);
    }
    g.fillStyle = "#050302"; g.fillRect(127, 56, 2.5, S - 56);        // fresta
    for (const kx of [116, 140]) {
      g.fillStyle = "#6e5628"; g.fillRect(kx - 3, 138, 6, 30);
      g.fillStyle = "#b8944e"; g.beginPath(); g.arc(kx, 150, 5, 0, 7); g.fill();
      g.fillStyle = "rgba(255,240,200,0.5)";
      g.beginPath(); g.arc(kx - 1.5, 148.5, 1.6, 0, 7); g.fill();
    }
  });

  // QUADROS de parede (só a FOTO mostra): vultos sem rosto e uma paisagem
  for (let q = 0; q < 3; q++) mk("quadro" + q, 1, (g, S, r) => {
    g.fillStyle = "#6b5630"; g.fillRect(0, 0, S, S);
    g.fillStyle = "#33280f"; g.fillRect(6, 4, S - 12, S - 8);
    g.fillStyle = "#8f7442"; g.fillRect(10, 6.5, S - 20, S - 13);
    g.fillStyle = "#12100d"; g.fillRect(18, 11, S - 36, S - 22);
    const cx = S / 2;
    if (q < 2) {
      const gr = g.createRadialGradient(cx, S * 0.42, 4, cx, S * 0.5, S * 0.42);
      gr.addColorStop(0, "rgba(120,104,84,0.5)");
      gr.addColorStop(1, "rgba(30,24,18,0)");
      g.fillStyle = gr; g.fillRect(18, 11, S - 36, S - 22);
      g.fillStyle = "rgba(24,20,16,0.92)";                             // ombros
      g.beginPath(); g.ellipse(cx, S * 0.74, S * 0.27, S * 0.22, 0, 0, 7); g.fill();
      if (q === 1) {                                                   // véu/cabelo
        g.fillStyle = "rgba(20,17,14,0.9)";
        g.beginPath(); g.ellipse(cx, S * 0.40, S * 0.2, S * 0.2, 0, 0, 7); g.fill();
      }
      g.fillStyle = "rgba(164,144,116,0.8)";                           // rosto liso
      g.beginPath(); g.ellipse(cx, S * 0.37, S * 0.13, S * 0.10, 0, 0, 7); g.fill();
    } else {
      g.fillStyle = "rgba(70,74,66,0.6)"; g.fillRect(18, 11, S - 36, S * 0.42);
      g.fillStyle = "rgba(28,26,20,0.9)"; g.fillRect(18, S * 0.52, S - 36, S * 0.4);
      g.strokeStyle = "rgba(12,10,8,0.95)"; g.lineWidth = 3;           // árvore morta
      g.beginPath(); g.moveTo(cx - 8, S * 0.72); g.lineTo(cx - 4, S * 0.3);
      g.moveTo(cx - 5, S * 0.42); g.lineTo(cx + 18, S * 0.28);
      g.moveTo(cx - 6, S * 0.5); g.lineTo(cx - 24, S * 0.36); g.stroke();
    }
    texSpeck(g, S, r, 260, "0,0,0", 0.25, 2);
  }, 128);
})();

// ------------------------------------------------------------------
// substitutas do Gemini (opcionais): Assets/Tex/<nome>.jpg
// ------------------------------------------------------------------
const TEX_OVERRIDE = { wp1: 2, wp2: 2, wp3: 2, wp4: 2, madeira: 2, pedra: 4,
                       gesso: 4, assoalho: 4, laje: 4, tapete: 4, passadeira: 2 };
function texFromImage(im, cells) {
  // espelha 2×2 num canvas 512: a emenda desaparece mesmo se a foto não ladrilha
  const S = 512, h = S / 2;
  const cv = document.createElement("canvas");
  cv.width = cv.height = S;
  const g = cv.getContext("2d");
  const side = Math.min(im.naturalWidth, im.naturalHeight);
  const sx = (im.naturalWidth - side) / 2, sy = (im.naturalHeight - side) / 2;
  for (const [fx, fy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
    g.save();
    g.translate(fx ? S : 0, fy ? S : 0);
    g.scale(fx ? -1 : 1, fy ? -1 : 1);
    g.drawImage(im, sx, sy, side, side, 0, 0, h, h);
    g.restore();
  }
  return texBuild(cv, cells * 2);
}
(function loadTexImgs() {
  for (const k in TEX_OVERRIDE) {
    const im = new Image();
    im.onload = () => { TEX[k] = texFromImage(im, TEX_OVERRIDE[k]); };
    im.onerror = () => {};
    im.src = "Assets/Tex/" + k + ".jpg";
  }
})();

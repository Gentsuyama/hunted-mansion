"use strict";
// ==================================================================
// FX — pós-processamento em WebGL por cima do canvas 2D
// O jogo continua desenhando tudo no canvas #game; a cada quadro essa
// imagem vira textura e passa por: brilho das luzes (bloom), grão de
// filme, vinheta de lente, aberração cromática e, na loucura, a imagem
// que ondula. Nada aqui muda regra de jogo nem o que o mapa revela: o
// brilho só nasce de pixels que JÁ estão claros (lanterna, velas, flash).
//   níveis: "cheio" (tudo) · "leve" (sem bloom) · "off" (canvas 2D puro)
//   F10 alterna; hm_fx guarda a escolha; sem WebGL cai para "off" sozinho;
//   quadro lento por 6 s rebaixa um nível (hm_fx_auto).
// ==================================================================
const FX = {
  nivel: "cheio", gl: null, cv: null, ok: false,
  prog: {}, tex: null, fbo: [], W: 1200, H: 680, bw: 300, bh: 170,
  quad: null, amostras: [], amostraT: 0, autoT: 0,
};
const FX_NIVEIS = ["cheio", "leve", "off"];

const FX_VS = `
attribute vec2 p; varying vec2 v;
void main() { v = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;

// 1) extrai o que é claro e reduz a 1/4 (a base do brilho)
const FX_FS_BRILHO = `
precision mediump float; varying vec2 v; uniform sampler2D s; uniform float lim;
void main() {
  vec3 c = texture2D(s, v).rgb;
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  float k = smoothstep(lim, lim + 0.25, l);
  gl_FragColor = vec4(c * k, 1.0);
}`;
// 2) desfoque gaussiano separável (9 toques)
const FX_FS_BLUR = `
precision mediump float; varying vec2 v; uniform sampler2D s; uniform vec2 dir;
void main() {
  vec3 c = texture2D(s, v).rgb * 0.227;
  c += (texture2D(s, v + dir * 1.385).rgb + texture2D(s, v - dir * 1.385).rgb) * 0.316;
  c += (texture2D(s, v + dir * 3.231).rgb + texture2D(s, v - dir * 3.231).rgb) * 0.070;
  gl_FragColor = vec4(c, 1.0);
}`;
// 3) composição final
const FX_FS_FINAL = `
precision mediump float; varying vec2 v;
uniform sampler2D s; uniform sampler2D b;
uniform float t, grao, vinh, aber, warp, bloom;
uniform vec2 px;
float hash(vec2 q) { return fract(sin(dot(q, vec2(127.1, 311.7)) + t * 43.7) * 43758.5453); }
void main() {
  vec2 uv = v;
  // loucura: a imagem ondula devagar, como vista por água
  if (warp > 0.0) {
    uv += vec2(sin(uv.y * 9.0 + t * 2.1) + sin(uv.y * 23.0 - t * 3.7) * 0.4,
               cos(uv.x * 7.0 + t * 1.7)) * warp;
  }
  vec2 d = uv - 0.5;
  float r2 = dot(d, d);
  // aberração cromática: cresce para as bordas
  vec2 off = d * aber * px * (0.5 + r2 * 1.2);
  float cr = texture2D(s, uv + off).r;
  float cg = texture2D(s, uv).g;
  float cb = texture2D(s, uv - off).b;
  vec3 c = vec3(cr, cg, cb);
  // brilho (aditivo, suave)
  vec3 g = texture2D(b, uv).rgb;
  c += g * bloom;
  // vinheta de lente
  float vg = smoothstep(0.95, 0.25, r2 * 1.9);
  c *= mix(1.0, vg, vinh);
  // grão de filme: mais forte no escuro, como emulsão
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  float n = hash(floor(gl_FragCoord.xy * 0.5)) - 0.5;
  c += n * grao * (1.0 - l * 0.7);
  gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}`;

function fxCompila(gl, vs, fs) {
  const mk = (tipo, src) => {
    const sh = gl.createShader(tipo); gl.shaderSource(sh, src); gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh));
    return sh;
  };
  const p = gl.createProgram();
  gl.attachShader(p, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) { const nm = gl.getActiveUniform(p, i).name; u[nm] = gl.getUniformLocation(p, nm); }
  return { p, u, a: gl.getAttribLocation(p, "p") };
}
function fxTextura(gl, w, h) {
  const tx = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tx);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  if (w) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  return tx;
}
function fxAlvo(gl, w, h) {
  const tx = fxTextura(gl, w, h), fb = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tx, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return { tx, fb, w, h };
}

function fxBoot() {
  if (typeof document === "undefined" || typeof canvas === "undefined") return;
  let guardado = null;
  try { guardado = localStorage.getItem("hm_fx") || localStorage.getItem("hm_fx_auto"); } catch (e) {}
  if (FX_NIVEIS.includes(guardado)) FX.nivel = guardado;
  const cv = document.createElement("canvas");
  cv.id = "fx"; cv.width = canvas.width; cv.height = canvas.height;
  cv.style.position = "fixed"; cv.style.pointerEvents = "none"; cv.style.cursor = "none";
  const gl = cv.getContext("webgl", { alpha: false, antialias: false, depth: false, stencil: false,
                                      premultipliedAlpha: false, preserveDrawingBuffer: false });
  if (!gl) { FX.nivel = "off"; return; }
  try {
    FX.prog.brilho = fxCompila(gl, FX_VS, FX_FS_BRILHO);
    FX.prog.blur = fxCompila(gl, FX_VS, FX_FS_BLUR);
    FX.prog.fin = fxCompila(gl, FX_VS, FX_FS_FINAL);
  } catch (e) { console.warn("fx", e); FX.nivel = "off"; return; }       // sem shaders: só o 2D
  FX.quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, FX.quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  FX.tex = fxTextura(gl);
  FX.bw = canvas.width >> 2; FX.bh = canvas.height >> 2;
  FX.fbo = [fxAlvo(gl, FX.bw, FX.bh), fxAlvo(gl, FX.bw, FX.bh)];
  FX.gl = gl; FX.cv = cv; FX.ok = true;
  document.body.appendChild(cv);
  fxEncaixa(); window.addEventListener("resize", fxEncaixa);
  fxAplicaNivel();
}
// o canvas de efeitos cobre exatamente o canvas do jogo
function fxEncaixa() {
  if (!FX.cv) return;
  const r = canvas.getBoundingClientRect();
  const st = FX.cv.style;
  const L = r.left + "px", T = r.top + "px", Wd = r.width + "px", Ht = r.height + "px";
  if (st.left !== L) st.left = L; if (st.top !== T) st.top = T;
  if (st.width !== Wd) st.width = Wd; if (st.height !== Ht) st.height = Ht;
}
function fxAplicaNivel() {
  if (FX.cv) FX.cv.style.display = FX.nivel === "off" || !FX.ok ? "none" : "block";
}
function fxNivel(n, guardar) {
  if (!FX_NIVEIS.includes(n)) return;
  FX.nivel = n; fxAplicaNivel();
  if (guardar) { try { localStorage.setItem("hm_fx", n); localStorage.removeItem("hm_fx_auto"); } catch (e) {} }
}
function fxAlterna() {
  const i = FX_NIVEIS.indexOf(FX.nivel);
  fxNivel(FX_NIVEIS[(i + 1) % FX_NIVEIS.length], true);
  if (typeof toast === "function")
    toast(FX.nivel === "cheio" ? "EFEITOS VISUAIS: LIGADOS"
        : FX.nivel === "leve" ? "EFEITOS VISUAIS: LEVES" : "EFEITOS VISUAIS: DESLIGADOS", 2.5);
}

// quanto de cada efeito, pelo que o jogo está mostrando
function fxPerfil() {
  const P = { grao: 0.02, vinh: 0.2, aber: 0.4, warp: 0, bloom: 0.35, lim: 0.62 };
  const s = typeof state === "string" ? state : "play";
  if (s === "play" || s === "ritual" || s === "dead") {
    P.grao = 0.035; P.vinh = 0.42; P.aber = 0.5; P.bloom = 0.7;
    if (typeof sanity === "number") { const m = 1 - Math.max(0, Math.min(100, sanity)) / 100;
      P.grao += 0.03 * m; P.vinh += 0.2 * m; P.aber += 0.5 * m; }
    if (typeof danoT === "number" && danoT > 0) P.aber += 2 * Math.min(1, danoT / 0.5);
    if (typeof flashT === "number" && flashT > 0) { P.bloom += 1.1 * flashT; P.aber += 0.8 * flashT; }
    if (typeof loucura !== "undefined" && loucura) {
      const falta = 1 - loucura.t / loucura.dur;
      P.warp = 0.003 + 0.005 * (1 - falta); P.aber += 1.2 + 1.0 * (1 - falta); P.grao += 0.04; P.bloom += 0.2;
      P.vinh += 0.35 * (1 - falta);
    }
  } else if (["album", "diario", "chat", "safe", "elevator", "fusebox", "darkroom", "win"].includes(s)) {
    P.grao = 0.012; P.vinh = 0.12; P.aber = 0.25; P.bloom = 0;       // papel e painéis: só a lente
  } else {                                                           // idioma, título, cinemática
    P.grao = 0.022; P.vinh = 0.22; P.aber = 0.4; P.bloom = 0.3;
  }
  if (FX.nivel === "leve") P.bloom = 0;
  return P;
}

function fxQuad(gl, pr) {
  gl.useProgram(pr.p);
  gl.bindBuffer(gl.ARRAY_BUFFER, FX.quad);
  gl.enableVertexAttribArray(pr.a);
  gl.vertexAttribPointer(pr.a, 2, gl.FLOAT, false, 0, 0);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

// chamado depois de render(): a imagem do jogo passa pelos efeitos
function fxApresenta() {
  if (!FX.ok || FX.nivel === "off") return;
  const gl = FX.gl, W = canvas.width, H = canvas.height;
  fxEncaixa();
  const P = fxPerfil();
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, FX.tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
  if (P.bloom > 0) {
    // claro → 1/4 → desfoque H → desfoque V
    gl.bindFramebuffer(gl.FRAMEBUFFER, FX.fbo[0].fb); gl.viewport(0, 0, FX.bw, FX.bh);
    gl.useProgram(FX.prog.brilho.p);
    gl.uniform1i(FX.prog.brilho.u.s, 0); gl.uniform1f(FX.prog.brilho.u.lim, P.lim);
    fxQuad(gl, FX.prog.brilho);
    gl.bindTexture(gl.TEXTURE_2D, FX.fbo[0].tx);
    gl.bindFramebuffer(gl.FRAMEBUFFER, FX.fbo[1].fb);
    gl.useProgram(FX.prog.blur.p); gl.uniform1i(FX.prog.blur.u.s, 0);
    gl.uniform2f(FX.prog.blur.u.dir, 1 / FX.bw, 0); fxQuad(gl, FX.prog.blur);
    gl.bindTexture(gl.TEXTURE_2D, FX.fbo[1].tx);
    gl.bindFramebuffer(gl.FRAMEBUFFER, FX.fbo[0].fb);
    gl.uniform2f(FX.prog.blur.u.dir, 0, 1 / FX.bh); fxQuad(gl, FX.prog.blur);
  }
  // final
  gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, W, H);
  const F = FX.prog.fin; gl.useProgram(F.p);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, FX.tex); gl.uniform1i(F.u.s, 0);
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, FX.fbo[0].tx); gl.uniform1i(F.u.b, 1);
  gl.uniform1f(F.u.t, typeof time === "number" ? time : performance.now() / 1000);
  gl.uniform1f(F.u.grao, P.grao); gl.uniform1f(F.u.vinh, P.vinh); gl.uniform1f(F.u.aber, P.aber);
  gl.uniform1f(F.u.warp, P.warp); gl.uniform1f(F.u.bloom, P.bloom);
  gl.uniform2f(F.u.px, 1 / W, 1 / H);
  fxQuad(gl, F);
  gl.activeTexture(gl.TEXTURE0);
  fxVigia();
}
// quadro lento por 6 s seguidos: desce um nível e lembra
function fxVigia() {
  const agora = performance.now();
  if (FX.amostraT) {
    const d = agora - FX.amostraT;
    if (d < 200) { FX.amostras.push(d); if (FX.amostras.length > 360) FX.amostras.shift(); }
  }
  FX.amostraT = agora;
  if (FX.amostras.length < 300) return;
  const media = FX.amostras.reduce((a, b) => a + b, 0) / FX.amostras.length;
  if (media > 26) {
    const i = FX_NIVEIS.indexOf(FX.nivel);
    if (i < FX_NIVEIS.length - 1) {
      FX.nivel = FX_NIVEIS[i + 1]; fxAplicaNivel();
      try { if (!localStorage.getItem("hm_fx")) localStorage.setItem("hm_fx_auto", FX.nivel); } catch (e) {}
      console.info("fx", { quadroMs: +media.toFixed(1), nivel: FX.nivel });   // rebaixado por lentidão
    }
  }
  FX.amostras = [];
}

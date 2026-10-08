#!/usr/bin/env node
"use strict";
// ==================================================================
// Build da edição desktop (Electron) — roda FORA do Google Drive.
// O Drive (G:) derruba o npm install (milhares de arquivos pequenos: EBADF),
// então este script espelha desktop/ + o jogo numa pasta local e trabalha lá:
//   %LOCALAPPDATA%\HuntedMansion\desktop   (ou HM_DESKTOP_WS)
//
//   node build.js dev       copia, instala se preciso, abre o jogo no Electron
//                           (com o jogo lido direto do repositório: edite e dê F5)
//   node build.js win       build Windows x64 (pasta dist/win-unpacked, sem instalador)
//   node build.js linux     build Linux x64   (pasta dist/linux-unpacked)
//   node build.js copia     só espelha os arquivos
// Variáveis: HM_PRINT=arquivo.png (tira um print do jogo e fecha), HM_DIAG=1
// ==================================================================
const fs = require("fs"), path = require("path"), { spawnSync } = require("child_process");

const AQUI = __dirname;                                   // Hunted Mansion/desktop
const REPO = path.resolve(AQUI, "..");                    // Hunted Mansion/
const WS = process.env.HM_DESKTOP_WS ||
  path.join(process.env.LOCALAPPDATA || process.env.HOME, "HuntedMansion", "desktop");
const FONTES = ["package.json", "main.js", "preload.js", "conquistas.json"];
const JOGO = ["index.html", "js", "Assets"];
const IGNORA_ASSETS = /(^|[\\/])(Intro[\\/]originais|\.DS_Store|Thumbs\.db)/i;

function log(...a) { console.log("[desktop]", ...a); }

function copiaDir(de, para, filtro) {
  fs.mkdirSync(para, { recursive: true });
  for (const ent of fs.readdirSync(de, { withFileTypes: true })) {
    const a = path.join(de, ent.name), b = path.join(para, ent.name);
    if (filtro && filtro(a)) continue;
    if (ent.isDirectory()) copiaDir(a, b, filtro);
    else {
      const sa = fs.statSync(a);
      let sb = null; try { sb = fs.statSync(b); } catch (e) {}
      if (!sb || sb.size !== sa.size || sb.mtimeMs < sa.mtimeMs) fs.copyFileSync(a, b);
    }
  }
}
function apagaSobras(de, para) {        // o que sumiu do repo some do espelho
  if (!fs.existsSync(para)) return;
  for (const ent of fs.readdirSync(para, { withFileTypes: true })) {
    const a = path.join(de, ent.name), b = path.join(para, ent.name);
    if (!fs.existsSync(a)) { fs.rmSync(b, { recursive: true, force: true }); continue; }
    if (ent.isDirectory()) apagaSobras(a, b);
  }
}

function copia() {
  fs.mkdirSync(WS, { recursive: true });
  for (const f of FONTES) fs.copyFileSync(path.join(AQUI, f), path.join(WS, f));
  copiaDir(path.join(AQUI, "build"), path.join(WS, "build"));
  const jogo = path.join(WS, "game");
  fs.mkdirSync(jogo, { recursive: true });
  for (const f of JOGO) {
    const a = path.join(REPO, f), b = path.join(jogo, f);
    if (fs.statSync(a).isDirectory()) { copiaDir(a, b, p => IGNORA_ASSETS.test(p)); apagaSobras(a, b); }
    else fs.copyFileSync(a, b);
  }
  log("espelho em", WS);
}

function instala() {
  const marca = path.join(WS, "node_modules", ".hm-instalado");
  const pkg = fs.readFileSync(path.join(AQUI, "package.json"), "utf8");
  if (fs.existsSync(marca) && fs.readFileSync(marca, "utf8") === pkg) return;
  log("npm install (uma vez; Electron ~150 MB)…");
  const r = spawnSync(process.platform === "win32" ? "npm.cmd" : "npm",
    ["install", "--no-audit", "--no-fund", "--no-progress", "--loglevel=error"],
    { cwd: WS, stdio: "inherit", shell: process.platform === "win32" });
  if (r.status !== 0) { console.error("npm install falhou"); process.exit(r.status || 1); }
  fs.writeFileSync(marca, pkg);
}

function bin(nome) {
  return path.join(WS, "node_modules", ".bin", process.platform === "win32" ? nome + ".cmd" : nome);
}
function roda(cmd, args, env) {
  const r = spawnSync(cmd, args, { cwd: WS, stdio: "inherit", shell: process.platform === "win32",
                                   env: Object.assign({}, process.env, env || {}) });
  return r.status;
}

function dev() {
  copia(); instala();
  // no dev o jogo é lido direto do repositório (F5 recarrega o que você editou)
  process.exit(roda(bin("electron"), [".", "--dev"], { HM_JOGO: REPO }) || 0);
}

function build(plat) {
  copia(); instala();
  const st = roda(bin("electron-builder"), ["--dir", "--" + plat, "--x64", "--publish", "never"]);
  if (st) process.exit(st);
  const saida = path.join(WS, "dist", plat === "win" ? "win-unpacked" : "linux-unpacked");
  // steam_appid.txt só serve para TESTAR fora da Steam (App 480 = Spacewar); NUNCA vai no depot
  fs.writeFileSync(path.join(saida, "steam_appid.txt"), "480\n");
  let total = 0, n = 0;
  (function soma(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name); if (e.isDirectory()) soma(p); else { total += fs.statSync(p).size; n++; } } })(saida);
  log("build pronto:", saida, "—", n, "arquivos,", (total / 1048576).toFixed(0), "MB");
  log("(steam_appid.txt = 480 gravado só para teste local; tire-o antes de subir para a Steam)");
}

const cmd = process.argv[2] || "dev";
if (cmd === "copia") copia();
else if (cmd === "dev") dev();
else if (cmd === "win" || cmd === "linux") build(cmd);
else { console.error("uso: node build.js [dev|win|linux|copia]"); process.exit(2); }

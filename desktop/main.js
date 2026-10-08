"use strict";
// ==================================================================
// HUNTED MANSION — edição desktop (Electron)
// O jogo web (index.html + js + Assets) roda sem mudanças dentro de uma
// janela; este processo cuida do que o navegador não dá:
//   · esquema hm://jogo/… servindo os arquivos locais (mesma origem, sem
//     os limites do file://: canvas sem "taint", fetch, localStorage)
//   · saves em ARQUIVO: cada chave hm_* do localStorage vira
//     <userData>/saves/<chave>.json (é isso que o Steam Cloud sincroniza)
//   · Steam (steamworks.js): overlay, idioma, conquistas, nome do jogador
//   · tela cheia (F11 / Alt+Enter), sem menu, ícone, fechar = sair
// Dev: `node build.js dev` (HM_JOGO aponta para o repositório);
// empacotado: game/ dentro do asar + resources/Assets (electron-builder).
// ==================================================================
const { app, BrowserWindow, protocol, net, ipcMain, Menu, dialog } = require("electron");
const path = require("path"), fs = require("fs");
const { pathToFileURL } = require("url");

const APP_ID = 480;                       // Spacewar: app de teste da Valve; trocar pelo App ID real
const DEV = process.argv.includes("--dev");
const ARGS = Object.fromEntries(process.argv.filter(a => a.startsWith("--")).map(a => {
  const i = a.indexOf("=");                      // só o primeiro "=": o valor pode ser código
  return i < 0 ? [a.slice(2), true] : [a.slice(2, i), a.slice(i + 1)]; }));
const VERSAO = app.getVersion();

app.setName("Hunted Mansion");           // userData = %APPDATA%\Hunted Mansion

// ------------------------------------------------------------------
// Steam — ANTES do ready: electronEnableSteamOverlay acrescenta as duas
// flags de linha de comando (in-process-gpu, disable-direct-composition)
// de que o overlay precisa; sem o cliente Steam aberto o jogo segue sem Steam.
// ------------------------------------------------------------------
let steam = null, steamErro = null, steamworks = null;
try {
  steamworks = require("@fishpondstudio/steamworks.js");
  // lançado fora da Steam com o jogo de verdade: reabre pela Steam (dono da licença).
  // No dev/App 480 não faz sentido — pularia para o Spacewar.
  if (!DEV && APP_ID !== 480 && steamworks.restartAppIfNecessary(APP_ID)) { app.exit(0); }
  steamworks.electronEnableSteamOverlay();
  steam = steamworks.init(APP_ID);
} catch (e) { steam = null; steamErro = String(e && e.message || e); }

// ------------------------------------------------------------------
// onde está o jogo
// ------------------------------------------------------------------
const RAIZ_DEV = process.env.HM_JOGO ? path.resolve(process.env.HM_JOGO) : null;
function arquivoDoJogo(rel) {
  if (RAIZ_DEV) return path.join(RAIZ_DEV, rel);
  if (rel === "Assets" || rel.startsWith("Assets/") || rel.startsWith("Assets\\"))
    return app.isPackaged ? path.join(process.resourcesPath, rel) : path.join(app.getAppPath(), "game", rel);
  return path.join(app.getAppPath(), "game", rel);
}
protocol.registerSchemesAsPrivileged([{
  scheme: "hm",
  privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true, bypassCSP: true },
}]);

// ------------------------------------------------------------------
// saves em arquivo (o que o Steam Cloud e o cloud da GOG sincronizam)
// ------------------------------------------------------------------
const SAVES = path.join(app.getPath("userData"), "saves");
const CHAVE_OK = /^hm_[a-z_]{1,32}$/;
function saveCaminho(k) { return path.join(SAVES, k + ".json"); }
function savesLe() {
  const out = {};
  try {
    for (const f of fs.readdirSync(SAVES)) {
      if (!f.endsWith(".json")) continue;
      const k = f.slice(0, -5);
      if (!CHAVE_OK.test(k)) continue;
      try {
        const d = JSON.parse(fs.readFileSync(saveCaminho(k), "utf8"));
        if (d && typeof d.valor === "string") out[k] = d.valor;
      } catch (e) {                                   // arquivo quebrado: tenta o .bak
        try { const d = JSON.parse(fs.readFileSync(saveCaminho(k) + ".bak", "utf8"));
              if (d && typeof d.valor === "string") out[k] = d.valor; } catch (e2) {}
      }
    }
  } catch (e) {}
  return out;
}
function saveGrava(k, valor) {
  if (!CHAVE_OK.test(k)) return;
  try {
    fs.mkdirSync(SAVES, { recursive: true });
    const p = saveCaminho(k), tmp = p + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify({ chave: k, valor: String(valor), versao: VERSAO, quando: new Date().toISOString() }));
    if (fs.existsSync(p)) { try { fs.copyFileSync(p, p + ".bak"); } catch (e) {} }
    fs.renameSync(tmp, p);                            // troca atômica
  } catch (e) { console.error("save", k, e.message); }
}
function saveApaga(k) {
  if (!CHAVE_OK.test(k)) return;
  for (const s of ["", ".bak", ".tmp"]) { try { fs.unlinkSync(saveCaminho(k) + s); } catch (e) {} }
}

// idioma da Steam → idioma do jogo (só na primeira vez, quando não há hm_lang)
const IDIOMA_STEAM = { brazilian: "pt", portuguese: "pt", english: "en", spanish: "es", latam: "es",
                       french: "fr", german: "de", schinese: "zh", tchinese: "zh", japanese: "ja" };
function idiomaInicial() {
  try { return steam ? IDIOMA_STEAM[steam.apps.currentGameLanguage()] || null : null; } catch (e) { return null; }
}

// conquistas: id do jogo → nome na API da Steam (conquistas.json)
let CONQUISTAS = {};
try { CONQUISTAS = JSON.parse(fs.readFileSync(path.join(__dirname, "conquistas.json"), "utf8")); } catch (e) {}
function conquista(id) {
  const api = CONQUISTAS[id];
  if (!steam || !api) return false;
  try { if (steam.achievement.isActivated(api)) return true; return steam.achievement.activate(api); }
  catch (e) { return false; }
}

function infoSteam() {
  if (!steam) return { ok: false, erro: steamErro };
  const o = { ok: true, appId: APP_ID };
  try { o.jogador = steam.localplayer.getName(); } catch (e) {}
  try { o.idioma = steam.apps.currentGameLanguage(); } catch (e) {}
  try { o.deck = !!(steam.utils.isSteamRunningOnSteamDeck && steam.utils.isSteamRunningOnSteamDeck()); } catch (e) {}
  return o;
}

// ------------------------------------------------------------------
// IPC com o preload
// ------------------------------------------------------------------
ipcMain.on("hm:carrega", e => {
  const s = savesLe();
  if (!("hm_lang" in s)) { const l = idiomaInicial(); if (l) s.hm_lang = l; }
  e.returnValue = s;
});
ipcMain.on("hm:grava", (e, k, v) => saveGrava(k, v));
ipcMain.on("hm:apaga", (e, k) => saveApaga(k));
ipcMain.on("hm:conquista", (e, id) => conquista(String(id)));
ipcMain.on("hm:info", e => { e.returnValue = { versao: VERSAO, dev: DEV, steam: infoSteam(), saves: SAVES }; });
ipcMain.on("hm:sair", () => app.quit());
ipcMain.on("hm:telacheia", (e, liga) => {
  const w = BrowserWindow.fromWebContents(e.sender);
  if (w) w.setFullScreen(liga === undefined ? !w.isFullScreen() : !!liga);
});

// ------------------------------------------------------------------
// janela
// ------------------------------------------------------------------
let win = null;
function criaJanela() {
  Menu.setApplicationMenu(null);
  win = new BrowserWindow({
    width: 1200, height: 680, minWidth: 600, minHeight: 340, useContentSize: true,
    backgroundColor: "#000000", title: "Hunted Mansion", show: false, autoHideMenuBar: true,
    fullscreen: app.isPackaged && !ARGS.janela,       // na loja abre em tela cheia; --janela para testar
    icon: path.join(__dirname, "build", process.platform === "win32" ? "icon.ico" : "icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: false,       // o preload embrulha o localStorage do próprio jogo
      nodeIntegration: false, sandbox: false,
      backgroundThrottling: false,   // o overlay da Steam precisa de quadros
      spellcheck: false,
    },
  });
  win.setAspectRatio(1200 / 680);
  win.once("ready-to-show", () => win.show());
  win.webContents.on("before-input-event", (e, input) => {
    if (input.type !== "keyDown") return;
    if (input.key === "F11" || (input.alt && input.key === "Enter")) {
      win.setFullScreen(!win.isFullScreen()); e.preventDefault();
    }
    if (DEV && input.key === "F5") { win.webContents.reloadIgnoringCache(); e.preventDefault(); }
    if (DEV && input.key === "F12") { win.webContents.toggleDevTools(); e.preventDefault(); }
  });
  win.webContents.on("render-process-gone", (e, d) => {
    dialog.showErrorBox("Hunted Mansion", "O jogo parou (" + d.reason + "). Abra de novo.");
    app.quit();
  });
  win.loadURL("hm://jogo/index.html");

  // --overlay: abre o painel de conquistas do overlay da Steam no meio da espera (teste)
  if (ARGS.overlay && steam) {
    const ms = +ARGS.espera || 4000;
    win.webContents.once("did-finish-load", () => setTimeout(() => {
      try { steam.overlay.activateDialog(6); } catch (e) { console.error("overlay", e.message); }
    }, Math.max(1000, ms / 2)));
  }
  // --print=arquivo.png: espera, fotografa a janela e fecha (teste automático)
  if (ARGS.print) {
    const ms = +ARGS.espera || 4000;
    win.webContents.once("did-finish-load", () => setTimeout(async () => {
      try {
        const js = ARGS.jsfile ? fs.readFileSync(String(ARGS.jsfile), "utf8") : ARGS.js;
        let resultadoJs = null;
        if (js) resultadoJs = await win.webContents.executeJavaScript("(async () => { " + js + " })()");
        const img = await win.webContents.capturePage();
        fs.writeFileSync(String(ARGS.print), img.toPNG());
        const diag = { js: resultadoJs, versao: VERSAO, steam: infoSteam(), saves: SAVES, arquivos: fs.existsSync(SAVES) ? fs.readdirSync(SAVES) : [],
                       janela: win.getContentSize(), telaCheia: win.isFullScreen(), url: win.webContents.getURL() };
        fs.writeFileSync(String(ARGS.print) + ".json", JSON.stringify(diag, null, 1));
      } catch (e) { fs.writeFileSync(String(ARGS.print) + ".erro.txt", String(e && e.stack || e)); }
      app.quit();
    }, ms));
  }
}

app.whenReady().then(() => {
  protocol.handle("hm", req => {
    const u = new URL(req.url);
    let rel = decodeURIComponent(u.pathname).replace(/^\/+/, "") || "index.html";
    if (rel.split(/[\\/]/).includes("..")) return new Response("", { status: 403 });
    const abs = arquivoDoJogo(rel);
    if (!fs.existsSync(abs)) return new Response("", { status: 404 });   // o jogo sonda arquivos opcionais
    return net.fetch(pathToFileURL(abs).toString());
  });
  criaJanela();
});
app.on("window-all-closed", () => app.quit());   // o Steam Cloud sobe os saves quando o processo TERMINA
app.on("will-quit", () => { try { if (steamworks && steam) steamworks.shutdown(); } catch (e) {} });

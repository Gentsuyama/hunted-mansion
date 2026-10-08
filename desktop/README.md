# Hunted Mansion — edição desktop (Electron)

O jogo web (`../index.html`, `../js`, `../Assets`) roda sem mudanças dentro de uma
janela Electron. O que esta pasta acrescenta:

| arquivo | papel |
|---|---|
| `main.js` | processo principal: esquema `hm://jogo/…` servindo os arquivos locais, janela, tela cheia (F11 / Alt+Enter), saves em arquivo, Steam |
| `preload.js` | roda antes do jogo: semeia o `localStorage` com os saves em arquivo e espelha cada gravação `hm_*` de volta; expõe `window.HM_DESKTOP` |
| `conquistas.json` | id usado no jogo (`conquista("alma_tomas")`) → nome da API na Steamworks |
| `build.js` | espelha tudo numa pasta LOCAL (`%LOCALAPPDATA%\HuntedMansion\desktop`) e roda npm/electron-builder lá — o Google Drive derruba o `npm install` |
| `build/icon.*` | ícone (câmera com o olho vermelho) |

No lado do jogo, só `js/plataforma.js` sabe que o desktop existe (`noDesktop()`,
`conquista(id)`, botão SAIR no título). No navegador nada disso faz nada.

## Comandos (na pasta `desktop/`)

```
npm run dev          # abre o jogo no Electron lendo o repositório (F5 recarrega, F12 devtools)
npm run build:win    # dist/win-unpacked  — a pasta que vai para o depot da Steam
npm run build:linux  # dist/linux-unpacked (gerado aqui, mas SÓ testado em máquina Linux)
```

Os builds ficam em `%LOCALAPPDATA%\HuntedMansion\desktop\dist\`. Versões fixas:
Electron 42.11.12, electron-builder 26.15.3, @fishpondstudio/steamworks.js 0.3.8
(fork do steamworks.js que acompanha o repositório upstream). Subir de Electron só
depois de retestar o overlay (o 35 quebrou o overlay no SteamOS).

## Steam

- `APP_ID` em `main.js` está em **480 (Spacewar)**, o app de teste da Valve: com o
  cliente Steam aberto, a API inicializa e o overlay é injetado sem conta Steamworks.
  Com o App ID real: trocar a constante, e `restartAppIfNecessary` passa a valer.
- `build.js` grava `steam_appid.txt` (480) na pasta do build **só para testar fora da
  Steam**. Tirar antes de subir o depot.
- Overlay: `electronEnableSteamOverlay()` antes do `ready` acrescenta `in-process-gpu`
  e `disable-direct-composition` e mantém a janela repintando. Teste manual: abrir o
  jogo com a Steam aberta e apertar Shift+Tab.
- Conquistas: `conquistas.json` lista os 14 nomes a criar em *Stats & Achievements*.
  O jogo chama `conquista(id)` em: primeira foto real, cada alma presa, cada final,
  Tomás acudindo, volta da loucura, assinatura do diário.
- Idioma: na primeira execução sem `hm_lang`, o idioma da Steam vira o do jogo.

## Saves e Steam Cloud

Cada chave `hm_*` do `localStorage` vira `%APPDATA%\Hunted Mansion\saves\<chave>.json`
(troca atômica + `.bak`). Ao abrir, o arquivo manda (é o que a nuvem trouxe). Config
do Auto-Cloud na Steamworks: raiz `WinAppDataRoaming`, subpasta `Hunted Mansion/saves`,
padrão `*.json`; overrides `LinuxHome/.config/Hunted Mansion/saves` e
`MacAppSupport/Hunted Mansion/saves`. O upload acontece quando o processo termina —
por isso fechar a janela encerra o app.

## Teste automático

`"Hunted Mansion.exe" --janela --print=saida.png --espera=4000 [--jsfile=roteiro.js] [--overlay]`
abre em janela, roda o roteiro, salva o print (`capturePage`) e `saida.png.json` com
o diagnóstico (Steam ok?, jogador, idioma, arquivos de save). O overlay NÃO aparece no
`capturePage`; para vê-lo, só a olho (Shift+Tab).

# SimpL

**One Prompt SSH/RDP Manager**

Simple SSH/RDP manager for Windows — folder tree, DPAPI-encrypted credentials, in-app SSH terminals (xterm.js + ssh2), and RDP via `mstsc.exe`.

## Requirements

- Windows 10/11 (RDP via mstsc; DPAPI for secrets)
- [Node.js](https://nodejs.org/) 18+ and npm

## Setup

```bash
git clone https://github.com/BobbyGR/simpl.git
cd simpl
npm install
```

## Run (development)

```bash
npm run dev
```

This starts the Vite dev server and Electron with hot reload. DevTools open automatically.

## Build (installer)

```bash
npm run build
```

Produces a Windows NSIS installer: `release/SimpL_0.1.0.exe`.

## Data locations

| Data | Location |
|------|----------|
| Connections & folders | `%APPDATA%\simpl\simpl-data.json` (electron-store) |
| Encrypted secrets | `%APPDATA%\simpl\simpl-secrets.json` |

Export/import includes connections and folders only — secrets are never exported.

## Usage

1. Create folders and connections from the sidebar (**+ Folder**, **+ Connection**).
2. Double-click a connection or use **Connect** from the context menu.
3. SSH opens in an in-app terminal tab; RDP launches **mstsc.exe** in a separate window.
4. **Quick connect** creates a saved connection and opens a session immediately.
5. **Export** / **Import** for backup (no passwords).

## Architecture (P1)

- **Main**: electron-store, safeStorage secrets, ssh2 sessions, mstsc RDP backend
- **Preload**: typed `window.sshManager` API (contextIsolation)
- **Renderer**: Fluent UI, sidebar tree, tabbed sessions

## Known limitations (P2+)

- Embedded in-app RDP (`EmbeddedRdpBackend`) — stub only
- SSH private keys: credential kind exists; UI defaults to password
- No master password (by design — OS DPAPI only)
- macOS/Linux packaging not targeted in P1

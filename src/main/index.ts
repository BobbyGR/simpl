import { app, BrowserWindow, shell } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { registerIpcHandlers } from './ipc/registerHandlers'
import { RdpSessionManager } from './rdp/RdpSessionManager'
import { SafeStorageSecretStore } from './secrets/SafeStorageSecretStore'
import { SshSessionManager } from './ssh/SshSessionManager'
import { AppStore } from './store/AppStore'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '../..')
const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')
const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL

if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

app.setPath('userData', path.join(app.getPath('appData'), 'simpl'))

let mainWindow: BrowserWindow | null = null

const appStore = new AppStore()
const secretStore = new SafeStorageSecretStore()
const getWindow = () => mainWindow
const sshManager = new SshSessionManager(getWindow, appStore, secretStore)
const rdpManager = new RdpSessionManager(getWindow, appStore, secretStore)

async function createWindow(): Promise<void> {
  const preload = path.join(__dirname, '../preload/index.mjs')
  const indexHtml = path.join(RENDERER_DIST, 'index.html')

  mainWindow = new BrowserWindow({
    title: 'SimpL',
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  if (VITE_DEV_SERVER_URL) {
    await mainWindow.loadURL(VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    await mainWindow.loadFile(indexHtml)
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) shell.openExternal(url)
    return { action: 'deny' }
  })
}

app.whenReady().then(() => {
  registerIpcHandlers(getWindow, appStore, secretStore, sshManager, rdpManager)
  return createWindow()
})

app.on('window-all-closed', () => {
  mainWindow = null
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  }
})

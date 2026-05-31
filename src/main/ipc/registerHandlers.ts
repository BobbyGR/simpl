import { ipcMain, type BrowserWindow } from 'electron'
import { randomUUID } from 'node:crypto'
import {
  IPC_RDP_CLOSE,
  IPC_RDP_LAUNCH,
  IPC_SECRET_CREATE,
  IPC_SECRET_DELETE,
  IPC_SECRET_GET_PLAINTEXT,
  IPC_SECRET_LIST,
  IPC_SECRET_UPDATE,
  IPC_SSH_CLOSE,
  IPC_SSH_INPUT,
  IPC_SSH_OPEN,
  IPC_SSH_RESIZE,
  IPC_STORE_CONNECTION_CREATE,
  IPC_STORE_CONNECTION_DELETE,
  IPC_STORE_CONNECTION_UPDATE,
  IPC_STORE_EXPORT,
  IPC_STORE_FOLDER_CREATE,
  IPC_STORE_FOLDER_DELETE,
  IPC_STORE_FOLDER_UPDATE,
  IPC_STORE_GET,
  IPC_STORE_IMPORT,
  IPC_STORE_RESOLVE_SETTINGS,
  IPC_STORE_SEARCH,
  IPC_STORE_TOGGLE_FAVORITE,
} from '../../shared/ipc'
import type { AppStore } from '../store/AppStore'
import type { SafeStorageSecretStore } from '../secrets/SafeStorageSecretStore'
import type { SshSessionManager } from '../ssh/SshSessionManager'
import type { RdpSessionManager } from '../rdp/RdpSessionManager'

export function registerIpcHandlers(
  getWindow: () => BrowserWindow | null,
  appStore: AppStore,
  secretStore: SafeStorageSecretStore,
  ssh: SshSessionManager,
  rdp: RdpSessionManager,
): void {
  ipcMain.handle(IPC_STORE_GET, () => ({
    ...appStore.getData(),
    credentials: secretStore.listCredentials(),
  }))

  ipcMain.handle(IPC_STORE_FOLDER_CREATE, (_, input: { name: string; parentId: string | null }) =>
    appStore.createFolder(input.name, input.parentId),
  )
  ipcMain.handle(IPC_STORE_FOLDER_UPDATE, (_, input) => appStore.updateFolder(input))
  ipcMain.handle(IPC_STORE_FOLDER_DELETE, (_, id: string) => appStore.deleteFolder(id))
  ipcMain.handle(IPC_STORE_CONNECTION_CREATE, (_, input) => appStore.createConnection(input))
  ipcMain.handle(IPC_STORE_CONNECTION_UPDATE, (_, input) => appStore.updateConnection(input))
  ipcMain.handle(IPC_STORE_CONNECTION_DELETE, (_, id: string) => appStore.deleteConnection(id))
  ipcMain.handle(IPC_STORE_SEARCH, (_, query: string) => appStore.search(query))
  ipcMain.handle(IPC_STORE_TOGGLE_FAVORITE, (_, id: string) => appStore.toggleFavorite(id))
  ipcMain.handle(IPC_STORE_EXPORT, () => appStore.exportBundle())
  ipcMain.handle(IPC_STORE_IMPORT, (_, bundle) => appStore.importBundle(bundle))
  ipcMain.handle(IPC_STORE_RESOLVE_SETTINGS, (_, connectionId: string) =>
    appStore.resolveSettings(connectionId),
  )

  ipcMain.handle(IPC_SECRET_LIST, () => secretStore.listCredentials())
  ipcMain.handle(IPC_SECRET_CREATE, (_, input) =>
    secretStore.createCredential(input.label, input.kind, input.plaintext),
  )
  ipcMain.handle(IPC_SECRET_UPDATE, (_, input) => {
    const { id, ...updates } = input
    return secretStore.updateCredential(id, updates)
  })
  ipcMain.handle(IPC_SECRET_DELETE, (_, id: string) => secretStore.deleteCredential(id))
  ipcMain.handle(IPC_SECRET_GET_PLAINTEXT, (_, id: string) => secretStore.getPlaintext(id))

  ipcMain.handle(IPC_SSH_OPEN, async (_, req) => {
    const sessionId = randomUUID()
    await ssh.open(sessionId, req.connectionId, req.cols, req.rows)
    return { sessionId }
  })
  ipcMain.handle(IPC_SSH_CLOSE, (_, sessionId: string) => ssh.close(sessionId))
  ipcMain.handle(IPC_SSH_RESIZE, (_, req) => ssh.resize(req.sessionId, req.cols, req.rows))
  ipcMain.handle(IPC_SSH_INPUT, (_, req) => ssh.write(req.sessionId, req.data))

  ipcMain.handle(IPC_RDP_LAUNCH, (_, req) => rdp.launch(req))
  ipcMain.handle(IPC_RDP_CLOSE, (_, sessionId: string) => rdp.close(sessionId))

  void getWindow
}

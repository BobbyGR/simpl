import { BrowserWindow } from 'electron'
import { randomUUID } from 'node:crypto'
import { IPC_RDP_STATUS } from '../../shared/ipc'
import type { RdpLaunchRequest, RdpLaunchResult } from '../../shared/ipc'
import type { AppStore } from '../store/AppStore'
import type { SafeStorageSecretStore } from '../secrets/SafeStorageSecretStore'
import { EmbeddedRdpBackend } from './EmbeddedRdpBackend'
import { MstscBackend } from './MstscBackend'

export class RdpSessionManager {
  private readonly mstsc = new MstscBackend()
  private readonly embedded = new EmbeddedRdpBackend()
  private readonly sessionBackends = new Map<string, string>()

  constructor(
    private readonly getWindow: () => BrowserWindow | null,
    private readonly appStore: AppStore,
    private readonly secretStore: SafeStorageSecretStore,
  ) {}

  async launch(req: RdpLaunchRequest): Promise<RdpLaunchResult> {
    const connection = this.appStore.getConnection(req.connectionId)
    if (!connection || connection.protocol !== 'rdp') {
      throw new Error('Invalid RDP connection')
    }

    const sessionId = randomUUID()
    const settings = this.appStore.resolveSettings(req.connectionId)
    let password: string | undefined
    if (connection.credentialId) {
      password = this.secretStore.getPlaintext(connection.credentialId)
    }

    const backendName = req.backend ?? 'mstsc'
    const backend = backendName === 'embedded' ? this.embedded : this.mstsc

    const result = await backend.launch({
      sessionId,
      connection,
      password,
      settings,
    })

    this.sessionBackends.set(sessionId, backend.name)
    this.emitStatus(sessionId, 'launched', result.message)

    return { sessionId, backend: backend.name, message: result.message }
  }

  async close(sessionId: string): Promise<void> {
    const backendName = this.sessionBackends.get(sessionId)
    if (!backendName) return
    const backend = backendName === 'embedded' ? this.embedded : this.mstsc
    await backend.close(sessionId)
    this.sessionBackends.delete(sessionId)
    this.emitStatus(sessionId, 'exited')
  }

  private emitStatus(sessionId: string, status: 'launched' | 'exited' | 'error', message?: string): void {
    const win = this.getWindow()
    win?.webContents.send(IPC_RDP_STATUS, { sessionId, status, message })
  }
}

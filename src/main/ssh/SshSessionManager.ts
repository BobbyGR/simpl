import { BrowserWindow } from 'electron'
import { Client, type ClientChannel } from 'ssh2'
import { IPC_SSH_EXIT, IPC_SSH_OUTPUT } from '../../shared/ipc'
import type { AppStore } from '../store/AppStore'
import type { SafeStorageSecretStore } from '../secrets/SafeStorageSecretStore'

interface ActiveSession {
  client: Client
  stream: ClientChannel
}

export class SshSessionManager {
  private readonly sessions = new Map<string, ActiveSession>()

  constructor(
    private readonly getWindow: () => BrowserWindow | null,
    private readonly appStore: AppStore,
    private readonly secretStore: SafeStorageSecretStore,
  ) {}

  async open(sessionId: string, connectionId: string, cols: number, rows: number): Promise<void> {
    const connection = this.appStore.getConnection(connectionId)
    if (!connection || connection.protocol !== 'ssh') {
      throw new Error('Invalid SSH connection')
    }

    const settings = this.appStore.resolveSettings(connectionId)
    let password: string | undefined
    let privateKey: string | undefined

    if (connection.credentialId) {
      const cred = this.secretStore.listCredentials().find((c) => c.id === connection.credentialId)
      if (!cred) throw new Error('Credential not found')
      const plaintext = this.secretStore.getPlaintext(connection.credentialId)
      if (cred.kind === 'password') password = plaintext
      else privateKey = plaintext
    }

    const client = new Client()
    const session: ActiveSession = { client, stream: null! }

    await new Promise<void>((resolve, reject) => {
      client
        .on('ready', () => {
          client.shell(
            {
              term: settings.ssh.terminalType,
              cols,
              rows,
            },
            (err, stream) => {
              if (err) {
                reject(err)
                return
              }
              session.stream = stream
              this.sessions.set(sessionId, session)

              stream.on('data', (data: Buffer) => {
                this.emitOutput(sessionId, data.toString('utf8'))
              })
              stream.stderr?.on('data', (data: Buffer) => {
                this.emitOutput(sessionId, data.toString('utf8'))
              })
              stream.on('close', () => {
                this.close(sessionId).catch(() => undefined)
              })
              resolve()
            },
          )
        })
        .on('error', (err) => reject(err))
        .connect({
          host: connection.host,
          port: connection.port || 22,
          username: connection.username,
          password,
          privateKey,
          keepaliveInterval: settings.ssh.keepaliveInterval,
          readyTimeout: 20_000,
        })
    })
  }

  resize(sessionId: string, cols: number, rows: number): void {
    const session = this.sessions.get(sessionId)
    if (!session?.stream) return
    session.stream.setWindow(rows, cols, 0, 0)
  }

  write(sessionId: string, data: string): void {
    const session = this.sessions.get(sessionId)
    session?.stream?.write(data)
  }

  async close(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId)
    if (!session) return
    this.sessions.delete(sessionId)
    try {
      session.stream?.close()
    } catch {
      /* ignore */
    }
    session.client.end()
    this.emitExit(sessionId, 0, null)
  }

  private emitOutput(sessionId: string, data: string): void {
    const win = this.getWindow()
    win?.webContents.send(IPC_SSH_OUTPUT, { sessionId, data })
  }

  private emitExit(sessionId: string, code: number | null, signal: string | null): void {
    const win = this.getWindow()
    win?.webContents.send(IPC_SSH_EXIT, { sessionId, code, signal })
  }
}

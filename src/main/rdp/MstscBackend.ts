import { spawn, type ChildProcess } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import type { RdpBackend, RdpLaunchContext } from '../../shared/backends/RdpBackend'

export class MstscBackend implements RdpBackend {
  readonly name = 'mstsc'
  private readonly processes = new Map<string, { proc: ChildProcess; rdpPath: string }>()

  isSupported(): boolean {
    return process.platform === 'win32'
  }

  async launch(ctx: RdpLaunchContext): Promise<{ message?: string }> {
    if (!this.isSupported()) {
      throw new Error('mstsc.exe is only available on Windows')
    }

    const { connection, settings, password } = ctx
    const lines = [
      `full address:s:${connection.host}:${connection.port || 3389}`,
      `username:s:${connection.username}`,
      'prompt for credentials:i:0',
      'authentication level:i:0',
      `screen mode id:i:${settings.rdp.fullscreen ? 2 : 1}`,
      `desktopwidth:i:${settings.rdp.width}`,
      `desktopheight:i:${settings.rdp.height}`,
      `administrative session:i:${settings.rdp.admin ? 1 : 0}`,
    ]

    if (password) {
      lines.push(`password 51:b:${Buffer.from(password, 'utf16le').toString('hex')}`)
    }

    const rdpPath = path.join(os.tmpdir(), `simpl-${ctx.sessionId}.rdp`)
    await fs.writeFile(rdpPath, lines.join('\r\n'), 'utf8')

    const proc = spawn('mstsc.exe', [rdpPath], {
      detached: false,
      stdio: 'ignore',
      windowsHide: false,
    })

    this.processes.set(ctx.sessionId, { proc, rdpPath })

    proc.on('exit', () => {
      this.cleanup(ctx.sessionId).catch(() => undefined)
    })

    return { message: 'Launched mstsc.exe' }
  }

  async close(sessionId: string): Promise<void> {
    const entry = this.processes.get(sessionId)
    if (!entry) return
    entry.proc.kill()
    await this.cleanup(sessionId)
  }

  private async cleanup(sessionId: string): Promise<void> {
    const entry = this.processes.get(sessionId)
    if (!entry) return
    this.processes.delete(sessionId)
    try {
      await fs.unlink(entry.rdpPath)
    } catch {
      /* temp file may already be gone */
    }
  }
}

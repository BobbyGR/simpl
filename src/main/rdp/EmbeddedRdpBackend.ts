import type { RdpBackend, RdpLaunchContext } from '../../shared/backends/RdpBackend'

export class EmbeddedRdpBackend implements RdpBackend {
  readonly name = 'embedded'

  isSupported(): boolean {
    return false
  }

  async launch(_ctx: RdpLaunchContext): Promise<{ message?: string }> {
    throw new Error('Embedded RDP is not yet supported (planned for P2)')
  }

  async close(_sessionId: string): Promise<void> {
    /* no-op */
  }
}

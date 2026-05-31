import type { Connection, ResolvedConnectionSettings } from '../types'

export interface RdpLaunchContext {
  sessionId: string
  connection: Connection
  password?: string
  settings: ResolvedConnectionSettings
}

export interface RdpBackend {
  readonly name: string
  launch(ctx: RdpLaunchContext): Promise<{ message?: string }>
  close(sessionId: string): Promise<void>
  isSupported(): boolean
}

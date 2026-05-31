export interface SessionBackend {
  readonly kind: string
  open(sessionId: string, ...args: unknown[]): Promise<void>
  close(sessionId: string): Promise<void>
}

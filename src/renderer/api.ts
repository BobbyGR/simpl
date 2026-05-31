import type { IpcInvokeMap } from '../shared/ipc'

export function api() {
  if (!window.sshManager) {
    throw new Error('sshManager API not available — preload may have failed')
  }
  return window.sshManager
}

export async function invoke<K extends keyof IpcInvokeMap>(
  channel: K,
  ...args: Parameters<IpcInvokeMap[K]>
): Promise<Awaited<ReturnType<IpcInvokeMap[K]>>> {
  return api().invoke(channel, ...args) as Promise<Awaited<ReturnType<IpcInvokeMap[K]>>>
}

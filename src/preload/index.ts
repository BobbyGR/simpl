import { contextBridge, ipcRenderer } from 'electron'
import type { IpcEventMap, IpcInvokeMap } from '../shared/ipc'
import {
  IPC_RDP_STATUS,
  IPC_SSH_EXIT,
  IPC_SSH_OUTPUT,
} from '../shared/ipc'

function invoke<K extends keyof IpcInvokeMap>(
  channel: K,
  ...args: Parameters<IpcInvokeMap[K]>
): Promise<ReturnType<IpcInvokeMap[K]>> {
  return ipcRenderer.invoke(channel, ...args) as Promise<ReturnType<IpcInvokeMap[K]>>
}

function onEvent<K extends keyof IpcEventMap>(
  channel: K,
  listener: (_: unknown, payload: IpcEventMap[K]) => void,
): () => void {
  const wrapped = (_event: Electron.IpcRendererEvent, payload: IpcEventMap[K]) => listener(_event, payload)
  ipcRenderer.on(channel, wrapped)
  return () => ipcRenderer.removeListener(channel, wrapped)
}

const api = {
  invoke,
  onSshOutput: (listener: (payload: IpcEventMap[typeof IPC_SSH_OUTPUT]) => void) =>
    onEvent(IPC_SSH_OUTPUT, (_, payload) => listener(payload)),
  onSshExit: (listener: (payload: IpcEventMap[typeof IPC_SSH_EXIT]) => void) =>
    onEvent(IPC_SSH_EXIT, (_, payload) => listener(payload)),
  onRdpStatus: (listener: (payload: IpcEventMap[typeof IPC_RDP_STATUS]) => void) =>
    onEvent(IPC_RDP_STATUS, (_, payload) => listener(payload)),
}

contextBridge.exposeInMainWorld('sshManager', api)

export type SshManagerApi = typeof api

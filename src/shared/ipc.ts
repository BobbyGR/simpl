import type {
  AppData,
  Connection,
  ConnectionSettings,
  Credential,
  ExportBundle,
  Folder,
  ResolvedConnectionSettings,
} from './types'

/** Store */
export const IPC_STORE_GET = 'store:get' as const
export const IPC_STORE_FOLDER_CREATE = 'store:folder:create' as const
export const IPC_STORE_FOLDER_UPDATE = 'store:folder:update' as const
export const IPC_STORE_FOLDER_DELETE = 'store:folder:delete' as const
export const IPC_STORE_CONNECTION_CREATE = 'store:connection:create' as const
export const IPC_STORE_CONNECTION_UPDATE = 'store:connection:update' as const
export const IPC_STORE_CONNECTION_DELETE = 'store:connection:delete' as const
export const IPC_STORE_SEARCH = 'store:search' as const
export const IPC_STORE_TOGGLE_FAVORITE = 'store:connection:toggleFavorite' as const
export const IPC_STORE_EXPORT = 'store:export' as const
export const IPC_STORE_IMPORT = 'store:import' as const
export const IPC_STORE_RESOLVE_SETTINGS = 'store:resolveSettings' as const

/** Secrets */
export const IPC_SECRET_LIST = 'secrets:list' as const
export const IPC_SECRET_CREATE = 'secrets:create' as const
export const IPC_SECRET_UPDATE = 'secrets:update' as const
export const IPC_SECRET_DELETE = 'secrets:delete' as const
export const IPC_SECRET_GET_PLAINTEXT = 'secrets:getPlaintext' as const

/** SSH */
export const IPC_SSH_OPEN = 'ssh:open' as const
export const IPC_SSH_CLOSE = 'ssh:close' as const
export const IPC_SSH_RESIZE = 'ssh:resize' as const
export const IPC_SSH_INPUT = 'ssh:input' as const
export const IPC_SSH_OUTPUT = 'ssh:output' as const
export const IPC_SSH_EXIT = 'ssh:exit' as const

/** RDP */
export const IPC_RDP_LAUNCH = 'rdp:launch' as const
export const IPC_RDP_CLOSE = 'rdp:close' as const
export const IPC_RDP_STATUS = 'rdp:status' as const

export interface SearchResult {
  folders: Folder[]
  connections: Connection[]
}

export interface SshOpenRequest {
  connectionId: string
  cols: number
  rows: number
}

export interface SshOpenResult {
  sessionId: string
}

export interface SshResizeRequest {
  sessionId: string
  cols: number
  rows: number
}

export interface SshInputRequest {
  sessionId: string
  data: string
}

export interface SshOutputEvent {
  sessionId: string
  data: string
}

export interface SshExitEvent {
  sessionId: string
  code: number | null
  signal: string | null
}

export interface RdpLaunchRequest {
  connectionId: string
  backend?: 'mstsc' | 'embedded'
}

export interface RdpLaunchResult {
  sessionId: string
  backend: string
  message?: string
}

export interface RdpStatusEvent {
  sessionId: string
  status: 'launched' | 'exited' | 'error'
  message?: string
}

export interface SecretCreateInput {
  label: string
  kind: Credential['kind']
  plaintext: string
}

export interface SecretUpdateInput {
  id: string
  label?: string
  plaintext?: string
}

export type IpcInvokeMap = {
  [IPC_STORE_GET]: () => AppData
  [IPC_STORE_FOLDER_CREATE]: (input: { name: string; parentId: string | null }) => Folder
  [IPC_STORE_FOLDER_UPDATE]: (input: { id: string; name?: string; parentId?: string | null; settings?: Partial<ConnectionSettings> }) => Folder
  [IPC_STORE_FOLDER_DELETE]: (id: string) => void
  [IPC_STORE_CONNECTION_CREATE]: (input: Omit<Connection, 'id' | 'createdAt' | 'updatedAt'>) => Connection
  [IPC_STORE_CONNECTION_UPDATE]: (input: Partial<Connection> & { id: string }) => Connection
  [IPC_STORE_CONNECTION_DELETE]: (id: string) => void
  [IPC_STORE_SEARCH]: (query: string) => SearchResult
  [IPC_STORE_TOGGLE_FAVORITE]: (id: string) => Connection
  [IPC_STORE_EXPORT]: () => ExportBundle
  [IPC_STORE_IMPORT]: (bundle: ExportBundle) => void
  [IPC_STORE_RESOLVE_SETTINGS]: (connectionId: string) => ResolvedConnectionSettings
  [IPC_SECRET_LIST]: () => Credential[]
  [IPC_SECRET_CREATE]: (input: SecretCreateInput) => Credential
  [IPC_SECRET_UPDATE]: (input: SecretUpdateInput) => Credential
  [IPC_SECRET_DELETE]: (id: string) => void
  [IPC_SECRET_GET_PLAINTEXT]: (id: string) => string
  [IPC_SSH_OPEN]: (req: SshOpenRequest) => SshOpenResult
  [IPC_SSH_CLOSE]: (sessionId: string) => void
  [IPC_SSH_RESIZE]: (req: SshResizeRequest) => void
  [IPC_SSH_INPUT]: (req: SshInputRequest) => void
  [IPC_RDP_LAUNCH]: (req: RdpLaunchRequest) => RdpLaunchResult
  [IPC_RDP_CLOSE]: (sessionId: string) => void
}

export type IpcEventMap = {
  [IPC_SSH_OUTPUT]: SshOutputEvent
  [IPC_SSH_EXIT]: SshExitEvent
  [IPC_RDP_STATUS]: RdpStatusEvent
}

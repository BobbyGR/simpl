export type Protocol = 'ssh' | 'rdp'

export interface Folder {
  id: string
  name: string
  parentId: string | null
  settings?: Partial<ConnectionSettings>
  createdAt: string
  updatedAt: string
}

export interface Connection {
  id: string
  name: string
  protocol: Protocol
  folderId: string | null
  host: string
  port: number
  username: string
  credentialId: string | null
  settings?: Partial<ConnectionSettings>
  favorite?: boolean
  createdAt: string
  updatedAt: string
}

export interface Credential {
  id: string
  label: string
  kind: 'password' | 'privateKey'
  createdAt: string
  updatedAt: string
}

export interface ConnectionSettings {
  ssh?: {
    keepaliveInterval?: number
    terminalType?: string
    fontSize?: number
  }
  rdp?: {
    fullscreen?: boolean
    width?: number
    height?: number
    admin?: boolean
  }
}

export interface ResolvedConnectionSettings {
  ssh: Required<NonNullable<ConnectionSettings['ssh']>>
  rdp: Required<NonNullable<ConnectionSettings['rdp']>>
}

export interface AppData {
  folders: Folder[]
  connections: Connection[]
  credentials: Credential[]
  rootFolderSettings?: Partial<ConnectionSettings>
}

export type SessionKind = 'ssh' | 'rdp'

export interface SessionTab {
  id: string
  kind: SessionKind
  connectionId: string
  title: string
}

export interface ExportBundle {
  version: 1
  exportedAt: string
  folders: Folder[]
  connections: Connection[]
  rootFolderSettings?: Partial<ConnectionSettings>
}

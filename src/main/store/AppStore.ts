import Store from 'electron-store'
import { randomUUID } from 'node:crypto'
import type {
  AppData,
  Connection,
  ConnectionSettings,
  ExportBundle,
  Folder,
  ResolvedConnectionSettings,
} from '../../shared/types'
import { mergeSettings, toResolved } from './defaults'

interface PersistedSchema {
  folders: Folder[]
  connections: Connection[]
  rootFolderSettings?: Partial<ConnectionSettings>
}

export class AppStore {
  private readonly store: Store<PersistedSchema>

  constructor() {
    this.store = new Store<PersistedSchema>({
      name: 'simpl-data',
      defaults: {
        folders: [],
        connections: [],
      },
    })
  }

  getData(): AppData {
    const credentials = [] as AppData['credentials']
    return {
      folders: this.store.get('folders'),
      connections: this.store.get('connections'),
      credentials,
      rootFolderSettings: this.store.get('rootFolderSettings'),
    }
  }

  getFolders(): Folder[] {
    return this.store.get('folders')
  }

  getConnections(): Connection[] {
    return this.store.get('connections')
  }

  getConnection(id: string): Connection | undefined {
    return this.getConnections().find((c) => c.id === id)
  }

  createFolder(name: string, parentId: string | null): Folder {
    const now = new Date().toISOString()
    const folder: Folder = {
      id: randomUUID(),
      name,
      parentId,
      createdAt: now,
      updatedAt: now,
    }
    const folders = [...this.getFolders(), folder]
    this.store.set('folders', folders)
    return folder
  }

  updateFolder(input: {
    id: string
    name?: string
    parentId?: string | null
    settings?: Partial<ConnectionSettings>
  }): Folder {
    const folders = this.getFolders()
    const idx = folders.findIndex((f) => f.id === input.id)
    if (idx < 0) throw new Error(`Folder not found: ${input.id}`)
    const existing = folders[idx]
    if (input.parentId !== undefined && input.parentId === input.id) {
      throw new Error('Folder cannot be its own parent')
    }
    const updated: Folder = {
      ...existing,
      name: input.name ?? existing.name,
      parentId: input.parentId !== undefined ? input.parentId : existing.parentId,
      settings: input.settings !== undefined ? { ...existing.settings, ...input.settings } : existing.settings,
      updatedAt: new Date().toISOString(),
    }
    folders[idx] = updated
    this.store.set('folders', folders)
    return updated
  }

  deleteFolder(id: string): void {
    const toDelete = new Set<string>([id])
    let changed = true
    while (changed) {
      changed = false
      for (const f of this.getFolders()) {
        if (f.parentId && toDelete.has(f.parentId) && !toDelete.has(f.id)) {
          toDelete.add(f.id)
          changed = true
        }
      }
    }
    const folders = this.getFolders().filter((f) => !toDelete.has(f.id))
    const connections = this.getConnections().map((c) =>
      c.folderId && toDelete.has(c.folderId) ? { ...c, folderId: null, updatedAt: new Date().toISOString() } : c,
    )
    this.store.set('folders', folders)
    this.store.set('connections', connections)
  }

  createConnection(input: Omit<Connection, 'id' | 'createdAt' | 'updatedAt'>): Connection {
    const now = new Date().toISOString()
    const connection: Connection = {
      ...input,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
    }
    this.store.set('connections', [...this.getConnections(), connection])
    return connection
  }

  updateConnection(input: Partial<Connection> & { id: string }): Connection {
    const connections = this.getConnections()
    const idx = connections.findIndex((c) => c.id === input.id)
    if (idx < 0) throw new Error(`Connection not found: ${input.id}`)
    const updated: Connection = {
      ...connections[idx],
      ...input,
      id: connections[idx].id,
      updatedAt: new Date().toISOString(),
    }
    connections[idx] = updated
    this.store.set('connections', connections)
    return updated
  }

  deleteConnection(id: string): void {
    this.store.set(
      'connections',
      this.getConnections().filter((c) => c.id !== id),
    )
  }

  toggleFavorite(id: string): Connection {
    const conn = this.getConnection(id)
    if (!conn) throw new Error(`Connection not found: ${id}`)
    return this.updateConnection({ id, favorite: !conn.favorite })
  }

  search(query: string): { folders: Folder[]; connections: Connection[] } {
    const q = query.trim().toLowerCase()
    if (!q) {
      return { folders: this.getFolders(), connections: this.getConnections() }
    }
    return {
      folders: this.getFolders().filter((f) => f.name.toLowerCase().includes(q)),
      connections: this.getConnections().filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.host.toLowerCase().includes(q) ||
          c.username.toLowerCase().includes(q),
      ),
    }
  }

  exportBundle(): ExportBundle {
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      folders: this.getFolders(),
      connections: this.getConnections().map((c) => ({ ...c, credentialId: null })),
      rootFolderSettings: this.store.get('rootFolderSettings'),
    }
  }

  importBundle(bundle: ExportBundle): void {
    if (bundle.version !== 1) throw new Error('Unsupported export version')
    this.store.set('folders', bundle.folders)
    this.store.set('connections', bundle.connections)
    if (bundle.rootFolderSettings) {
      this.store.set('rootFolderSettings', bundle.rootFolderSettings)
    }
  }

  resolveSettings(connectionId: string): ResolvedConnectionSettings {
    const connection = this.getConnection(connectionId)
    if (!connection) throw new Error(`Connection not found: ${connectionId}`)

    let accumulated: ConnectionSettings = {}
    const root = this.store.get('rootFolderSettings')
    if (root) accumulated = mergeSettings(accumulated, root)

    if (connection.folderId) {
      const chain = this.folderAncestorChain(connection.folderId)
      for (const folder of chain) {
        accumulated = mergeSettings(accumulated, folder.settings)
      }
    }

    accumulated = mergeSettings(accumulated, connection.settings)
    return toResolved(accumulated)
  }

  private folderAncestorChain(folderId: string): Folder[] {
    const folders = this.getFolders()
    const byId = new Map(folders.map((f) => [f.id, f]))
    const chain: Folder[] = []
    let current: string | null = folderId
    const seen = new Set<string>()
    while (current) {
      if (seen.has(current)) break
      seen.add(current)
      const folder = byId.get(current)
      if (!folder) break
      chain.unshift(folder)
      current = folder.parentId
    }
    return chain
  }
}

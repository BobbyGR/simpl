import { Spinner, Text } from '@fluentui/react-components'
import { useMemo, useState } from 'react'
import type { Connection, Folder, SessionTab } from '../shared/types'
import { Sidebar } from './components/Sidebar'
import { TabManager, createTabFromConnection } from './components/TabManager'
import { ConnectionEditor } from './components/ConnectionEditor'
import { FolderEditor } from './components/FolderEditor'
import { QuickConnect } from './components/QuickConnect'
import { useAppData } from './hooks/useAppData'
import { invoke } from './api'
import { IPC_STORE_CONNECTION_CREATE } from '../shared/ipc'

export default function App() {
  const { data, loading, error, refresh } = useAppData()
  const [tabs, setTabs] = useState<SessionTab[]>([])
  const [activeTabId, setActiveTabId] = useState<string | null>(null)
  const [sessionIds, setSessionIds] = useState<Record<string, string | null>>({})
  const [connEditorOpen, setConnEditorOpen] = useState(false)
  const [editingConnection, setEditingConnection] = useState<Connection | null>(null)
  const [newConnFolderId, setNewConnFolderId] = useState<string | null>(null)

  const [folderEditorOpen, setFolderEditorOpen] = useState(false)
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null)
  const [newFolderParentId, setNewFolderParentId] = useState<string | null>(null)

  const [quickOpen, setQuickOpen] = useState(false)

  const connectionsById = useMemo(() => {
    const map = new Map<string, Connection>()
    if (data) {
      for (const c of data.connections) map.set(c.id, c)
    }
    return map
  }, [data])

  const openConnection = (connection: Connection) => {
    const tab = createTabFromConnection(connection)
    setTabs((prev) => [...prev, tab])
    setActiveTabId(tab.id)
  }

  const closeTab = (tabId: string) => {
    setTabs((prev) => {
      const next = prev.filter((t) => t.id !== tabId)
      if (activeTabId === tabId) {
        setActiveTabId(next[next.length - 1]?.id ?? null)
      }
      return next
    })
    setSessionIds((prev) => {
      const copy = { ...prev }
      delete copy[tabId]
      return copy
    })
  }

  const handleQuickConnect = async (params: {
    protocol: 'ssh' | 'rdp'
    host: string
    port: number
    username: string
  }) => {
    const saved = await invoke(IPC_STORE_CONNECTION_CREATE, {
      name: `${params.username}@${params.host}`,
      protocol: params.protocol,
      folderId: null,
      host: params.host,
      port: params.port,
      username: params.username,
      credentialId: null,
      favorite: false,
    })
    await refresh()
    openConnection(saved)
  }

  if (error) {
    return (
      <div className="rdp-placeholder">
        <Text>{error}</Text>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="rdp-placeholder">
        <Spinner label="Loading application data…" />
      </div>
    )
  }

  return (
    <div className="app-shell">
      <Sidebar
        data={data}
        loading={loading}
        onRefresh={refresh}
        onConnect={openConnection}
        onEditConnection={(c) => {
          setEditingConnection(c)
          setConnEditorOpen(true)
        }}
        onNewConnection={(folderId) => {
          setEditingConnection(null)
          setNewConnFolderId(folderId)
          setConnEditorOpen(true)
        }}
        onNewFolder={(parentId) => {
          setEditingFolder(null)
          setNewFolderParentId(parentId)
          setFolderEditorOpen(true)
        }}
        onEditFolder={(f) => {
          setEditingFolder(f)
          setFolderEditorOpen(true)
        }}
        onQuickConnect={() => setQuickOpen(true)}
      />

      <main className="main-area">
        <TabManager
          tabs={tabs}
          activeTabId={activeTabId}
          connectionsById={connectionsById}
          sessionIds={sessionIds}
          onSelectTab={setActiveTabId}
          onCloseTab={closeTab}
          onSessionId={(tabId, sessionId) => setSessionIds((prev) => ({ ...prev, [tabId]: sessionId }))}
        />
      </main>

      <ConnectionEditor
        open={connEditorOpen}
        connection={editingConnection}
        folders={data.folders.map((f) => ({ id: f.id, name: f.name }))}
        credentials={data.credentials}
        defaultFolderId={newConnFolderId}
        onClose={() => setConnEditorOpen(false)}
        onSaved={refresh}
      />

      <FolderEditor
        open={folderEditorOpen}
        folder={editingFolder}
        parentId={newFolderParentId}
        onClose={() => setFolderEditorOpen(false)}
        onSaved={refresh}
      />

      <QuickConnect
        open={quickOpen}
        onClose={() => setQuickOpen(false)}
        onConnect={(p) => handleQuickConnect(p).catch(console.error)}
      />
    </div>
  )
}

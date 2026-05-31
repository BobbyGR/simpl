import {
  Button,
  Input,
  Menu,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  Spinner,
  Text,
  Tree,
  TreeItem,
  TreeItemLayout,
} from '@fluentui/react-components'
import {
  ArrowExportRegular,
  ArrowImportRegular,
  DesktopRegular,
  FolderRegular,
  PlugConnectedRegular,
  StarFilled,
} from '@fluentui/react-icons'
import { useMemo, useState } from 'react'
import type { AppData, Connection, Folder } from '../../shared/types'
import { invoke } from '../api'
import {
  IPC_STORE_CONNECTION_DELETE,
  IPC_STORE_EXPORT,
  IPC_STORE_FOLDER_DELETE,
  IPC_STORE_IMPORT,
  IPC_STORE_SEARCH,
  IPC_STORE_TOGGLE_FAVORITE,
} from '../../shared/ipc'

interface SidebarProps {
  data: AppData
  loading: boolean
  onRefresh: () => void
  onConnect: (connection: Connection) => void
  onEditConnection: (connection: Connection) => void
  onNewConnection: (folderId: string | null) => void
  onNewFolder: (parentId: string | null) => void
  onEditFolder: (folder: Folder) => void
  onQuickConnect: () => void
}

interface TreeNode {
  id: string
  kind: 'folder' | 'connection'
  label: string
  folder?: Folder
  connection?: Connection
  children: TreeNode[]
}

function buildTree(data: AppData, filterIds?: { folderIds: Set<string>; connectionIds: Set<string> }): TreeNode[] {
  const folders = filterIds
    ? data.folders.filter((f) => filterIds.folderIds.has(f.id))
    : data.folders
  const connections = filterIds
    ? data.connections.filter((c) => filterIds.connectionIds.has(c.id))
    : data.connections

  const folderNodes = new Map<string, TreeNode>()
  for (const f of folders) {
    folderNodes.set(f.id, { id: f.id, kind: 'folder', label: f.name, folder: f, children: [] })
  }

  const roots: TreeNode[] = []
  for (const f of folders) {
    const node = folderNodes.get(f.id)!
    if (f.parentId && folderNodes.has(f.parentId)) {
      folderNodes.get(f.parentId)!.children.push(node)
    } else {
      roots.push(node)
    }
  }

  for (const c of connections) {
    const node: TreeNode = {
      id: c.id,
      kind: 'connection',
      label: c.name,
      connection: c,
      children: [],
    }
    if (c.folderId && folderNodes.has(c.folderId)) {
      folderNodes.get(c.folderId)!.children.push(node)
    } else {
      roots.push(node)
    }
  }

  const sortNodes = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'folder' ? -1 : 1
      return a.label.localeCompare(b.label)
    })
    nodes.forEach((n) => sortNodes(n.children))
  }
  sortNodes(roots)
  return roots
}

export function Sidebar({
  data,
  loading,
  onRefresh,
  onConnect,
  onEditConnection,
  onNewConnection,
  onNewFolder,
  onEditFolder,
  onQuickConnect,
}: SidebarProps) {
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [filter, setFilter] = useState<{ folderIds: Set<string>; connectionIds: Set<string> } | null>(null)

  const favorites = useMemo(() => data.connections.filter((c) => c.favorite), [data.connections])

  const tree = useMemo(() => buildTree(data, filter ?? undefined), [data, filter])

  const runSearch = async (q: string) => {
    const trimmed = q.trim()
    if (!trimmed) {
      setFilter(null)
      return
    }
    setSearching(true)
    try {
      const result = await invoke(IPC_STORE_SEARCH, trimmed)
      setFilter({
        folderIds: new Set(result.folders.map((f) => f.id)),
        connectionIds: new Set(result.connections.map((c) => c.id)),
      })
    } finally {
      setSearching(false)
    }
  }

  const exportData = async () => {
    const bundle = await invoke(IPC_STORE_EXPORT)
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `simpl-export-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const importData = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      const text = await file.text()
      const bundle = JSON.parse(text)
      await invoke(IPC_STORE_IMPORT, bundle)
      onRefresh()
    }
    input.click()
  }

  const renderNode = (node: TreeNode): React.ReactNode => {
    if (node.kind === 'connection' && node.connection) {
      const c = node.connection
      return (
        <TreeItem key={node.id} itemType="leaf" value={node.id}>
          <TreeItemLayout
            onDoubleClick={() => onConnect(c)}
            actions={
              <Menu>
                <MenuTrigger disableButtonEnhancement>
                  <Button appearance="subtle" size="small">
                    ⋯
                  </Button>
                </MenuTrigger>
                <MenuPopover>
                  <MenuList>
                    <MenuItem onClick={() => onConnect(c)}>Connect</MenuItem>
                    <MenuItem onClick={() => onEditConnection(c)}>Edit</MenuItem>
                    <MenuItem
                      onClick={() =>
                        invoke(IPC_STORE_TOGGLE_FAVORITE, c.id).then(onRefresh).catch(console.error)
                      }
                    >
                      {c.favorite ? 'Unfavorite' : 'Favorite'}
                    </MenuItem>
                    <MenuItem
                      onClick={() =>
                        invoke(IPC_STORE_CONNECTION_DELETE, c.id).then(onRefresh).catch(console.error)
                      }
                    >
                      Delete
                    </MenuItem>
                  </MenuList>
                </MenuPopover>
              </Menu>
            }
          >
            <span className="tree-item">
              {c.protocol === 'ssh' ? <PlugConnectedRegular /> : <DesktopRegular />}
              {c.name}
              {c.favorite && <StarFilled fontSize={14} />}
            </span>
          </TreeItemLayout>
        </TreeItem>
      )
    }

    return (
      <TreeItem key={node.id} itemType={node.children.length ? 'branch' : 'leaf'} value={node.id}>
        <TreeItemLayout
          actions={
            <Menu>
              <MenuTrigger disableButtonEnhancement>
                <Button appearance="subtle" size="small">
                  ⋯
                </Button>
              </MenuTrigger>
              <MenuPopover>
                <MenuList>
                  <MenuItem onClick={() => onNewFolder(node.id)}>New subfolder</MenuItem>
                  <MenuItem onClick={() => onNewConnection(node.id)}>New connection</MenuItem>
                  {node.folder && <MenuItem onClick={() => onEditFolder(node.folder!)}>Rename</MenuItem>}
                  {node.folder && (
                    <MenuItem
                      onClick={() =>
                        invoke(IPC_STORE_FOLDER_DELETE, node.id).then(onRefresh).catch(console.error)
                      }
                    >
                      Delete folder
                    </MenuItem>
                  )}
                </MenuList>
              </MenuPopover>
            </Menu>
          }
        >
          <FolderRegular /> {node.label}
        </TreeItemLayout>
        {node.children.length > 0 && <Tree>{node.children.map(renderNode)}</Tree>}
      </TreeItem>
    )
  }

  return (
    <aside className="sidebar">
      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Text weight="semibold" size={400}>
          SimpL
        </Text>
        <Input
          placeholder="Search…"
          value={query}
          onChange={(_, d) => {
            setQuery(d.value)
            void runSearch(d.value)
          }}
          contentAfter={searching ? <Spinner size="tiny" /> : undefined}
        />
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <Button size="small" appearance="primary" onClick={onQuickConnect}>
            Quick connect
          </Button>
          <Button size="small" onClick={() => onNewConnection(null)}>
            + Connection
          </Button>
          <Button size="small" onClick={() => onNewFolder(null)}>
            + Folder
          </Button>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <Button size="small" icon={<ArrowExportRegular />} onClick={() => exportData().catch(console.error)}>
            Export
          </Button>
          <Button size="small" icon={<ArrowImportRegular />} onClick={importData}>
            Import
          </Button>
        </div>
      </div>

      {favorites.length > 0 && (
        <div style={{ padding: '0 12px 8px' }}>
          <Text size={200} weight="semibold">
            Favorites
          </Text>
          {favorites.map((c) => (
            <Button
              key={c.id}
              appearance="subtle"
              size="small"
              style={{ display: 'flex', width: '100%', justifyContent: 'flex-start', marginTop: 4 }}
              icon={<StarFilled />}
              onClick={() => onConnect(c)}
              onContextMenu={(e) => {
                e.preventDefault()
                onEditConnection(c)
              }}
            >
              {c.name}
            </Button>
          ))}
        </div>
      )}

      <div style={{ flex: 1, overflow: 'auto', padding: '0 8px 12px' }}>
        {loading ? (
          <Spinner label="Loading…" />
        ) : tree.length === 0 ? (
          <Text size={200}>No folders or connections yet.</Text>
        ) : (
          <Tree aria-label="Connections">{tree.map(renderNode)}</Tree>
        )}
      </div>
    </aside>
  )
}

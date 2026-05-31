import { Button, Tab, TabList, Text } from '@fluentui/react-components'
import { DismissRegular } from '@fluentui/react-icons'
import type { Connection, SessionTab } from '../../shared/types'
import { TerminalTab } from '../sessions/TerminalTab'
import { RdpSessionTab } from '../sessions/RdpSessionTab'

interface TabManagerProps {
  tabs: SessionTab[]
  activeTabId: string | null
  connectionsById: Map<string, Connection>
  sessionIds: Record<string, string | null>
  onSelectTab: (id: string) => void
  onCloseTab: (id: string) => void
  onSessionId: (tabId: string, sessionId: string) => void
}

export function TabManager({
  tabs,
  activeTabId,
  connectionsById,
  sessionIds,
  onSelectTab,
  onCloseTab,
  onSessionId,
}: TabManagerProps) {
  if (tabs.length === 0) {
    return (
      <div className="rdp-placeholder">
        <Text>Select a connection from the sidebar or use Quick connect.</Text>
      </div>
    )
  }

  const active = tabs.find((t) => t.id === activeTabId) ?? tabs[0]

  return (
    <>
      <TabList
        selectedValue={active.id}
        onTabSelect={(_, d) => onSelectTab(String(d.value))}
        style={{ padding: '4px 8px 0', flexShrink: 0 }}
      >
        {tabs.map((tab) => (
          <Tab key={tab.id} value={tab.id}>
            {tab.title}
            <Button
              appearance="transparent"
              size="small"
              icon={<DismissRegular />}
              onClick={(e) => {
                e.stopPropagation()
                onCloseTab(tab.id)
              }}
              aria-label="Close tab"
            />
          </Tab>
        ))}
      </TabList>
      <div className="tab-content">
        {tabs.map((tab) => {
          const conn = connectionsById.get(tab.connectionId)
          const hidden = tab.id !== active.id
          if (!conn) return null

          return (
            <div key={tab.id} style={{ display: hidden ? 'none' : 'block', height: '100%' }}>
              {tab.kind === 'ssh' ? (
                <TerminalTab
                  connectionId={tab.connectionId}
                  sessionId={sessionIds[tab.id] ?? null}
                  onSessionId={(sid) => onSessionId(tab.id, sid)}
                  onClose={() => onCloseTab(tab.id)}
                />
              ) : (
                <RdpSessionTab
                  connectionId={tab.connectionId}
                  sessionId={sessionIds[tab.id] ?? null}
                  onSessionId={(sid) => onSessionId(tab.id, sid)}
                />
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}

export function createTabFromConnection(connection: Connection, ephemeral?: boolean): SessionTab {
  return {
    id: crypto.randomUUID(),
    kind: connection.protocol as 'ssh' | 'rdp',
    connectionId: connection.id,
    title: ephemeral ? `${connection.name}*` : connection.name,
  }
}

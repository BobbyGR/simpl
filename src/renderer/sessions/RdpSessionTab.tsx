import { useEffect, useState } from 'react'
import { Text } from '@fluentui/react-components'
import { invoke, api } from '../api'
import { IPC_RDP_CLOSE, IPC_RDP_LAUNCH } from '../../shared/ipc'

interface RdpSessionTabProps {
  connectionId: string
  sessionId: string | null
  onSessionId: (id: string) => void
}

export function RdpSessionTab({ connectionId, sessionId, onSessionId }: RdpSessionTabProps) {
  const [status, setStatus] = useState('Launching Remote Desktop…')
  const [message, setMessage] = useState<string | undefined>()

  useEffect(() => {
    let active = true
    let sid = sessionId

    const launch = async () => {
      if (sid) return
      try {
        const result = await invoke(IPC_RDP_LAUNCH, { connectionId, backend: 'mstsc' })
        if (!active) {
          invoke(IPC_RDP_CLOSE, result.sessionId).catch(() => undefined)
          return
        }
        sid = result.sessionId
        onSessionId(result.sessionId)
        setStatus('Remote Desktop session running')
        setMessage(result.message)
      } catch (err) {
        setStatus('Failed to launch RDP')
        setMessage(err instanceof Error ? err.message : String(err))
      }
    }

    launch()

    const unsub = api().onRdpStatus((ev) => {
      if (sid && ev.sessionId === sid) {
        setStatus(ev.status === 'exited' ? 'Session ended' : ev.status)
        if (ev.message) setMessage(ev.message)
      }
    })

    return () => {
      active = false
      unsub()
      if (sid) invoke(IPC_RDP_CLOSE, sid).catch(() => undefined)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionId])

  return (
    <div className="rdp-placeholder">
      <div>
        <Text size={500} weight="semibold" block>
          {status}
        </Text>
        {message && (
          <Text size={300} block style={{ marginTop: 8 }}>
            {message}
          </Text>
        )}
        <Text size={200} block style={{ marginTop: 16, opacity: 0.7 }}>
          mstsc.exe runs in a separate window. Embedded RDP is planned for P2.
        </Text>
      </div>
    </div>
  )
}

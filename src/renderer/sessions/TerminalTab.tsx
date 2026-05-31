import { useEffect, useRef } from 'react'
import { Terminal } from 'xterm'
import { FitAddon } from '@xterm/addon-fit'
import 'xterm/css/xterm.css'
import { invoke, api } from '../api'
import {
  IPC_SSH_CLOSE,
  IPC_SSH_INPUT,
  IPC_SSH_OPEN,
  IPC_SSH_RESIZE,
} from '../../shared/ipc'

interface TerminalTabProps {
  connectionId: string
  sessionId: string | null
  onSessionId: (id: string) => void
  onClose: () => void
}

export function TerminalTab({ connectionId, sessionId, onSessionId, onClose }: TerminalTabProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<Terminal | null>(null)
  const fitRef = useRef<FitAddon | null>(null)
  const sidRef = useRef<string | null>(sessionId)

  useEffect(() => {
    sidRef.current = sessionId
  }, [sessionId])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Consolas, "Courier New", monospace',
      theme: { background: '#1e1e1e' },
    })
    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    term.open(container)
    fitAddon.fit()
    termRef.current = term
    fitRef.current = fitAddon

    const ro = new ResizeObserver(() => {
      fitAddon.fit()
      const sid = sidRef.current
      if (sid) {
        invoke(IPC_SSH_RESIZE, { sessionId: sid, cols: term.cols, rows: term.rows }).catch(() => undefined)
      }
    })
    ro.observe(container)

    let disposed = false

    const openSession = async () => {
      fitAddon.fit()
      const result = await invoke(IPC_SSH_OPEN, {
        connectionId,
        cols: term.cols,
        rows: term.rows,
      })
      if (disposed) {
        invoke(IPC_SSH_CLOSE, result.sessionId).catch(() => undefined)
        return
      }
      sidRef.current = result.sessionId
      onSessionId(result.sessionId)
    }

    if (!sessionId) {
      openSession().catch((err) => {
        term.writeln(`\r\n\x1b[31mConnection failed: ${err instanceof Error ? err.message : String(err)}\x1b[0m`)
      })
    }

    const unsubOut = api().onSshOutput(({ sessionId: sid, data }) => {
      if (sid === sidRef.current) term.write(data)
    })
    const unsubExit = api().onSshExit(({ sessionId: sid }) => {
      if (sid === sidRef.current) {
        term.writeln('\r\n\x1b[33m[session closed]\x1b[0m')
        onClose()
      }
    })

    term.onData((data) => {
      const sid = sidRef.current
      if (sid) invoke(IPC_SSH_INPUT, { sessionId: sid, data }).catch(() => undefined)
    })

    return () => {
      disposed = true
      ro.disconnect()
      unsubOut()
      unsubExit()
      const sid = sidRef.current
      if (sid) invoke(IPC_SSH_CLOSE, sid).catch(() => undefined)
      term.dispose()
      termRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionId])

  return <div className="terminal-host" ref={containerRef} />
}

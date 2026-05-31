import { Button, Dialog, DialogActions, DialogBody, DialogContent, DialogSurface, DialogTitle, Dropdown, Field, Input, Option } from '@fluentui/react-components'
import { useState } from 'react'
import type { Protocol } from '../../shared/types'

interface QuickConnectProps {
  open: boolean
  onClose: () => void
  onConnect: (params: { protocol: Protocol; host: string; port: number; username: string }) => void
}

export function QuickConnect({ open, onClose, onConnect }: QuickConnectProps) {
  const [protocol, setProtocol] = useState<Protocol>('ssh')
  const [host, setHost] = useState('')
  const [port, setPort] = useState(22)
  const [username, setUsername] = useState('')

  const connect = () => {
    onConnect({ protocol, host, port: port || (protocol === 'ssh' ? 22 : 3389), username })
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(_, d) => !d.open && onClose()}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Quick connect</DialogTitle>
          <DialogContent style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Field label="Protocol">
              <Dropdown
                value={protocol}
                selectedOptions={[protocol]}
                onOptionSelect={(_, d) => {
                  const p = d.optionValue as Protocol
                  setProtocol(p)
                  setPort(p === 'rdp' ? 3389 : 22)
                }}
              >
                <Option value="ssh">SSH</Option>
                <Option value="rdp">RDP</Option>
              </Dropdown>
            </Field>
            <Field label="Host" required>
              <Input value={host} onChange={(_, d) => setHost(d.value)} />
            </Field>
            <Field label="Port">
              <Input type="number" value={String(port)} onChange={(_, d) => setPort(Number(d.value) || 0)} />
            </Field>
            <Field label="Username">
              <Input value={username} onChange={(_, d) => setUsername(d.value)} />
            </Field>
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button appearance="primary" onClick={connect} disabled={!host}>
              Connect
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  )
}

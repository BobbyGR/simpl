import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Dropdown,
  Field,
  Input,
  Option,
  Switch,
} from '@fluentui/react-components'
import { useEffect, useState } from 'react'
import type { Connection, Credential, Protocol } from '../../shared/types'
import { invoke } from '../api'
import {
  IPC_SECRET_CREATE,
  IPC_STORE_CONNECTION_CREATE,
  IPC_STORE_CONNECTION_UPDATE,
} from '../../shared/ipc'

interface ConnectionEditorProps {
  open: boolean
  connection?: Connection | null
  folders: { id: string; name: string }[]
  credentials: Credential[]
  defaultFolderId?: string | null
  onClose: () => void
  onSaved: () => void
}

const defaultForm = {
  name: '',
  protocol: 'ssh' as Protocol,
  host: '',
  port: 22,
  username: '',
  folderId: null as string | null,
  credentialId: null as string | null,
  favorite: false,
  newPassword: '',
  saveNewCredential: false,
  credentialLabel: '',
}

export function ConnectionEditor({
  open,
  connection,
  folders,
  credentials,
  defaultFolderId,
  onClose,
  onSaved,
}: ConnectionEditorProps) {
  const [form, setForm] = useState(defaultForm)

  useEffect(() => {
    if (!open) return
    if (connection) {
      setForm({
        name: connection.name,
        protocol: connection.protocol,
        host: connection.host,
        port: connection.port,
        username: connection.username,
        folderId: connection.folderId,
        credentialId: connection.credentialId,
        favorite: !!connection.favorite,
        newPassword: '',
        saveNewCredential: false,
        credentialLabel: connection.name,
      })
    } else {
      setForm({ ...defaultForm, folderId: defaultFolderId ?? null, port: 22 })
    }
  }, [open, connection, defaultFolderId])

  const save = async () => {
    let credentialId = form.credentialId
    if (form.saveNewCredential && form.newPassword) {
      const cred = await invoke(IPC_SECRET_CREATE, {
        label: form.credentialLabel || form.name,
        kind: 'password',
        plaintext: form.newPassword,
      })
      credentialId = cred.id
    }

    const payload = {
      name: form.name,
      protocol: form.protocol,
      host: form.host,
      port: form.port || (form.protocol === 'ssh' ? 22 : 3389),
      username: form.username,
      folderId: form.folderId,
      credentialId,
      favorite: form.favorite,
    }

    if (connection) {
      await invoke(IPC_STORE_CONNECTION_UPDATE, { id: connection.id, ...payload })
    } else {
      await invoke(IPC_STORE_CONNECTION_CREATE, payload)
    }
    onSaved()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(_, d) => !d.open && onClose()}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>{connection ? 'Edit connection' : 'New connection'}</DialogTitle>
          <DialogContent style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Field label="Name" required>
              <Input value={form.name} onChange={(_, d) => setForm((f) => ({ ...f, name: d.value }))} />
            </Field>
            <Field label="Protocol">
              <Dropdown
                value={form.protocol}
                selectedOptions={[form.protocol]}
                onOptionSelect={(_, d) =>
                  setForm((f) => ({
                    ...f,
                    protocol: d.optionValue as Protocol,
                    port: d.optionValue === 'rdp' ? 3389 : 22,
                  }))
                }
              >
                <Option value="ssh">SSH</Option>
                <Option value="rdp">RDP</Option>
              </Dropdown>
            </Field>
            <Field label="Host" required>
              <Input value={form.host} onChange={(_, d) => setForm((f) => ({ ...f, host: d.value }))} />
            </Field>
            <Field label="Port">
              <Input
                type="number"
                value={String(form.port)}
                onChange={(_, d) => setForm((f) => ({ ...f, port: Number(d.value) || 0 }))}
              />
            </Field>
            <Field label="Username" required>
              <Input value={form.username} onChange={(_, d) => setForm((f) => ({ ...f, username: d.value }))} />
            </Field>
            <Field label="Folder">
              <Dropdown
                placeholder="(root)"
                value={folders.find((x) => x.id === form.folderId)?.name ?? '(root)'}
                selectedOptions={form.folderId ? [form.folderId] : []}
                onOptionSelect={(_, d) =>
                  setForm((f) => ({ ...f, folderId: d.optionValue === '__root__' ? null : d.optionValue ?? null }))
                }
              >
                <Option value="__root__">(root)</Option>
                {folders.map((f) => (
                  <Option key={f.id} value={f.id}>
                    {f.name}
                  </Option>
                ))}
              </Dropdown>
            </Field>
            <Field label="Saved credential">
              <Dropdown
                placeholder="None"
                value={credentials.find((c) => c.id === form.credentialId)?.label ?? 'None'}
                selectedOptions={form.credentialId ? [form.credentialId] : []}
                onOptionSelect={(_, d) =>
                  setForm((f) => ({
                    ...f,
                    credentialId: d.optionValue === '__none__' ? null : d.optionValue ?? null,
                  }))
                }
              >
                <Option value="__none__">None</Option>
                {credentials.map((c) => (
                  <Option key={c.id} value={c.id}>
                    {c.label}
                  </Option>
                ))}
              </Dropdown>
            </Field>
            <Field label="New password (optional)">
              <Input
                type="password"
                value={form.newPassword}
                onChange={(_, d) => setForm((f) => ({ ...f, newPassword: d.value }))}
              />
            </Field>
            <Switch
              label="Save new password as credential"
              checked={form.saveNewCredential}
              onChange={(_, d) => setForm((f) => ({ ...f, saveNewCredential: d.checked }))}
            />
            {form.saveNewCredential && (
              <Field label="Credential label">
                <Input
                  value={form.credentialLabel}
                  onChange={(_, d) => setForm((f) => ({ ...f, credentialLabel: d.value }))}
                />
              </Field>
            )}
            <Switch
              label="Favorite"
              checked={form.favorite}
              onChange={(_, d) => setForm((f) => ({ ...f, favorite: d.checked }))}
            />
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button appearance="primary" onClick={() => save().catch(console.error)} disabled={!form.name || !form.host}>
              Save
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  )
}

import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Field,
  Input,
} from '@fluentui/react-components'
import { useEffect, useState } from 'react'
import type { Folder } from '../../shared/types'
import { invoke } from '../api'
import { IPC_STORE_FOLDER_CREATE, IPC_STORE_FOLDER_UPDATE } from '../../shared/ipc'

interface FolderEditorProps {
  open: boolean
  folder?: Folder | null
  parentId?: string | null
  onClose: () => void
  onSaved: () => void
}

export function FolderEditor({ open, folder, parentId, onClose, onSaved }: FolderEditorProps) {
  const [name, setName] = useState('')

  useEffect(() => {
    if (open) setName(folder?.name ?? '')
  }, [open, folder])

  const save = async () => {
    if (folder) {
      await invoke(IPC_STORE_FOLDER_UPDATE, { id: folder.id, name })
    } else {
      await invoke(IPC_STORE_FOLDER_CREATE, { name, parentId: parentId ?? null })
    }
    onSaved()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(_, d) => !d.open && onClose()}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>{folder ? 'Rename folder' : 'New folder'}</DialogTitle>
          <DialogContent>
            <Field label="Name" required>
              <Input value={name} onChange={(_, d) => setName(d.value)} />
            </Field>
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button appearance="primary" onClick={() => save().catch(console.error)} disabled={!name.trim()}>
              Save
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  )
}

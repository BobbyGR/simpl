import { safeStorage } from 'electron'
import Store from 'electron-store'
import { randomUUID } from 'node:crypto'
import type { Credential } from '../../shared/types'
import type { SecretStore } from '../../shared/backends/SecretStore'

interface SecretsSchema {
  credentials: Credential[]
  blobs: Record<string, string>
}

export class SafeStorageSecretStore implements SecretStore {
  private readonly store: Store<SecretsSchema>

  constructor() {
    this.store = new Store<SecretsSchema>({
      name: 'simpl-secrets',
      defaults: { credentials: [], blobs: {} },
    })
  }

  private ensureEncryptionAvailable(): void {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('OS encryption (DPAPI) is not available on this system')
    }
  }

  listCredentials(): Credential[] {
    return this.store.get('credentials')
  }

  createCredential(label: string, kind: Credential['kind'], plaintext: string): Credential {
    this.ensureEncryptionAvailable()
    const now = new Date().toISOString()
    const credential: Credential = {
      id: randomUUID(),
      label,
      kind,
      createdAt: now,
      updatedAt: now,
    }
    const credentials = [...this.listCredentials(), credential]
    const blobs = { ...this.store.get('blobs') }
    blobs[credential.id] = safeStorage.encryptString(plaintext).toString('base64')
    this.store.set('credentials', credentials)
    this.store.set('blobs', blobs)
    return credential
  }

  updateCredential(id: string, updates: { label?: string; plaintext?: string }): Credential {
    const credentials = this.listCredentials()
    const idx = credentials.findIndex((c) => c.id === id)
    if (idx < 0) throw new Error(`Credential not found: ${id}`)

    const updated: Credential = {
      ...credentials[idx],
      label: updates.label ?? credentials[idx].label,
      updatedAt: new Date().toISOString(),
    }
    credentials[idx] = updated
    this.store.set('credentials', credentials)

    if (updates.plaintext !== undefined) {
      this.ensureEncryptionAvailable()
      const blobs = { ...this.store.get('blobs') }
      blobs[id] = safeStorage.encryptString(updates.plaintext).toString('base64')
      this.store.set('blobs', blobs)
    }

    return updated
  }

  deleteCredential(id: string): void {
    const credentials = this.listCredentials().filter((c) => c.id !== id)
    const blobs = { ...this.store.get('blobs') }
    delete blobs[id]
    this.store.set('credentials', credentials)
    this.store.set('blobs', blobs)
  }

  getPlaintext(id: string): string {
    this.ensureEncryptionAvailable()
    const blobs = this.store.get('blobs')
    const encoded = blobs[id]
    if (!encoded) throw new Error(`Secret not found: ${id}`)
    return safeStorage.decryptString(Buffer.from(encoded, 'base64'))
  }
}

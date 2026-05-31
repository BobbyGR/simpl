import type { Credential } from '../types'

export interface SecretStore {
  listCredentials(): Credential[]
  createCredential(label: string, kind: Credential['kind'], plaintext: string): Credential
  updateCredential(id: string, updates: { label?: string; plaintext?: string }): Credential
  deleteCredential(id: string): void
  getPlaintext(id: string): string
}

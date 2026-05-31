import type { SshManagerApi } from './index'

declare global {
  interface Window {
    sshManager: SshManagerApi
  }
}

export {}

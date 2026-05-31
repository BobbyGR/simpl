import type { SshManagerApi } from '../preload/index'

declare global {
  interface Window {
    sshManager: SshManagerApi
  }
}

export {}

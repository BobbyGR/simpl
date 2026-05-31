import type { ConnectionSettings, ResolvedConnectionSettings } from '../../shared/types'

export const DEFAULT_SETTINGS: ResolvedConnectionSettings = {
  ssh: {
    keepaliveInterval: 30_000,
    terminalType: 'xterm-256color',
    fontSize: 14,
  },
  rdp: {
    fullscreen: false,
    width: 1920,
    height: 1080,
    admin: false,
  },
}

export function mergeSettings(
  base: ConnectionSettings | undefined,
  overlay: Partial<ConnectionSettings> | undefined,
): ConnectionSettings {
  return {
    ssh: { ...base?.ssh, ...overlay?.ssh },
    rdp: { ...base?.rdp, ...overlay?.rdp },
  }
}

export function toResolved(partial: ConnectionSettings | undefined): ResolvedConnectionSettings {
  const merged = mergeSettings(DEFAULT_SETTINGS, partial)
  return {
    ssh: { ...DEFAULT_SETTINGS.ssh, ...merged.ssh },
    rdp: { ...DEFAULT_SETTINGS.rdp, ...merged.rdp },
  }
}

import { useCallback, useEffect, useState } from 'react'
import type { AppData } from '../../shared/types'
import { invoke } from '../api'
import { IPC_STORE_GET } from '../../shared/ipc'

export function useAppData() {
  const [data, setData] = useState<AppData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      setError(null)
      const next = await invoke(IPC_STORE_GET)
      setData(next)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { data, loading, error, refresh, setData }
}

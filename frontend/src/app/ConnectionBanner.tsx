import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useSyncExternalStore } from 'react'
import { api, connection } from '../api/client'
import styles from './ConnectionBanner.module.css'

const RETRY_MS = 2000

/** Shown while the backend can't be reached; checks again by itself (UI-5). */
export function ConnectionBanner() {
  const online = useSyncExternalStore(connection.subscribe, connection.isOnline)
  const queryClient = useQueryClient()

  useEffect(() => {
    if (online) return
    const timer = setInterval(async () => {
      try {
        const { response } = await api.GET('/api/health')
        if (response.ok) {
          clearInterval(timer)
          await queryClient.invalidateQueries()
        }
      } catch {
        // Still down; try again on the next tick.
      }
    }, RETRY_MS)
    return () => clearInterval(timer)
  }, [online, queryClient])

  if (online) return null
  return (
    <div className={styles.banner} role="alert">
      서버에 연결할 수 없어요. 터미널에서 npm run dev가 실행 중인지 확인해 주세요.
    </div>
  )
}

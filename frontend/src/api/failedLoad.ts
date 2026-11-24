import { isOffline } from './client'

type Load = { data: unknown; error: unknown; refetch: () => unknown }

/** How to try again when something a screen needs couldn't be loaded (UI-5), or
 * nothing. While the backend is down the banner says so and the page retries by itself. */
export function failedLoad(...loads: Load[]): (() => void) | undefined {
  const failed = loads.filter((load) => load.data === undefined && load.error && !isOffline(load.error))
  return failed.length > 0 ? () => failed.forEach((load) => load.refetch()) : undefined
}

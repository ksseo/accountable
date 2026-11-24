import createClient from 'openapi-fetch'
import type { components, paths } from './schema'

export type Schemas = components['schemas']

/** One error shape for every failed call. `fields` maps a field name to its error type. */
export class ApiError extends Error {
  readonly status: number
  readonly fields: Record<string, string>

  constructor(status: number, message: string, fields: Record<string, string> = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fields = fields
  }

  get offline(): boolean {
    return this.status === 0
  }
}

/** Whether a call failed because the backend can't be reached. */
export const isOffline = (error: unknown): boolean => error instanceof ApiError && error.offline

// Whether the backend can be reached (UI-5). Every call updates it.
let online = true
const listeners = new Set<() => void>()

export const connection = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  isOnline: (): boolean => online,
  set(value: boolean): void {
    if (online === value) return
    online = value
    listeners.forEach((listener) => listener())
  },
}

async function trackedFetch(request: Request): Promise<Response> {
  let response: Response
  try {
    response = await fetch(request)
  } catch {
    connection.set(false)
    throw new ApiError(0, 'offline')
  }
  // Vite's proxy answers 503 with this marker when the backend is down.
  if (response.status === 503 && response.headers.get('X-Accountable-Offline')) {
    connection.set(false)
    throw new ApiError(0, 'offline')
  }
  connection.set(true)
  return response
}

export const api = createClient<paths>({
  baseUrl: globalThis.location?.origin ?? 'http://127.0.0.1',
  fetch: trackedFetch,
})

type FetchResult<T> = { data?: T; error?: unknown; response: Response }

/** The data of a call, or an ApiError with the fields FastAPI named in a 422. */
export async function unwrap<T>(call: Promise<FetchResult<T>>): Promise<T> {
  const { data, error, response } = await call
  if (response.ok) return data as T
  const fields: Record<string, string> = {}
  let message = `HTTP ${response.status}`
  const detail = (error as { detail?: unknown } | undefined)?.detail
  if (Array.isArray(detail)) {
    for (const item of detail as { loc?: unknown[]; type?: string; msg?: string }[]) {
      const loc = item.loc ?? []
      const field = String(loc[loc.length - 1] ?? '')
      if (field) fields[field] = item.type ?? 'value_error'
      message = item.msg ?? message
    }
  } else if (typeof detail === 'string') {
    message = detail
  }
  throw new ApiError(response.status, message, fields)
}

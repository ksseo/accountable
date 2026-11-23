// Short messages after saving, deleting and moving (UI-4).
export type ToastItem = { id: number; message: string; tone: 'info' | 'error' }

let items: ToastItem[] = []
let nextId = 1
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((listener) => listener())

export const TOAST_MS = 4000

export const toasts = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  list: (): ToastItem[] => items,
  dismiss(id: number): void {
    items = items.filter((item) => item.id !== id)
    emit()
  },
}

export function toast(message: string, tone: ToastItem['tone'] = 'info'): void {
  const id = nextId++
  items = [...items.slice(-2), { id, message, tone }]
  emit()
  setTimeout(() => toasts.dismiss(id), TOAST_MS)
}

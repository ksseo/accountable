// Light or dark mode (UI-9). index.html puts the kept choice on <html> before
// anything is drawn, and the colors follow from there (tokens.css).

const root = document.documentElement
const KEY = 'accountable.mode'
const listeners = new Set<() => void>()

function keep(value: 'light' | 'dark'): void {
  try {
    localStorage.setItem(KEY, value)
  } catch {
    // The browser won't keep it, so it lasts until the page is reloaded.
  }
}

export const mode = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  isDark: (): boolean => root.dataset.mode === 'dark',
  setDark(isDark: boolean): void {
    if (isDark) root.dataset.mode = 'dark'
    else delete root.dataset.mode
    keep(isDark ? 'dark' : 'light')
    listeners.forEach((listener) => listener())
  },
}

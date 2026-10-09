import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'system' | 'light' | 'dark'

export interface Preferences {
  schemaVersion: 1
  currency: string
  defaultTipBps: number
  lastInputMethod: 'scan' | 'manual'
  recentNames: string[]
  payHandles: { venmo?: string; cashtag?: string }
  theme: Theme
  hintsSeen: string[]
  shareTarget: 'public' | 'local'
}

interface PrefsActions {
  set: (patch: Partial<Preferences>) => void
  rememberNames: (names: string[]) => void
  dismissHint: (id: string) => void
}

const defaults: Preferences = {
  schemaVersion: 1,
  currency: 'USD',
  defaultTipBps: 2000,
  lastInputMethod: 'manual',
  recentNames: [],
  payHandles: {},
  theme: 'system',
  hintsSeen: [],
  shareTarget: 'public',
}

export const usePrefs = create<Preferences & PrefsActions>()(
  persist(
    (set) => ({
      ...defaults,
      set: (patch) => set(patch),
      rememberNames: (names) =>
        set((s) => {
          const fresh = names.map((n) => n.trim()).filter(Boolean)
          const lower = new Set(fresh.map((n) => n.toLowerCase()))
          const rest = s.recentNames.filter((n) => !lower.has(n.toLowerCase()))
          return { recentNames: [...fresh, ...rest].slice(0, 20) }
        }),
      dismissHint: (id) =>
        set((s) => (s.hintsSeen.includes(id) ? s : { hintsSeen: [...s.hintsSeen, id] })),
    }),
    {
      name: 'tabby:prefs',
      version: 1,
      // Unknown or corrupt fields fall back to defaults rather than crashing.
      merge: (persisted, current) => ({ ...current, ...(persisted as Partial<Preferences>) }),
    },
  ),
)

export function applyTheme(theme: Theme) {
  const dark =
    theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
}

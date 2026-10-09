import type { SplitMode } from '../lib/split'
import { create } from 'zustand'

export const STEPS = ['receipt', 'people', 'assign', 'tip', 'summary'] as const
export type Step = (typeof STEPS)[number]
export type SheetName = 'menu' | 'currency' | 'history' | 'settings' | 'about' | 'share' | null

interface UiState {
  step: Step
  sheet: SheetName
  /** Receipt step: show the item editor instead of the input-method cards. */
  editingItems: boolean
  splitMode: SplitMode
  setStep: (step: Step) => void
  openSheet: (sheet: SheetName) => void
  setEditingItems: (on: boolean) => void
  setSplitMode: (mode: SplitMode) => void
}

export const useUi = create<UiState>()((set) => ({
  step: 'receipt',
  sheet: null,
  editingItems: false,
  splitMode: 'fair',
  setStep: (step) => {
    set({ step })
    window.scrollTo({ top: 0 })
  },
  openSheet: (sheet) => set({ sheet }),
  setEditingItems: (editingItems) => set({ editingItems }),
  setSplitMode: (splitMode) => set({ splitMode }),
}))

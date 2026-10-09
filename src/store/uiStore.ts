import type { SplitMode } from '../lib/split'
import { create } from 'zustand'

export const STEPS = ['receipt', 'people', 'assign', 'tip', 'summary'] as const
export type Step = (typeof STEPS)[number]
export type SheetName = 'menu' | 'currency' | 'history' | 'settings' | 'about' | 'share' | null

export interface ScanRequest {
  source: Blob | HTMLCanvasElement
  /** 'items' reads the whole receipt; 'total' only needs the total (Quick Split). */
  purpose: 'items' | 'total'
}

interface UiState {
  step: Step
  sheet: SheetName
  /** Receipt step: show the item editor instead of the input-method cards. */
  editingItems: boolean
  splitMode: SplitMode
  scan: (ScanRequest & { id: number }) | null
  setStep: (step: Step) => void
  openSheet: (sheet: SheetName) => void
  setEditingItems: (on: boolean) => void
  setSplitMode: (mode: SplitMode) => void
  startScan: (scan: ScanRequest) => void
  endScan: () => void
}

export const useUi = create<UiState>()((set) => ({
  step: 'receipt',
  sheet: null,
  editingItems: false,
  splitMode: 'fair',
  scan: null,
  setStep: (step) => {
    set({ step })
    window.scrollTo({ top: 0 })
  },
  openSheet: (sheet) => set({ sheet }),
  setEditingItems: (editingItems) => set({ editingItems }),
  setSplitMode: (splitMode) => set({ splitMode }),
  startScan: (scan) => set({ scan: { ...scan, id: Date.now() } }),
  endScan: () => set({ scan: null }),
}))

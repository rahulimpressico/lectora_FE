import { create } from 'zustand'
import type { AliaAction, AliaHistoryTurn, AliaVoiceState } from '../types/alia'

interface AliaStoreState {
  isOpen: boolean
  voiceState: AliaVoiceState
  lastTranscript: string        // what the user said
  lastResponse: string          // what Alia said back
  pendingAction: AliaAction | null  // waiting for confirm (destructive only)
  history: AliaHistoryTurn[]    // last N turns for context
  errorMessage: string | null
  /** Section Alia last acted on — used to resolve follow-ups like "now add examples". */
  focusedSectionId: string | null
  /** When true, Alia auto-listens again after finishing a response. */
  continuousMode: boolean

  open: () => void
  close: () => void
  setVoiceState: (state: AliaVoiceState) => void
  setTranscript: (text: string) => void
  setResponse: (text: string, action?: AliaAction | null) => void
  setPendingAction: (action: AliaAction | null) => void
  confirmPending: () => AliaAction | null
  cancelPending: () => void
  setError: (msg: string | null) => void
  addToHistory: (role: 'user' | 'alia', text: string) => void
  setFocusedSection: (id: string | null) => void
  toggleContinuousMode: () => void
  reset: () => void
}

const MAX_HISTORY = 8

export const useAliaStore = create<AliaStoreState>()((set, get) => ({
  isOpen: false,
  voiceState: 'idle',
  lastTranscript: '',
  lastResponse: '',
  pendingAction: null,
  history: [],
  errorMessage: null,
  focusedSectionId: null,
  continuousMode: false,

  open: () => set({ isOpen: true, voiceState: 'idle', errorMessage: null }),

  close: () => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()
    set({ isOpen: false, voiceState: 'idle', pendingAction: null, errorMessage: null })
  },

  setVoiceState: (state) => set({ voiceState: state, errorMessage: state === 'error' ? get().errorMessage : null }),

  setTranscript: (text) => set({ lastTranscript: text }),

  setResponse: (text, action) => set({
    lastResponse: text,
    pendingAction: action !== undefined ? action : get().pendingAction,
  }),

  setPendingAction: (action) => set({ pendingAction: action }),

  confirmPending: () => {
    const action = get().pendingAction
    set({ pendingAction: null })
    return action
  },

  cancelPending: () => set({ pendingAction: null, voiceState: 'idle' }),

  setError: (msg) => set({ errorMessage: msg, voiceState: msg ? 'error' : 'idle' }),

  addToHistory: (role, text) => set((s) => ({
    history: [...s.history, { role, text }].slice(-MAX_HISTORY),
  })),

  setFocusedSection: (id) => set({ focusedSectionId: id }),

  toggleContinuousMode: () => set((s) => ({ continuousMode: !s.continuousMode })),

  reset: () => set({
    voiceState: 'idle',
    lastTranscript: '',
    lastResponse: '',
    pendingAction: null,
    errorMessage: null,
  }),
}))

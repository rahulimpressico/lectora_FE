/**
 * settingsStore — persisted UI preference store.
 *
 * All values are saved to localStorage under the key `lactora-settings` and
 * survive page reloads.  Side-effects (DOM class toggling, etc.) are applied
 * by `useSettingsEffect` in AppLayout — not here.
 */
import { create } from 'zustand'
import { persist, devtools } from 'zustand/middleware'

export type Theme = 'light' | 'dark' | 'system'
export type OutputFormat = 'docx' | 'pdf' | 'html'

interface SettingsState {
  // ── Appearance ────────────────────────────────────────────────────
  theme: Theme

  // ── Editor ────────────────────────────────────────────────────────
  animations: boolean
  autoSave: boolean
  compactMode: boolean

  // ── Output ────────────────────────────────────────────────────────
  outputFormat: OutputFormat

  // ── Actions ───────────────────────────────────────────────────────
  setTheme: (t: Theme) => void
  setAnimations: (v: boolean) => void
  setAutoSave: (v: boolean) => void
  setCompactMode: (v: boolean) => void
  setOutputFormat: (f: OutputFormat) => void
}

export const useSettingsStore = create<SettingsState>()(
  devtools(
    persist(
      (set) => ({
        // Defaults
        theme: 'light',
        animations: true,
        autoSave: true,
        compactMode: false,
        outputFormat: 'docx',

        // Setters
        setTheme:        (theme)        => set({ theme },        false, 'settings/setTheme'),
        setAnimations:   (animations)   => set({ animations },   false, 'settings/setAnimations'),
        setAutoSave:     (autoSave)     => set({ autoSave },     false, 'settings/setAutoSave'),
        setCompactMode:  (compactMode)  => set({ compactMode },  false, 'settings/setCompactMode'),
        setOutputFormat: (outputFormat) => set({ outputFormat }, false, 'settings/setOutputFormat'),
      }),
      { name: 'lactora-settings' },
    ),
    { name: 'SettingsStore' },
  ),
)

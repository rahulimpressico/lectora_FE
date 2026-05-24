import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useCourseStore } from '@/modules/course-generation/store/courseStore'
import { useSettingsStore } from '@/store/settingsStore'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { SettingsPanel } from './panels/SettingsPanel'
import { HelpPanel } from './panels/HelpPanel'

// ─── Apply settings as DOM side-effects ──────────────────────────────────────

function useSettingsEffect() {
  const { theme, animations, compactMode } = useSettingsStore()

  // Theme → html class
  useEffect(() => {
    const html = document.documentElement
    html.classList.remove('dark', 'light')
    if (theme === 'dark') {
      html.classList.add('dark')
    } else if (theme === 'light') {
      html.classList.add('light')
    }
    // 'system' — no class; CSS @media prefers-color-scheme handles it
  }, [theme])

  // Compact mode → html class
  useEffect(() => {
    document.documentElement.classList.toggle('compact', compactMode)
  }, [compactMode])

  // Animations → html class (CSS kills all transition/animation durations)
  useEffect(() => {
    document.documentElement.classList.toggle('no-animations', !animations)
  }, [animations])
}

// ─── Main layout ──────────────────────────────────────────────────────────────

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)

  const location = useLocation()
  const phase = useCourseStore((s: { phase: string }) => s.phase)
  const { animations } = useSettingsStore()

  const isPipelinePage = location.pathname === '/generate' && phase === 'pipeline'

  // Apply all settings side-effects to the DOM
  useSettingsEffect()

  const pageVariants = {
    initial: { opacity: 0, y: animations ? 10 : 0 },
    animate: { opacity: 1, y: 0 },
    exit:    { opacity: 0, y: animations ? -6 : 0 },
  }
  const pageTransition = {
    duration: animations ? 0.22 : 0,
    ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#f4f6f9]">
      <div className="shrink-0">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onSettingsClick={() => setSettingsOpen((v) => !v)}
          onHelpClick={() => setHelpOpen((v) => !v)}
          isSettingsOpen={settingsOpen}
          isHelpOpen={helpOpen}
        />
      </div>

      <div
        className={`relative flex min-w-0 flex-1 flex-col overflow-hidden ${isPipelinePage ? 'bg-transparent' : ''}`}
      >
        <TopBar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex flex-1 flex-col min-h-0 overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={pageTransition}
              className="flex h-full min-h-0 flex-1 flex-col overflow-hidden"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Global slide-over panels — rendered at layout root */}
      <SettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <HelpPanel     isOpen={helpOpen}     onClose={() => setHelpOpen(false)}     />
    </div>
  )
}

import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useCourseStore } from '@/features/course-generation/store/courseStore'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -6 },
}

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const phase = useCourseStore((s) => s.phase)
  const isPipelinePage =
    location.pathname === '/generate' && phase === 'pipeline'

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#f4f6f9]">
      <div className="shrink-0">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
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
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="flex h-full min-h-0 flex-1 flex-col overflow-hidden"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}

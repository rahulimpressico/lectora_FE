import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

export function AppLayout() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#f4f6f9]">
      <Sidebar />
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <TopBar />
        <main className="flex flex-1 flex-col min-h-0 overflow-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

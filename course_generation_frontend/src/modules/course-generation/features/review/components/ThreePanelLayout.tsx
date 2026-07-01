import { GripVertical } from 'lucide-react'
import { Group, Panel, Separator } from 'react-resizable-panels'

interface ThreePanelLayoutProps {
  left: React.ReactNode
  middle: React.ReactNode
  right: React.ReactNode
}

function ResizeHandle() {
  return (
    <Separator className="group relative flex w-1.5 shrink-0 items-center justify-center select-none z-20 bg-slate-150 hover:bg-indigo-100 data-[dragging]:bg-indigo-200 transition-colors duration-100">
      <div className="flex h-8 w-4 items-center justify-center rounded-full bg-slate-200 text-slate-400 opacity-0 group-hover:opacity-100 group-data-[dragging]:bg-indigo-500 group-data-[dragging]:text-white group-data-[dragging]:shadow-md group-data-[dragging]:opacity-100 transition-all">
        <GripVertical size={10} />
      </div>
    </Separator>
  )
}

export function ThreePanelLayout({ left, middle, right }: ThreePanelLayoutProps) {
  return (
    <Group orientation="horizontal" className="h-full w-full">
      <Panel defaultSize={28} minSize={16} className="flex flex-col min-w-0 overflow-hidden border-r border-slate-200">
        {left}
      </Panel>
      <ResizeHandle />
      <Panel defaultSize={38} minSize={16} className="flex flex-col min-w-0 overflow-hidden border-r border-slate-200">
        {middle}
      </Panel>
      <ResizeHandle />
      <Panel defaultSize={34} minSize={16} className="flex flex-col min-w-0 overflow-hidden">
        {right}
      </Panel>
    </Group>
  )
}

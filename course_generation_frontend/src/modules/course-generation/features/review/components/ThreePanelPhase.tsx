import { ThreePanelLayout } from './ThreePanelLayout'
import { DocViewerPanel } from './DocViewerPanel'
import { TOPanel } from './TOPanel'
import { RulesPanel } from './RulesPanel'
import { ThreePanelHeader } from './ThreePanelHeader'
import { GenerateCourseBanner } from './GenerateCourseBanner'
import { useLoadTrainingOutline } from '../hooks/useLoadTrainingOutline'

export const ThreePanelPhase = () => {
  const { loading, error } = useLoadTrainingOutline()

  return (
    <div className="flex flex-col h-full min-h-0">
      <ThreePanelHeader />
      <div className="flex-1 min-h-0 overflow-hidden">
        <ThreePanelLayout
          left={<DocViewerPanel />}
          middle={<TOPanel loading={loading} loadError={error} />}
          right={<RulesPanel loading={loading} loadError={error} />}
        />
      </div>
      <GenerateCourseBanner />
    </div>
  )
}

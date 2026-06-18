import { useEffect } from 'react'
import { useBlocker } from 'react-router-dom'
import { ConfirmLeaveModal } from '@/shared/components/ConfirmLeaveModal'
import { UploadPhase } from '../to_rules_generation_view/components/UploadPhase'
import { TOSummaryPhase } from '../to_rules_edit_card_view/components/TOSummaryPhase'
import { ThreePanelPhase } from '../to_rules_edit_card_view/components/ThreePanelPhase'
import { DocPreviewModal } from '../to_rules_generation_view/components/DocPreviewModal'
import { PipelineView } from '../course_generation/components/PipelineView'
import { CourseEditorView } from '../course_generation/components/CourseEditorView'
import { WelcomeScreen } from '../components/wizard/WelcomeScreen'
import { WizardLayout } from '../components/wizard/WizardLayout'
import { CourseBasicsStep } from '../components/wizard/steps/CourseBasicsStep'
import { AudienceStep } from '../components/wizard/steps/AudienceStep'
import { SourceMaterialStep } from '../components/wizard/steps/SourceMaterialStep'
import { LearningObjectivesStep } from '../components/wizard/steps/LearningObjectivesStep'
import { CourseDirectionStep } from '../components/wizard/steps/CourseDirectionStep'
import { OutlinePreferenceStep } from '../components/wizard/steps/OutlinePreferenceStep'
import { OutlineReviewStep } from '../components/wizard/steps/OutlineReviewStep'
import { useCourseStore } from '../store/courseStore'
import { usePipelineStore } from '../store/pipelineStore'
import { useEditorStore } from '../store/editorStore'

const WIZARD_PHASES = new Set([
  'wizard-basics',
  'wizard-audience',
  'wizard-materials',
  'wizard-objectives',
  'wizard-direction',
  'wizard-outline-pref',
  'wizard-outline-review',
])

export const CourseGenerationPage = () => {
  const { phase, activeJobId, activeTOJobId } = useCourseStore()
  const { clearPipeline } = usePipelineStore()
  const { resetEditor } = useEditorStore()

  // Wizard & welcome phases auto-save via Zustand persist — never block navigation there.
  // Only block once real work exists: after TO generation, in three-panel, pipeline, or editor.
  const isOnboardingPhase = phase === 'welcome' || WIZARD_PHASES.has(phase)
  const hasProgress = !isOnboardingPhase || !!activeTOJobId
  const blocker = useBlocker(hasProgress)

  useEffect(() => {
    if (!hasProgress) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [hasProgress])

  const handleBackFromPipeline = () => {
    clearPipeline()
    useCourseStore.getState().setActiveJobId(null)
    useCourseStore.getState().setPhase('three-panel')
  }

  const handleBackFromEditor = () => {
    resetEditor()
    useCourseStore.getState().setActiveJobId(null)
    useCourseStore.getState().setPhase('three-panel')
  }

  if (phase === 'pipeline') {
    if (!activeJobId) {
      handleBackFromPipeline()
      return null
    }
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <PipelineView jobId={activeJobId} />
      </div>
    )
  }

  if (phase === 'course-editor') {
    if (!activeJobId) {
      handleBackFromEditor()
      return null
    }
    return <CourseEditorView jobId={activeJobId} />
  }

  // Welcome screen — full-viewport, no wrapper
  if (phase === 'welcome') {
    return <WelcomeScreen />
  }

  // Wizard steps — wrapped in WizardLayout with step progress bar
  if (WIZARD_PHASES.has(phase)) {
    return (
      <WizardLayout>
        {phase === 'wizard-basics'         && <CourseBasicsStep />}
        {phase === 'wizard-audience'       && <AudienceStep />}
        {phase === 'wizard-materials'      && <SourceMaterialStep />}
        {phase === 'wizard-objectives'     && <LearningObjectivesStep />}
        {phase === 'wizard-direction'      && <CourseDirectionStep />}
        {phase === 'wizard-outline-pref'   && <OutlinePreferenceStep />}
        {phase === 'wizard-outline-review' && <OutlineReviewStep />}
      </WizardLayout>
    )
  }

  return (
    <>
      {phase === 'upload' && <UploadPhase />}
      {phase === 'to-summary' && <TOSummaryPhase />}
      {phase === 'three-panel' && <ThreePanelPhase />}
      <DocPreviewModal />

      <ConfirmLeaveModal
        open={blocker.state === 'blocked'}
        title="Leave course generation?"
        message="You have unsaved progress. Leaving this page will discard your uploaded files, Training Outline, and any edits. This cannot be undone."
        confirmLabel="Leave page"
        cancelLabel="Stay"
        onConfirm={() => blocker.proceed?.()}
        onCancel={() => blocker.reset?.()}
      />
    </>
  )
}

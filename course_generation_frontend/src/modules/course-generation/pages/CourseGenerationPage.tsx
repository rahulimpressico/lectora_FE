import { useEffect } from 'react'
import { useBlocker } from 'react-router-dom'
import { ConfirmLeaveModal } from '@/shared/components/ConfirmLeaveModal'
import { UploadPhase } from '../features/upload/components/UploadPhase'
import { ThreePanelPhase } from '../features/review/components/ThreePanelPhase'
import { DocPreviewModal } from '../features/upload/components/DocPreviewModal'
import { PipelineView } from '../features/pipeline/components/PipelineView'
import { CourseEditorView } from '../features/pipeline/components/CourseEditorView'
import { WelcomeScreen } from '../features/onboarding/components/WelcomeScreen'
import { WizardLayout } from '../features/onboarding/components/WizardLayout'
import { CourseBasicsStep } from '../features/onboarding/components/steps/CourseBasicsStep'
import { RequiredTopicsStep } from '../features/onboarding/components/steps/RequiredTopicsStep'
import { AudienceStep } from '../features/onboarding/components/steps/AudienceStep'
import { SourceMaterialStep } from '../features/onboarding/components/steps/SourceMaterialStep'
import { LearningObjectivesStep } from '../features/onboarding/components/steps/LearningObjectivesStep'
import { CourseDirectionStep } from '../features/onboarding/components/steps/CourseDirectionStep'
import { OutlinePreferenceStep } from '../features/onboarding/components/steps/OutlinePreferenceStep'
import { OutlineReviewStep } from '../features/onboarding/components/steps/OutlineReviewStep'
import { useCourseStore } from '../store/courseStore'
import { usePipelineStore } from '../store/pipelineStore'
import { useEditorStore } from '../store/editorStore'
import { useBrowserHistory } from '../store/useBrowserHistory'

const WIZARD_PHASES = new Set([
  'wizard-basics',
  'wizard-required-topics',
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

  // Keeps browser Back / Forward in sync with in-app phase navigation.
  useBrowserHistory()

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
        {phase === 'wizard-basics'           && <CourseBasicsStep />}
        {phase === 'wizard-required-topics'  && <RequiredTopicsStep />}
        {phase === 'wizard-audience'         && <AudienceStep />}
        {phase === 'wizard-materials'        && <SourceMaterialStep />}
        {phase === 'wizard-objectives'       && <LearningObjectivesStep />}
        {phase === 'wizard-direction'        && <CourseDirectionStep />}
        {phase === 'wizard-outline-pref'     && <OutlinePreferenceStep />}
        {phase === 'wizard-outline-review'   && <OutlineReviewStep />}
      </WizardLayout>
    )
  }

  return (
    <>
      {phase === 'upload' && <UploadPhase />}
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

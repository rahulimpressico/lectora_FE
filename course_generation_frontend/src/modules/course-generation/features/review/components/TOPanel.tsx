import { useState } from 'react'
import { AlertCircle, BookOpen, CheckCircle2, Download, Loader2, RefreshCw, Wand2 } from 'lucide-react'
import { JsonEditorPanel } from './JsonEditorPanel'
import { ReviseOutlineModal } from './ReviseOutlineModal'
import { useAutoSaveTO } from '../hooks/useAutoSaveTO'
import { useCourseStore } from '../../../store/courseStore'
import { exportTrainingOutlineToDocx } from '../../../utils/exportTrainingOutline'
import { cn } from '@/lib/cn'
import type { JsonValue } from '../../../types'

interface TOPanelProps {
  loading?: boolean
  loadError?: string | null
}

export function TOPanel({ loading = false, loadError = null }: TOPanelProps) {
  const {
    toData,
    toOriginal,
    modifiedTOPaths,
    updateTOField,
    resetTOField,
    setTOData,
    courseTitle,
    audience,
    difficultyLevel,
    durationHours,
    wizardData,
  } = useCourseStore()

  const [downloading, setDownloading] = useState(false)
  const [showReviseModal, setShowReviseModal] = useState(false)

  const { status: saveStatus, saveError, retry: retrySave } = useAutoSaveTO()

  const handleResetAll = () => {
    if (toOriginal) setTOData(toOriginal, toOriginal)
  }

  const handleDownload = async () => {
    if (!toData || downloading) return
    setDownloading(true)
    try {
      await exportTrainingOutlineToDocx(toData, {
        courseTitle,
        ruleFamily: (toData.rule_family as string | undefined) ?? '',
        audience,
        difficultyLevel,
        durationHours,
        description: wizardData.description || '',
        objectives: wizardData.objectives.length > 0 ? wizardData.objectives : undefined,
      })
    } catch (err) {
      console.error('Failed to generate Training Outline DOCX:', err)
    } finally {
      setDownloading(false)
    }
  }

  const saveIndicator = toData ? (
    <SaveIndicator status={saveStatus} error={saveError} onRetry={retrySave} />
  ) : null

  const headerActions = toData ? (
    <div className="flex items-center gap-1.5">
      {saveIndicator}

      <button
        type="button"
        onClick={() => setShowReviseModal(true)}
        title="Ask the AI to revise the Training Outline"
        className="flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 hover:bg-violet-100 hover:border-violet-300 transition-all shadow-sm"
      >
        <Wand2 size={11} />
        Revise with AI
      </button>

      <button
        type="button"
        onClick={handleDownload}
        disabled={downloading}
        title="Download Training Outline as DOCX"
        className="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300 transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {downloading ? (
          <Loader2 size={11} className="animate-spin" />
        ) : (
          <Download size={11} />
        )}
        {downloading ? 'Generating…' : 'Download'}
      </button>
    </div>
  ) : null

  return (
    <>
      <JsonEditorPanel
        title="Training Outline"
        subtitle="Review and adjust the AI-generated course structure"
        icon={<BookOpen size={13} className="text-indigo-600" />}
        iconBgClass="bg-indigo-50"
        data={toData}
        originalData={toOriginal}
        modifiedPaths={modifiedTOPaths}
        onUpdate={(path: string[], value: JsonValue) => updateTOField(path, value)}
        onReset={(path: string[]) => resetTOField(path)}
        onResetAll={handleResetAll}
        loading={loading}
        loadError={loadError}
        emptyMessage="Generate a Training Outline or open a saved course to review its outline."
        headerActions={headerActions}
      />

      {showReviseModal && (
        <ReviseOutlineModal onClose={() => setShowReviseModal(false)} />
      )}
    </>
  )
}

// ── Save status indicator ────────────────────────────────────────────────────

interface SaveIndicatorProps {
  status: 'idle' | 'saving' | 'saved' | 'error'
  error: string | null
  onRetry: () => void
}

function SaveIndicator({ status, error, onRetry }: SaveIndicatorProps) {
  if (status === 'idle') return null

  if (status === 'saving') {
    return (
      <span className="flex items-center gap-1 text-[11px] text-slate-400 select-none">
        <Loader2 size={11} className="animate-spin" />
        Saving…
      </span>
    )
  }

  if (status === 'saved') {
    return (
      <span className="flex items-center gap-1 text-[11px] text-emerald-600 select-none">
        <CheckCircle2 size={11} />
        Saved
      </span>
    )
  }

  // error
  return (
    <span
      title={error ?? 'Auto-save failed'}
      className="flex items-center gap-1 text-[11px] text-amber-600"
    >
      <AlertCircle size={11} />
      <span className="hidden sm:inline max-w-[120px] truncate">
        {error ?? 'Save failed'}
      </span>
      <button
        type="button"
        onClick={onRetry}
        className={cn(
          'ml-0.5 flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] font-semibold',
          'bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors',
        )}
      >
        <RefreshCw size={9} />
        Retry
      </button>
    </span>
  )
}

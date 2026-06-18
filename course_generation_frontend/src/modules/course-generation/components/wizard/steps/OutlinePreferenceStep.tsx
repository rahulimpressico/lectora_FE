import type { ChangeEvent, DragEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import { AlertCircle, Sparkles, Upload, X } from 'lucide-react'
import { useCourseStore } from '../../../store/courseStore'
import { useGenerateTO } from '../../../hooks/useGenerateTO'
import { useFileUpload } from '../../../hooks/useFileUpload'
import { useWizardNav } from '../WizardNavContext'
import { formatBytes } from '@/shared/utils/formatBytes'
import { cn } from '@/lib/cn'
import type { WizardData } from '../../../types/wizard'

function buildCompositePrompt(data: WizardData, audience: string): string {
  const parts: string[] = []

  if (data.description) parts.push(`Course description: ${data.description}`)
  if (audience) parts.push(`Target audience: ${audience}`)
  if (data.audienceNotes) parts.push(`Audience notes: ${data.audienceNotes}`)
  if (data.experienceLevel) parts.push(`Learner experience level: ${data.experienceLevel}`)
  if (data.learnerOutcomes) parts.push(`Learner outcomes: ${data.learnerOutcomes}`)
  if (data.objectives.length > 0) {
    parts.push(`Learning objectives:\n${data.objectives.map((o) => `- ${o}`).join('\n')}`)
  }
  if (data.tone) parts.push(`Desired tone: ${data.tone}`)
  if (data.depth) parts.push(`Course depth: ${data.depth}`)
  if (data.emphasis) parts.push(`Emphasize: ${data.emphasis}`)
  if (data.avoid) parts.push(`Avoid: ${data.avoid}`)
  if (!data.includeScenarios) parts.push('Do not include scenarios or examples.')
  if (!data.includeKnowledgeChecks) parts.push('Do not include knowledge checks.')
  if (data.sourceNotes) parts.push(`Source notes: ${data.sourceNotes}`)
  if (data.lessonStyle === 'short') parts.push('Lesson style: short, focused sections.')
  if (data.lessonStyle === 'detailed') parts.push('Lesson style: detailed, comprehensive chapters.')
  if (data.preferredChapters) parts.push(`Preferred number of chapters: ${data.preferredChapters}`)

  return parts.join('\n\n')
}

export const OutlinePreferenceStep = () => {
  const setCustomToPrompt = useCourseStore((s) => s.setCustomToPrompt)
  const audience = useCourseStore((s) => s.audience)
  const wizardData = useCourseStore((s) => s.wizardData)
  const setWizardData = useCourseStore((s) => s.setWizardData)

  const rawDocuments = useCourseStore((s) => s.rawDocuments)
  const removeRawDocument = useCourseStore((s) => s.removeRawDocument)
  const { enqueueFiles } = useFileUpload()
  const generateTO = useGenerateTO('wizard-outline-review')

  const outlineMode = wizardData.outlineMode ?? 'generate'
  const preferredChapters = wizardData.preferredChapters
  const lessonStyle = wizardData.lessonStyle

  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const { setConfig } = useWizardNav()

  useEffect(() => {
    if (outlineMode === 'generate') {
      setConfig({
        backPhase: 'wizard-direction',
        backLabel: 'Back',
        nextLabel: generateTO.isPending ? 'Generating...' : 'Generate Outline',
        isNextLoading: generateTO.isPending,
        isNextDisabled: generateTO.isPending,
        onNext: () => {
          if (!generateTO.isPending) {
            const composite = buildCompositePrompt(wizardData, audience)
            setCustomToPrompt(composite)
            generateTO.mutate()
          }
        },
      })
    } else {
      const hasUploadedFile = rawDocuments.some((f) => f.status === 'success')
      setConfig({
        backPhase: 'wizard-direction',
        backLabel: 'Back',
        nextPhase: 'wizard-outline-review',
        nextLabel: 'Review Outline',
        isNextDisabled: !hasUploadedFile,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outlineMode, generateTO.isPending, rawDocuments.length])

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => setIsDragging(false)

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files.length > 0) void enqueueFiles(e.dataTransfer.files)
  }

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) void enqueueFiles(e.target.files)
    e.target.value = ''
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="mb-8 sm:mb-10">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-indigo-500 mb-3">Outline Structure</p>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight mb-3">How would you like to structure this?</h2>
        <p className="text-slate-500 text-base leading-relaxed max-w-md">Upload your own course outline, or let the AI build one from your materials and settings.</p>
      </div>

      {/* Option cards */}
      <div className="space-y-3">
        {/* Upload */}
        <button
          type="button"
          onClick={() => setWizardData({ outlineMode: 'upload' })}
          className={cn(
            'w-full flex items-start gap-4 p-5 rounded-xl cursor-pointer transition-all text-left',
            outlineMode === 'upload'
              ? 'border-2 border-indigo-500 bg-indigo-50/60'
              : 'border border-slate-200/80 bg-white shadow-sm hover:border-indigo-200 hover:bg-indigo-50/20 hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0',
          )}
        >
          <div
            className={cn(
              'p-2.5 rounded-lg shrink-0',
              outlineMode === 'upload' ? 'bg-brand-100 text-brand-600' : 'bg-slate-100 text-slate-500',
            )}
          >
            <Upload className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">Yes, I have an outline</p>
            <p className="text-xs text-slate-500 mt-0.5">Upload your existing course structure</p>
          </div>
        </button>

        {/* Generate */}
        <button
          type="button"
          onClick={() => setWizardData({ outlineMode: 'generate' })}
          className={cn(
            'w-full flex items-start gap-4 p-5 rounded-xl cursor-pointer transition-all text-left',
            outlineMode === 'generate'
              ? 'border-2 border-indigo-500 bg-indigo-50/60'
              : 'border border-slate-200/80 bg-white shadow-sm hover:border-indigo-200 hover:bg-indigo-50/20 hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0',
          )}
        >
          <div
            className={cn(
              'p-2.5 rounded-lg shrink-0',
              outlineMode === 'generate' ? 'bg-brand-100 text-brand-600' : 'bg-slate-100 text-slate-500',
            )}
          >
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">No, create one for me</p>
            <p className="text-xs text-slate-500 mt-0.5">Let the AI build a structured outline from your materials</p>
          </div>
        </button>
      </div>

      {/* Generate sub-fields */}
      {outlineMode === 'generate' && (
        <div className="space-y-5 fade-in">
          {/* Preferred chapters */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">
              Preferred Number of Chapters
              <span className="text-slate-400 font-normal ml-1">(optional)</span>
            </label>
            <input
              type="number"
              min={1}
              max={30}
              value={preferredChapters}
              onChange={(e) => setWizardData({ preferredChapters: e.target.value })}
              placeholder="e.g. 6"
              className="w-40 px-3.5 py-2.5 text-sm border border-border rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all"
            />
          </div>

          {/* Lesson style */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700">Lesson Style</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setWizardData({ lessonStyle: 'short' })}
                className={cn(
                  'flex flex-col items-start gap-1 p-4 rounded-xl cursor-pointer transition-all text-left',
                  lessonStyle === 'short'
                    ? 'border-2 border-indigo-500 bg-indigo-50/60 shadow-sm'
                    : 'border border-slate-200/80 bg-white shadow-sm hover:border-indigo-200 hover:bg-indigo-50/20 hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0',
                )}
              >
                <p className="text-sm font-semibold text-slate-800">Short Sections</p>
                <p className="text-xs text-slate-500">Compact, focused</p>
              </button>
              <button
                type="button"
                onClick={() => setWizardData({ lessonStyle: 'detailed' })}
                className={cn(
                  'flex flex-col items-start gap-1 p-4 rounded-xl cursor-pointer transition-all text-left',
                  lessonStyle === 'detailed'
                    ? 'border-2 border-indigo-500 bg-indigo-50/60 shadow-sm'
                    : 'border border-slate-200/80 bg-white shadow-sm hover:border-indigo-200 hover:bg-indigo-50/20 hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0',
                )}
              >
                <p className="text-sm font-semibold text-slate-800">Detailed Chapters</p>
                <p className="text-xs text-slate-500">Comprehensive, in-depth</p>
              </button>
            </div>
          </div>

          {/* Generate info card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-500" />
              <p className="text-sm font-semibold text-slate-800">Ready to create your timed outline?</p>
            </div>
            <p className="text-xs text-slate-500">
              The assistant will analyze your source materials and build a structured course outline based on all the details you've provided.
            </p>

            {generateTO.isError && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{generateTO.error?.message ?? 'An error occurred. Please try again.'}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Upload sub-zone */}
      {outlineMode === 'upload' && (
        <div className="space-y-3 fade-in">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={cn(
              'border-2 border-dashed rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer transition-all',
              isDragging
                ? 'border-brand-600 bg-brand-200/20'
                : 'border-slate-200 bg-white hover:border-brand-300 hover:bg-brand-100/10',
            )}
          >
            <Upload className="w-6 h-6 text-slate-400" />
            <div className="text-center">
              <p className="text-sm font-medium text-slate-700">Drop your outline file here or click to browse</p>
              <p className="text-xs text-slate-400 mt-1">Accepted: .docx, .pdf, .json</p>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".docx,.pdf,.json"
              className="hidden"
              onChange={handleInputChange}
            />
          </div>

          {rawDocuments.length > 0 && (
            <div className="space-y-2">
              {rawDocuments.map((file) => (
                <div key={file.id} className="flex items-center gap-3 p-3 bg-white border border-border rounded-xl">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{file.name}</p>
                    <p className="text-xs text-slate-400">{formatBytes(file.sizeBytes)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeRawDocument(file.id)}
                    className="shrink-0 p-1 text-slate-400 hover:text-red-400 transition-colors rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

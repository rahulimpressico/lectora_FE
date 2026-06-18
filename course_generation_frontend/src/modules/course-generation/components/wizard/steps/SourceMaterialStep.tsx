import type { ChangeEvent, DragEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, Loader2, Upload, X, XCircle } from 'lucide-react'
import { useCourseStore } from '../../../store/courseStore'
import { useFileUpload } from '../../../hooks/useFileUpload'
import { useWizardNav } from '../WizardNavContext'
import { formatBytes } from '@/shared/utils/formatBytes'
import { cn } from '@/lib/cn'

export const SourceMaterialStep = () => {
  const courseTitle = useCourseStore((s) => s.courseTitle)
  const courseTopic = useCourseStore((s) => s.courseTopic)
  const setCourseTopic = useCourseStore((s) => s.setCourseTopic)
  const rawDocuments = useCourseStore((s) => s.rawDocuments)
  const removeRawDocument = useCourseStore((s) => s.removeRawDocument)
  const wizardData = useCourseStore((s) => s.wizardData)
  const setWizardData = useCourseStore((s) => s.setWizardData)

  const { enqueueFiles } = useFileUpload()
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const { setConfig } = useWizardNav()

  useEffect(() => {
    setConfig({
      backPhase: 'wizard-audience',
      backLabel: 'Back',
      nextPhase: 'wizard-objectives',
      nextLabel: 'Next: Objectives',
      isNextDisabled: false,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!courseTopic.trim() && courseTitle.trim()) {
      setCourseTopic(courseTitle)
    }
  }, [courseTitle, courseTopic, setCourseTopic])

  const sourceNotes = wizardData.sourceNotes ?? ''

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files.length > 0) {
      void enqueueFiles(e.dataTransfer.files)
    }
  }

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      void enqueueFiles(e.target.files)
    }
    e.target.value = ''
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="mb-8 sm:mb-10">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-indigo-500 mb-3">Knowledge Source</p>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight mb-3">What knowledge powers this course?</h2>
        <p className="text-slate-500 text-base leading-relaxed max-w-md">Upload your reference materials. The richer the input, the sharper the AI-generated output.</p>
      </div>

      {/* Drop zone */}
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
        <div
          className={cn(
            'p-3 rounded-full transition-colors',
            isDragging ? 'bg-brand-100' : 'bg-slate-100',
          )}
        >
          <Upload className={cn('w-6 h-6', isDragging ? 'text-brand-600' : 'text-slate-400')} />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-slate-700">Drop your files here or click to browse</p>
          <p className="text-xs text-slate-400 mt-1">Accepted: .docx, .pdf</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".docx,.pdf"
          multiple
          className="hidden"
          onChange={handleInputChange}
        />
      </div>

      {/* File list */}
      {rawDocuments.length > 0 && (
        <div className="space-y-2">
          {rawDocuments.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-3 p-3 bg-white border border-border rounded-xl"
            >
              {/* Status icon */}
              <div className="shrink-0">
                {(file.status === 'uploading' || file.status === 'parsing') && (
                  <Loader2 className="w-4 h-4 text-brand-500 animate-spin" />
                )}
                {file.status === 'success' && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                )}
                {file.status === 'error' && (
                  <XCircle className="w-4 h-4 text-red-400" />
                )}
                {file.status === 'idle' && (
                  <div className="w-4 h-4 rounded-full border-2 border-slate-300" />
                )}
              </div>

              {/* File info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{file.name}</p>
                <p className="text-xs text-slate-400">
                  {formatBytes(file.sizeBytes)}
                  {file.status === 'uploading' && ' · Uploading...'}
                  {file.status === 'parsing' && ' · Parsing...'}
                  {file.status === 'error' && file.errorMessage && ` · ${file.errorMessage}`}
                </p>
              </div>

              {/* Remove */}
              <button
                type="button"
                onClick={() => removeRawDocument(file.id)}
                className="shrink-0 p-1 text-slate-400 hover:text-red-400 transition-colors rounded"
                aria-label="Remove file"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Helper note */}
      <p className="text-xs text-slate-400 italic">
        May include regulations, manuals, existing courses, articles, reference documents, or internal guidance.
      </p>

      {/* Source Notes */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-slate-700">
          Source Notes
          <span className="text-slate-400 font-normal ml-1">(optional)</span>
        </label>
        <textarea
          rows={3}
          value={sourceNotes}
          onChange={(e) => setWizardData({ sourceNotes: e.target.value })}
          placeholder="Describe key references, regulations, or special instructions..."
          className="w-full px-3.5 py-2.5 text-sm border border-border rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 transition-all resize-none"
        />
      </div>
    </div>
  )
}

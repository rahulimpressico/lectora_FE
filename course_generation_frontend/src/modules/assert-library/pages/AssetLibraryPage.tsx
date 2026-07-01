import { useMemo, useCallback, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowRight,
  Code2,
  Database,
  FileText,
  FolderKanban,
  FolderOpen,
  Wrench,
} from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import {
  browseStorageCategory,
  type BrowseResponse,
  type StorageCategory,
  type StorageSource,
  type StorageEntry,
} from '@/api/storage/api'
import { StorageExplorer } from '@/modules/storage'
import { CourseEditorModal } from '@/modules/storage/components/CourseEditorModal'
import { getJobByCourseSlug } from '@/api/jobs/api'

type CategoryConfig = {
  key: StorageCategory
  label: string
  subtitle: string
  icon: typeof FileText
  source: StorageSource
  emptyHint: string
}

const CATEGORIES: CategoryConfig[] = [
  {
    key: 'source-documents',
    label: 'Source Documents',
    subtitle: 'Uploaded DOCX/PDF files from Azure uploaded-documents.',
    icon: FileText,
    source: 'uploads',
    emptyHint: 'No source documents found yet.',
  },
  {
    key: 'generated-courses',
    label: 'Generated Courses',
    subtitle: 'Final DOCX/PDF outputs from Azure generated-courses.',
    icon: FolderKanban,
    source: 'generated-courses',
    emptyHint: 'No generated courses found yet.',
  },
  {
    key: 'pipeline-artifacts',
    label: 'Pipeline Artifacts',
    subtitle: 'Live pipeline run logs and intermediate JSON from Azure pipeline storage.',
    icon: Wrench,
    source: 'artifacts',
    emptyHint: 'No pipeline JSON logs found yet. Start a course generation to see live logs.',
  },
  {
    key: 'course-generation-artifacts',
    label: 'Course Generation Artifacts',
    subtitle: 'Production pipeline JSON per course from Azure course-generation-artifacts.',
    icon: Code2,
    source: 'course-generation-artifacts',
    emptyHint: 'No JSON artifacts found in course-generation-artifacts yet.',
  },
]

export function AssetLibraryPage() {
  const queryClient = useQueryClient()
  const [params, setParams] = useSearchParams()
  const [modalJobId, setModalJobId] = useState<string | null>(null)
  const [modalCourseSlug, setModalCourseSlug] = useState<string | undefined>(undefined)

  const selected =
    (params.get('category') as StorageCategory | null) ?? 'generated-courses'
  const active = CATEGORIES.find((c) => c.key === selected) ?? CATEGORIES[1]

  const handleOpenDocx = useCallback(async (entry: StorageEntry) => {
    const pathParts = entry.path.split('/')
    const slug = pathParts[0]
    if (!slug) return

    // New isolated layout: {courseSlug}/{jobId}/output/study_guide.docx
    const potentialJobId = pathParts[1]
    const looksLikeJobId =
      !!potentialJobId &&
      (/^j-[a-z0-9]+$/i.test(potentialJobId) || /^[a-f0-9]{32}$/i.test(potentialJobId))
    if (looksLikeJobId) {
      setModalCourseSlug(slug)
      setModalJobId(potentialJobId)
      return
    }

    // Fallback: look up most recent job by course slug (legacy layout or root-level path)
    const result = await getJobByCourseSlug(slug)
    if (!result) {
      alert(`No completed job found for course "${slug}". The course may still be generating.`)
      return
    }
    setModalCourseSlug(slug)
    setModalJobId(result.jobId)
  }, [])

  // Only fetch the selected category (same query key as StorageExplorer — deduped).
  const { data: activeBrowseData } = useQuery({
    queryKey: ['storage-browse', active.source, active.key, ''] as const,
    queryFn: ({ signal }) => browseStorageCategory(active.key, '', signal),
    staleTime: 30_000,
    retry: false,
  })

  const countByKey = useMemo(() => {
    const map = new Map<StorageCategory, { folders: number; files: number } | null>()
    for (const item of CATEGORIES) {
      const data =
        item.key === active.key
          ? activeBrowseData
          : queryClient.getQueryData<BrowseResponse>([
              'storage-browse',
              item.source,
              item.key,
              '',
            ])
      map.set(
        item.key,
        data ? { folders: data.totalFolders, files: data.totalFiles } : null,
      )
    }
    return map
  }, [active.key, activeBrowseData, queryClient])

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-slate-200/80 bg-[radial-gradient(circle_at_top_left,#eef2ff,transparent_45%),radial-gradient(circle_at_top_right,#f5f3ff,transparent_40%),#ffffff] px-8 py-7">
        <div className="flex items-center gap-3.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-[0_8px_24px_-8px_rgba(79,70,229,0.55)]">
            <Database size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Asset Library
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Browse Azure storage by category — source docs, generated courses, dev pipeline files, and production JSON artifacts.
            </p>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {CATEGORIES.map((item) => {
            const Icon = item.icon
            const isActive = item.key === active.key
            const counts = countByKey.get(item.key)
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setParams({ category: item.key })}
                className={[
                  'group relative overflow-hidden rounded-3xl border px-5 py-4 text-left transition-all duration-300',
                  isActive
                    ? 'border-violet-300 bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-white shadow-[0_14px_36px_-16px_rgba(109,40,217,0.75)]'
                    : 'border-slate-200/90 bg-white hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-[0_12px_30px_-18px_rgba(79,70,229,0.45)]',
                ].join(' ')}
              >
                <div className="absolute inset-0 pointer-events-none">
                  {isActive ? (
                    <div className="h-full w-full bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.24),transparent_50%)]" />
                  ) : null}
                </div>
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={[
                        'flex h-11 w-11 items-center justify-center rounded-2xl border transition-colors',
                        isActive
                          ? 'border-white/35 bg-white/20 text-white'
                          : 'border-indigo-100 bg-indigo-50 text-indigo-600',
                      ].join(' ')}
                    >
                      <Icon size={20} />
                    </div>
                    <span className={['text-base font-semibold', isActive ? 'text-white' : 'text-slate-900'].join(' ')}>
                      {item.label}
                    </span>
                  </div>
                  <FolderOpen
                    size={16}
                    className={isActive ? 'text-white/90' : 'text-slate-400 group-hover:text-indigo-500'}
                  />
                </div>
                <p
                  className={[
                    'relative mt-3 text-sm leading-relaxed',
                    isActive ? 'text-white/88' : 'text-slate-600',
                  ].join(' ')}
                >
                  {item.subtitle}
                </p>
                <div className="relative mt-4 flex items-center justify-between">
                  <div
                    className={[
                      'inline-flex items-center rounded-xl px-3 py-1.5 text-xs font-semibold',
                      isActive
                        ? 'bg-white/18 text-white'
                        : 'bg-slate-50 text-slate-600',
                    ].join(' ')}
                  >
                    {counts ? (
                      <span>{counts.folders} folders · {counts.files} files</span>
                    ) : (
                      <span className={isActive ? 'text-white/80' : 'text-slate-400'}>
                        Open to browse
                      </span>
                    )}
                  </div>
                  <span
                    className={[
                      'inline-flex items-center gap-1 text-sm font-semibold',
                      isActive ? 'text-white' : 'text-indigo-600',
                    ].join(' ')}
                  >
                    Open <ArrowRight size={14} />
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <StorageExplorer
        title={active.label}
        subtitle={active.subtitle}
        headerIcon={Database}
        source={active.source}
        category={active.key}
        emptyHint={active.emptyHint}
        fileExtensions={
          active.key === 'course-generation-artifacts' || active.key === 'pipeline-artifacts'
            ? ['.json']
            : undefined
        }
        allowDelete
        onOpenDocx={active.key === 'generated-courses' ? handleOpenDocx : undefined}
      />

      {/* Course editor / preview modal — opened when user clicks a DOCX */}
      {modalJobId && (
        <CourseEditorModal
          jobId={modalJobId}
          courseSlug={modalCourseSlug}
          onClose={() => {
            setModalJobId(null)
            setModalCourseSlug(undefined)
          }}
        />
      )}
    </div>
  )
}

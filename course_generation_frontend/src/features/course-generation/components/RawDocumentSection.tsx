import { Files } from 'lucide-react'
import { SectionCard } from '@/shared/components/SectionCard'
import { EmptyState } from '@/shared/components/EmptyState'
import { Badge } from '@/shared/components/Badge'
import { UploadZone } from './UploadZone'
import { FileCard } from './FileCard'
import { useFileUpload } from '../hooks/useFileUpload'
import { useCourseStore } from '../store/courseStore'

export function RawDocumentSection() {
  const { rawDocuments, removeRawDocument, openPreview } = useCourseStore()
  const { enqueueFiles } = useFileUpload('raw')

  const successCount = rawDocuments.filter((f) => f.status === 'success').length

  return (
    <SectionCard
      title="Source Documents"
      description="Upload the raw study guide DOCX files to be processed by the pipeline."
      badge={
        rawDocuments.length > 0 ? (
          <Badge variant={successCount > 0 ? 'success' : 'info'}>
            {rawDocuments.length} file{rawDocuments.length !== 1 ? 's' : ''}
          </Badge>
        ) : undefined
      }
    >
      <div className="space-y-3">
        <UploadZone
          onFiles={enqueueFiles}
          multiple
          label="Drag & drop study guide files"
          sublabel="or click to browse your computer"
        />

        {rawDocuments.length > 0 && (
          <div className="space-y-2 mt-4">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Uploaded files
            </p>
            <div className="space-y-2">
              {rawDocuments.map((file) => (
                <FileCard
                  key={file.id}
                  file={file}
                  onRemove={removeRawDocument}
                  onPreview={openPreview}
                />
              ))}
            </div>
          </div>
        )}

        {rawDocuments.length === 0 && (
          <EmptyState
            icon={<Files size={18} />}
            title="No documents uploaded yet"
            description="Accepted format: .docx — You can upload multiple files at once."
            className="py-4"
          />
        )}
      </div>
    </SectionCard>
  )
}

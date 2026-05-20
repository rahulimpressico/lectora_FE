import { FileUp } from 'lucide-react'
import { StorageExplorer } from '@/components/storage/StorageExplorer'

export function DocumentsLibraryPage() {
  return (
    <StorageExplorer
      title="Uploaded Documents"
      subtitle="Source documents from Azure Blob (regedlectoraaistorage / uploads/) — open any file in preview"
      headerIcon={FileUp}
      source="uploads"
      fileExtensions={['.docx', '.doc', '.pdf']}
      emptyHint="No DOCX/PDF under Azure uploads/ yet. Open a job folder (e.g. uploads/{jobId}/) to see study guides."
    />
  )
}

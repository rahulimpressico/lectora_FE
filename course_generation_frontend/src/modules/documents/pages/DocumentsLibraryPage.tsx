import { FileUp } from 'lucide-react'
import { StorageExplorer } from '@/modules/storage'

export function DocumentsLibraryPage() {
  return (
    <StorageExplorer
      title="Uploaded Documents"
      subtitle="DOCX/PDF files from the uploaded-documents container. Falls back to pipeline storage when empty."
      headerIcon={FileUp}
      source="uploads"
      emptyHint="Open a course folder to select files. If uploaded-documents is empty, files from pipeline storage are listed automatically."
    />
  )
}

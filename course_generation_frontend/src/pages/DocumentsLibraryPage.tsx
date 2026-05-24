import { FileUp } from 'lucide-react'
import { StorageExplorer } from '@/modules/storage'

export function DocumentsLibraryPage() {
  return (
    <StorageExplorer
      title="Uploaded Documents"
      subtitle="DOCX/PDF in uploaded-documents, or regedlectoraaistorage when the upload container is empty"
      headerIcon={FileUp}
      source="uploads"
      emptyHint="Open a course folder to select files. If uploaded-documents is empty, files from regedlectoraaistorage are listed automatically."
    />
  )
}

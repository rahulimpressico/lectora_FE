import { FileUp } from 'lucide-react'
import { StorageExplorer } from '@/components/storage/StorageExplorer'

export function DocumentsLibraryPage() {
  return (
    <StorageExplorer
      title="Uploaded Documents"
      subtitle="Source documents in Azure Blob container uploaded-documents"
      headerIcon={FileUp}
      source="uploads"
      emptyHint="No items in uploaded-documents container yet. Upload from Generate with a course topic, or open a folder below."
    />
  )
}

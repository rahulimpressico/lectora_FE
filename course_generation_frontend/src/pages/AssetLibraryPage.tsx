import { Database } from 'lucide-react'
import { StorageExplorer } from '@/components/storage/StorageExplorer'

export function AssetLibraryPage() {
  return (
    <StorageExplorer
      title="Asset Library"
      subtitle="Browse pipeline artifacts — open images, JSON, and DOCX in preview"
      headerIcon={Database}
      source="artifacts"
      emptyHint="Run the course generation pipeline to create artifacts under shared_state."
    />
  )
}

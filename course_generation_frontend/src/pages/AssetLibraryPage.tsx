import { Database } from 'lucide-react'
import { StorageExplorer } from '@/components/storage/StorageExplorer'

export function AssetLibraryPage() {
  return (
    <StorageExplorer
      title="Asset Library"
      subtitle="Browse Azure container regedlectoraaistorage — course folders and pipeline artifacts"
      headerIcon={Database}
      source="artifacts"
      emptyHint="No folders in regedlectoraaistorage yet. Run a course to create a course folder at the container root."
    />
  )
}

import type {  IngestionStatus, SourceRole } from "../../../../types";

export interface AnalyzableDoc {
  blobPath: string;
  sourceRole?: SourceRole;
  extractHint?: string;
}

export interface UploadDocumentOptions {
  /** Stable course identifier for RAG chunk metadata. */
  courseId?: string;
  /** Jurisdiction label for RAG chunk metadata. */
  jurisdiction?: string;
  /** Source role/type for RAG chunk metadata. */
  sourceType?: string;
  /** Source priority for RAG chunk metadata. */
  sourcePriority?: string;
  /** Extract hint / source intent for RAG chunk metadata. */
  sourceIntent?: string;
}

export interface UploadDocumentResponse {
  blobPath: string;
  uploadFolder: string;
  documentId: string;
}

export interface IngestionStatusResponse {
  document_id: string;
  status: IngestionStatus;
  total_chunks: number;
  error: string | null;
  updated_at: number;
}

export interface StorageEntry {
  name: string;
  path: string;
  entryType: "folder" | "file";
  size?: number;
  lastModified?: string;
  contentType?: string;
}

export interface BrowseSourceDirectoryResponse {
  prefix: string;
  entries: StorageEntry[];
  totalFiles: number;
  totalFolders: number;
  totalSize: number;
  source: "azure" | "local";
  containerName?: string;
}
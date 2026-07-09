import type {  IngestionStatus, SourceRole } from "../../../../types";

export interface AnalyzableDoc {
  blobPath: string;
  sourceRole?: SourceRole;
  extractHint?: string;
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
  createdAt?: string;
  contentType?: string;
  fileCount?: number;
  extension?: string;
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
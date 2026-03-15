export type StagingStatus = 'pending' | 'uploading' | 'success' | 'error';

export interface StagingItem {
  localId: string;
  file: File;
  previewUrl: string;
  title: string;
  slug: string;
  caption: string;
  format: 'landscape' | 'portrait';
  projectId: string | null;
  publishedDate: string;
  status: StagingStatus;
  errorMessage: string | null;
  isModified: boolean;
}

export interface BulkSelection {
  activeId: string | null;
  selectedIds: Set<string>;
}

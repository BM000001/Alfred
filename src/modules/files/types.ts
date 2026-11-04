export interface StoredFile {
  id: string;
  name: string;
  type: string;
  size: number;
  createdAt: string;
  /** Optional to preserve compatibility with files saved before discipline linking. */
  disciplineId?: string;
  blob: Blob;
}
export interface FileSummary {
  id: string;
  name: string;
  type: string;
  size: number;
  createdAt: string;
  disciplineId?: string;
}
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

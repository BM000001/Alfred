export interface StoredFile {
  id: string;
  name: string;
  type: string;
  size: number;
  createdAt: string;
  blob: Blob;
}
export interface FileSummary {
  id: string;
  name: string;
  type: string;
  size: number;
  createdAt: string;
}
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

export type TextDocumentFormat = 'txt' | 'md' | 'csv' | 'json';

export interface ExtractedTextDocument {
  fileName: string;
  format: TextDocumentFormat;
  text: string;
  characterCount: number;
  wordCount: number;
  extractedAt: string;
}

const FORMAT_BY_EXTENSION: Record<string, TextDocumentFormat> = {
  txt: 'txt',
  md: 'md',
  markdown: 'md',
  csv: 'csv',
  json: 'json',
};

function getFormat(file: File): TextDocumentFormat {
  const extension = file.name.split('.').pop()?.toLocaleLowerCase('en-US') ?? '';
  const format = FORMAT_BY_EXTENSION[extension];
  if (format) return format;

  const mime = file.type.toLocaleLowerCase('en-US');
  if (mime === 'text/plain') return 'txt';
  if (mime === 'text/markdown') return 'md';
  if (mime === 'text/csv') return 'csv';
  if (mime === 'application/json') return 'json';

  throw new Error('Formato ainda não suportado para leitura local. Nesta etapa, use TXT, MD, CSV ou JSON.');
}

export async function extractTextDocument(
  file: File,
  now: () => Date = () => new Date(),
): Promise<ExtractedTextDocument> {
  if (file.size <= 0) throw new Error('O arquivo está vazio.');
  const format = getFormat(file);
  const decoded = (await file.text()).replace(/^\uFEFF/, '');
  const text = decoded.replace(/\r\n?/g, '\n').trim();

  if (!text) throw new Error('Não foi encontrado texto para extrair deste arquivo.');
  if (format === 'json') {
    try {
      JSON.parse(text);
    } catch {
      throw new Error('O arquivo JSON contém uma estrutura inválida.');
    }
  }

  const words = text.match(/[\p{L}\p{N}_]+/gu) ?? [];
  return {
    fileName: file.name,
    format,
    text,
    characterCount: text.length,
    wordCount: words.length,
    extractedAt: now().toISOString(),
  };
}

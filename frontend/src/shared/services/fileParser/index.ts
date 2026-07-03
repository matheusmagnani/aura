import { pdfToHtml } from './pdfParser'

export interface FileParserOptions {
  /** Called to upload extracted images and receive a public URL. Without it, images are skipped. */
  uploadImage?: (file: File) => Promise<string>
}

/**
 * Generic file reader: converts a supported document into Tiptap-compatible HTML.
 * Load it into the editor via `editor.commands.setContent(html)`.
 *
 * Supported formats: PDF (today). Add new parsers by extending the dispatch below —
 * each parser must return an HTML string (the common contract across formats).
 */
export async function readFileAsHtml(file: File, options?: FileParserOptions): Promise<string> {
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
  if (isPdf) return pdfToHtml(file, options?.uploadImage)

  throw new Error('Tipo de arquivo não suportado.')
}

export const IMPORT_ACCEPT = 'application/pdf'

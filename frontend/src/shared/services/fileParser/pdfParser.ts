import * as pdfjsLib from 'pdfjs-dist'
import PdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = PdfWorker

const BOLD_RE = /bold|black|semibold|heavy|w[5-9]00/i
const ITALIC_RE = /italic|oblique/i

// Use pdfjsLib.OPS for correct op codes — hardcoded numbers differ across pdfjs versions.
// Resolved lazily so the import-time value is available after module init.
function getImageOpCodes(): Set<number> {
  const O = (pdfjsLib as any).OPS ?? {}
  return new Set([
    O.paintImageXObject,         // 85 — raster XObject image
    O.paintInlineImageXObject,   // 86 — inline image
    O.paintImageXObjectRepeat,   // 88
    O.paintImageMaskXObject,     // 83
    O.paintImageMaskXObjectRepeat, // 89
  ].filter((n): n is number => typeof n === 'number'))
}

interface TextLine {
  kind: 'text'
  html: string
  yAbs: number  // accumulated y from top across all pages, for sorting
  fontSize: number
}

interface ImageItem {
  kind: 'img'
  url: string
  yAbs: number
}

type DocItem = TextLine | ImageItem

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function styleFragment(text: string, bold: boolean, italic: boolean): string {
  let html = escapeHtml(text)
  if (italic) html = `<em>${html}</em>`
  if (bold) html = `<strong>${html}</strong>`
  return html
}


/**
 * Extracts text and embedded images from a PDF and returns Tiptap-compatible HTML.
 *
 * Text reconstruction is heuristic: glyph runs are clustered into lines by their
 * vertical position, then grouped into paragraphs by vertical gap. Bold/italic
 * require semantic font names (Word/Acrobat PDFs) — browser-generated PDFs use
 * generic names and won't carry style info.
 *
 * Images are extracted as raw pixel data, converted to PNG via OffscreenCanvas, and
 * uploaded via the optional `uploadImage` callback. Identical images (same pixel
 * fingerprint, e.g. a repeated header logo) are uploaded once and reused.
 */
export async function pdfToHtml(
  file: File,
  uploadImage?: (f: File) => Promise<string>,
): Promise<string> {
  const buffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise

  const items: DocItem[] = []
  const uploadedByFingerprint = new Map<string, string>()

  try {
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum)
      const pageHeight = page.getViewport({ scale: 1 }).height
      // yOffset accumulates page heights + inter-page gaps so items sort globally
      const yOffset = (pageNum - 1) * (pageHeight + 20)

      // ── Text extraction ──────────────────────────────────────────────────────
      const textContent = await page.getTextContent()
      const textItems = textContent.items as Array<{
        str: string; transform: number[]; width: number; height: number; fontName: string
      }>

      // Cluster glyph runs sharing the same baseline into visual lines
      type Cluster = { y: number; runs: typeof textItems }
      const clusters: Cluster[] = []
      for (const it of textItems) {
        if (!it.str) continue
        const y = it.transform[5]
        const size = it.height || Math.hypot(it.transform[1], it.transform[3]) || it.transform[0]
        let cluster = clusters.find((c) => Math.abs(c.y - y) <= Math.max(size * 0.5, 2))
        if (!cluster) { cluster = { y, runs: [] }; clusters.push(cluster) }
        cluster.runs.push(it)
      }
      clusters.sort((a, b) => b.y - a.y) // top → bottom (PDF y grows upward, so descending)

      for (const cluster of clusters) {
        const runs = cluster.runs.slice().sort((a, b) => a.transform[4] - b.transform[4])
        let html = ''
        let prevEndX: number | null = null
        let fontSize = 0

        for (const run of runs) {
          const size = run.height || Math.hypot(run.transform[1], run.transform[3]) || run.transform[0]
          fontSize = Math.max(fontSize, size)
          const x = run.transform[4]
          const bold = BOLD_RE.test(run.fontName)
          const italic = ITALIC_RE.test(run.fontName)
          if (prevEndX !== null && x - prevEndX > size * 0.25 && !/\s$/.test(html) && !/^\s/.test(run.str)) html += ' '
          html += styleFragment(run.str, bold, italic)
          prevEndX = x + run.width
        }

        const text = html.replace(/\s+/g, ' ').trim()
        if (!text) continue

        // Convert PDF y (origin bottom-left) to distance from page top, then accumulate
        const yAbs = yOffset + (pageHeight - cluster.y)
        items.push({ kind: 'text', html: text, yAbs, fontSize })
      }

      // ── Image extraction ─────────────────────────────────────────────────────
      if (uploadImage) {
        const IMAGE_OP_CODES = getImageOpCodes()
        const ops = await page.getOperatorList()

        // Collect image ops: name, position/size from the CTM (current transform matrix),
        // and the transform itself for canvas cropping + deduplication.
        type ImageOp = { name: string; yAbs: number; transform: number[] }
        const imageOps: ImageOp[] = []
        let lastTransform: number[] | null = null

        for (let i = 0; i < ops.fnArray.length; i++) {
          if (ops.fnArray[i] === 12) lastTransform = ops.argsArray[i] as number[]
          if (!IMAGE_OP_CODES.has(ops.fnArray[i])) continue
          const imgName = ops.argsArray[i]?.[0] as string
          if (!imgName || !lastTransform) continue

          const pdfY = lastTransform[5] ?? 0
          const displayH = lastTransform[3] ?? 0
          const imgTopPdf = Math.max(pdfY, pdfY + displayH)
          imageOps.push({ name: imgName, yAbs: yOffset + (pageHeight - imgTopPdf), transform: [...lastTransform] })
        }

        if (imageOps.length > 0) {
          // In the browser with web worker, pdfjs transfers image pixel data from the
          // worker INTO the canvas during render() and does NOT keep raw bytes in
          // page.objs. So we render the full page and crop each image region out of
          // the rendered canvas. This is the only reliable cross-browser approach.
          const scale = 1
          const vp = page.getViewport({ scale })
          const pageCanvas = new OffscreenCanvas(Math.ceil(vp.width), Math.ceil(vp.height))
          const pageCtx = pageCanvas.getContext('2d')!
          try {
            await page.render({ canvasContext: pageCtx as any, viewport: vp }).promise
          } catch (err) {
            console.warn(`[pdfParser] page ${pageNum}: render failed`, err)
          }

          const seen = new Set<string>()
          for (const { name: imgName, yAbs, transform } of imageOps) {
            // Dedup by transform: images at the same position/size are identical
            // (e.g. same logo repeated on every page with a different XObject name).
            const transformKey = transform.join(',')
            if (seen.has(transformKey)) {
              // Reuse the URL we already uploaded for this transform
              const cached = uploadedByFingerprint.get(transformKey)
              if (cached) items.push({ kind: 'img', url: cached, yAbs })
              continue
            }
            seen.add(transformKey)

            let url = uploadedByFingerprint.get(transformKey)
            if (!url) {
              try {
                // Crop the image region from the rendered page canvas.
                // PDF transform [a, b, c, d, e, f]: e=left, f=bottom-y in PDF coords,
                // a=displayW, d=displayH (may be negative for flipped images).
                const [a, , , d, e, f] = transform
                const dispW = Math.abs(a) * scale
                const dispH = Math.abs(d) * scale
                // Convert PDF bottom-left origin to canvas top-left origin
                const cx = Math.round(e * scale)
                const cy = Math.round(vp.height - (f + Math.abs(d)) * scale)
                const cw = Math.round(dispW)
                const ch = Math.round(dispH)

                if (cw <= 0 || ch <= 0) continue
                // Clamp to canvas bounds
                const sx = Math.max(0, cx)
                const sy = Math.max(0, cy)
                const sw = Math.min(cw, pageCanvas.width - sx)
                const sh = Math.min(ch, pageCanvas.height - sy)
                if (sw <= 0 || sh <= 0) continue

                const cropCanvas = new OffscreenCanvas(sw, sh)
                const cropCtx = cropCanvas.getContext('2d')!
                cropCtx.drawImage(pageCanvas, sx, sy, sw, sh, 0, 0, sw, sh)

                const blob = await cropCanvas.convertToBlob({ type: 'image/png' })
                const imgFile = new File([blob], `img_${pageNum}_${imgName}.png`, { type: 'image/png' })
                url = await uploadImage(imgFile)
                uploadedByFingerprint.set(transformKey, url)
                console.log(`[pdfParser] uploaded "${imgName}" (${sw}×${sh}) → ${url}`)
              } catch (err) {
                console.error(`[pdfParser] crop/upload failed for "${imgName}"`, err)
                continue
              }
            }

            if (url) items.push({ kind: 'img', url, yAbs })
          }
        }
      }
    }
  } finally {
    pdf.destroy()
  }

  if (items.length === 0) return '<p></p>'

  // Sort everything top-to-bottom across the whole document
  items.sort((a, b) => a.yAbs - b.yAbs)

  const textLines = items.filter((i): i is TextLine => i.kind === 'text')
  const sizes = textLines.map((l) => l.fontSize).sort((a, b) => a - b)
  const bodySize = sizes[Math.floor(sizes.length / 2)] || 12

  // Compute the document's typical inter-line gap from the actual data.
  // Only count gaps > 0 and < 100pt — this excludes inter-page jumps (700pt+)
  // and backwards jumps. The median of these small gaps represents the normal
  // line height for this specific PDF, which we use to detect blank lines adaptively.
  const lineGaps: number[] = []
  for (let i = 1; i < textLines.length; i++) {
    const g = textLines[i].yAbs - textLines[i - 1].yAbs
    if (g > 0 && g < 100) lineGaps.push(g)
  }
  lineGaps.sort((a, b) => a - b)
  // Median gap ≈ normal line height. A blank line creates a gap of ~2× line height,
  // so any gap > 2× median (but < 200pt to exclude inter-page) is an empty line.
  const medianLineGap = lineGaps[Math.floor(lineGaps.length / 2)] || bodySize * 1.2
  const blankLineMin = medianLineGap * 2.0

  // Build HTML: flush text paragraphs on large vertical gaps; emit images inline
  const htmlParts: string[] = []
  let paragraph: TextLine[] = []

  const flushParagraph = () => {
    if (paragraph.length === 0) return
    const maxSize = Math.max(...paragraph.map((l) => l.fontSize))
    const ratio = maxSize / bodySize
    for (const line of paragraph) {
      if (ratio >= 1.5) htmlParts.push(`<h1>${line.html}</h1>`)
      else if (ratio >= 1.2) htmlParts.push(`<h2>${line.html}</h2>`)
      else htmlParts.push(`<p>${line.html}</p>`)
    }
    paragraph = []
  }

  for (const item of items) {
    if (item.kind === 'img') {
      flushParagraph()
      htmlParts.push(`<img src="${item.url}" style="max-width:100%;height:auto;" />`)
      continue
    }
    if (paragraph.length > 0) {
      const prev = paragraph[paragraph.length - 1]
      const gap = item.yAbs - prev.yAbs
      if (gap > item.fontSize * 1.6) {
        flushParagraph()
        // Gap > 2× the document's normal line height means there's a blank line.
        // Upper bound of 200pt filters out inter-page gaps (which are 700pt+).
        if (gap > blankLineMin && gap < 200) {
          htmlParts.push('<p></p>')
        }
      }
    }
    paragraph.push(item)
  }
  flushParagraph()

  return htmlParts.join('')
}

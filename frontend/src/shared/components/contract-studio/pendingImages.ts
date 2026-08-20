/**
 * Imagens pendentes do Contract Studio.
 *
 * Enquanto o modelo está sendo editado, as imagens ficam no documento como
 * **data URL** (base64, só no navegador). Elas só sobem para o S3 quando o
 * modelo é salvo — ver `uploadPendingImages`.
 *
 * POR QUÊ: antes o upload acontecia no instante em que a imagem era inserida.
 * Se o usuário fechasse o Studio sem salvar, ou trocasse a imagem por outra
 * antes de salvar, o arquivo já estava no bucket e não havia registro dele em
 * lugar nenhum — ninguém mais sabia que existia, e ele ficava lá para sempre.
 * Segurando o upload até o save, o arquivo só nasce quando tem dono.
 *
 * Os outros fluxos continuam como estavam: trocar a imagem de um modelo salvo,
 * remover a imagem e salvar, ou excluir o modelo já apagam do S3 no backend
 * (`updateContractTemplateService` / `deleteContractTemplateService`).
 */

export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
]

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024 // espelha o limite do @fastify/multipart

/** Converte o arquivo escolhido pelo usuário em data URL, sem tocar na rede. */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo.'))
    reader.readAsDataURL(file)
  })
}

/** Reconstrói um File a partir da data URL, para enviar no multipart do save. */
export function dataUrlToFile(dataUrl: string, filename: string): File {
  const [meta, base64] = dataUrl.split(',')
  const mime = meta.match(/data:([^;]+)/)?.[1] ?? 'image/png'
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  const ext = mime.split('/')[1]?.replace('jpeg', 'jpg').replace('svg+xml', 'svg') ?? 'png'
  return new File([bytes], `${filename}.${ext}`, { type: mime })
}

function collectDataUrls(node: any, found: Set<string>): void {
  if (!node || typeof node !== 'object') return
  if (node.type === 'image' && typeof node.attrs?.src === 'string' && node.attrs.src.startsWith('data:')) {
    found.add(node.attrs.src)
  }
  for (const child of node.content ?? []) collectDataUrls(child, found)
}

function replaceDataUrls(node: any, map: Map<string, string>): any {
  if (!node || typeof node !== 'object') return node
  const next = { ...node }
  if (next.type === 'image' && typeof next.attrs?.src === 'string' && map.has(next.attrs.src)) {
    next.attrs = { ...next.attrs, src: map.get(next.attrs.src) }
  }
  if (Array.isArray(next.content)) next.content = next.content.map((c: any) => replaceDataUrls(c, map))
  return next
}

/**
 * Sobe para o S3 toda imagem que ainda está como data URL e devolve o conteúdo
 * com as URLs definitivas. Data URLs idênticas (ex.: o mesmo logo repetido em
 * várias páginas) sobem uma única vez.
 *
 * Lança se algum upload falhar — quem chama NÃO deve salvar o modelo nesse
 * caso, para o conteúdo nunca ser persistido com base64 dentro.
 */
export async function uploadPendingImages(
  content: any,
  upload: (file: File) => Promise<string>,
  onProgress?: (done: number, total: number) => void,
): Promise<{ content: any; uploaded: number }> {
  const dataUrls = new Set<string>()
  collectDataUrls(content, dataUrls)

  if (dataUrls.size === 0) return { content, uploaded: 0 }

  const map = new Map<string, string>()
  let done = 0
  onProgress?.(0, dataUrls.size)

  for (const dataUrl of dataUrls) {
    const file = dataUrlToFile(dataUrl, `modelo-${Date.now()}-${done}`)
    map.set(dataUrl, await upload(file))
    done++
    onProgress?.(done, dataUrls.size)
  }

  return { content: replaceDataUrls(content, map), uploaded: map.size }
}

/** Há imagens ainda não enviadas neste conteúdo? */
export function hasPendingImages(content: any): boolean {
  const found = new Set<string>()
  collectDataUrls(content, found)
  return found.size > 0
}

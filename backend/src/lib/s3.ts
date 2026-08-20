import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3'
import { env } from '../env'

export const s3 = new S3Client({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
})

export async function uploadToS3(key: string, buffer: Buffer, mimetype: string): Promise<string> {
  await s3.send(new PutObjectCommand({
    Bucket: env.AWS_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: mimetype,
  }))
  return `https://${env.AWS_BUCKET_NAME}.s3.${env.AWS_REGION}.amazonaws.com/${key}`
}

export async function deleteFromS3(url: string): Promise<void> {
  // URL format: https://{bucket}.s3.{region}.amazonaws.com/{key}
  const match = url.match(/^https?:\/\/([^.]+)\.s3\.[^/]+\.amazonaws\.com\/(.+)$/)
  if (!match) return
  const [, bucket, key] = match
  await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
}

/**
 * Extrai a key de uma URL do S3. Devolve null se a URL não for do formato
 * esperado (ex.: avatar antigo salvo como caminho local, antes do S3).
 */
export function s3KeyFromUrl(url: string): string | null {
  const match = url.match(/^https?:\/\/([^.]+)\.s3\.[^/]+\.amazonaws\.com\/(.+)$/)
  return match ? match[2] : null
}

/**
 * Lista todas as keys sob um prefixo (paginado — o S3 devolve no máximo 1000
 * por página). Usado pela limpeza da empresa demo para achar objetos que NÃO
 * têm registro no banco (ex.: imagens que o editor de contrato sobe avulsas).
 */
export async function listS3Keys(prefix: string): Promise<string[]> {
  const keys: string[] = []
  let continuationToken: string | undefined

  do {
    const response = await s3.send(
      new ListObjectsV2Command({
        Bucket: env.AWS_BUCKET_NAME,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    )
    for (const item of response.Contents ?? []) {
      if (item.Key) keys.push(item.Key)
    }
    continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined
  } while (continuationToken)

  return keys
}

/**
 * Apaga keys em lote (o DeleteObjects aceita no máximo 1000 por chamada).
 */
export async function deleteS3Keys(keys: string[]): Promise<void> {
  for (let i = 0; i < keys.length; i += 1000) {
    const batch = keys.slice(i, i + 1000)
    await s3.send(
      new DeleteObjectsCommand({
        Bucket: env.AWS_BUCKET_NAME,
        Delete: { Objects: batch.map((Key) => ({ Key })), Quiet: true },
      }),
    )
  }
}

export async function getStreamFromS3(url: string) {
  const match = url.match(/^https?:\/\/([^.]+)\.s3\.[^/]+\.amazonaws\.com\/(.+)$/)
  if (!match) throw new Error('Invalid S3 URL')
  const [, bucket, key] = match
  const response = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }))
  return response
}

import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
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

export async function getStreamFromS3(url: string) {
  const match = url.match(/^https?:\/\/([^.]+)\.s3\.[^/]+\.amazonaws\.com\/(.+)$/)
  if (!match) throw new Error('Invalid S3 URL')
  const [, bucket, key] = match
  const response = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }))
  return response
}

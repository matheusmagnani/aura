import {
  S3Client,
  CreateBucketCommand,
  BucketAlreadyOwnedByYou,
  BucketAlreadyExists,
  PutBucketCorsCommand,
} from '@aws-sdk/client-s3'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env') })

const BUCKET_NAME = 'aura-uploads-development'
const REGION = process.env.AWS_REGION!

const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

async function main() {
  console.log(`Criando bucket "${BUCKET_NAME}" na região ${REGION}...`)

  try {
    await s3.send(new CreateBucketCommand({
      Bucket: BUCKET_NAME,
      ...(REGION !== 'us-east-1' && {
        CreateBucketConfiguration: { LocationConstraint: REGION as any },
      }),
    }))
    console.log(`Bucket "${BUCKET_NAME}" criado com sucesso!`)
  } catch (err: any) {
    if (err instanceof BucketAlreadyOwnedByYou || err instanceof BucketAlreadyExists || err.name === 'BucketAlreadyOwnedByYou') {
      console.log(`Bucket "${BUCKET_NAME}" já existe na sua conta.`)
    } else {
      throw err
    }
  }

  await s3.send(new PutBucketCorsCommand({
    Bucket: BUCKET_NAME,
    CORSConfiguration: {
      CORSRules: [
        {
          AllowedHeaders: ['*'],
          AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE'],
          AllowedOrigins: ['http://localhost:5173', 'http://localhost:5174'],
          ExposeHeaders: [],
        },
      ],
    },
  }))
  console.log('CORS configurado. Pronto!')
}

main().catch((err) => {
  console.error('Erro:', err.message)
  process.exit(1)
})

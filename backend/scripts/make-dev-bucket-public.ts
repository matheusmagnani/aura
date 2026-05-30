import {
  S3Client,
  PutBucketPolicyCommand,
  DeletePublicAccessBlockCommand,
} from '@aws-sdk/client-s3'

const BUCKET_NAME = 'aura-uploads-development'
const REGION = 'sa-east-1'

const adminKey = process.env.AWS_ADMIN_KEY
const adminSecret = process.env.AWS_ADMIN_SECRET

if (!adminKey || !adminSecret) {
  console.error('Forneça as credenciais admin:')
  console.error('AWS_ADMIN_KEY=xxx AWS_ADMIN_SECRET=yyy npx tsx scripts/make-dev-bucket-public.ts')
  process.exit(1)
}

const s3 = new S3Client({
  region: REGION,
  credentials: { accessKeyId: adminKey, secretAccessKey: adminSecret },
})

async function main() {
  console.log('Removendo bloqueio de acesso público...')
  await s3.send(new DeletePublicAccessBlockCommand({ Bucket: BUCKET_NAME }))

  console.log('Aplicando bucket policy de leitura pública...')
  await s3.send(new PutBucketPolicyCommand({
    Bucket: BUCKET_NAME,
    Policy: JSON.stringify({
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'PublicReadGetObject',
          Effect: 'Allow',
          Principal: '*',
          Action: 's3:GetObject',
          Resource: `arn:aws:s3:::${BUCKET_NAME}/*`,
        },
      ],
    }),
  }))

  console.log(`Pronto! Bucket "${BUCKET_NAME}" agora permite leitura pública.`)
}

main().catch((err) => {
  console.error('Erro:', err.message)
  process.exit(1)
})

import {
  IAMClient,
  GetUserPolicyCommand,
  PutUserPolicyCommand,
  NoSuchEntityException,
} from '@aws-sdk/client-iam'

// Roda com credenciais admin:
// AWS_ADMIN_KEY=xxx AWS_ADMIN_SECRET=yyy npx tsx scripts/add-dev-bucket-policy.ts

const IAM_USER = 'aura-s3-backend'
const POLICY_NAME = 'aura-s3-policy'
const DEV_BUCKET = 'aura-uploads-development'
const PROD_BUCKET = 'aura-uploads-prod'

const adminKey = process.env.AWS_ADMIN_KEY
const adminSecret = process.env.AWS_ADMIN_SECRET
const region = process.env.AWS_REGION || 'sa-east-1'

if (!adminKey || !adminSecret) {
  console.error('Forneça as credenciais admin:')
  console.error('AWS_ADMIN_KEY=xxx AWS_ADMIN_SECRET=yyy npx tsx scripts/add-dev-bucket-policy.ts')
  process.exit(1)
}

const iam = new IAMClient({
  region,
  credentials: { accessKeyId: adminKey, secretAccessKey: adminSecret },
})

async function main() {
  // Tenta ler a policy inline existente do usuário
  let existingPolicy: any = null
  try {
    const res = await iam.send(new GetUserPolicyCommand({ UserName: IAM_USER, PolicyName: POLICY_NAME }))
    existingPolicy = JSON.parse(decodeURIComponent(res.PolicyDocument!))
    console.log('Policy existente encontrada.')
  } catch (err: any) {
    if (err instanceof NoSuchEntityException || err.name === 'NoSuchEntityException') {
      console.log('Nenhuma policy inline encontrada — criando nova.')
    } else {
      throw err
    }
  }

  const devArn = `arn:aws:s3:::${DEV_BUCKET}/*`

  if (existingPolicy) {
    const statements: any[] = existingPolicy.Statement

    // Verifica se já existe uma statement que cobre o bucket de dev
    const alreadyHas = statements.some((s: any) => {
      const resources = Array.isArray(s.Resource) ? s.Resource : [s.Resource]
      return resources.includes(devArn)
    })

    if (alreadyHas) {
      console.log(`Permissão para "${DEV_BUCKET}" já existe. Nada a fazer.`)
      return
    }

    // Adiciona o bucket de dev na statement existente de S3, ou cria nova statement
    const s3Statement = statements.find((s: any) => {
      const resources = Array.isArray(s.Resource) ? s.Resource : [s.Resource]
      return resources.some((r: string) => r.includes(PROD_BUCKET))
    })

    if (s3Statement) {
      if (Array.isArray(s3Statement.Resource)) {
        s3Statement.Resource.push(devArn)
      } else {
        s3Statement.Resource = [s3Statement.Resource, devArn]
      }
    } else {
      statements.push({
        Effect: 'Allow',
        Action: ['s3:PutObject', 's3:GetObject', 's3:DeleteObject'],
        Resource: devArn,
      })
    }

    existingPolicy.Statement = statements
  } else {
    existingPolicy = {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Action: ['s3:PutObject', 's3:GetObject', 's3:DeleteObject'],
          Resource: [`arn:aws:s3:::${PROD_BUCKET}/*`, devArn],
        },
      ],
    }
  }

  await iam.send(new PutUserPolicyCommand({
    UserName: IAM_USER,
    PolicyName: POLICY_NAME,
    PolicyDocument: JSON.stringify(existingPolicy),
  }))

  console.log(`Permissão para "${DEV_BUCKET}" adicionada ao usuário "${IAM_USER}" com sucesso!`)
}

main().catch((err) => {
  console.error('Erro:', err.message)
  process.exit(1)
})

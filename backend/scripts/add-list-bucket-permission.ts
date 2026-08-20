import {
  IAMClient,
  GetUserPolicyCommand,
  PutUserPolicyCommand,
  NoSuchEntityException,
} from '@aws-sdk/client-iam'

// Roda com credenciais admin:
// AWS_ADMIN_KEY=xxx AWS_ADMIN_SECRET=yyy npx tsx scripts/add-list-bucket-permission.ts
//
// Adiciona `s3:ListBucket` à policy do usuário do backend.
//
// POR QUE: o job `demo:reset` limpa as imagens que o editor de contrato sobe
// (`contracts/models-images/{companyId}-*`). Elas NÃO têm registro no banco —
// a única forma de achá-las é varrer o prefixo com ListObjectsV2, que exige
// `s3:ListBucket`. Sem essa permissão o job continua rodando (a falha é
// engolida de propósito, pra não impedir a limpeza do banco), mas essas
// imagens ficam órfãs no bucket para sempre, acumulando custo.
//
// DETALHE QUE COSTUMA PASSAR BATIDO: ListBucket é uma permissão sobre o
// BUCKET (`arn:aws:s3:::bucket`), não sobre os objetos (`arn:aws:s3:::bucket/*`).
// Por isso ela precisa de uma statement própria — não adianta somá-la à
// statement existente de PutObject/GetObject/DeleteObject.

const IAM_USER = 'aura-s3-backend'
const POLICY_NAME = 'aura-s3-policy'
const BUCKETS = ['aura-uploads-prod', 'aura-uploads-development']

const adminKey = process.env.AWS_ADMIN_KEY
const adminSecret = process.env.AWS_ADMIN_SECRET
const region = process.env.AWS_REGION || 'sa-east-1'

if (!adminKey || !adminSecret) {
  console.error('Forneça as credenciais admin:')
  console.error('AWS_ADMIN_KEY=xxx AWS_ADMIN_SECRET=yyy npx tsx scripts/add-list-bucket-permission.ts')
  process.exit(1)
}

const iam = new IAMClient({
  region,
  credentials: { accessKeyId: adminKey, secretAccessKey: adminSecret },
})

const bucketArns = BUCKETS.map((b) => `arn:aws:s3:::${b}`)

async function main() {
  let policy: any = null

  try {
    const res = await iam.send(
      new GetUserPolicyCommand({ UserName: IAM_USER, PolicyName: POLICY_NAME }),
    )
    policy = JSON.parse(decodeURIComponent(res.PolicyDocument!))
    console.log('Policy existente encontrada.')
  } catch (err: any) {
    if (err instanceof NoSuchEntityException || err.name === 'NoSuchEntityException') {
      console.error(`Policy "${POLICY_NAME}" não existe no usuário "${IAM_USER}".`)
      console.error('Rode antes o scripts/add-dev-bucket-policy.ts.')
      process.exit(1)
    }
    throw err
  }

  const statements: any[] = policy.Statement

  // Procura uma statement que já conceda ListBucket
  const listStatement = statements.find((s: any) => {
    const actions = Array.isArray(s.Action) ? s.Action : [s.Action]
    return actions.includes('s3:ListBucket')
  })

  if (listStatement) {
    const resources: string[] = Array.isArray(listStatement.Resource)
      ? listStatement.Resource
      : [listStatement.Resource]
    const faltando = bucketArns.filter((arn) => !resources.includes(arn))

    if (faltando.length === 0) {
      console.log('s3:ListBucket já concedido para todos os buckets. Nada a fazer.')
      return
    }

    listStatement.Resource = [...resources, ...faltando]
    console.log(`Adicionando ListBucket para: ${faltando.join(', ')}`)
  } else {
    statements.push({
      Effect: 'Allow',
      Action: ['s3:ListBucket'],
      Resource: bucketArns,
    })
    console.log(`Criando statement de ListBucket para: ${bucketArns.join(', ')}`)
  }

  policy.Statement = statements

  await iam.send(
    new PutUserPolicyCommand({
      UserName: IAM_USER,
      PolicyName: POLICY_NAME,
      PolicyDocument: JSON.stringify(policy),
    }),
  )

  console.log(`✓ s3:ListBucket concedido ao usuário "${IAM_USER}".`)
  console.log('  Confira rodando o job demo:reset com ?dryRun=true — o campo')
  console.log('  s3Objects deve passar a contar as imagens do editor.')
}

main().catch((err) => {
  console.error('Erro:', err.message)
  process.exit(1)
})

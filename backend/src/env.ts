import { z } from 'zod'

/**
 * Trata variável definida porém VAZIA (`FOO=""`) como ausente.
 *
 * Sem isso, `z.coerce.number()` transforma `""` em `0` e um `.positive()`
 * derruba o processo inteiro no boot — o mesmo vale para `""` num `.email()`.
 * Acontece na prática: `.env` com placeholder vazio, ou `fly secrets set FOO=""`.
 * Uma variável opcional em branco deve simplesmente não existir, nunca impedir
 * o servidor de subir.
 */
const optional = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (v === '' ? undefined : v), schema.optional())

const envSchema = z.object({
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string(),
  PORT: z.coerce.number().default(3333),
  CORS_ORIGIN: z.string().default('http://localhost:5173,http://localhost:5174'),
  AWS_ACCESS_KEY_ID: z.string(),
  AWS_SECRET_ACCESS_KEY: z.string(),
  AWS_BUCKET_NAME: z.string(),
  AWS_REGION: z.string(),

  // --- Jobs agendados (módulo `jobs`) ---
  // Chaves de assinatura do QStash. São DUAS porque o Upstash faz rotação: a
  // "current" assina hoje, a "next" passa a assinar após a rotação — verificar
  // com as duas evita janela de falha. Opcionais: sem elas o servidor sobe
  // normalmente, mas a rota de jobs recusa qualquer disparo.
  QSTASH_CURRENT_SIGNING_KEY: optional(z.string()),
  QSTASH_NEXT_SIGNING_KEY: optional(z.string()),
  // URL pública do backend (ex.: https://beetsbr-aura-backend.fly.dev). Se
  // definida, a assinatura do QStash também é validada contra a URL de destino
  // (impede replay do mesmo request em outro endpoint). Opcional porque atrás
  // do proxy da Fly a URL reconstruída pode divergir e gerar falso negativo.
  JOBS_PUBLIC_URL: optional(z.string()),

  // --- Empresa de demonstração (job `demo:reset`) ---
  DEMO_COMPANY_ID: optional(z.coerce.number().int().positive()),
  DEMO_COMPANY_NAME: optional(z.string()),
  DEMO_USER_NAME: optional(z.string()),
  DEMO_USER_EMAIL: optional(z.string().email()),
  DEMO_USER_PASSWORD: optional(z.string().min(6)),
  // URL pública da foto do usuário demo (S3). Restaurada a cada reset e
  // PROTEGIDA contra exclusão — ver `isProtectedDemoAvatar` em lib/demoReset.ts.
  DEMO_USER_AVATAR: optional(z.string().url()),
})

export const env = envSchema.parse(process.env)

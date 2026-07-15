import { app } from './app'
import { env } from './env'
import { prisma } from './lib/prisma'
import { warmupBrowser } from './modules/contracts/contract.service'

async function start() {
  // Conecta o Prisma no boot pra tirar o custo de conexão do caminho da
  // primeira query — importante com auto_stop, onde o processo sobe frio a
  // cada wake e o Neon pode estar resumindo o compute.
  await prisma.$connect()
  await app.listen({ port: env.PORT, host: '0.0.0.0' })
  console.log(`🚀 Aura server running on port ${env.PORT}`)
  warmupBrowser()
}

start().catch((err) => {
  console.error('Falha ao iniciar o servidor:', err)
  process.exit(1)
})

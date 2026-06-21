import { app } from './app'
import { env } from './env'
import { warmupBrowser } from './modules/contracts/contract.service'

app
  .listen({ port: env.PORT, host: '0.0.0.0' })
  .then(() => {
    console.log(`🚀 Aura server running on port ${env.PORT}`)
    warmupBrowser()
  })

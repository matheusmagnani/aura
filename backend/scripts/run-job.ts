import { runJobService } from '../src/modules/jobs/job.service'
import { JOB_REGISTRY } from '../src/modules/jobs/job.registry'

/**
 * Executa um job do registry pela linha de comando, sem passar pelo HTTP.
 *
 * Uso:
 *   npx tsx --env-file=.env scripts/run-job.ts demo:reset --dry-run
 *   npx tsx --env-file=.env scripts/run-job.ts demo:reset
 *
 * Existe porque o QStash não alcança `localhost` — em dev não dá para disparar
 * pelo caminho normal. Também serve em produção via `fly ssh console` quando
 * for preciso rodar algo fora do horário agendado.
 *
 * Roda exatamente o mesmo `runJobService` da rota HTTP: grava JobRun, respeita
 * o lock de execução concorrente e devolve o mesmo resultado.
 */
async function main() {
  const [name, ...flags] = process.argv.slice(2)
  const dryRun = flags.includes('--dry-run')

  if (!name) {
    console.error('Informe o job. Disponíveis:')
    for (const job of Object.keys(JOB_REGISTRY)) console.error(`  · ${job}`)
    console.error('\nEx: npx tsx --env-file=.env scripts/run-job.ts demo:reset --dry-run')
    process.exit(1)
  }

  if (!JOB_REGISTRY[name]) {
    console.error(`Job "${name}" não existe. Disponíveis: ${Object.keys(JOB_REGISTRY).join(', ')}`)
    process.exit(1)
  }

  console.log(`Executando "${name}"${dryRun ? ' (dry-run — não escreve nada)' : ''}...\n`)

  try {
    const result = await runJobService(name, dryRun)
    console.log(JSON.stringify(result, null, 2))
    if (result.status === 'skipped') {
      console.log('\n⚠️  Pulado — já havia uma execução em andamento.')
    }
  } catch (err: any) {
    console.error('\n✗ O job falhou:', err?.message ?? err)
    process.exit(1)
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })

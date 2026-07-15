import { useLoadingStore } from '../stores/useLoadingStore'
import { FullScreenLoading } from './FullScreenLoading'

/**
 * Overlay de bloqueio global exibido durante requisições de cadastro/edição
 * (as marcadas com `meta.blockingLoader`). Sem texto — o cliente vê apenas o
 * loading padrão, sem saber que às vezes estamos aguardando o servidor acordar.
 * Trava a tela pra o usuário não empilhar novas requisições enquanto aguarda.
 */
export function GlobalLoading() {
  const count = useLoadingStore((s) => s.count)
  return <FullScreenLoading visible={count > 0} />
}

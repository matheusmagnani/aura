/**
 * Perfil cadastral da empresa de demonstração.
 *
 * É a fonte de verdade dos dados que o job `demo:reset` RESTAURA a cada rodada.
 * Não são apagados: uma empresa recém-cadastrada tem esses campos preenchidos
 * (o formulário de registro pede todos eles), e os contratos gerados usam
 * `{{empresa.cnpj}}`, `{{empresa.email}}`, `{{empresa.telefone}}` e
 * `{{empresa.endereco}}` — com eles nulos, o contrato da demo sai furado.
 *
 * Restaurar (em vez de simplesmente não mexer) é o que desfaz as edições de
 * quem testou: se um prospect trocar o nome da empresa, na semana seguinte ele
 * volta ao definido aqui.
 *
 * Editar este arquivo é a forma de mudar os dados da demo — os campos seguem a
 * regra do projeto de armazenamento sem formatação (só dígitos em cnpj, phone
 * e zipCode).
 */
export const DEMO_COMPANY_PROFILE = {
  name: 'Empresa Demonstração',
  tradeName: 'Aura Demonstração',
  cnpj: '11222333000181', // fictício, mas com dígitos verificadores válidos
  email: 'contato@demonstracao.com.br',
  phone: '31999999999',
  department: 'Comercial',
  zipCode: '31680020',
  address: 'Rua Tatuapé',
  addressNumber: '100',
  addressComplement: null as string | null,
  neighborhood: 'Maria Helena',
  city: 'Belo Horizonte',
  state: 'MG',
}

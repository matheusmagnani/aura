export interface ContractVariable {
  key: string
  label: string
  group: string
}

export const CONTRACT_VARIABLES: ContractVariable[] = [
  { key: '{{cliente.nome}}', label: 'Nome do cliente', group: 'Cliente' },
  { key: '{{cliente.email}}', label: 'E-mail do cliente', group: 'Cliente' },
  { key: '{{cliente.telefone}}', label: 'Telefone do cliente', group: 'Cliente' },
  { key: '{{cliente.cpf_cnpj}}', label: 'CPF/CNPJ do cliente', group: 'Cliente' },
  { key: '{{cliente.endereco}}', label: 'Endereço do cliente', group: 'Cliente' },
  { key: '{{empresa.nome}}', label: 'Nome da empresa', group: 'Empresa' },
  { key: '{{empresa.cnpj}}', label: 'CNPJ da empresa', group: 'Empresa' },
  { key: '{{empresa.email}}', label: 'E-mail da empresa', group: 'Empresa' },
  { key: '{{empresa.telefone}}', label: 'Telefone da empresa', group: 'Empresa' },
  { key: '{{empresa.endereco}}', label: 'Endereço da empresa', group: 'Empresa' },
  { key: '{{proposta.valor}}', label: 'Valor da proposta', group: 'Proposta' },
  { key: '{{proposta.descricao}}', label: 'Descrição da proposta', group: 'Proposta' },
  { key: '{{proposta.observacoes}}', label: 'Observações da proposta', group: 'Proposta' },
  { key: '{{contrato.data}}', label: 'Data do contrato', group: 'Contrato' },
  { key: '{{contrato.numero}}', label: 'Número do contrato', group: 'Contrato' },
]

export const CONTRACT_VARIABLE_GROUPS = [...new Set(CONTRACT_VARIABLES.map((v) => v.group))]

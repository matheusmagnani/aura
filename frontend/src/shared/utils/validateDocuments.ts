export function validateCPF(value: string): boolean {
  const cpf = value.replace(/\D/g, '')
  if (cpf.length !== 11) return false
  if (/^(\d)\1{10}$/.test(cpf)) return false

  let sum = 0
  for (let i = 0; i < 9; i++) sum += parseInt(cpf[i]) * (10 - i)
  let remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== parseInt(cpf[9])) return false

  sum = 0
  for (let i = 0; i < 10; i++) sum += parseInt(cpf[i]) * (11 - i)
  remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  return remainder === parseInt(cpf[10])
}

export function validateCNPJ(value: string): boolean {
  const cnpj = value.replace(/\D/g, '')
  if (cnpj.length !== 14) return false
  if (/^(\d)\1{13}$/.test(cnpj)) return false

  const calc = (cnpj: string, weights: number[]) => {
    const sum = weights.reduce((acc, w, i) => acc + parseInt(cnpj[i]) * w, 0)
    const remainder = sum % 11
    return remainder < 2 ? 0 : 11 - remainder
  }

  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]

  if (calc(cnpj, weights1) !== parseInt(cnpj[12])) return false
  return calc(cnpj, weights2) === parseInt(cnpj[13])
}

export function formatCPF(value: string): string {
  const c = value.replace(/\D/g, '').slice(0, 11)
  return c
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

export function formatCNPJ(value: string): string {
  const c = value.replace(/\D/g, '').slice(0, 14)
  return c
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
}

export function formatPhone(phone: string): string {
  const c = phone.replace(/\D/g, '').slice(0, 11)
  if (c.length <= 10) return c.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2')
  return c.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2')
}

export function formatZipCode(zip: string): string {
  const c = zip.replace(/\D/g, '').slice(0, 8)
  return c.replace(/(\d{5})(\d)/, '$1-$2')
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR')
}

export function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function getApiError(err: unknown, fallback = 'Ocorreu um erro. Tente novamente.'): string {
  if (err && typeof err === 'object') {
    const e = err as any
    const message: string = e?.response?.data?.message || e?.message || fallback
    const missingFields: string[] = e?.response?.data?.missingFields ?? []
    if (missingFields.length > 0) {
      return `${message}\n${missingFields.map((f: string) => `• ${f}`).join('\n')}`
    }
    return message
  }
  return fallback
}

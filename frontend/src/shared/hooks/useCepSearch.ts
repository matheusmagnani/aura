import { useState, useCallback } from 'react'

export interface CepAddress {
  street: string
  neighborhood: string
  city: string
  state: string
}

async function fetchFromBrasilApi(cep: string): Promise<CepAddress | null> {
  const response = await fetch(`https://brasilapi.com.br/api/cep/v1/${cep}`)
  if (!response.ok) return null
  const data = await response.json()
  return { street: data.street || '', neighborhood: data.neighborhood || '', city: data.city || '', state: data.state || '' }
}

async function fetchFromViaCep(cep: string): Promise<CepAddress | null> {
  const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
  if (!response.ok) return null
  const data = await response.json()
  if (data.erro) return null
  return { street: data.logradouro || '', neighborhood: data.bairro || '', city: data.localidade || '', state: data.uf || '' }
}

async function fetchFromAwesomeApi(cep: string): Promise<CepAddress | null> {
  const response = await fetch(`https://cep.awesomeapi.com.br/json/${cep}`)
  if (!response.ok) return null
  const data = await response.json()
  return { street: data.address || '', neighborhood: data.district || '', city: data.city || '', state: data.state || '' }
}

const providers = [fetchFromBrasilApi, fetchFromViaCep, fetchFromAwesomeApi]

async function searchCep(cep: string): Promise<CepAddress | null> {
  for (const provider of providers) {
    try {
      const result = await provider(cep)
      if (result && (result.city || result.street)) return result
    } catch {
      continue
    }
  }
  return null
}

export function useCepSearch() {
  const [isLoading, setIsLoading] = useState(false)

  const fetchAddress = useCallback(async (cep: string): Promise<CepAddress | null> => {
    const clean = cep.replace(/\D/g, '')
    if (clean.length !== 8) return null
    setIsLoading(true)
    try {
      return await searchCep(clean)
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { fetchAddress, isLoading }
}

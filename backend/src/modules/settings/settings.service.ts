import { prisma } from '../../lib/prisma'
import { createLog, getActorName } from '../logs/log.service'

interface UpdateCompanyInput {
  companyName?: string
  tradeName?: string
  cnpj?: string
  department?: string
  email?: string
  phone?: string
  address?: string
  addressNumber?: string
  addressComplement?: string
  neighborhood?: string
  city?: string
  state?: string
  zipCode?: string
}

const SELECT_COMPANY = {
  id: true,
  name: true,
  tradeName: true,
  cnpj: true,
  email: true,
  phone: true,
  department: true,
  zipCode: true,
  address: true,
  addressNumber: true,
  addressComplement: true,
  neighborhood: true,
  city: true,
  state: true,
}

export async function getCompanyInfoService(companyId: number) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: SELECT_COMPANY,
  })

  if (!company) {
    throw { statusCode: 404, message: 'Empresa não encontrada.' }
  }

  return company
}

export async function updateCompanyInfoService(
  companyId: number,
  data: UpdateCompanyInput,
  actor: { userId: number },
) {
  if (data.cnpj) {
    const cnpjClean = data.cnpj.replace(/\D/g, '')
    const existing = await prisma.company.findFirst({
      where: { cnpj: cnpjClean, id: { not: companyId }, deletedAt: null },
    })
    if (existing) {
      throw { statusCode: 409, message: 'CNPJ já cadastrado.' }
    }
  }

  const before = await prisma.company.findUnique({ where: { id: companyId }, select: SELECT_COMPANY })

  const company = await prisma.company.update({
    where: { id: companyId },
    data: {
      ...(data.companyName && { name: data.companyName }),
      ...(data.tradeName !== undefined && { tradeName: data.tradeName }),
      ...(data.cnpj !== undefined && { cnpj: data.cnpj.replace(/\D/g, '') }),
      ...(data.department !== undefined && { department: data.department }),
      ...(data.email !== undefined && { email: data.email }),
      ...(data.phone !== undefined && { phone: data.phone.replace(/\D/g, '') }),
      ...(data.address !== undefined && { address: data.address }),
      ...(data.addressNumber !== undefined && { addressNumber: data.addressNumber }),
      ...(data.addressComplement !== undefined && { addressComplement: data.addressComplement }),
      ...(data.neighborhood !== undefined && { neighborhood: data.neighborhood }),
      ...(data.city !== undefined && { city: data.city }),
      ...(data.state !== undefined && { state: data.state }),
      ...(data.zipCode !== undefined && { zipCode: data.zipCode.replace(/\D/g, '') }),
    },
    select: SELECT_COMPANY,
  })

  if (before) {
    const FIELD_MAP: Record<string, keyof typeof before> = {
      companyName: 'name', tradeName: 'tradeName', cnpj: 'cnpj', department: 'department',
      email: 'email', phone: 'phone', address: 'address', addressNumber: 'addressNumber',
      addressComplement: 'addressComplement', neighborhood: 'neighborhood', city: 'city',
      state: 'state', zipCode: 'zipCode',
    }
    const LABEL_MAP: Record<string, string> = {
      name: 'Nome da empresa', tradeName: 'Nome fantasia da empresa', cnpj: 'CNPJ da empresa',
      department: 'Departamento da empresa', email: 'E-mail da empresa', phone: 'Telefone da empresa',
      address: 'Endereço da empresa', addressNumber: 'Número do endereço da empresa',
      addressComplement: 'Complemento da empresa', neighborhood: 'Bairro da empresa',
      city: 'Cidade da empresa', state: 'UF da empresa', zipCode: 'CEP da empresa',
    }
    const STRIP_FIELDS = new Set(['cnpj', 'phone', 'zipCode'])
    const normalize = (k: string, val: unknown) =>
      STRIP_FIELDS.has(k) && typeof val === 'string' ? val.replace(/\D/g, '') : val
    const prev: Record<string, unknown> = {}
    const changed: Record<string, unknown> = {}
    for (const [k, field] of Object.entries(FIELD_MAP)) {
      const newVal = normalize(k, k === 'companyName' ? data.companyName : (data as any)[k])
      const oldVal = normalize(k, before[field])
      if (newVal !== undefined && oldVal !== newVal) {
        const label = LABEL_MAP[field as string] ?? field
        prev[label] = oldVal
        changed[label] = newVal
      }
    }
    if (Object.keys(changed).length > 0) {
      const userName = await getActorName(actor.userId)
      await createLog({
        companyId, userId: actor.userId, userName,
        module: 'empresa', action: 'edit',
        entityId: companyId, entityName: company.tradeName ?? company.name,
        description: 'Dados da empresa atualizados',
        metadata: { before: prev, after: changed },
      })
    }
  }

  return company
}

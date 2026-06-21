import puppeteer from 'puppeteer'
import { prisma } from '../../lib/prisma'
import { uploadToS3, deleteFromS3 } from '../../lib/s3'
import { createLog, getActorName } from '../logs/log.service'

// ─── Formatting helpers ───────────────────────────────────────────────────────

function formatPhone(raw: string | null | undefined): string {
  if (!raw) return ''
  const d = raw.replace(/\D/g, '')
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return raw
}

function formatCNPJ(raw: string | null | undefined): string {
  if (!raw) return ''
  const d = raw.replace(/\D/g, '')
  if (d.length === 14) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
  return raw
}

function formatCPF(raw: string | null | undefined): string {
  if (!raw) return ''
  const d = raw.replace(/\D/g, '')
  if (d.length === 11) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
  return raw
}

function formatDocument(doc: string | null | undefined, type: string | null | undefined): string {
  if (!doc) return ''
  return type === 'CNPJ' ? formatCNPJ(doc) : formatCPF(doc)
}

function formatCurrency(value: any): string {
  const n = typeof value === 'object' && value !== null ? Number(value.toString()) : Number(value)
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function buildAddress(entity: {
  address?: string | null
  addressNumber?: string | null
  addressComplement?: string | null
  neighborhood?: string | null
  city?: string | null
  state?: string | null
  zipCode?: string | null
}): string {
  const parts = [
    entity.address,
    entity.addressNumber ? `nº ${entity.addressNumber}` : null,
    entity.addressComplement,
    entity.neighborhood,
    entity.city && entity.state ? `${entity.city}/${entity.state}` : entity.city ?? entity.state,
    entity.zipCode ? `CEP ${entity.zipCode.replace(/\D/g, '').replace(/(\d{5})(\d{3})/, '$1-$2')}` : null,
  ].filter(Boolean)
  return parts.join(', ')
}

// ─── TipTap JSON → HTML ───────────────────────────────────────────────────────

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function marksToAttrs(marks: any[]): { style: string; wrappers: string[] } {
  const styles: string[] = []
  const wrappers: string[] = []
  for (const mark of marks ?? []) {
    if (mark.type === 'bold') wrappers.push('strong')
    if (mark.type === 'italic') wrappers.push('em')
    if (mark.type === 'underline') styles.push('text-decoration: underline')
    if (mark.type === 'textStyle') {
      if (mark.attrs?.color) styles.push(`color: ${mark.attrs.color}`)
      if (mark.attrs?.fontFamily) styles.push(`font-family: ${mark.attrs.fontFamily}`)
      if (mark.attrs?.fontSize) styles.push(`font-size: ${mark.attrs.fontSize}`)
    }
  }
  return { style: styles.join('; '), wrappers }
}

function nodeToHtml(node: any): string {
  if (!node) return ''
  switch (node.type) {
    case 'doc':
      return (node.content ?? []).map(nodeToHtml).join('')

    case 'paragraph': {
      const align = node.attrs?.textAlign ? `text-align: ${node.attrs.textAlign};` : ''
      const style = align ? ` style="${align}"` : ''
      const inner = (node.content ?? []).map(nodeToHtml).join('')
      return `<p${style}>${inner || '&nbsp;'}</p>`
    }

    case 'heading': {
      const level = node.attrs?.level ?? 1
      const align = node.attrs?.textAlign ? `text-align: ${node.attrs.textAlign};` : ''
      const style = align ? ` style="${align}"` : ''
      return `<h${level}${style}>${(node.content ?? []).map(nodeToHtml).join('')}</h${level}>`
    }

    case 'text': {
      const { style, wrappers } = marksToAttrs(node.marks ?? [])
      let html = escapeHtml(node.text ?? '')
      if (style) html = `<span style="${style}">${html}</span>`
      for (const tag of wrappers) html = `<${tag}>${html}</${tag}>`
      return html
    }

    case 'image': {
      const src = node.attrs?.src ?? ''
      const widthPx = node.attrs?.width ? `width: ${node.attrs.width}px; ` : ''
      const align: string = node.attrs?.align ?? node.attrs?.textAlign ?? 'left'
      const justify = align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start'
      return `<div style="display: flex; justify-content: ${justify};"><img src="${src}" style="${widthPx}max-width: 100%; height: auto;" /></div>`
    }

    case 'bulletList':
      return `<ul>${(node.content ?? []).map(nodeToHtml).join('')}</ul>`

    case 'orderedList':
      return `<ol>${(node.content ?? []).map(nodeToHtml).join('')}</ol>`

    case 'listItem':
      return `<li>${(node.content ?? []).map(nodeToHtml).join('')}</li>`

    case 'hardBreak':
      return '<br>'

    case 'horizontalRule':
      return '<hr>'

    case 'blockquote':
      return `<blockquote>${(node.content ?? []).map(nodeToHtml).join('')}</blockquote>`

    default:
      return (node.content ?? []).map(nodeToHtml).join('')
  }
}

function tiptapToHtml(json: any, title: string): string {
  const body = nodeToHtml(json)
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 12pt; line-height: 1.6; color: #111; background: #fff; padding: 40px; }
    h1 { font-size: 20pt; margin-bottom: 12px; }
    h2 { font-size: 16pt; margin-bottom: 10px; }
    h3 { font-size: 13pt; margin-bottom: 8px; }
    p { margin-bottom: 8px; }
    ul, ol { margin: 8px 0 8px 24px; }
    li { margin-bottom: 4px; }
    img { display: block; }
    hr { border: none; border-top: 1px solid #ccc; margin: 16px 0; }
    blockquote { border-left: 3px solid #ccc; padding-left: 12px; color: #555; }
  </style>
</head>
<body>${body}</body>
</html>`
}

// ─── S3 image cleanup ────────────────────────────────────────────────────────

export function extractImageUrlsFromContent(node: any, found: string[] = []): string[] {
  if (!node) return found
  if (node.type === 'image' && node.attrs?.src) found.push(node.attrs.src)
  for (const child of node.content ?? []) extractImageUrlsFromContent(child, found)
  return found
}

export async function deleteContentImagesFromS3(content: any): Promise<void> {
  const urls = extractImageUrlsFromContent(content)
  await Promise.allSettled(urls.map((url) => deleteFromS3(url)))
}

// ─── Variable extraction ──────────────────────────────────────────────────────

function extractVariables(node: any, found: Set<string> = new Set()): Set<string> {
  if (!node) return found
  if (node.type === 'variableChip') {
    const key = node.attrs?.variable ?? ''
    if (key) found.add(key)
    return found
  }
  if (node.content) {
    for (const child of node.content) extractVariables(child, found)
  }
  return found
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  money: 'Dinheiro',
  pix: 'Pix',
  boleto: 'Boleto',
  card: 'Cartão',
}

const DEADLINE_TYPE_LABELS: Record<string, string> = {
  business: 'úteis',
  calendar: 'corridos',
}

const VARIABLE_LABELS: Record<string, string> = {
  '{{cliente.nome}}': 'Nome do cliente',
  '{{cliente.email}}': 'E-mail do cliente',
  '{{cliente.telefone}}': 'Telefone do cliente',
  '{{cliente.cpf_cnpj}}': 'CPF/CNPJ do cliente',
  '{{cliente.endereco}}': 'Endereço do cliente',
  '{{empresa.nome}}': 'Nome da empresa',
  '{{empresa.cnpj}}': 'CNPJ da empresa',
  '{{empresa.email}}': 'E-mail da empresa',
  '{{empresa.telefone}}': 'Telefone da empresa',
  '{{empresa.endereco}}': 'Endereço da empresa',
  '{{proposta.valor}}': 'Valor da proposta',
  '{{proposta.descricao}}': 'Descrição da proposta',
  '{{proposta.observacoes}}': 'Observações da proposta',
  '{{proposta.prazo}}': 'Prazo de entrega',
  '{{proposta.sinal}}': 'Valor do sinal',
  '{{proposta.forma_pagamento_sinal}}': 'Forma de pagamento do sinal',
  '{{proposta.restante}}': 'Valor restante',
  '{{proposta.forma_pagamento_restante}}': 'Forma de pagamento restante',
}

// Variables that are optional — empty value is acceptable (proposal may not have them set)
const OPTIONAL_VARS = new Set([
  '{{proposta.prazo}}',
  '{{proposta.sinal}}',
  '{{proposta.forma_pagamento_sinal}}',
  '{{proposta.restante}}',
  '{{proposta.forma_pagamento_restante}}',
  '{{proposta.descricao}}',
  '{{proposta.observacoes}}',
])

function checkMissingVars(
  usedVars: Set<string>,
  vars: Record<string, string>,
): string[] {
  const missing: string[] = []
  for (const key of usedVars) {
    if (OPTIONAL_VARS.has(key)) continue
    const value = vars[key]
    if (value === undefined || value === null || value.trim() === '') {
      missing.push(VARIABLE_LABELS[key] ?? key)
    }
  }
  return missing
}

// ─── Variable substitution ────────────────────────────────────────────────────

function substituteVariablesInNode(node: any, vars: Record<string, string>): any {
  if (!node) return node
  if (node.type === 'variableChip') {
    const key = node.attrs?.variable ?? ''
    const text = vars[key] ?? key
    const marks: any[] = []
    if (node.attrs?.bold) marks.push({ type: 'bold' })
    if (node.attrs?.italic) marks.push({ type: 'italic' })
    if (node.attrs?.underline) marks.push({ type: 'underline' })
    if (node.attrs?.color || node.attrs?.fontFamily || node.attrs?.fontSize) {
      marks.push({ type: 'textStyle', attrs: { color: node.attrs.color ?? null, fontFamily: node.attrs.fontFamily ?? null, fontSize: node.attrs.fontSize ?? null } })
    }
    return marks.length > 0 ? { type: 'text', text, marks } : { type: 'text', text }
  }
  if (node.content) {
    return { ...node, content: node.content.map((child: any) => substituteVariablesInNode(child, vars)) }
  }
  return node
}

// ─── PDF generation ───────────────────────────────────────────────────────────

// ─── Browser singleton ────────────────────────────────────────────────────────

let browserInstance: Awaited<ReturnType<typeof puppeteer.launch>> | null = null

async function getBrowser() {
  if (browserInstance && !browserInstance.connected) {
    browserInstance = null
  }

  if (!browserInstance) {
    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH
    browserInstance = await puppeteer.launch({
      headless: true,
      ...(executablePath ? { executablePath } : {}),
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-extensions',
        '--disable-background-networking',
        '--disable-sync',
        '--disable-translate',
        '--hide-scrollbars',
        '--metrics-recording-only',
        '--mute-audio',
        '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding',
        '--disable-backgrounding-occluded-windows',
      ],
    })
    browserInstance.on('disconnected', () => { browserInstance = null })
    console.log('[PDF] Browser launched')
  }

  return browserInstance
}

export async function warmupBrowser() {
  try {
    await getBrowser()
    console.log('[PDF] Browser warmed up')
  } catch (err: any) {
    console.warn('[PDF] Browser warmup failed:', err?.message)
  }
}

// Substitui URLs externas de imagens por data URLs base64 para evitar
// que o puppeteer faça requisições de rede durante a geração do PDF.
async function inlineImages(html: string): Promise<string> {
  const urlRegex = /src="(https?:\/\/[^"]+)"/g
  const urls = new Set<string>()
  let m: RegExpExecArray | null
  while ((m = urlRegex.exec(html)) !== null) urls.add(m[1])
  if (urls.size === 0) return html

  const results = await Promise.allSettled(
    Array.from(urls).map(async (url) => {
      try {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), 8000)
        try {
          const res = await fetch(url, { signal: controller.signal })
          if (!res.ok) return null
          const buf = await res.arrayBuffer()
          const mime = res.headers.get('content-type') || 'image/png'
          const b64 = Buffer.from(buf).toString('base64')
          return { url, dataUrl: `data:${mime};base64,${b64}` }
        } finally {
          clearTimeout(timer)
        }
      } catch {
        return null
      }
    }),
  )

  let out = html
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value) {
      out = out.split(`src="${r.value.url}"`).join(`src="${r.value.dataUrl}"`)
    }
  }
  return out
}

async function generatePdf(html: string): Promise<Buffer> {
  const inlined = await inlineImages(html)
  const browser = await getBrowser()
  const page = await browser.newPage()
  try {
    page.setDefaultNavigationTimeout(120_000)
    page.setDefaultTimeout(120_000)
    await page.setContent(inlined, { waitUntil: 'domcontentloaded' })
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', bottom: '20mm', left: '20mm', right: '20mm' },
      timeout: 0,
    })
    return Buffer.from(pdf)
  } finally {
    await page.close()
  }
}

// ─── Service functions ────────────────────────────────────────────────────────

export async function listContractsService(companyId: number, clientId: number, page?: number, limit?: number) {
  const where = { companyId, clientId }
  const include = { template: { select: { name: true } }, proposal: { select: { value: true } } }

  if (page !== undefined && limit !== undefined) {
    const [data, total] = await Promise.all([
      prisma.contract.findMany({ where, orderBy: { createdAt: 'desc' }, include, skip: (page - 1) * limit, take: limit }),
      prisma.contract.count({ where }),
    ])
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) }
  }

  return prisma.contract.findMany({ where, orderBy: { createdAt: 'desc' }, include })
}

export async function getContractService(id: number, companyId: number) {
  const contract = await prisma.contract.findFirst({ where: { id, companyId } })
  if (!contract) throw { statusCode: 404, message: 'Contrato não encontrado.' }
  return contract
}

export async function createContractService(
  data: { templateId: number; clientId: number; proposalId: number },
  companyId: number,
  actor: { userId: number },
) {
  const [template, client, proposal, company] = await Promise.all([
    prisma.contractTemplate.findFirst({ where: { id: data.templateId, companyId, deletedAt: null } }),
    prisma.client.findFirst({ where: { id: data.clientId, companyId, deletedAt: null } }),
    prisma.proposal.findFirst({ where: { id: data.proposalId, clientId: data.clientId, companyId, idStatus: 3, deletedAt: null } }),
    prisma.company.findFirst({ where: { id: companyId } }),
  ])

  if (!template) throw { statusCode: 404, message: 'Modelo de contrato não encontrado.' }
  if (!client) throw { statusCode: 404, message: 'Cliente não encontrado.' }
  if (!proposal) throw { statusCode: 404, message: 'Proposta não encontrada ou não está com status aceita.' }
  if (!company) throw { statusCode: 404, message: 'Empresa não encontrada.' }

  const contractCount = await prisma.contract.count({ where: { companyId } })
  const contractNumber = String(contractCount + 1).padStart(4, '0')
  const contractDate = formatDate(new Date())

  let vars: Record<string, string>
  try {
    vars = {
    '{{cliente.nome}}': client.name,
    '{{cliente.email}}': client.email ?? '',
    '{{cliente.telefone}}': formatPhone(client.phone),
    '{{cliente.cpf_cnpj}}': formatDocument(client.document, client.documentType),
    '{{cliente.endereco}}': buildAddress(client),
    '{{empresa.nome}}': company.name,
    '{{empresa.cnpj}}': formatCNPJ(company.cnpj),
    '{{empresa.email}}': company.email ?? '',
    '{{empresa.telefone}}': formatPhone(company.phone),
    '{{empresa.endereco}}': buildAddress(company),
    '{{proposta.valor}}': formatCurrency(proposal.value),
    '{{proposta.descricao}}': proposal.description ?? '',
    '{{proposta.observacoes}}': proposal.clientObservation ?? '',
    '{{proposta.prazo}}': proposal.deadlineDays
      ? `${proposal.deadlineDays} dia${proposal.deadlineDays !== 1 ? 's' : ''} ${proposal.deadlineType ? (DEADLINE_TYPE_LABELS[proposal.deadlineType] ?? proposal.deadlineType) : ''}`
      : '',
    '{{proposta.sinal}}': proposal.signalValue && Number(proposal.signalValue) > 0 ? formatCurrency(proposal.signalValue) : '',
    '{{proposta.forma_pagamento_sinal}}': proposal.signalPaymentMethod ? (PAYMENT_METHOD_LABELS[proposal.signalPaymentMethod] ?? proposal.signalPaymentMethod) : '',
    '{{proposta.restante}}': proposal.signalValue && Number(proposal.signalValue) > 0
      ? formatCurrency(Number(proposal.value) - Number(proposal.signalValue))
      : formatCurrency(proposal.value),
    '{{proposta.forma_pagamento_restante}}': proposal.remainingPaymentMethod ? (PAYMENT_METHOD_LABELS[proposal.remainingPaymentMethod] ?? proposal.remainingPaymentMethod) : '',
    '{{contrato.data}}': contractDate,
    '{{contrato.numero}}': contractNumber,
  }
  } catch (err: any) {
    console.error('[createContract] Error building vars:', err?.message, err?.stack)
    throw { statusCode: 500, message: `Erro ao montar variáveis do contrato: ${err?.message ?? String(err)}` }
  }

  const usedVars = extractVariables(template.content)
  const missingFields = checkMissingVars(usedVars, vars)
  if (missingFields.length > 0) {
    throw {
      statusCode: 422,
      message: 'Dados insuficientes para gerar o contrato.',
      missingFields,
    }
  }

  const renderedJson = substituteVariablesInNode(template.content, vars)
  const contractName = `Contrato ${contractNumber} - ${client.name} - ${contractDate.replace(/\//g, '-')}`

  const html = tiptapToHtml(renderedJson, contractName)

  let pdfBuffer: Buffer
  try {
    pdfBuffer = await generatePdf(html)
  } catch (err: any) {
    console.error('[createContract] PDF generation failed:', err?.message, err?.stack)
    throw { statusCode: 500, message: `Erro ao gerar o PDF: ${err?.message ?? String(err)}` }
  }

  const tempId = `${companyId}-${Date.now()}`
  const pdfKey = `contracts/pdfs/${tempId}.pdf`

  let pdfUrl: string
  try {
    pdfUrl = await uploadToS3(pdfKey, pdfBuffer, 'application/pdf')
  } catch (err: any) {
    console.error('[createContract] S3 upload failed:', err?.message, err?.stack)
    throw { statusCode: 500, message: `Erro ao salvar o PDF: ${err?.message ?? String(err)}` }
  }

  let contract: Awaited<ReturnType<typeof prisma.contract.create>>
  try {
    contract = await prisma.contract.create({
      data: {
        name: contractName,
        content: renderedJson,
        pdfUrl,
        templateId: data.templateId,
        clientId: data.clientId,
        proposalId: data.proposalId,
        companyId,
      },
    })
  } catch (err: any) {
    console.error('[createContract] DB create failed:', err?.message, err?.stack)
    throw { statusCode: 500, message: `Erro ao salvar o contrato no banco: ${err?.message ?? String(err)}` }
  }

  try {
    const userName = await getActorName(actor.userId)
    await createLog({
      companyId,
      userId: actor.userId,
      userName,
      module: 'clients',
      action: 'create',
      entityId: data.clientId,
      entityName: contract.name,
      description: `Contrato "${contract.name}" gerado para ${client.name}`,
      metadata: { contractId: contract.id, proposalId: data.proposalId, templateId: data.templateId },
    })
  } catch (err: any) {
    console.error('[createContract] Log creation failed (non-fatal):', err?.message)
    // Log failure is non-fatal — contrato já foi salvo
  }

  return contract
}

export async function deleteContractService(id: number, companyId: number, actor: { userId: number }) {
  const contract = await prisma.contract.findFirst({ where: { id, companyId } })
  if (!contract) throw { statusCode: 404, message: 'Contrato não encontrado.' }

  await deleteFromS3(contract.pdfUrl)

  await prisma.contract.delete({ where: { id } })

  const userName = await getActorName(actor.userId)
  await createLog({
    companyId,
    userId: actor.userId,
    userName,
    module: 'clients',
    action: 'delete',
    entityId: contract.clientId,
    entityName: contract.name,
    description: `Contrato "${contract.name}" excluído`,
  })
}

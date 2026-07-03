import puppeteer from 'puppeteer'
import { prisma } from '../../lib/prisma'
import { uploadToS3, deleteFromS3 } from '../../lib/s3'
import { createLog, getActorName } from '../logs/log.service'

// ─── Fonts ───────────────────────────────────────────────────────────────────
// Fonts are self-hosted by the FRONTEND (src/styles/contract-fonts.css, files in
// /public/contract-fonts). The PDF is rendered by navigating puppeteer to the
// frontend route /__pdf-render, so it loads those exact same woff2 files and embeds
// them — no font server / CSS injection is needed here. Using identical font files on
// screen and in the PDF is what keeps line breaks and page distribution identical.
// (Source of truth for the family/alias list stays in contract.fonts.ts, which
// generates contract-fonts.css.)

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

// ─── Valor por extenso (pt-BR) ────────────────────────────────────────────────

const _EXT_UNITS = [
  '', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove',
  'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove',
]
const _EXT_TENS = ['', 'dez', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa']
const _EXT_HUNDREDS = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos']

function _lt1000(n: number): string {
  if (n === 0) return ''
  if (n === 100) return 'cem'
  if (n < 20) return _EXT_UNITS[n]
  const h = Math.floor(n / 100)
  const rem = n % 100
  const tensPart = rem === 0 ? '' : rem < 20
    ? _EXT_UNITS[rem]
    : _EXT_TENS[Math.floor(rem / 10)] + (rem % 10 > 0 ? ' e ' + _EXT_UNITS[rem % 10] : '')
  if (h === 0) return tensPart
  if (rem === 0) return _EXT_HUNDREDS[h]
  return _EXT_HUNDREDS[h] + ' e ' + tensPart
}

function numberToExtensoPtBR(n: number): string {
  if (n === 0) return 'zero'
  const parts: string[] = []
  const billions  = Math.floor(n / 1_000_000_000)
  const millions  = Math.floor((n % 1_000_000_000) / 1_000_000)
  const thousands = Math.floor((n % 1_000_000) / 1_000)
  const rest      = Math.floor(n % 1_000)
  if (billions  > 0) parts.push(_lt1000(billions)  + (billions  === 1 ? ' bilhão' : ' bilhões'))
  if (millions  > 0) parts.push(_lt1000(millions)  + (millions  === 1 ? ' milhão' : ' milhões'))
  if (thousands > 0) parts.push(thousands === 1 ? 'mil' : _lt1000(thousands) + ' mil')
  if (rest      > 0) parts.push(_lt1000(rest))
  return parts.join(' e ')
}

function currencyToExtensoPtBR(value: number): string {
  const totalCents = Math.round(value * 100)
  const reais      = Math.floor(totalCents / 100)
  const centavos   = totalCents % 100
  const parts: string[] = []
  if (reais    > 0) parts.push(numberToExtensoPtBR(reais)    + (reais    === 1 ? ' real' : ' reais'))
  if (centavos > 0) parts.push(numberToExtensoPtBR(centavos) + (centavos === 1 ? ' centavo' : ' centavos'))
  return parts.length > 0 ? parts.join(' e ') : 'zero reais'
}

function formatCurrencyWithExtensivo(value: any): string {
  const n = typeof value === 'object' && value !== null ? Number(value.toString()) : Number(value)
  if (isNaN(n)) return ''
  const formatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
  return `${formatted} (${currencyToExtensoPtBR(n)})`
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

// ─── S3 image cleanup ────────────────────────────────────────────────────────

export function extractImageUrlsFromContent(node: any, found: string[] = []): string[] {
  if (!node) return found
  // Handle wrapped format { pageMargins, doc }
  if (node.pageMargins && node.doc) return extractImageUrlsFromContent(node.doc, found)
  if (node.type === 'image' && node.attrs?.src) found.push(node.attrs.src)
  for (const child of node.content ?? []) extractImageUrlsFromContent(child, found)
  return found
}

export async function deleteContentImagesFromS3(content: any): Promise<void> {
  const urls = extractImageUrlsFromContent(content)
  await Promise.allSettled(urls.map((url) => deleteFromS3(url)))
}

// ─── Variable extraction ──────────────────────────────────────────────────────

function unwrapTemplateContent(content: any): { doc: any; padV: number; padH: number } {
  if (!content || content.type === 'doc') {
    return { doc: content ?? { type: 'doc', content: [] }, padV: 60, padH: 72 }
  }
  return {
    doc: content.doc ?? { type: 'doc', content: [] },
    padV: content.pageMargins?.v ?? 60,
    padH: content.pageMargins?.h ?? 72,
  }
}

function extractVariables(node: any, found: Set<string> = new Set()): Set<string> {
  if (!node) return found
  // Handle wrapped format { pageMargins, doc }
  if (node.pageMargins && node.doc) return extractVariables(node.doc, found)
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

function buildPaymentVar(proposal: {
  value: any
  signalValue?: any
  signalPaymentMethod?: string | null
  remainingPaymentMethod?: string | null
}): string {
  const hasSignal = proposal.signalValue && Number(proposal.signalValue) > 0
  const methodLabel = (m: string | null | undefined) =>
    m ? (PAYMENT_METHOD_LABELS[m] ?? m) : ''

  if (hasSignal) {
    const signalAmt    = Number(proposal.signalValue)
    const remainingAmt = Number(proposal.value) - signalAmt
    const signalFmt    = formatCurrencyWithExtensivo(signalAmt)
    const remainingFmt = formatCurrencyWithExtensivo(remainingAmt)
    const signalMethod    = methodLabel(proposal.signalPaymentMethod)
    const remainingMethod = methodLabel(proposal.remainingPaymentMethod)
    const signalLine    = signalMethod    ? `Sinal: ${signalFmt} via ${signalMethod}`       : `Sinal: ${signalFmt}`
    const remainingLine = remainingMethod ? `Restante: ${remainingFmt} via ${remainingMethod}` : `Restante: ${remainingFmt}`
    return `${signalLine}\n${remainingLine}`
  }

  const totalFmt = formatCurrencyWithExtensivo(proposal.value)
  const method   = methodLabel(proposal.remainingPaymentMethod)
  return method ? `${totalFmt} via ${method}` : totalFmt
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
  '{{proposta.pagamento}}': 'Forma de pagamento completa',
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

// Where the headless renderer route (frontend) lives. In dev it's the Vite server;
// in prod set PDF_RENDERER_URL to the deployed frontend origin.
const PDF_RENDERER_URL = process.env.PDF_RENDERER_URL || 'http://localhost:5173'

// Editor geometry — MUST match PageBreakExtension.ts in the frontend.
const PAGE_H = 1123      // A4 page height in px @96dpi
const PAGE_GAP = 20      // inter-page visual gap in the editor canvas
const PAGE_STRIDE = PAGE_H + PAGE_GAP // 1143 — editor Y distance between page tops

// Generate the PDF by driving the REAL editor (TipTap + PageBreakExtension) in the
// headless browser via the frontend's /__pdf-render route, then slicing the laid-out
// canvas into A4 pages. Because the exact same layout engine runs here as in the
// on-screen preview, the page breaks and page count are identical — no re-implemented
// pagination that could drift. `content` is the TipTap doc JSON (variables already
// substituted).
async function generatePdf(content: any, padV: number, padH: number): Promise<Buffer> {
  const cH = PAGE_H - 2 * padV
  // Fonts are self-hosted by the frontend (/__pdf-render loads them via
  // src/styles/contract-fonts.css), so the PDF embeds the exact same woff2 files the
  // on-screen preview uses — no font CSS is injected here. This keeps the puppeteer
  // layout (line breaks, page distribution) identical to the preview.
  const browser = await getBrowser()
  const page = await browser.newPage()
  try {
    page.setDefaultNavigationTimeout(120_000)
    page.setDefaultTimeout(120_000)
    // Comfortably wider than the 794px content so a scrollbar never shrinks it.
    await page.setViewport({ width: 1000, height: 1400, deviceScaleFactor: 1 })

    await page.goto(`${PDF_RENDERER_URL}/__pdf-render`, { waitUntil: 'domcontentloaded' })
    await page.waitForFunction('typeof window.__renderContractForPdf === "function"', { timeout: 60_000 })

    // Hand the content to the real editor and wait until PageBreakExtension settles.
    await page.evaluate(
      (c: any, v: number, h: number) => (window as any).__renderContractForPdf(c, v, h),
      content, padV, padH,
    )
    await page.waitForFunction('window.__pdfReady === true', { timeout: 120_000 })
    await page.evaluate(async () => {
      try { await (document as any).fonts.ready } catch {}
      await Promise.all(Array.from(document.images).map((img: HTMLImageElement) => img.decode().catch(() => {})))
    })

    // ── Slice the editor canvas into A4 pages ──────────────────────────────────
    // The editor lays the content out with inter-page gaps (PAGE_STRIDE apart). We
    // clone the wrapper once per page and translate it up by p*PAGE_STRIDE inside a
    // fixed 794×1123 container clipped to the page — so page p shows exactly the
    // editor's page p (its padV top/bottom margins fall naturally inside the gap).
    // Page count uses the SAME formula as the preview (ContractViewModal), so the
    // downloaded PDF always has the same number of pages as what's shown on screen.
    await page.evaluate(`(function(pageW, pageH, pageGap, stride){
      var wrap = document.querySelector('[data-pdf-wrapper]');
      if (!wrap) return;
      var pageCount = Math.max(1, Math.ceil((wrap.scrollHeight + pageGap) / (pageH + pageGap)));
      var host = document.createElement('div');
      for (var p = 0; p < pageCount; p++) {
        var pageDiv = document.createElement('div');
        pageDiv.style.cssText = 'width:' + pageW + 'px;height:' + pageH + 'px;overflow:hidden;position:relative;background:#fff;' + (p < pageCount - 1 ? 'break-after:page;' : '');
        var clone = wrap.cloneNode(true);
        clone.style.position = 'absolute';
        clone.style.top = (-(p * stride)) + 'px';
        clone.style.left = '0';
        pageDiv.appendChild(clone);
        host.appendChild(pageDiv);
      }
      // Hide the live app (keep it in the DOM so its <style> rules still apply to the
      // clones) and show only the sliced pages.
      var root = document.getElementById('root');
      if (root) root.style.display = 'none';
      host.style.cssText = 'position:absolute;top:0;left:0;';
      document.body.appendChild(host);
      var st = document.createElement('style');
      st.textContent = '@page{size:' + pageW + 'px ' + pageH + 'px;margin:0;}';
      document.head.appendChild(st);
    })(794, ${PAGE_H}, ${PAGE_GAP}, ${PAGE_STRIDE})`)

    const pdf = await page.pdf({
      width: '794px',
      height: `${PAGE_H}px`,
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '0', bottom: '0', left: '0', right: '0' },
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
    '{{proposta.valor}}': formatCurrencyWithExtensivo(proposal.value),
    '{{proposta.descricao}}': proposal.description ?? '',
    '{{proposta.observacoes}}': proposal.clientObservation ?? '',
    '{{proposta.prazo}}': proposal.deadlineDays
      ? `${proposal.deadlineDays} dia${proposal.deadlineDays !== 1 ? 's' : ''} ${proposal.deadlineType ? (DEADLINE_TYPE_LABELS[proposal.deadlineType] ?? proposal.deadlineType) : ''}`
      : '',
    '{{proposta.sinal}}': proposal.signalValue && Number(proposal.signalValue) > 0 ? formatCurrencyWithExtensivo(proposal.signalValue) : '',
    '{{proposta.forma_pagamento_sinal}}': proposal.signalPaymentMethod ? (PAYMENT_METHOD_LABELS[proposal.signalPaymentMethod] ?? proposal.signalPaymentMethod) : '',
    '{{proposta.restante}}': proposal.signalValue && Number(proposal.signalValue) > 0
      ? formatCurrencyWithExtensivo(Number(proposal.value) - Number(proposal.signalValue))
      : formatCurrencyWithExtensivo(proposal.value),
    '{{proposta.forma_pagamento_restante}}': proposal.remainingPaymentMethod ? (PAYMENT_METHOD_LABELS[proposal.remainingPaymentMethod] ?? proposal.remainingPaymentMethod) : '',
    '{{proposta.pagamento}}': buildPaymentVar(proposal),
    '{{contrato.data}}': contractDate,
    '{{contrato.numero}}': contractNumber,
  }
  } catch (err: any) {
    console.error('[createContract] Error building vars:', err?.message, err?.stack)
    throw { statusCode: 500, message: `Erro ao montar variáveis do contrato: ${err?.message ?? String(err)}` }
  }

  const { doc: templateDoc, padV, padH } = unwrapTemplateContent(template.content)

  const usedVars = extractVariables(templateDoc)
  const missingFields = checkMissingVars(usedVars, vars)
  if (missingFields.length > 0) {
    throw {
      statusCode: 422,
      message: 'Dados insuficientes para gerar o contrato.',
      missingFields,
    }
  }

  const renderedJson = substituteVariablesInNode(templateDoc, vars)
  const contractName = `Contrato ${contractNumber} - ${client.name} - ${contractDate.replace(/\//g, '-')}`

  let pdfBuffer: Buffer
  try {
    pdfBuffer = await generatePdf(renderedJson, padV, padH)
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
        content: { pageMargins: { v: padV, h: padH }, doc: renderedJson },
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

export async function regeneratePdfService(id: number, companyId: number) {
  const contract = await prisma.contract.findFirst({ where: { id, companyId } })
  if (!contract) throw { statusCode: 404, message: 'Contrato não encontrado.' }

  const content = contract.content as { pageMargins?: { v: number; h: number }; doc: any }
  const padV = content.pageMargins?.v ?? 60
  const padH = content.pageMargins?.h ?? 72

  const pdfBuffer = await generatePdf(content.doc, padV, padH)

  await deleteFromS3(contract.pdfUrl)

  const pdfKey = `contracts/pdfs/${companyId}-${Date.now()}.pdf`
  const pdfUrl = await uploadToS3(pdfKey, pdfBuffer, 'application/pdf')

  await prisma.contract.update({ where: { id }, data: { pdfUrl } })

  return { ok: true }
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

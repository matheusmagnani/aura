# Aura — Project Context

## Stack

- **Backend:** Fastify + Prisma + PostgreSQL + TypeScript
- **Frontend:** React 18 + Vite + TailwindCSS v4 + TypeScript
- **Dev runner:** tsx (watch mode)

## Responsividade

- **Projeto totalmente responsivo** (mobile-first)
- Mobile (< 768px) — layout padrão
- Desktop (>= 768px) — adaptações via `md:` prefix do Tailwind
- Design mobile e desktop fornecidos via Figma

## Multi-tenant

- Cada Company é um tenant isolado
- O registro cria Company + User (dono) + Role "Administrativo" + Permissions (todas allowed) numa transação
- Login retorna JWT com userId + companyId
- Todas as queries filtram por companyId do token

## Backend

### Plugins registrados (app.ts)

- `@fastify/cors` — origins localhost:5173, 5174
- `@fastify/helmet` — com crossOriginResourcePolicy: cross-origin
- `@fastify/jwt` — secret via env, expiresIn 7d
- `@fastify/multipart` — limite 5MB
- `@fastify/static` — serve `uploads/` em `/uploads/`

### Módulos

- **auth** — register, login, refresh, me
- **roles** — CRUD de setores por empresa (listagem com paginação, busca, filtro por status)
- **permissions** — Gerenciamento de permissões por setor (GET/PUT por roleId)
- **collaborators** — CRUD de usuários da empresa (excluindo o usuário logado); inclui redefinição de senha pelo admin
- **schedule** — CRUD de agendamentos por empresa; filtros por range de datas, clientId, collaboratorId; soft delete; logs de auditoria
- **proposals** — CRUD de propostas por empresa; vinculadas a cliente (obrigatório) e colaborador (opcional); status: pending, sent, accepted, refused; filtros por status, clientId, collaboratorId; soft delete; logs de auditoria
- **contract-templates** — CRUD de modelos de contrato por empresa; conteúdo armazenado como JSON TipTap; soft delete com restore; logs de auditoria; permissão `settings`
- **follow-ups** — Notas de acompanhamento por cliente; GET `?clientId=X`, POST, DELETE /:id; permissão `clients`
- **contracts** — Contratos gerados para clientes; vinculados a cliente + proposta aceita (idStatus=3) + template; variáveis substituídas no backend; PDF gerado rodando o editor real na rota `/__pdf-render` via puppeteer e fatiando em páginas A4 (ver "Geração de PDF — Arquitetura"), salvo no S3; hard delete (remove S3 + DB); logs de auditoria; permissão `clients`

### Models (Prisma)

- Company, User, Role, Permission, Client, Appointment, Proposal, ContractTemplate, Contract
- **Appointment** possui campos: `title` (obrigatório), `description?`, `startAt` (DateTime), `companyId`, `clientId?` (relação com Client), `collaboratorId?` (relação com User via "AppointmentCollaborator"), `deletedAt?`
- **Proposal** possui campos: `value` (Decimal, obrigatório), `description?`, `clientObservation?`, `idStatus` (Int: 1=Pendente, 2=Enviada, 3=Aceita, 4=Recusada, default 1), `deadlineDays?` (Int — prazo em dias), `deadlineType?` (String: `"business"` | `"calendar"` — dias úteis ou corridos), `signalValue?` (Decimal — valor do sinal; null/0 = sem sinal), `signalPaymentMethod?` (String: `"money"` | `"pix"` | `"boleto"` | `"card"`), `remainingPaymentMethod?` (mesmos valores — forma de pagamento do restante), `companyId`, `clientId` (obrigatório, relação com Client), `collaboratorId?` (relação com User via "ProposalCollaborator"), `deletedAt?`
- Client possui campos: `name` (obrigatório), `phone` (obrigatório), `email?`, `document?` (CPF ou CNPJ sem máscara), `documentType?` (String: `"CPF"` ou `"CNPJ"`), e campos de endereço: `address?`, `addressNumber?`, `addressComplement?`, `neighborhood?`, `city?`, `state?`, `zipCode?`. Também possui `userId?` (relação opcional com User — colaborador responsável).
- User possui campo `avatar` (String?) — caminho relativo do arquivo
- User possui campo `color` (String?) — cor de identificação do colaborador (hex, ex: `#E6C284`)
- User possui campo `roleId` (Int?) — setor do usuário (relação com Role)
- Company possui campos de contato: email, phone, address, addressNumber, addressComplement, neighborhood, city, state, zipCode, department, tradeName, cnpj
- Role pertence a uma Company (cada empresa tem seus próprios setores) — @@unique([name, companyId])
- Role possui campo `status` (Int: 0 = inativo, 1 = ativo, default 1)
- Permission pertence a um Role (roleId, module, action, allowed) — @@unique([roleId, module, action])
- **ContractTemplate** — `id`, `name`, `content` (Json TipTap), `companyId`, `deletedAt?` — @@unique([name, companyId])
- **Contract** — `id`, `name`, `content` (Json TipTap com variáveis substituídas), `pdfUrl` (S3), `templateId`, `clientId`, `proposalId`, `companyId` — SEM `deletedAt` (hard delete)
- **FollowUp** — `id`, `content`, `clientId`, `companyId`, `userId?`, `userName` (snapshot), `deletedAt?` — notas de acompanhamento por cliente; soft delete; permissão `clients`
- **Todas as tabelas exceto Contract possuem `deletedAt DateTime?`** — soft delete

### Padrão de Soft Delete

- Todas as tabelas possuem campo `deletedAt`
- Ao excluir um registro, setar `deletedAt = new Date()` + `status = 0` (ou `active = false` para User)
- Em todas as queries de leitura, adicionar `deletedAt: null` no `where`

### Padrão de Criação com Restauração de Soft-Deleted

- Ao criar um registro, se já existe um soft-deleted com a mesma chave única, **restaurar** em vez de criar novo
- Fluxo: verificar ativo (conflito) → verificar deletado (restaurar) → criar novo

### Sistema de Permissões

- Módulos: `schedule`, `clients`, `collaborators`, `settings`, `history`, `proposals`
- Ações: `read`, `create`, `edit`, `delete`
- 6 módulos × 4 ações = 24 permissões por role
- Ao registrar empresa, cria role "Administrativo" com todas as 20 permissões allowed
- User com `roleId = null` → admin (acesso total)
- User com `roleId` → permissões definidas pela role

### Endpoints de Auth

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| POST | /api/auth/register | Não | Cria Company + User + Role + Permissions |
| POST | /api/auth/login | Não | Login, retorna JWT + user com roleId/role |
| POST | /api/auth/refresh | Sim | Refresh token |
| GET | /api/auth/me | Sim | Dados do usuário logado (inclui roleId/role) |
| PUT | /api/auth/me | Sim | Atualiza perfil (name, email) |
| POST | /api/auth/me/avatar | Sim | Upload de avatar (multipart) |
| DELETE | /api/auth/me/avatar | Sim | Remove avatar |
| PUT | /api/auth/me/password | Sim | Troca senha (currentPassword, newPassword) |

#### Campos do /api/auth/register

- `companyName` (obrigatório) — nome da empresa
- `tradeName` — nome fantasia
- `cnpj` — CNPJ (único por empresa; validado com algoritmo de dígitos verificadores)
- `department` — setor/departamento
- `companyEmail` — e-mail da empresa
- `phone` — telefone
- `zipCode` — CEP
- `address` — rua
- `addressNumber` — número
- `addressComplement` — complemento (opcional)
- `neighborhood` — bairro
- `city` — cidade
- `state` — UF (sigla, ex: SP)
- `name` (obrigatório) — nome do usuário
- `email` (obrigatório) — e-mail do usuário (único)
- `password` (obrigatório, mín 6) — senha

Após registro bem-sucedido: **não** faz auto-login, retorna à tela de login com animação.

### Endpoints de Roles

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | /api/roles/select | Só autenticado | Retorna `[{ id, name }]` de setores ativos — para selects/filtros sem exigir permissão do módulo |
| GET | /api/roles | Sim | Listar setores (paginação, busca, filtro status) |
| GET | /api/roles/:id | Sim | Buscar setor por ID |
| POST | /api/roles | Sim | Criar setor |
| PUT | /api/roles/:id | Sim | Atualizar setor (nome e/ou status) |
| DELETE | /api/roles/:id | Sim | Excluir setor (bloqueia se houver usuários vinculados) |

### Endpoints de Collaborators

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | /api/collaborators/select | Só autenticado | Retorna `[{ id, name }]` de colaboradores ativos — para selects/filtros sem exigir permissão do módulo |
| GET | /api/collaborators | Sim | Listar colaboradores (paginação, busca, filtro active, filtro roleId) |
| GET | /api/collaborators/:id | Sim | Buscar colaborador por ID |
| POST | /api/collaborators | Sim | Criar colaborador (name, email, password, roleId?) |
| PUT | /api/collaborators/:id | Sim | Atualizar colaborador (name, email, roleId?, active?) |
| DELETE | /api/collaborators/:id | Sim | Excluir colaborador (soft delete; bloqueia auto-exclusão) |
| PUT | /api/collaborators/:id/password | Sim | Redefinir senha do colaborador (newPassword) |

### Endpoints de Clients

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | /api/clients/select | Só autenticado | Retorna `[{ id, name, phone }]` com busca opcional — para autocomplete sem exigir permissão do módulo |
| GET | /api/clients | Sim | Listar clientes (paginação, busca por nome/email/telefone, filtro status) |
| GET | /api/clients/:id | Sim | Buscar cliente por ID |
| POST | /api/clients | Sim | Criar cliente (name*, phone*, email?, document?, documentType?, endereço?, userId?) |
| PUT | /api/clients/:id | Sim | Atualizar cliente (userId? para vincular colaborador) |
| DELETE | /api/clients/:id | Sim | Excluir cliente (soft delete) |

### Endpoints de Schedule

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | /api/schedule | Sim | Listar agendamentos (filtros: dateFrom, dateTo, clientId, collaboratorId) |
| GET | /api/schedule/:id | Sim | Buscar agendamento por ID |
| POST | /api/schedule | Sim | Criar agendamento (title*, description?, startAt*, clientId?, collaboratorId?) |
| PUT | /api/schedule/:id | Sim | Atualizar agendamento (reagendar via startAt gera log especial) |
| DELETE | /api/schedule/:id | Sim | Excluir agendamento (soft delete) |

### Endpoints de Proposals

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | /api/proposals | Sim | Listar propostas (paginação, busca, filtros: status, clientId, collaboratorId) |
| GET | /api/proposals/:id | Sim | Buscar proposta por ID |
| POST | /api/proposals | Sim | Criar proposta (value*, clientId*, description?, clientObservation?, status?, collaboratorId?) |
| PUT | /api/proposals/:id | Sim | Atualizar proposta (value, description, clientObservation, status, collaboratorId) |
| DELETE | /api/proposals/:id | Sim | Excluir proposta (soft delete) |

### Endpoints de Contract Templates

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | /api/contract-templates | Sim | Listar modelos da empresa (deletedAt: null) — permissão settings/read |
| POST | /api/contract-templates | Sim | Criar modelo (name*, content*) — permissão settings/create |
| PUT | /api/contract-templates/:id | Sim | Atualizar modelo (name?, content?) — permissão settings/edit |
| DELETE | /api/contract-templates/:id | Sim | Soft delete — permissão settings/delete |

### Endpoints de Contracts

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | /api/contracts?clientId= | Sim | Listar contratos do cliente — permissão clients/read |
| GET | /api/contracts/:id | Sim | Buscar contrato por ID — permissão clients/read |
| POST | /api/contracts | Sim | Gerar contrato (templateId*, clientId*, proposalId*) — substitui variáveis, gera PDF, sobe ao S3 — permissão clients/create |
| DELETE | /api/contracts/:id | Sim | Hard delete: remove S3 + DB — permissão clients/delete |
| GET | /api/contracts/:id/download | Sim | Download do PDF gerado (stream S3) — Content-Type: application/pdf — permissão clients/read |
| POST | /api/contracts/upload-image | Sim | Upload de imagem para o editor (multipart) — retorna URL S3 — permissão settings/edit |

### Geração de PDF — Arquitetura (contract.service.ts)

A geração roda o **editor real** (TipTap + PageBreakExtension) dentro do Puppeteer, em vez de reimplementar a paginação — a lógica de layout/paginação é a mesma do editor, sem um segundo algoritmo pra divergir.

> **Preview = PDF (importante):** o `ContractViewModal` **não re-renderiza** o contrato no navegador — ele exibe o **próprio PDF gerado** (blob de `/contracts/:id/download`) num `<iframe>`. Motivo: o Chromium do puppeteer (servidor) e o do navegador do usuário são builds diferentes e renderizam texto com ~1% de diferença de métrica, deslocando a quebra de linha/distribuição por página perto dos limites — e isso **não** dá pra eliminar por CSS (`line-height`, `text-rendering: geometricPrecision`, `deviceScaleFactor`, `--font-render-hinting` foram todos testados sem efeito). Exibir o PDF real no preview é a única forma de garantir que o que se vê É o que se baixa. A contagem de páginas usa a mesma fórmula nos dois, então o nº de páginas bate.

1. **Rota headless `/__pdf-render`** (`frontend/src/modules/contract-pdf/PdfRenderPage.tsx`): página pública, sem chrome, que monta o MESMO editor read-only do `ContractViewModal` (mesmas extensões, mesmo CSS `.tiptap`, mesmos overlays de imagem pinned). Expõe `window.__renderContractForPdf(content, padV, padH)` e, quando o `PageBreakExtension` estabiliza (fontes prontas + imagens decodificadas + altura do wrapper estável por ~8 frames), seta `window.__pdfReady = true`. O wrapper tem `data-pdf-wrapper`.

2. **`generatePdf(content, padV, padH)`** — Puppeteer headless Chromium:
   - Viewport 1000×1400 (maior que os 794px do conteúdo pra scrollbar nunca encolher a largura). `page.goto(${PDF_RENDERER_URL}/__pdf-render)` (`PDF_RENDERER_URL` = env, default `http://localhost:5173`; em produção apontar pro frontend deployado).
   - Chama `__renderContractForPdf(content, padV, padH)` e aguarda `window.__pdfReady` (as fontes são self-hosted pelo frontend — o backend **não** injeta CSS de fonte).
   - **Fatiamento (slicing)** (`page.evaluate`): `pageCount = ceil((wrapper.scrollHeight + PAGE_GAP) / (PAGE_H + PAGE_GAP))` — **mesma fórmula do preview**, então o PDF sempre tem o mesmo nº de páginas. Para cada página `p`, clona o wrapper e posiciona `position:absolute; top:-(p*PAGE_STRIDE)` dentro de um container fixo 794×1123 `overflow:hidden` com `break-after:page`. As margens `padV` (topo/base) caem naturalmente dentro do gap entre páginas do editor. Esconde o `#root` (mantendo no DOM pros `<style>` continuarem valendo pros clones) e injeta `@page{size:794px 1123px;margin:0}`.
   - **PDF**: `page.pdf({ width:'794px', height:'1123px', preferCSSPageSize:true, margin:0 })`.
   - Geometria (`PAGE_H=1123`, `PAGE_GAP=20`, `PAGE_STRIDE=1143`) **deve espelhar** `PageBreakExtension.ts`.

3. **Fontes — TODAS self-hosted pelo frontend:** as fontes vivem em `frontend/public/contract-fonts/*.woff2` (todas as famílias curadas + os aliases web-safe; cópia de `backend/src/assets/fonts/`) e são declaradas em `frontend/src/styles/contract-fonts.css` (importado em `main.tsx`). Sem link do Google Fonts no `index.html`. Assim o **editor/Studio, o preview e a rota `/__pdf-render`** carregam exatamente os mesmos arquivos, e o puppeteer os busca por HTTP do próprio frontend → embute no PDF de forma confiável (sem depender de internet nem do Google, que **não** carrega de forma confiável dentro do puppeteer).
   - **Geração do CSS:** `contract-fonts.css` é gerado a partir de `getContractFontsCss()` em **`backend/src/modules/contracts/contract.fonts.ts`** (fonte de verdade das famílias/faces/aliases), trocando `FONT_ORIGIN_PLACEHOLDER` por `/contract-fonts`. Ao mexer em fontes, regenerar esse CSS e copiar os `.woff2` novos pro `public/contract-fonts/`.
   - **Force-load (crítico):** `PdfRenderPage` dá `document.fonts` `.load()` em **todas** as faces antes de sinalizar `__pdfReady`. Uma fonte usada só como *strut* de linha (ex.: o `Maven Pro` default dos parágrafos, quando o texto visível está em spans `Courier New`) não pinta glifo, então o Chromium pode não requisitá-la e o strut cai num fallback de altura diferente — desincronizando as alturas de linha. Carregá-las à força torna as métricas determinísticas.
   - **Fontes disponíveis (`contract.fonts.ts`):** Sans (Maven Pro, Roboto, Open Sans, Lato, Montserrat, Poppins), Serif (Merriweather, Lora, PT Serif, Playfair Display), Mono (Roboto Mono, Source Code Pro). Nomes web-safe no dropdown (Arial, Times New Roman, Courier New, Georgia) → `FONT_ALIASES` → equivalentes métricos (Arimo, Tinos, Cousine, Gelasio). `FONT_FAMILIES` deve espelhar o array `FONTS` do `ContractToolbar.tsx`.
   - **Nota:** o backend **não** roda mais servidor de fontes loopback nem injeta CSS (removido); `backend/src/assets/fonts/` permanece só como origem pra gerar o CSS/copiar pro frontend.

### Endpoints de Logs (Histórico)

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | /api/logs | Sim | Listar logs (paginação, filtros: module, action, userId, entityId, entityModule, search) |

- Logs são **somente leitura** — apenas create + read, nunca update/delete
- Criados automaticamente em toda operação mutante (create/edit/delete) de todos os módulos, exceto `auth`
- Campos: `id`, `companyId`, `userId?`, `userName` (snapshot), `module`, `action`, `entityId?`, `entityName?`, `description`, `metadata?` (Json), `createdAt`
- Para buscar logs de uma entidade específica: `?entityModule=clients&entityId=123`

### Endpoints de Permissions

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | /api/permissions/:roleId | Sim | Buscar permissões de um setor |
| PUT | /api/permissions/:roleId | Sim | Atualizar permissões de um setor |

### Upload de avatars

- Arquivos salvos em `backend/uploads/avatars/`
- Tipos permitidos: JPEG, PNG, WebP
- Tamanho máximo: 5MB
- `backend/uploads/` está no .gitignore

## Frontend

### Auth Service (authService.ts)

- `login`, `register`, `refresh`, `me`, `updateProfile`, `uploadAvatar`, `removeAvatar`, `changePassword`
- Respostas incluem `roleId` e `role` (id + name) do usuário
- `MeResponse.company` inclui todos os campos de endereço separados: `address`, `addressNumber`, `addressComplement`, `neighborhood`, `city`, `state`, `zipCode`, `department`, `tradeName`, `cnpj`

### Collaborators Service (collaboratorsService.ts)

- `list`, `create`, `update`, `delete`, `resetPassword`
- `Collaborator` interface inclui: id, name, email, avatar, color, active, companyId, roleId, role (id + name)
- `CollaboratorSelectItem` inclui: id, name, color — retornado pelo `/collaborators/select`
- Cor do colaborador é exibida em todos os lugares onde o nome aparece (ProposalsPage, DashboardPage, ClientDetailPage, AppointmentDetailModal, ProposalDetailModal, GenerateContractModal, CollaboratorsPage)

### Role Service (roleService.ts)

- `list(params?)` — GET /api/roles (usado para popular dropdowns de setor)

### Permission Service (permissionService.ts)

- `getByRoleId(roleId)` — GET /api/permissions/:roleId
- `updateByRoleId(roleId, permissions)` — PUT /api/permissions/:roleId

### Design Tokens (globals.css)

**Fonte:** Maven Pro (Google Fonts) — `'Maven Pro', system-ui, -apple-system, sans-serif`

**Cores:**
| Variável CSS | Tailwind | Valor |
|--------------|----------|-------|
| `--color-app-bg` | `app-bg` | #1D2529 |
| `--color-app-primary` | `app-primary` | #171514 |
| `--color-app-secondary` | `app-secondary` | #E6C284 |
| `--color-app-accent` | `app-accent` | #6AA6C1 |
| `--color-app-gray` | `app-gray` | #8A919C |

Variáveis RGB disponíveis para uso com `rgba()`: `--color-app-*-rgb`

### Assets (frontend/src/assets/)

- `icone-direito.png` — ícone pequeno do app (usado no topo do formulário de login)
- `icone-esquerdo.png` — ícone grande do app (usado no lado esquerdo do login desktop)
- `logo-desktop-esquerdo.png` — logo texto "Aura" (usado no login desktop e mobile)

### Stores (Zustand)

- `useAuthStore` — token, user (com roleId/role), setAuth, logout, isAuthenticated (persist localStorage)
- `useToast` — message, type, visible, show, hide
- `useLoadingStore` — contador de requisições de bloqueio (cadastro/edição); dirige o `GlobalLoading`. Ver "Cold Start / Warmup"

### Hooks Compartilhados (shared/hooks/)

- `useMyPermissions()` — retorna `{ permissions, isLoading, isAdmin }`
- `useCanAccess(module, action)` — retorna `boolean`
- Se `roleId` é `null` → acesso total (admin)
- Se `roleId` existe → busca permissões via GET /api/permissions/:roleId
- `useToast()` — exibir toasts de feedback (success, danger, warning)
- `useServerWarmup()` — gatilhos de warmup por atividade do usuário (montado no `Layout`). Ver "Cold Start / Warmup"

### Mapeamento path→module (`PATH_TO_MODULE`)

- `/schedule` → `schedule`
- `/clients` → `clients`
- `/collaborators` → `collaborators`
- `/settings` → `settings`
- `/history` → `history`
- `/proposals` → `proposals`

### Utilitários Compartilhados (shared/utils/)

- **formatters.ts** — `formatPhone(phone)`, `formatZipCode(zip)`, `formatDate(dateStr)`, `formatCPF(value)`, `formatCNPJ(value)`, `formatCurrency(value)` — formatação de exibição
- **validateDocuments.ts** — `validateCPF(value: string): boolean` e `validateCNPJ(value: string): boolean`
  - Remove máscara antes de validar (mantém só dígitos)
  - Algoritmo completo de dígitos verificadores para ambos

### Componentes Compartilhados (shared/components/)

- **Layout** — Sidebar + Header + Outlet
- **Sidebar** — menu lateral com NavLink e ícones Phosphor
- **Header** — avatar com iniciais, nome do usuário, botão logout
- **Toast** — feedback visual (success, danger, warning)
- **GlobalLoading** — overlay de bloqueio global (usa `FullScreenLoading` sem texto) exibido durante cadastros/edições; dirigido pelo `useLoadingStore`. Montado no `App`. Ver "Cold Start / Warmup"
- **FullScreenLoading** — spinner full-screen com gradiente (props `visible`, `label?`, `sublabel?`); usado no `GlobalLoading` (sem texto) e na geração de contrato (com label)
- **Modal** — modal genérico reutilizável (background app-primary, border/title app-accent)
- **CopyText** — botão inline que copia texto para clipboard e exibe feedback (ícone Copy → Check + "Copiado")
- **PageHeader** — cabeçalho de página reutilizável com título, ícone, busca, filtro dropdown e botão de adicionar. Props: `title`, `icon?`, `searchPlaceholder?`, `filterOptions?` (`FilterOption[]`), `filterValue?`, `onSearch?`, `onFilterChange?`, `canCreate?`, `onAdd?`, `actions?` (ReactNode extra)
- **ListCard** — card de linha de lista com checkbox integrado, borda highlight ao selecionar, e prop `columns` (grid-template-columns). Usa o componente `Checkbox`
- **EntityHistoryModal** — modal reutilizável que exibe o histórico de uma entidade específica. Props: `isOpen`, `onClose`, `module`, `entityId`, `entityName?`. Usa `logService.listByEntity()` com paginação
- **ui/Checkbox** — checkbox acessível via @radix-ui/react-checkbox com animação de check, suporte a sizes `sm|md|lg`, e cores do projeto
- **ui/Input** — input com label, ícone, X de limpar, toggle de visibilidade (password), error state (`border-red-500/50`). Em inputs de **senha**: apenas o olhinho (sem X)
- **contract-studio/ContractStudio** — overlay full-screen para criação/edição de templates de contrato. Props: `template`, `isOpen`, `onClose`, `onSave`. Usa TipTap com extensões + VariableChipNode + ContractToolbar + VariablePickerPanel. CSS inclui `word-break: break-word` em `p`, `h1`, `h2`, `h3`
- **contract-studio/ContractPreview** — preview read-only de conteúdo TipTap em miniatura (prop `content`). Usado em cards de templates e contratos
- **contract-studio/ContractToolbar** — toolbar TipTap com fonte, tamanho, formatação, cor, alinhamento, listas, upload de imagem e **importação de PDF** (botão FilePdf → `readFileAsHtml` → `setContent`, substitui o modelo após confirmação)
- **contract-studio/VariablePickerPanel** — painel lateral com variáveis agrupadas para inserção no editor
- **contract-studio/VariableChipNode** — TipTap custom node que renderiza variáveis como chips não-editáveis
- **contract-studio/contractVariables** — `CONTRACT_VARIABLES[]` e `CONTRACT_VARIABLE_GROUPS` com todas as variáveis disponíveis
- **contract-studio/PageBreakExtension** — plugin ProseMirror que simula quebras de página no editor. Exporta `PAGE_H=1123`, `PAGE_PAD_V=60`, `PAGE_PAD_H=72`, `PAGE_GAP=20`. Algoritmo: mede `getBoundingClientRect()` de cada bloco, calcula `marginTop` para empurrar blocos que cruzariam a borda da página. Corrige CSS margin collapsing via `collapseAdj = max(prevMarginBottom - existingDecoration, 0)`. Blocos pinned recebem `position:absolute`. ResizeObserver no elemento ProseMirror re-dispara ao mudar fonte; `document.fonts` listener re-dispara ao carregar web fonts
- **contract-studio/PinnedBlockExtension** — adiciona attrs `pinned` (bool) e `pinnedVisualY` (number|null) a `paragraph` e `heading`. `pinnedVisualY` = `nodeEl.getBoundingClientRect().top - view.dom.getBoundingClientRect().top`. Imagens pinned: hidadas a `top:-9999px` pelo PageBreakExtension; ContractStudio e PdfRenderPage rendem overlays React na posição correta (o ContractViewModal agora exibe o PDF pronto, não re-renderiza)

### Padrão de Validação de Formulários (Frontend)

- Estado centralizado: `const [errors, setErrors] = useState<Record<string, string>>({})`
- Helper: `clearError(field)` — remove erro do campo ao editar
- Helper: `ErrMsg({ field })` — exibe mensagem de erro abaixo do campo
- Helper: `selectCls(field)` — classes do select com borda vermelha se houver erro
- Validação disparada no submit: `setErrors({...})` com todos os erros encontrados; não prossegue se `Object.keys(errors).length > 0`
- Erros de API (ex: email duplicado) também populam o `errors` state via toast + campo específico
- CPF/CNPJ sempre passam por `validateCPF`/`validateCNPJ` antes de submeter
- CNPJ da empresa é único (verificado no backend, erro 409 retornado)
- Email do usuário é único (erro 409 retornado como "E-mail de usuário já cadastrado.")

### LoginPage — Animação Mobile

- Faixa inferior (bottom bar) anima expand → colapso para transição login↔cadastro
- `useAnimationControls` (framer-motion): expand para `100vh`, depois colapsa para `80px`
- Logo dentro da barra também anima de 24px → 72px → 24px
- Ao completar cadastro com sucesso: **não** faz auto-login, anima de volta para login

### Services Compartilhados (shared/services/)

- **serverWarmup.ts** — `maybeWarmup()` (acorda Fly+Neon só se dormindo) e `markServerSeen()` (chamado pelo interceptor do axios). Ver "Cold Start / Warmup"
- **logService.ts** — `list(params)`, `listByEntity(module, entityId, page?)`. Interface `Log` com todos os campos.
- **contractTemplateService.ts** — `list()`, `create({name, content})`, `update(id, {name?, content?})`, `delete(id)`, `uploadImage(file)` → URL S3. Interface `ContractTemplate`
- **contractService.ts** — `listByClient(clientId)`, `getById(id)`, `create({templateId, clientId, proposalId})`, `delete(id)`. Interface `Contract`
- **fileParser/** — leitor genérico de arquivos → HTML compatível com TipTap. Entrada única `readFileAsHtml(file, { uploadImage? })` faz dispatch por tipo. `pdfParser.ts` (pdfjs-dist): extrai texto (títulos por tamanho de fonte, negrito/itálico por nome de fonte — funciona em Word/Acrobat, não em PDFs de navegador) e imagens embutidas (raw pixel data → OffscreenCanvas → PNG → upload via callback → `<img>` no HTML). Deduplicação de imagens por fingerprint dos primeiros 64 bytes (logos repetidos em todas as páginas sobem apenas uma vez). Itens ordenados por posição y absoluta acumulada entre páginas. Adicionar novos formatos estendendo o dispatch

### Proposal Service (proposalService.ts)

- `list(params)`, `getById(id)`, `create(data)`, `update(id, data)`, `delete(id)`
- Interface `Proposal` com client e collaborator aninhados
- Parâmetros de listagem: `page`, `limit`, `search`, `clientId`, `collaboratorId`, `status`
- Status: `pending` | `sent` | `accepted` | `refused`

### Schedule Service (scheduleService.ts)

- `list(params)`, `getById(id)`, `create(data)`, `update(id, data)`, `delete(id)`
- Interface `Appointment` com client e collaborator aninhados
- Parâmetros de listagem: `dateFrom`, `dateTo`, `clientId`, `collaboratorId`

### Schedule Store (useScheduleStore.ts)

- `view: 'week' | 'month' | 'year'`
- `currentDate: Date` — início do período atual
- `setView(v)` — reseta currentDate para startOf{Week/Month/Year}
- `navigate('prev' | 'next')` — usa date-fns addWeeks/addMonths/addYears

### Páginas

- **SchedulePage** — calendário com views Semana/Mês/Ano, toolbar sticky, drag-and-drop para reagendar, modal de create/edit. Rota: `/schedule`. Componentes: `WeekView`, `MonthView`, `YearView`, `DayView` (usado no dashboard)
- **LoginPage** — login + cadastro em 2 etapas (usuário e empresa) na mesma página, com animação de transição no mobile. Desktop: split layout; Mobile: coluna única + barra inferior animada
- **DashboardPage** — dashboard do usuário com 3 seções: (1) Agenda com toggle Dia/Semana (DayView/WeekView, estado local independente do store compartilhado, filtrada por collaboratorId=userId para usuários comuns; admins veem tudo e podem filtrar por colaborador), (2) Listagem de Clientes do usuário com busca e paginação, (3) Listagem de Propostas do usuário com busca, filtro de status e paginação. Layout: Agenda full-width no topo → Clientes | Propostas em grid md:grid-cols-2 abaixo. Rota: `/dashboard`
- **ClientsPage** — lista paginada de clientes com busca (nome/email/telefone), filtro de status, ações (editar, inativar, excluir). Clicar no nome/contato navega para `/clients/:id`
- **ClientDetailPage** — detalhe do cliente com card header (nome, status, telefone, email, data de cadastro com copy), card de endereço (condicional), ações de editar, toggle status (ToggleLeft/Right) e excluir com confirmação. Botão "Histórico" abre `EntityHistoryModal`. Cards de agendamentos e propostas em linha (desktop) ou empilhados (mobile): agendamentos via query `client-appointments` | propostas via query `client-proposals` — ambos com carousel 143×143px; clicar abre `AppointmentDetailModal` / `ProposalDetailModal` com opções de editar/excluir respeitando permissões. Propostas mostram valor (formatCurrency), badge de status colorido, colaborador. Card de Contratos full-width abaixo: grid de contratos com preview TipTap miniaturizado, botão "+" abre `GenerateContractModal` (2 etapas: proposta aceita → template); ações por contrato: visualizar (`ContractViewModal` — exibe o PDF gerado num iframe, ver "Geração de PDF"), baixar PDF (link S3), excluir (hard delete)
- **CollaboratorsPage** — lista paginada de colaboradores (usuários da empresa) com avatar, badge "Você", filtro de status, setor (role), ações (editar, inativar, excluir, redefinir senha, histórico). Usa `ListCard` no mobile e tabela div no desktop
- **HistoryPage** — página somente leitura do histórico global da empresa. Filtros por módulo e ação, busca por texto, paginação. Acesso controlado por permissão `history/read`
- **ProposalsPage** — lista paginada de propostas com busca, filtros por status e colaborador, ações (visualizar, editar, excluir, histórico). Visualizar abre `ProposalDetailModal`. Clicar no nome do cliente abre detalhe. Bulk delete de selecionados

### Rotas

- `/schedule` — SchedulePage (privada, PermissionRoute module: schedule)
- `/login` — LoginPage (pública, redireciona se logado)
- `/dashboard` — DashboardPage (privada)
- `/clients` — ClientsPage (privada, module: clients)
- `/clients/:id` — ClientDetailPage (privada, module: clients)
- `/collaborators` — CollaboratorsPage (privada, module: collaborators)
- `/history` — HistoryPage (privada, PermissionRoute module: history)
- `/proposals` — ProposalsPage (privada, PermissionRoute module: proposals)
- `/settings` — SettingsPage com 5 seções colapsáveis: Empresa, Setores, Permissões, Status de Clientes, **Modelos de Contrato** (ContractsSection)
- `/__pdf-render` — `PdfRenderPage` (pública, sem chrome). Superfície headless usada pelo backend (puppeteer) pra renderizar um contrato com o editor real e gerar o PDF. Não faz fetch; recebe o conteúdo via `window.__renderContractForPdf`. Ver "Geração de PDF — Arquitetura"

### Variáveis de Ambiente (Backend)

- `PDF_RENDERER_URL` — origem do frontend onde vive a rota `/__pdf-render` (default `http://localhost:5173`). Em produção, apontar pro frontend deployado (o puppeteer do backend precisa alcançá-lo)
- `PUPPETEER_EXECUTABLE_PATH` — caminho do Chromium (opcional; usado em produção/Alpine)
- `DATABASE_URL` — conexão Prisma. Em produção (Neon) usar o endpoint **POOLED** (`-pooler` + `pgbouncer=true&connection_limit=1&connect_timeout=15`); o `connect_timeout` alto faz o Prisma **esperar** o compute do Neon resumir em vez de dar erro no cold start
- `DIRECT_URL` — endpoint **DIRETO** do Neon (sem `-pooler`), usado por `migrate`/introspection (não funcionam bem via PgBouncer). Em dev = `DATABASE_URL`. Declarado como `directUrl` no `datasource` do `schema.prisma`

### Cold Start / Warmup (Fly auto-stop + Neon) — Arquitetura

O backend roda na Fly com `auto_stop_machines = 'stop'` + `min_machines_running = 0` (economia), e o Neon suspende o compute após ~5 min ocioso. Isso causava lentidão e **erro quando a primeira requisição era um insert** (Prisma conectando num Neon dormindo, estourando timeout). Solução em camadas:

- **Backend:**
  - `GET /health` (em `app.ts`) — **não** toca no banco; usado pelo health check da Fly (`[[http_service.checks]]` no `fly.toml`) pra só rotear tráfego quando o server está de pé (evita 502 durante boot)
  - `GET /warmup` (em `app.ts`) — roda `SELECT 1`; acorda a máquina (Fly `auto_start`) **e** o compute do Neon. Chamado silenciosamente pelo frontend
  - `prisma.$connect()` no boot (`server.ts`) — tira o custo de conexão do caminho da primeira query
- **Frontend (warmup por atividade):**
  - `shared/services/serverWarmup.ts` — `maybeWarmup()` dispara o `/warmup` **só se o servidor provavelmente estiver dormindo** (sem resposta do backend há > 4 min) e sem outro warmup em andamento (`inFlight`). `markServerSeen()` é chamado pelo interceptor do axios em toda resposta → durante uso ativo os gatilhos viram no-op (zero warmup redundante)
  - `shared/hooks/useServerWarmup.ts` — montado no `Layout` (shell autenticado). Escuta `mousemove`/`keydown`/`click`/`scroll`/`visibilitychange` (throttle de 30s) e chama `maybeWarmup()`. Acorda o servidor **antecipadamente** enquanto o usuário navega/preenche formulário, pra que o insert já pegue tudo quente
- **Loading de bloqueio nos cadastros/edições:**
  - `shared/stores/useLoadingStore.ts` — contador de requisições de bloqueio em andamento
  - `shared/components/GlobalLoading.tsx` — renderiza o `FullScreenLoading` (sem texto) quando `count > 0`; montado no `App`. Trava a tela pra o usuário não empilhar requisições enquanto o servidor termina de acordar (o cliente vê só o loading padrão, sem saber que estamos "conectando")
  - Padrão `meta: { blockingLoader: true }` — passado no config das chamadas de **create/edit de todos os módulos** (o interceptor do axios em `api.ts` incrementa/decrementa o `useLoadingStore`). **Não** aplicado em: delete, buscas/listagens (têm loading próprio), auth (login/register têm loading próprio) e geração de contrato (tem `FullScreenLoading` com label próprio)

### Novas Dependências (Módulo de Contratos)

**Frontend:**
- `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-image`, `@tiptap/extension-font-family`, `@tiptap/extension-text-style`, `@tiptap/extension-color`, `@tiptap/extension-underline`, `@tiptap/extension-text-align`, `@tiptap/extension-placeholder`
- `pdfjs-dist` — parsing de PDF no client (importação de modelo no Contract Studio). Worker carregado via `pdfjs-dist/build/pdf.worker.min.mjs?url` (asset separado, lazy-loaded)

**Backend:**
- `puppeteer` — geração de PDF via headless Chromium (HTML-to-PDF)
- `/` — redireciona para /dashboard

### Sistema de Logs (Audit Trail)

- Todo create/edit/delete em **todos os módulos** gera um `Log` automaticamente — exceto módulo `auth` (login, perfil, senha não geram log)
- `createLog` é fire-and-forget (try-catch que engole erros) — nunca bloqueia a operação principal
- Actor extraído no controller: `userId` do JWT + `userName` via `getActorName(userId)` (snapshot do nome)
- Campos do Log: `module`, `action` (`create|edit|delete`), `entityId`, `entityName` (snapshot), `description`, `metadata` (Json com os dados alterados)
- Log de `edit` só é criado se houver campos **realmente alterados** (comparar before vs after)
- Para settings (roles, client-statuses, empresa): `entityId = companyId`, `entityName = companyName`
- Metadata de `edit`: usar **chaves descritivas** (ex: `"Nome do setor \"Financeiro\""`) para legibilidade no histórico
- **Regra para features futuras:** toda nova operação mutante deve chamar `createLog` com actor; se não tiver certeza, perguntar

### Campos Numéricos — Regra de Armazenamento

**Sempre salvar sem formatação no banco:**
- `phone` → só dígitos (ex: `55119999999`)
- `document` (CPF) → só dígitos (ex: `12345678901`)
- `document` / `cnpj` (CNPJ) → só dígitos (ex: `12345678000190`)
- `zipCode` → só dígitos (ex: `01310100`)

No backend: `.replace(/\D/g, '')` antes de salvar e antes de comparar em logs de edição.
No frontend: exibir formatado via `formatters.ts` (`formatPhone`, `formatCPF`, `formatCNPJ`, `formatZipCode`).

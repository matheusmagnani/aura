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

### Models (Prisma)

- Company, User, Role, Permission, Client, Appointment, Proposal
- **Appointment** possui campos: `title` (obrigatório), `description?`, `startAt` (DateTime), `companyId`, `clientId?` (relação com Client), `collaboratorId?` (relação com User via "AppointmentCollaborator"), `deletedAt?`
- **Proposal** possui campos: `value` (Decimal, obrigatório), `description?`, `clientObservation?`, `status` (String: `"pending"` | `"sent"` | `"accepted"` | `"refused"`, default `"pending"`), `companyId`, `clientId` (obrigatório, relação com Client), `collaboratorId?` (relação com User via "ProposalCollaborator"), `deletedAt?`
- Client possui campos: `name` (obrigatório), `phone` (obrigatório), `email?`, `document?` (CPF ou CNPJ sem máscara), `documentType?` (String: `"CPF"` ou `"CNPJ"`), e campos de endereço: `address?`, `addressNumber?`, `addressComplement?`, `neighborhood?`, `city?`, `state?`, `zipCode?`. Também possui `userId?` (relação opcional com User — colaborador responsável).
- User possui campo `avatar` (String?) — caminho relativo do arquivo
- User possui campo `roleId` (Int?) — setor do usuário (relação com Role)
- Company possui campos de contato: email, phone, address, addressNumber, addressComplement, neighborhood, city, state, zipCode, department, tradeName, cnpj
- Role pertence a uma Company (cada empresa tem seus próprios setores) — @@unique([name, companyId])
- Role possui campo `status` (Int: 0 = inativo, 1 = ativo, default 1)
- Permission pertence a um Role (roleId, module, action, allowed) — @@unique([roleId, module, action])
- **Todas as tabelas possuem `deletedAt DateTime?`** — soft delete

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
- `Collaborator` interface inclui: id, name, email, avatar, active, companyId, roleId, role (id + name)

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
| `--color-app-bg` | `app-bg` | #13161B |
| `--color-app-primary` | `app-primary` | #171B24 |
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

### Hooks Compartilhados (shared/hooks/)

- `useMyPermissions()` — retorna `{ permissions, isLoading, isAdmin }`
- `useCanAccess(module, action)` — retorna `boolean`
- Se `roleId` é `null` → acesso total (admin)
- Se `roleId` existe → busca permissões via GET /api/permissions/:roleId
- `useToast()` — exibir toasts de feedback (success, danger, warning)

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
- **Modal** — modal genérico reutilizável (background app-primary, border/title app-accent)
- **CopyText** — botão inline que copia texto para clipboard e exibe feedback (ícone Copy → Check + "Copiado")
- **PageHeader** — cabeçalho de página reutilizável com título, ícone, busca, filtro dropdown e botão de adicionar. Props: `title`, `icon?`, `searchPlaceholder?`, `filterOptions?` (`FilterOption[]`), `filterValue?`, `onSearch?`, `onFilterChange?`, `canCreate?`, `onAdd?`, `actions?` (ReactNode extra)
- **ListCard** — card de linha de lista com checkbox integrado, borda highlight ao selecionar, e prop `columns` (grid-template-columns). Usa o componente `Checkbox`
- **EntityHistoryModal** — modal reutilizável que exibe o histórico de uma entidade específica. Props: `isOpen`, `onClose`, `module`, `entityId`, `entityName?`. Usa `logService.listByEntity()` com paginação
- **ui/Checkbox** — checkbox acessível via @radix-ui/react-checkbox com animação de check, suporte a sizes `sm|md|lg`, e cores do projeto
- **ui/Input** — input com label, ícone, X de limpar, toggle de visibilidade (password), error state (`border-red-500/50`). Em inputs de **senha**: apenas o olhinho (sem X)

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

- **logService.ts** — `list(params)`, `listByEntity(module, entityId, page?)`. Interface `Log` com todos os campos.

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

- **SchedulePage** — calendário com views Semana/Mês/Ano, toolbar sticky, drag-and-drop para reagendar, modal de create/edit. Rota: `/schedule`
- **LoginPage** — login + cadastro em 2 etapas (usuário e empresa) na mesma página, com animação de transição no mobile. Desktop: split layout; Mobile: coluna única + barra inferior animada
- **DashboardPage** — placeholder pós-login
- **ClientsPage** — lista paginada de clientes com busca (nome/email/telefone), filtro de status, ações (editar, inativar, excluir). Clicar no nome/contato navega para `/clients/:id`
- **ClientDetailPage** — detalhe do cliente com card header (nome, status, telefone, email, data de cadastro com copy), card de endereço (condicional), ações de editar, toggle status (ToggleLeft/Right) e excluir com confirmação. Botão "Histórico" abre `EntityHistoryModal`. Cards de agendamentos e propostas em linha (desktop) ou empilhados (mobile): agendamentos via query `client-appointments` | propostas via query `client-proposals` — ambos com carousel 143×143px; clicar abre `AppointmentDetailModal` / `ProposalDetailModal` com opções de editar/excluir respeitando permissões. Propostas mostram valor (formatCurrency), badge de status colorido, colaborador
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

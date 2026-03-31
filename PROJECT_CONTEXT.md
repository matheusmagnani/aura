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

### Models (Prisma)

- Company, User, Role, Permission
- User possui campo `avatar` (String?) — caminho relativo do arquivo
- User possui campo `roleId` (Int?) — setor do usuário (relação com Role)
- Company possui campos de contato: email, phone, address, neighborhood, city, state, zipCode
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

- Módulos: `schedule`, `clients`, `settings`
- Ações: `read`, `create`, `edit`, `delete`
- 3 módulos × 4 ações = 12 permissões por role
- Ao registrar empresa, cria role "Administrativo" com todas as 12 permissões allowed
- User com `roleId = null` → admin (acesso total)
- User com `roleId` → permissões definidas pela role

### Endpoints de Auth

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| POST | /api/auth/register | Não | Cria Company + User + Role + Permissions |
| POST | /api/auth/login | Não | Login, retorna JWT + user com roleId/role |
| POST | /api/auth/refresh | Sim | Refresh token |
| GET | /api/auth/me | Sim | Dados do usuário logado (inclui roleId/role) |

### Endpoints de Roles

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | /api/roles | Sim | Listar setores (paginação, busca, filtro status) |
| GET | /api/roles/:id | Sim | Buscar setor por ID |
| POST | /api/roles | Sim | Criar setor |
| PUT | /api/roles/:id | Sim | Atualizar setor (nome e/ou status) |
| DELETE | /api/roles/:id | Sim | Excluir setor (bloqueia se houver usuários vinculados) |

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

- `login`, `register`, `refresh`, `me`
- Respostas incluem `roleId` e `role` (id + name) do usuário

### Permission Service (permissionService.ts)

- `getByRoleId(roleId)` — GET /api/permissions/:roleId
- `updateByRoleId(roleId, permissions)` — PUT /api/permissions/:roleId

### Design Tokens (globals.css)

**Cores:**
| Variável CSS | Tailwind | Valor |
|--------------|----------|-------|
| `--color-app-bg` | `app-bg` | #1E232C |
| `--color-app-primary` | `app-primary` | #16171C |
| `--color-app-secondary` | `app-secondary` | #E6C284 |
| `--color-app-accent` | `app-accent` | #1E232C |
| `--color-app-gray` | `app-gray` | #8A919C |

Variáveis RGB disponíveis para uso com `rgba()`: `--color-app-*-rgb`

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
- `/settings` → `settings`

### Componentes Compartilhados

- **Layout** — Sidebar + Header + Outlet
- **Sidebar** — menu lateral com NavLink e ícones Phosphor
- **Header** — avatar com iniciais, nome do usuário, botão logout
- **Toast** — feedback visual (success, danger, warning)

### Páginas

- **LoginPage** — formulário de login com email/senha
- **RegisterPage** — formulário de registro com empresa/nome/email/senha
- **DashboardPage** — placeholder pós-login

### Rotas

- `/login` — LoginPage (pública, redireciona se logado)
- `/register` — RegisterPage (pública, redireciona se logado)
- `/dashboard` — DashboardPage (privada)
- `/` — redireciona para /dashboard

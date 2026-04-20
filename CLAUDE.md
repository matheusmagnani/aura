# Regras do Projeto Aura

## Regra obrigatória: Ler PROJECT_CONTEXT.md ANTES de qualquer mudança

**SEMPRE** leia o arquivo `PROJECT_CONTEXT.md` (na raiz do projeto) antes de iniciar qualquer mudança, feature nova ou refatoração. Este arquivo contém:

- Estrutura completa de pastas do projeto
- Padrões de arquitetura e design patterns utilizados
- Componentes e hooks disponíveis para reutilização
- Endpoints de API existentes
- Models e schemas do banco de dados
- Dependências e libs do projeto
- Features implementadas e em desenvolvimento

Isso garante que você entenda o contexto atual do projeto e evite criar código duplicado ou fora do padrão.

## Regra obrigatória: Manter PROJECT_CONTEXT.md atualizado

Após qualquer alteração que mude o contexto ou os padrões do projeto, você **DEVE** atualizar o arquivo `PROJECT_CONTEXT.md` (na raiz do projeto) para refletir a mudança. Isso inclui:

- Novo módulo, rota, página ou componente criado
- Novo model, enum ou migration no Prisma
- Nova dependência adicionada ao projeto (npm install)
- Mudança em padrões existentes (ex: troca de lib, novo pattern de componente)
- Novo endpoint de API
- Novo hook, service ou utilitário compartilhado
- Mudança em variáveis de ambiente
- Mudança no fluxo de autenticação
- Mudança em design tokens ou tema (cores, fontes)
- Mudança em convenções de nomenclatura
- Feature que sai de "em desenvolvimento" para implementada

**Não** atualize para mudanças triviais como:
- Bug fixes que não alteram a arquitetura
- Ajustes de CSS/posicionamento pontuais
- Alteração de textos/labels

## Idioma

- Código e nomes técnicos em **inglês**
- Textos exibidos ao usuário (labels, mensagens, placeholders) em **português**

## Regra obrigatória: Responsividade (Mobile-First)

**TODO componente, página e layout DEVE ser totalmente responsivo.** Este projeto suporta dois breakpoints principais:

- **Mobile** (< 768px) — layout padrão, mobile-first
- **Desktop** (>= 768px) — adaptações via `md:` prefix do Tailwind

Regras:
- **SEMPRE** desenvolva mobile-first: escreva o CSS base para mobile, depois adicione `md:` para desktop
- **NUNCA** crie um componente ou página que funcione apenas em desktop
- Sidebar no mobile deve ser um menu hamburger ou drawer
- Tabelas no mobile devem virar cards ou listas empilhadas
- Formulários devem ser single-column no mobile, podem ser multi-column no desktop
- O design do mobile e desktop será fornecido via Figma — siga fielmente o layout fornecido
- Use classes responsivas do Tailwind: `md:`, `lg:`, etc.

## Padrões de código

- Backend segue o padrão **Controller → Service** por módulo
- Frontend segue **Page → Components + Hooks + Services** por módulo
- Componentes reutilizáveis ficam em `shared/components/`
- Hooks reutilizáveis ficam em `shared/hooks/`
- Validação com **Zod** no backend e validação manual nos forms do frontend
- State do servidor via **React Query**, state do cliente via **Zustand**
- Erros de API exibidos via **Toast** (`useToast`)
- **Soft delete SEMPRE inativa**: ao excluir, setar `deletedAt = new Date()` + `status = 0` (ou `active = false` para User)
- **Criação com restauração**: ao criar, se já existe registro soft-deleted com mesma chave única, **restaurar** (setar `deletedAt = null`, atualizar campos, reativar) em vez de criar novo. Fluxo: verificar ativo (conflito) → verificar deletado (restaurar) → criar novo

## Regra obrigatória: Permissões em toda feature nova

Ao criar qualquer **novo módulo, página ou rota** no projeto, você **DEVE** aplicar o sistema de permissões:

1. **Sidebar** — Adicionar o path no `PATH_TO_MODULE` em `shared/hooks/useMyPermissions.ts` para que o item do menu seja filtrado
2. **Rotas** — Envolver a rota com `<PermissionRoute module="...">` em `AppRoutes.tsx`
3. **Botões de ação** — Usar `useCanAccess(module, 'create')` para condicionar botão de criar, passar `canEdit`/`canDelete` para tabelas/listagens
4. **Tabelas/Listagens** — Receber `canEdit`/`canDelete` como props e condicionar itens do menu de ações (editar, excluir, toggle status, etc.). Se nenhuma ação disponível, esconder o botão de menu

Referência de hooks:
- `useCanAccess(module, action)` — retorna `boolean`
- `useMyPermissions()` — retorna `{ permissions, isLoading, isAdmin }`

Módulos existentes: `schedule`, `clients`, `settings`
Ações: `read`, `create`, `edit`, `delete`

## Padrões de Estilo CSS (REGRA CRÍTICA)

### Cores - SEMPRE usar variáveis

**OBRIGATÓRIO:** Use APENAS as variáveis de cores do projeto. NUNCA use valores hexadecimais hardcoded.

Variáveis disponíveis:
- `app-bg` - cor de fundo principal
- `app-primary` - cor primária (cards, containers)
- `app-secondary` - cor secundária (textos, bordas, destaques)
- `app-accent` - cor de destaque
- `app-gray` - cor cinza para textos secundários

**Exemplos CORRETOS:**
```
bg-app-primary
bg-app-primary/30
text-app-secondary
text-app-secondary/50
border-app-secondary/30
```

**Exemplos ERRADOS (NUNCA FAZER):**
```
bg-[#16171C]
bg-[#16171C]/[0.3]
text-[#E6C284]
border-[#1E232C]
```

### Opacidade

- Em Tailwind: `bg-app-primary/30`, `text-app-secondary/50`
- Em CSS inline/puro: `rgb(var(--color-app-secondary-rgb) / 0.5)`

### Fontes

- Tamanhos: Use classes Tailwind (`text-xs`, `text-sm`, `text-base`, `text-lg`, `text-xl`, `text-2xl`, `text-3xl`)
- Pesos: Use classes Tailwind (`font-normal`, `font-medium`, `font-semibold`, `font-bold`)
- **NUNCA** use valores hardcoded como `text-[14px]` ou `font-[500]`

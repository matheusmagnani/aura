<div align="center">
  <img src="frontend/src/assets/icone_fundo_preto.png" alt="Aura Icon" height="72" />
  &nbsp;&nbsp;
  <img src="frontend/src/assets/logo.png" alt="Aura" height="72" />

  <br /><br />

  <h3>Plataforma SaaS de gestão para prestadores de serviços</h3>

  <p>Agenda · Clientes · Propostas · Equipe · Permissões</p>

  ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
  ![React](https://img.shields.io/badge/React_18-61DAFB?style=flat&logo=react&logoColor=black)
  ![Fastify](https://img.shields.io/badge/Fastify-000000?style=flat&logo=fastify&logoColor=white)
  ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat&logo=postgresql&logoColor=white)
  ![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=flat&logo=prisma&logoColor=white)
  ![TailwindCSS](https://img.shields.io/badge/Tailwind_v4-06B6D4?style=flat&logo=tailwindcss&logoColor=white)
</div>

---

## Sobre

**Aura** é um SaaS multi-tenant voltado para empresas de serviços. Cada empresa tem seus dados totalmente isolados e pode gerenciar agenda, clientes, propostas e equipe com controle granular de permissões por setor.

## Telas

<p align="center">
  <img src="frontend/src/assets/print-readme/macbook-dashboard.png" width="68%" alt="Dashboard Desktop" />
  &nbsp;
  <img src="frontend/src/assets/print-readme/iphone-dashboard.png" width="24%" alt="Dashboard Mobile" />
</p>

<p align="center">
  <img src="frontend/src/assets/print-readme/macbook-login.png" width="68%" alt="Login Desktop" />
  &nbsp;
  <img src="frontend/src/assets/print-readme/iphone-login.png" width="24%" alt="Login Mobile" />
</p>

## Funcionalidades

- **Multi-tenant** — cada empresa isolada, login com JWT
- **Agenda** — views dia / semana / mês, drag-and-drop para reagendar
- **Clientes** — cadastro completo com endereço, CPF/CNPJ e histórico
- **Propostas** — pipeline com status pendente → enviada → aceita / recusada
- **Equipe** — colaboradores com avatar, setor e controle de acesso
- **Permissões** — 6 módulos × 4 ações (read/create/edit/delete) por role
- **Audit trail** — log automático de toda operação no sistema
- **Responsivo** — mobile-first, funciona em qualquer tela

## Stack

| Camada | Tecnologias |
|--------|-------------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS v4, React Query, Zustand, Framer Motion |
| **Backend** | Node.js, Fastify, TypeScript, Prisma ORM, Zod |
| **Banco** | PostgreSQL |
| **Auth** | JWT (stateless, 7 dias) |

---

## Rodando o projeto

### Pré-requisitos

- Node.js 18+
- PostgreSQL rodando localmente

### 1. Clone o repositório

```bash
git clone https://github.com/matheusmagnani/aura.git
cd aura
```

### 2. Configure o backend

```bash
cd backend
npm install
```

Crie o arquivo `.env`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/aura"
JWT_SECRET="seu-secret-aqui"
PORT=3333
```

Rode as migrations e inicie:

```bash
npx prisma migrate dev
npm run dev
```

> API disponível em `http://localhost:3333`

### 3. Configure o frontend

Em outro terminal:

```bash
cd frontend
npm install
npm run dev
```

> App disponível em `http://localhost:5173`

### 4. Crie sua conta

Acesse `http://localhost:5173` e clique em **Criar conta** para registrar sua empresa e começar a usar.

---

<div align="center">
  <sub>Desenvolvido por <a href="https://github.com/matheusmagnani">Matheus Magnani</a></sub>
</div>

# ContractCore — Guia Completo de Instalação e Deploy

**Contratos Inteligentes. Governança Completa.**

---

## Índice

1. [Pré-requisitos](#1-pré-requisitos)
2. [Configurar Supabase](#2-configurar-supabase)
3. [Instalar localmente](#3-instalar-localmente)
4. [Variáveis de ambiente](#4-variáveis-de-ambiente)
5. [Rodar em desenvolvimento](#5-rodar-em-desenvolvimento)
6. [Deploy na Vercel](#6-deploy-na-vercel)
7. [Checklist final de implantação](#7-checklist-final)
8. [Arquitetura do projeto](#8-arquitetura)
9. [Guia Puppeteer (PDF alternativo)](#9-puppeteer-futuro)

---

## 1. Pré-requisitos

| Ferramenta | Versão mínima | Instalação |
|---|---|---|
| Node.js | 18.17+ | https://nodejs.org |
| npm | 9+ | (junto com Node) |
| Git | qualquer | https://git-scm.com |
| Conta Supabase | — | https://supabase.com |
| Conta Vercel | — | https://vercel.com |
| Conta Anthropic | — | https://console.anthropic.com |

---

## 2. Configurar Supabase

### 2.1 Criar projeto

1. Acesse https://supabase.com/dashboard
2. Clique em **New Project**
3. Preencha:
   - **Name:** `contractcore` (ou nome preferido)
   - **Database Password:** anote em local seguro
   - **Region:** South America (São Paulo) — `sa-east-1`
4. Aguarde a criação (~2 minutos)

### 2.2 Executar o Schema SQL

1. No Dashboard do projeto, acesse **SQL Editor** (ícone de banco no menu lateral)
2. Clique em **New Query**
3. Abra o arquivo: `supabase/migrations/001_initial_schema.sql`
4. Copie TODO o conteúdo e cole no editor
5. Clique em **Run** (Ctrl+Enter)
6. Verifique: todas as tabelas criadas sem erro

**Tabelas criadas:**
- `companies` — dados da clínica contratante
- `service_providers` — prestadores de serviço
- `contracts` — contratos gerados
- `contract_versions` — histórico de versões
- `ai_logs` — auditoria de chamadas à IA
- `audit_logs` — log geral de ações

### 2.3 Configurar Storage Buckets

1. No Dashboard, acesse **Storage**
2. O SQL já cria os buckets automaticamente. Se necessário, crie manualmente:

**Bucket 1: `company-logos`**
- Public: ✅ SIM
- File size limit: 5 MB
- Allowed types: `image/jpeg, image/png, image/webp, image/svg+xml`

**Bucket 2: `contract-pdfs`**
- Public: ❌ NÃO (privado)
- File size limit: 50 MB
- Allowed types: `application/pdf`

### 2.4 Configurar Autenticação

1. No Dashboard, acesse **Authentication → Settings**
2. Em **Email Auth:**
   - Enable email confirmations: ✅ (recomendado)
   - Minimum password length: `8`
3. Em **URL Configuration:**
   - Site URL: `https://seu-projeto.vercel.app`
   - Redirect URLs: adicionar `https://seu-projeto.vercel.app/auth/callback`

### 2.5 Coletar as chaves

1. Acesse **Settings → API**
2. Anote:
   - **Project URL:** `https://XXXXX.supabase.co`
   - **anon (public) key:** `eyJhbGci...`
   - **service_role (secret) key:** `eyJhbGci...` ⚠️ NUNCA expor ao público

---

## 3. Instalar Localmente

```bash
# 1. Clonar o repositório
git clone https://github.com/SEU_USUARIO/contractcore.git
cd contractcore

# 2. Instalar dependências
npm install

# 3. Copiar variáveis de ambiente
cp .env.example .env.local
```

---

## 4. Variáveis de Ambiente

Edite o arquivo `.env.local` com seus valores reais:

```env
# ── SUPABASE ─────────────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://SEU_PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...sua_anon_key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...sua_service_role_key

# ── ANTHROPIC (Claude API) ────────────────────────────────────────
# ⚠️  NUNCA expor esta chave no frontend ou no Git
ANTHROPIC_API_KEY=sk-ant-api03-...

# ── NEXT.JS ───────────────────────────────────────────────────────
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Gerar com: openssl rand -base64 32
NEXTAUTH_SECRET=cole_aqui_sua_string_aleatoria_segura
```

> **Como gerar NEXTAUTH_SECRET:**
> ```bash
> openssl rand -base64 32
> ```

---

## 5. Rodar em Desenvolvimento

```bash
# Iniciar servidor de desenvolvimento
npm run dev

# Acesse: http://localhost:3000
```

**Fluxo inicial:**
1. Acesse `http://localhost:3000`
2. Será redirecionado para `/auth/login`
3. Clique em "Criar conta" e registre-se
4. Confirme o e-mail (verifique a caixa de entrada)
5. Faça login → será redirecionado para o onboarding da empresa
6. Cadastre os dados da clínica
7. Comece a gerar contratos!

**Outros comandos:**
```bash
npm run build        # Build de produção
npm run start        # Iniciar produção local
npm run lint         # Verificar erros de linting
npm run type-check   # Verificar tipos TypeScript
```

---

## 6. Deploy na Vercel

### 6.1 Criar repositório no GitHub

```bash
git init
git add .
git commit -m "feat: ContractCore — initial commit"
git remote add origin https://github.com/SEU_USUARIO/contractcore.git
git push -u origin main
```

### 6.2 Conectar à Vercel

1. Acesse https://vercel.com/new
2. Clique em **Import Git Repository**
3. Selecione o repositório `contractcore`
4. Framework: **Next.js** (detectado automaticamente)
5. **NÃO clique em Deploy ainda** — configure as variáveis primeiro

### 6.3 Configurar variáveis de ambiente na Vercel

Em **Environment Variables**, adicione TODAS as variáveis do `.env.example`:

| Key | Value | Environments |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://XXXXX.supabase.co` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGci...` | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGci...` | Production, Preview, Development |
| `ANTHROPIC_API_KEY` | `sk-ant-...` | Production, Preview, Development |
| `NEXTAUTH_URL` | `https://contractcore.vercel.app` | Production |
| `NEXTAUTH_SECRET` | string aleatória | Production, Preview, Development |
| `NEXT_PUBLIC_APP_URL` | `https://contractcore.vercel.app` | Production |

### 6.4 Deploy

1. Clique em **Deploy**
2. Aguarde o build (~2-3 minutos)
3. Acesse a URL gerada pela Vercel

### 6.5 Atualizar URLs no Supabase

Após o deploy, volte ao Supabase Dashboard:

1. **Authentication → URL Configuration:**
   - Site URL: `https://SEU_PROJETO.vercel.app`
   - Redirect URLs: `https://SEU_PROJETO.vercel.app/**`

2. Clique em **Save**

### 6.6 Deploy de atualizações futuras

```bash
# Commitar alterações e fazer push
git add .
git commit -m "feat: descrição da alteração"
git push

# A Vercel detecta automaticamente e faz o redeploy
```

---

## 7. Checklist Final de Implantação

### Supabase
- [ ] Projeto criado na região sa-east-1 (São Paulo)
- [ ] SQL executado sem erros (todas as tabelas criadas)
- [ ] Bucket `company-logos` criado (público)
- [ ] Bucket `contract-pdfs` criado (privado)
- [ ] RLS ativo em todas as tabelas
- [ ] Auth com confirmação de e-mail ativada
- [ ] Site URL e Redirect URLs configurados

### Ambiente Local
- [ ] `.env.local` criado com todas as variáveis
- [ ] `npm install` executado sem erros
- [ ] `npm run dev` rodando em http://localhost:3000
- [ ] Login e registro funcionando
- [ ] Onboarding da empresa funcionando
- [ ] Geração de contrato funcionando
- [ ] IA Claude respondendo (botão "Enriquecer com IA")
- [ ] Consulta CNPJ funcionando
- [ ] Consulta CEP funcionando

### Vercel (Deploy)
- [ ] Repositório no GitHub criado
- [ ] Projeto importado na Vercel
- [ ] TODAS as variáveis de ambiente configuradas
- [ ] Build com sucesso (sem erros)
- [ ] URL de produção acessível
- [ ] Login funcionando em produção
- [ ] PDF sendo gerado corretamente

### Segurança (Produção)
- [ ] `ANTHROPIC_API_KEY` somente nas variáveis da Vercel (nunca no frontend)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` somente nas variáveis server-side
- [ ] `.env.local` no `.gitignore` (nunca commitado)
- [ ] NEXTAUTH_SECRET gerado com `openssl rand -base64 32`
- [ ] RLS habilitado e testado no Supabase
- [ ] Audit logs registrando ações

---

## 8. Arquitetura do Projeto

```
contractcore/
├── src/
│   ├── app/                          # Next.js 14 App Router
│   │   ├── auth/
│   │   │   ├── login/page.tsx        # Página de login premium
│   │   │   └── register/page.tsx     # Página de cadastro
│   │   ├── dashboard/page.tsx        # Dashboard com métricas
│   │   ├── contracts/
│   │   │   ├── page.tsx              # Listagem de contratos
│   │   │   ├── new/page.tsx          # Wizard de novo contrato
│   │   │   └── [id]/page.tsx         # Detalhes do contrato
│   │   ├── settings/
│   │   │   └── company/page.tsx      # Configuração da empresa
│   │   └── api/
│   │       ├── claude/route.ts       # IA Claude (SERVER-SIDE)
│   │       ├── cnpj/route.ts         # Consulta CNPJ
│   │       ├── cep/route.ts          # Consulta CEP
│   │       ├── contracts/route.ts    # CRUD contratos
│   │       └── pdf/route.ts          # Geração PDF
│   │
│   ├── components/
│   │   ├── layout/AppLayout.tsx      # Sidebar + header
│   │   ├── contract/
│   │   │   ├── NewContractPageClient.tsx  # Orquestrador wizard
│   │   │   ├── StepIndicator.tsx          # Progress bar
│   │   │   ├── Step1Provider.tsx          # Dados do prestador
│   │   │   ├── Step2Service.tsx           # Dados do serviço
│   │   │   ├── Step3Remuneration.tsx      # Remuneração
│   │   │   └── Step4Review.tsx            # Revisão + IA
│   │   └── pdf/
│   │       └── ContractPDF.tsx            # PDF premium (react-pdf)
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts             # Browser client
│   │   │   └── server.ts             # Server client + service role
│   │   ├── claude/index.ts           # Integração Claude (server only)
│   │   ├── masks/index.ts            # CPF, CNPJ, CEP, telefone...
│   │   └── pdf/generator.ts          # Gerador HTML local
│   │
│   ├── types/index.ts                # Todos os tipos TypeScript
│   ├── middleware.ts                 # Auth middleware
│   └── styles/globals.css            # Design system
│
├── supabase/
│   └── migrations/001_initial_schema.sql  # Schema completo
│
├── .env.example                      # Template de variáveis
├── next.config.js
├── tailwind.config.ts
├── postcss.config.js
└── docs/SETUP.md                     # Este arquivo
```

### Stack completa

| Camada | Tecnologia | Função |
|---|---|---|
| Frontend | Next.js 14 + React | UI, roteamento, SSR |
| Estilo | Tailwind CSS | Design system ContractCore |
| Banco | Supabase (PostgreSQL) | Dados, auth, storage |
| IA | Claude claude-sonnet-4-6 (Anthropic) | Revisão de contratos |
| PDF | @react-pdf/renderer | Geração PDF premium |
| Deploy | Vercel | Hospedagem + CI/CD |
| Auth | Supabase Auth | Login, sessão, JWT |
| Storage | Supabase Storage | Logos + PDFs |

---

## 9. PDF com Puppeteer (Futuro)

A arquitetura já está preparada para migrar ou adicionar geração via Puppeteer.

**Quando usar Puppeteer:**
- Quando quiser um PDF 100% fiel ao visual HTML/CSS da preview
- Quando o contrato tiver formatação muito complexa

**Instalação futura:**
```bash
npm install puppeteer
```

**Criar o endpoint alternativo:**
```typescript
// src/app/api/pdf-puppeteer/route.ts
import puppeteer from 'puppeteer';

export async function GET(req: Request) {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page    = await browser.newPage();
  await page.setContent(contrato_html, { waitUntil: 'networkidle0' });
  const pdf = await page.pdf({
    format: 'A4',
    margin: { top: '2cm', bottom: '2cm', left: '2cm', right: '2cm' },
    printBackground: true,
  });
  await browser.close();
  return new Response(pdf, {
    headers: { 'Content-Type': 'application/pdf' }
  });
}
```

> ⚠️ Puppeteer na Vercel requer `@sparticuz/chromium` para funcionar corretamente no ambiente serverless.

---

## Suporte e Manutenção

- **Logs de erro:** Dashboard Vercel → Functions → Logs
- **Banco de dados:** Supabase Dashboard → Table Editor / SQL Editor
- **Storage:** Supabase Dashboard → Storage
- **Autenticação:** Supabase Dashboard → Authentication → Users

---

*ContractCore © 2024 — Bem Estar Psicologia · Todos os direitos reservados*

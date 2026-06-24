# SIGOL v2 — Sistema Integrado de Gestão Operacional de Lançamentos

Interface SaaS premium para gestão de operações florestais.

## Pré-requisitos

- Node.js 18+
- Conta no [Supabase](https://supabase.com) (gratuita)
- Conta no [Vercel](https://vercel.com) (gratuita)

## Setup Local

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar Supabase

1. Crie um novo projeto no Supabase
2. Vá em **SQL Editor** e execute o conteúdo de `supabase-migration.sql`
3. Copie a **URL** e a **anon key** em **Settings > API**
4. Crie o arquivo `.env` na raiz:

```
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon
```

### 3. Rodar em desenvolvimento

```bash
npm run dev
```

> Sem `.env` o sistema roda em **modo demonstração** com dados fictícios.

## Deploy no Vercel

### Via GitHub Desktop

1. Faça commit e push do projeto para o GitHub
2. Em [vercel.com](https://vercel.com), clique **New Project** → importe o repositório
3. Em **Environment Variables**, adicione:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Clique **Deploy**

O `vercel.json` já está configurado para SPA routing.

## Estrutura

```
src/
├── App.tsx              # Layout principal (header + sidebar + routing)
├── types.ts             # Tipos TypeScript
├── utils.ts             # Formatação e exportação
├── lib/
│   ├── supabase.ts      # Cliente Supabase
│   └── demoData.ts      # Dados demo (fallback sem Supabase)
├── components/
│   ├── DashboardTab.tsx
│   ├── LancamentosTab.tsx
│   ├── PendenciasTab.tsx
│   ├── ControleMensalTab.tsx
│   ├── FaturamentoTab.tsx
│   ├── EquipamentosTab.tsx
│   ├── CadastroFlorestalTab.tsx
│   ├── ColaboradoresTab.tsx
│   ├── AuditoriaTab.tsx
│   └── GestaoUsuariosTab.tsx
```

## Design System

- **Paleta**: Azul (#2563EB), Neutro (#0F172A / #64748B), Fundo (#F8FAFC)
- **Tipografia**: Inter (sans) + JetBrains Mono (mono)
- **Layout**: Header fixo escuro + Sidebar branca + Conteúdo claro
- **Ícones**: Lucide React
- **Gráficos**: Recharts

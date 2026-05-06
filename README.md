# Família Poker Champions (FPC)

SPA React/Vite/TypeScript que gerencia uma liga privada de poker (partidas, ranking sazonal e mensal, XP/conquistas, Hall da Fama, financeiro do Ás/Mês/Croupier, K e Ás do Poker).

> **Documentação técnica completa para migração e manutenção:**
> consulte **[MIGRATION_SNAPSHOT.md](./MIGRATION_SNAPSHOT.md)** —
> contém visão geral, stack, estrutura de pastas, regras de negócio, autenticação,
> esquema completo do Supabase, **histórico cronológico de TODOS os SQL executados**
> (`supabase-sql/0005`…`0013`), checklist de validação do banco, instruções de deploy
> na Vercel e checklist de segurança.

## Quickstart

```bash
npm install
cp .env.example .env.local   # ajuste se for outro projeto Supabase
npm run dev                   # http://localhost:5173
npm run build && npm run preview
npm test
```

## Stack

- React 18 + Vite 5 + TypeScript 5
- Tailwind CSS v3 + shadcn/ui (Radix)
- React Router v6
- TanStack Query v5
- Supabase JS (auth, db, storage)
- Vitest + Testing Library

## SQL do Supabase

Todas as migrations vivem em [`supabase-sql/`](./supabase-sql). A ordem de aplicação,
o que cada uma faz e o schema base (Fases 1–4 criadas pelo Lovable Cloud) estão
documentados na **§6 do MIGRATION_SNAPSHOT.md**.

## Variáveis de ambiente

| Var | Obrigatória | Descrição |
|---|---|---|
| `VITE_SUPABASE_URL` | sim (após refator) | URL do projeto Supabase |
| `VITE_SUPABASE_ANON_KEY` | sim (após refator) | anon key (segura no client) |

> Hoje, `src/integrations/supabase/client.ts` ainda tem URL/anon hardcoded. Para
> rodar fora do Lovable, refatore para `import.meta.env.VITE_SUPABASE_*` (snippet
> pronto na §4 e §14 do MIGRATION_SNAPSHOT.md).

## Deploy (Vercel)

- Framework preset: **Vite**
- Build: `npm run build`
- Output: `dist`
- Env vars: as duas acima
- Cadastre as URLs de produção em **Supabase → Auth → URL Configuration** (Site URL + Redirects), incluindo `/auth` e `/complete-profile`.

Detalhes completos: **§14 do MIGRATION_SNAPSHOT.md**.

# Radiogenia

AI-powered radiology reporting platform built with Next.js and Supabase.

## Commands

- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run lint` — ESLint over `src/` (flat config in `eslint.config.mjs`; must pass with 0 errors)
- `npm run typecheck` — TypeScript `tsc --noEmit`
- `npm test` — run tests (vitest)
- `npm run test:watch` — run tests in watch mode

## Architecture

- **Framework**: Next.js App Router (v16+)
- **Database**: Supabase (PostgreSQL + Auth + RLS)
- **Styling**: Tailwind CSS v4 + shadcn/ui (Radix primitives)
- **State**: React hooks, localStorage for UI prefs
- **i18n**: Custom translation system in `src/lib/i18n.ts` (ES/EN/PT)
- **AI**: Multi-provider (Claude, GPT, DeepSeek, Gemini) via `src/lib/providers/`
- **Payments**: Stripe
- **Email**: Resend

## Key directories

- `src/app/` — Next.js pages and API routes
- `src/components/` — React components (dashboard, sidebar, admin, landing, shared)
- `src/lib/` — Business logic, types, i18n, Supabase clients, templates
- `supabase/migrations/` — Database migrations

## Conventions

- All user-facing strings must use the `useT()` hook from `src/lib/i18n.ts`
- Three languages: Spanish (es, default), English (en), Portuguese (pt)
- Error boundaries use localStorage-based language detection (can't use hooks)
- API routes use `requireAdmin()` or `requireOrgRole()` from `src/lib/auth-helpers.ts`
- Supabase: `createClient()` for user context, `createServiceClient()` for admin/service operations
- Org hierarchy: organization → sections → members (roles: org_chief, section_chief, section_editor, radiologist)

## Security constraints

- AI provider names must NOT appear in any user-visible content (legal docs, consent, UI)
- Department chief productivity metrics must NOT be discoverable by radiologists
- Only org_chief can view productivity stats (not section chiefs)

## Testing

Tests are in `src/lib/__tests__/` using Vitest. Run with `npm test`.

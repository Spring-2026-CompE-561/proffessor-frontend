# Copilot instructions for this repository

## Build, test, and lint commands

```bash
npm run dev
npm run lint
npm run build
```

There is currently no test runner or `test` script configured in `package.json`, so there is no supported single-test command yet.

## High-level architecture

- This is a Next.js 16 App Router frontend. Routes live under `src/app`, with the auth pages grouped under `src/app/(auth)` but exposed as `/signin` and `/signup`.
- `src/app/layout.tsx` is the shared shell for every page. It mounts the global `ThemeProvider`, top navigation, footer, and Sonner toaster.
- The current dashboard flow is client-driven: `src/app/page.tsx` reads `access_token` from `localStorage`, redirects unauthenticated users to `/signin`, and fetches balance data from the backend at `http://127.0.0.1:8000/api/v1/transaction/balance`.
- Authentication is handled entirely in client components today. `src/components/login-form.tsx` posts form-encoded credentials to `/api/v1/user/login`, stores `returnedData.access_token` in `localStorage`, then routes to `/`. `src/components/signup-form.tsx` posts JSON to `/api/v1/user/register` and routes to `/signin`.
- Shared UI primitives live in `src/components/ui`. They are not stock shadcn wrappers around Radix: this project uses `@base-ui/react` primitives plus the shadcn `base-maia` preset configured in `components.json`.

## Key conventions

- Treat this as a Next.js 16 codebase, not older App Router examples. The repository-level guidance in `AGENTS.md` explicitly warns that APIs and conventions may differ from older Next.js versions.
- Prefer `@/*` imports over long relative paths. The alias is defined in `tsconfig.json` and used consistently across the app.
- Any component that touches browser-only APIs (`localStorage`, `useRouter`, `useTheme`, hooks) is a client component and should start with `"use client"`.
- Forms follow the same stack and structure as the existing auth forms: `react-hook-form` + `zod` validation, `Controller` for inputs, and the custom `Field` / `FieldGroup` / `FieldError` primitives from `src/components/ui/field`.
- Notifications use `sonner`, with the global `<Toaster />` already mounted in `src/app/layout.tsx`. Prefer toast-based feedback for auth/form submission flows.
- Theme and design tokens come from `src/app/globals.css` and `next-themes`. Reuse the existing semantic Tailwind tokens (`bg-card`, `text-muted-foreground`, etc.) instead of hardcoding one-off colors when extending UI.
- The UI primitives use Base UI's API shape, including `render={...}` props on triggers such as `DropdownMenuTrigger` and `SheetTrigger`. When composing or editing these components, follow the existing wrapper patterns in `src/components/ui`.
- Backend integration is currently hardcoded to `http://127.0.0.1:8000`. Keep new frontend API calls consistent with the existing auth and dashboard flow unless the backend integration is being intentionally refactored.

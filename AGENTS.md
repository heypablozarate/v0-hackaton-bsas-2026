<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This project runs on Next.js 16 with React 19 and Tailwind CSS 4. APIs, conventions, and file structure may differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## What this project is

**Terms & Conditions — The Experience.** A hackathon project (Buenos Aires 2026) that takes any Terms & Conditions document, has an LLM analyze it paragraph by paragraph, and renders the result as an interactive experience where the page visually deteriorates (CRT/BadTV overlay) in proportion to how predatory the clauses are. Tagline: *"You've agreed to this 847 times. Have you ever actually read it?"*

The app was bootstrapped from a v0.app export and is an early-stage single-commit codebase. Treat it as a working prototype: no CHANGELOG yet, no README, no tests.

## Flow

`app/page.tsx` is a client component that drives a four-screen state machine:

1. **`input`** (`components/InputScreen.tsx`) — user pastes Terms & Conditions text or a URL.
2. **`loading`** (`components/LoadingScreen.tsx`) — calls `/api/analyze` (and `/api/fetch-url` if a URL was given).
3. **`experience`** (`components/ExperienceScreen.tsx`) — paragraph-by-paragraph reveal, accumulating "damage" that drives the BadTV overlay intensity in real time.
4. **`verdict`** (`components/VerdictScreen.tsx`) — final score and verdict.

`BadTVOverlay` runs over every screen, pulling its `damage` prop from `getBadTVDamage()` in `app/page.tsx`. Ambient damage on the input screen is intentional.

## API routes

- **`POST /api/analyze`** — two-step LLM call:
  1. Validates the input is actually legal text (gpt-4o-mini, strict JSON schema). Marketing copy, news, recipes, etc. must return `isLegal: false`.
  2. Returns a `clauses` array where each clause has `original`, `severity` (1–5), `translation`, and `category` (`privacy | control | liability | content_rights | payments | termination | other`).
  - `maxDuration = 60`. Falls back to a local keyword-based analyzer (`lib/analyzer.ts`) when AI is unavailable; the UI labels the source as `"ai"` or `"fallback"`.
- **`POST /api/fetch-url`** — server-side fetch of a remote URL with a 10s timeout, then `parseHtmlToSections` from `lib/parse-html.ts`. Validates http/https only.

## Stack

- Next.js 16 App Router
- React 19
- TypeScript 5
- Tailwind CSS 4 (`@tailwindcss/postcss`, `tw-animate-css`)
- shadcn/ui + the full Radix primitives suite (already installed in `package.json`)
- Vercel AI SDK (`ai` v6) — currently using `openai/gpt-4o-mini` via the `ai` provider routing
- Zod for schema validation
- pnpm (`pnpm-lock.yaml` is the lockfile — do not introduce `package-lock.json` or `yarn.lock`)
- Geist + Geist Mono + Geist Pixel + Special Elite (Google) for type
- Vercel Analytics
- next-themes + a custom `ThemeApplicator`
- `LanguageContext` for EN/ES UI strings (`contexts/LanguageContext.tsx`, `lib/translations.ts`)

## Commands

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm build
pnpm start
pnpm lint
```

There is no `typecheck` or `test` script yet. If you add tests, wire `vitest` and a `test` script. If you add a typecheck script, follow the github.webpz / v0-2000s-html-puzzle convention (`next typegen && tsc --noEmit`).

## Module map (where to look)

- `app/page.tsx` — screen orchestrator and state machine
- `app/layout.tsx` — fonts, `LanguageProvider`, `ThemeApplicator`, body classes
- `app/api/analyze/route.ts` — LLM validation + clause analysis
- `app/api/fetch-url/route.ts` — remote URL fetcher and HTML parser
- `components/InputScreen.tsx` / `LoadingScreen.tsx` / `ExperienceScreen.tsx` / `VerdictScreen.tsx` — the four screens
- `components/BadTVOverlay.tsx` — global CRT/glitch overlay driven by `damage`
- `components/SettingsButton.tsx`, `components/ThemeApplicator.tsx`, `components/theme-provider.tsx`
- `components/ui/` — shadcn/ui components (Radix-based)
- `contexts/LanguageContext.tsx` — EN/ES toggle + provider
- `lib/types.ts` — `Category`, `AnalyzedParagraph`
- `lib/analyzer.ts` — local keyword-based fallback analyzer (severity patterns by category)
- `lib/contracts.ts`, `lib/parse-html.ts`, `lib/translations.ts`, `lib/verdict-generator.ts`

## Conventions and gotchas

- **The `package.json` `name` is still `"my-project"`** (v0 default). If you rename it, also update any deploy/Vercel references. Otherwise leave it alone.
- **`generator: "v0.app"`** in `app/layout.tsx` metadata is from the v0 export. Safe to keep or remove — your call, but don't accidentally regenerate it.
- **`userScalable: false`** in viewport is intentional for the immersive experience. Do not "fix" it.
- **`cursor: crosshair`** on body is intentional aesthetic — same.
- **The local fallback analyzer has English-only keyword lists.** The AI path supports English and Spanish via the `language` parameter; the fallback does not. Keep this in mind if you change validation messaging.
- **The validation step truncates input to 4000 chars** (`text.slice(0, 4000)`). The full text is still passed to the analyzer. Do not collapse them into one call.
- **API route `maxDuration` is 60s.** Vercel free-tier limit. Don't bump it without checking the deployment plan.
- **Severity must be 1–5, integer**, enforced by Zod `z.literal` union — not `z.number().min(1).max(5)`. Keep it strict so the UI mappings stay safe.

## Open questions / TODOs for future agents

- No README. If you add one, mirror the structure used in `github/v0-2000s-html-puzzle/README.md` (architecture, data model, hard rules, contributor notes).
- No tests. The analyzer logic, severity scoring, and category mapping are good candidates for unit tests.
- No CHANGELOG. If this graduates beyond hackathon scope, start one and update it on every shipped change (the convention used in the rest of Pablo's repos).
- Vercel project name not yet pinned in this file — confirm before adding a hard rule, the way the other repos do.

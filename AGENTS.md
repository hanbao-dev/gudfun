# Gudfun contributor guide

## Project shape

- This is a Bun workspace monorepo. Use `bun` for installs, scripts, and one-off
  commands; keep `bun.lock` authoritative.
- `packages/web`: Vite + React 19 client application. New routing work uses
  React Router **Data Mode**.
- `packages/api`: Bun + Elysia API, including Better Auth and Zero HTTP
  endpoints.
- `packages/database`: Drizzle PostgreSQL schema, relations, database client,
  and migrations. This is the sole home for database schema definitions.
- `packages/zero`: Zero queries, mutators, client setup, and generated Zero
  schema. `src/zero-schema.gen.ts` is generated—never edit it by hand.
- `packages/docker`: local PostgreSQL support.

## Product baseline

- Authentication is single-user and exclusively through X. Do not introduce
  passwords, email sign-in, other social providers, organizations, roles, or
  multi-tenant data modelling unless explicitly requested.
- An unauthenticated visitor sees the login page. An authenticated visitor sees
  either the current show or a countdown to the next show.
- During a live show, a user may join LiveKit chat only after being pulled on
  stage. The show and voice-chat details are intentionally not in scope until a
  dedicated feature request defines them.

## General working agreement

- Follow the closest existing pattern. Keep each change focused and small.
- Put each feature or fix on a focused `codex/<topic>` branch and open a focused
  PR when the work is ready for review. Do not mix unrelated cleanup into it.
- Local `.env` files and environment variables are acceptable for now. Do not
  add deployment configuration or production-secret management unless asked.
- Before changing a stack area below, consult its linked `llms.txt` and the
  local code that uses it. Prefer the documented, current API over memory.

## Web UI (`packages/web`)

- Use shadcn/ui for all UI. First reuse an installed component under
  `packages/web/src/components/ui`; then look for the appropriate official or
  configured shadcn registry component. Only build a component from scratch if
  neither is suitable.
- Put reusable, app-level components in `packages/web/src/components`; put
  shadcn primitives in `packages/web/src/components/ui`. Do not duplicate a
  component that can be composed from existing shadcn primitives.
- Use the existing shadcn CLI configuration in `packages/web/components.json`
  and preserve its aliases and CSS-variable token system.
- Every UI change must work in light and dark mode. Use semantic Tailwind
  tokens (for example `bg-background`, `text-foreground`, `text-muted-foreground`)
  rather than hard-coded light-only or dark-only colors. Preserve the existing
  `ThemeProvider` behavior.
- Establish and use React Router Data Mode as the app's routing architecture.
  Define route objects in TypeScript files, create one `createBrowserRouter`
  instance outside the React tree, and render it with `RouterProvider`. Route
  modules own their loaders, actions, pending UI, and error boundaries. Do not
  introduce a competing routing model.
- Reference: <https://reactrouter.com/start/data/routing>
- Reference: <https://ui.shadcn.com/llms.txt>

## Database (`packages/database`)

- Define and change all database tables, columns, indexes, constraints, and
  Drizzle relations in `packages/database/src`. Do not create schema definitions
  in the API or web packages.
- Use Drizzle migrations for schema changes. Generate and inspect the migration
  rather than manually changing generated migration metadata.
- After a schema change, run `bun run db:generate` and regenerate Zero's schema
  with `bun run zero:schema`. Commit the resulting migration and generated Zero
  schema when applicable.
- Reference: <https://orm.drizzle.team/llms.txt>

## Authentication (`packages/api/src/auth.ts` and clients)

- Use Better Auth for authentication changes. Keep server configuration in the
  API and use the existing web auth client rather than creating parallel auth
  flows.
- Preserve authorization checks at API and Zero query/mutator boundaries; a
  client-side check is never sufficient.
- Reference: <https://better-auth.com/llms.txt>

## Data access and APIs

- Prefer Zero for application data: place named, permission-scoped reads in
  `packages/zero/src/queries.ts` and optimistic writes in
  `packages/zero/src/mutators.ts`. Use Elysia API routes only when Zero is not
  appropriate (for example, third-party integrations or non-sync operations).
- Every Zero query and mutator must scope data by the authenticated context.
  Treat query results as immutable. Generate client IDs before invoking a
  mutator; never generate IDs inside a mutator because it can run more than
  once.
- Keep Elysia controllers thin: validate input, enforce auth through existing
  patterns, and delegate domain/data logic to the appropriate package.
- References: <https://elysiajs.com/llms.txt> and
  <https://zero.rocicorp.dev/llms.txt>

## Voice

- Implement voice-chat features with LiveKit and follow its current guidance
  for rooms, participant tokens, media tracks, and client/server boundaries.
- Reference: <https://docs.livekit.io/llms.txt>

## Commands and validation

- Bun reference: <https://bun.com/llms.txt>
- Web checks: `bun --cwd packages/web run lint`,
  `bun --cwd packages/web run typecheck`, and
  `bun --cwd packages/web run build` as relevant.
- Database commands: `bun run db:generate`, `bun run db:migrate`, and
  `bun run zero:schema` as relevant. Do not run destructive database reset
  commands without explicit approval.
- API development: `bun --cwd packages/api run dev`.

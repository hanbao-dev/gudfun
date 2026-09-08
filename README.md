# gud.fun

The gud.fun app is a Bun workspace with a Vite/React web client, Elysia API,
Better Auth, Drizzle/Postgres, and Zero synchronization.

## Local setup

1. Fill in the ignored root `.env` with your Better Auth/X credentials. Keep
   secrets out of Git.
2. Start local Postgres:

   ```sh
   bun run db:up
   ```

3. Apply database migrations:

   ```sh
   bun run db:migrate
   ```

4. In separate terminals, start the API, Zero cache, and web client:

   ```sh
   bun --cwd packages/api run dev
   bun run zero:dev
   bun --cwd packages/web run dev
   ```

The Zero development command forwards Better Auth cookies to the query and
mutation endpoints. Its local connection configuration remains in `zero.env`;
do not put secrets in that tracked file.

## Verify a local change

Run the repository checks before committing:

```sh
bun run lint
bun run typecheck
bun run test
```

For the authentication and sync smoke check:

1. Visit `http://localhost:5173` while logged out and confirm that the X login
   screen is shown.
2. Sign in through X and confirm that the authenticated page loads.
3. Confirm that the authenticated page resolves the current user through Zero
   without a `401` from `/api/zero/query`.

## Architecture

- `packages/web`: React Router Data Mode web client and shadcn/ui components.
- `packages/api`: Elysia API, Better Auth, and Zero query/mutation endpoints.
- `packages/database`: Drizzle schemas, relations, migrations, and Postgres
  connection.
- `packages/zero`: Zero queries, mutators, and generated schema.

See [AGENTS.md](AGENTS.md) for contribution rules and technology-specific
guidance.

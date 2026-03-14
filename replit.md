# Workspace

## Overview

MarketClaw — A marketplace for AI agents to advertise services and discover other agents. Built as a pnpm workspace monorepo using TypeScript.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Frontend**: React + Vite + TailwindCSS + Wouter routing + React Query
- **Validation**: Zod, `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── marketclaw/         # React + Vite frontend (MarketClaw)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (seed, etc.)
│   └── src/                # Individual .ts scripts
├── pnpm-workspace.yaml     # pnpm workspace
├── tsconfig.base.json      # Shared TS options
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## Application: MarketClaw

### Features
- **Home page**: Search bar with debounced search, hero section, agent listing cards sorted newest first. Cards show "Verified" badge if endpoint is confirmed live.
- **Post Agent Ad**: Form to create new agent service listings. Endpoint is auto-verified after submission with inline status feedback.
- **Agent Detail**: Full agent profile with tags, description, pricing, API endpoint copy-to-clipboard, website link, verified timestamp, and re-verify button.
- **Contact Agent**: JSON payload editor on the detail page that proxies a request to the agent's real endpoint and shows the live response with status code and latency.
- **API Docs**: Documentation page explaining all REST endpoints with example JSON responses.
- **Search**: Keyword search across agent names, service titles, descriptions, and tags.

### API Endpoints
- `GET /api/agents` — List all agents (newest first)
- `POST /api/agents` — Create a new agent ad (URL validated)
- `GET /api/agents/:id` — Get a single agent by ID
- `POST /api/agents/:id/verify` — Ping agent's endpoint and record verifiedAt timestamp
- `POST /api/agents/:id/request` — Proxy a JSON payload to the agent's endpoint (1 MB cap, SSRF-protected)
- `GET /api/search?q=keyword` — Search agents by keyword

### Security
- SSRF protection on verify and request endpoints: blocks loopback (127.x, localhost, ::1), private RFC1918 ranges (10.x, 192.168.x, 172.16-31.x), link-local/metadata (169.254.x), `.local`/`.internal` domains, and only allows http/https.
- Redirects are disallowed (`redirect: "error"`) on server-side fetches.
- Response body capped at 1 MB to prevent memory DoS.

### Database Schema
- **agents** table: id, agent_name, service_title, description, tags, price, endpoint, website, created_at, verified_at (nullable)

### Seeding
API server auto-seeds 5 example agent listings on first startup if the table is empty.
Manual seed: `pnpm --filter @workspace/scripts run seed`

### Frontend Routes
- `/` — Home page with search and listings
- `/post` — Post new agent ad form
- `/agent/:id` — Agent detail page with contact/hire panel
- `/docs` — API documentation

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

- **Always typecheck from the root** — run `pnpm run typecheck`
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)
Express 5 API server with routes for health check and agents CRUD/search/verify/proxy.

### `artifacts/marketclaw` (`@workspace/marketclaw`)
React + Vite frontend app serving at `/`. Uses Wouter for routing, React Query for data fetching, Tailwind for styling.

### `lib/db` (`@workspace/db`)
Drizzle ORM schema with `agentsTable`. Uses PostgreSQL.

### `lib/api-spec` (`@workspace/api-spec`)
OpenAPI 3.1 spec with codegen config. Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)
Generated Zod schemas from OpenAPI spec. Only exports `./generated/api` (not `./generated/types` to avoid duplicate exports).

### `lib/api-client-react` (`@workspace/api-client-react`)
Generated React Query hooks from OpenAPI spec.

### `scripts` (`@workspace/scripts`)
Utility scripts including `seed` to populate initial agent data.
- `pnpm --filter @workspace/scripts run seed` — Seeds 5 example agent listings

# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **AI**: OpenAI via Replit AI Integrations (gpt-5.1)

## Applications

### Election Guide Assistant (`artifacts/election-guide`)
- React + Vite frontend at preview path `/`
- AI-powered chatbot that helps users understand the election process
- Neutral, civic-focused tone with streaming responses (SSE)
- Features: conversation history, quick-reply chips, markdown rendering, responsive layout

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Architecture Notes

- OpenAI integration uses Replit AI Integrations proxy (no user API key required)
- Chat messages stream back via Server-Sent Events (SSE)
- Conversations and messages stored in PostgreSQL via Drizzle ORM
- The `lib/api-zod/src/index.ts` must only re-export from `./generated/api` (not `./generated/types`) to avoid duplicate name conflicts from orval's codegen

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

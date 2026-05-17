# Global Connect

A real-time global chat platform where anyone with a link can join and chat, toggle an AI assistant, create private ephemeral rooms, and customize their experience.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/global-connect run dev` — run the frontend (port 18430)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Required env: `AI_INTEGRATIONS_OPENAI_BASE_URL`, `AI_INTEGRATIONS_OPENAI_API_KEY` — Replit AI proxy

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + TailwindCSS + shadcn/ui + wouter
- API: Express 5
- Real-time: WebSocket (`ws` library) at `/ws`
- DB: PostgreSQL + Drizzle ORM
- AI: OpenAI via Replit AI Integrations (gpt-5.4)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for API contract)
- `lib/db/src/schema/rooms.ts` — Room table schema
- `lib/db/src/schema/chat_messages.ts` — Chat messages table schema
- `artifacts/api-server/src/lib/websocket.ts` — WebSocket server (real-time messaging, AI, presence)
- `artifacts/api-server/src/routes/rooms.ts` — REST routes for room/message management
- `artifacts/api-server/src/routes/ai.ts` — REST AI chat streaming route
- `artifacts/global-connect/src/hooks/use-websocket.ts` — Frontend WebSocket hook
- `artifacts/global-connect/src/components/chat-room.tsx` — Main chat UI component

## Architecture decisions

- WebSocket handles real-time messaging, presence, AI responses, and timer events; REST handles room CRUD and initial data hydration
- AI mode is per-room state stored in memory on the server; activates with `/ai` command, deactivates with `\ai`
- Private rooms have configurable timers: inactivity delete (resets on each message), empty room delete (starts when last user leaves), message retention (periodic cleanup)
- Room state (AI mode, timers) lives in server memory; messages persist to PostgreSQL
- Online presence is tracked purely in-memory via active WebSocket connections
- Global room (`id = 'global'`) is seeded at startup and never deleted

## Product

- **Global Chat** — anyone who opens the link joins the live global room
- **Online presence** — green dot = connected, amber/red = disconnected
- **AI Mode** — type `/ai` to activate ChatGPT-style responses; type `\ai` to deactivate
- **Private Rooms** — create ephemeral rooms with configurable inactivity/empty/retention timers and a countdown display
- **Emoji picker** — click the smiley icon in the input to pick emojis
- **Theme** — light/dark/system, persisted in localStorage
- **Wallpaper** — pick from presets or enter a custom URL; applies to chat background only

## User preferences

- App name: Global Connect
- AI should respond like ChatGPT (conversational, concise, helpful)

## Gotchas

- The `/ws` WebSocket path must be listed in `artifacts/api-server/.replit-artifact/artifact.toml` paths array — otherwise the proxy drops WebSocket upgrades silently
- Always run codegen after changing `openapi.yaml`
- Body schema names in the OpenAPI spec must be entity-shaped (not `CreateXBody`) to avoid Orval TS2308 collision
- Room timers are in-memory — server restart resets all active timers (rooms remain in DB but timers don't resume)

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details

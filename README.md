# Global Connect

A real-time global chat platform. Anyone with the link can join, chat live, summon an AI assistant, create private auto-deleting rooms, and customize their experience with themes and wallpapers.

## Features

- **Global Chat** — open to everyone, always online
- **Private Rooms** — create invite-only rooms that auto-delete on inactivity, when empty, or after a set time
- **AI Assistant** — type `/ai` to activate, `\ai` to deactivate. ChatGPT-style streaming responses
- **Online Presence** — see who's connected in real time
- **Emoji Picker** — built-in emoji support in the message input
- **Themes** — light, dark, or system — persisted locally
- **Wallpapers** — choose a preset or enter a custom image URL

## Tech Stack

- **Frontend** — React + Vite + TailwindCSS + shadcn/ui
- **Backend** — Node.js + Express 5 + WebSocket
- **Database** — PostgreSQL + Drizzle ORM
- **AI** — OpenAI API (GPT streaming)
- **Monorepo** — pnpm workspaces + TypeScript

## Project Structure

```
├── artifacts/
│   ├── global-connect/    # React frontend
│   └── api-server/        # Express + WebSocket backend
├── lib/
│   ├── db/                # Database schema & connection
│   ├── api-spec/          # OpenAPI contract (source of truth)
│   ├── api-client-react/  # Auto-generated React Query hooks
│   └── api-zod/           # Auto-generated Zod validators
```

## Running Locally

```bash
# Install dependencies
pnpm install

# Start the backend (port 8080)
pnpm --filter @workspace/api-server run dev

# Start the frontend (port 5173)
pnpm --filter @workspace/global-connect run dev
```

Required environment variables:

```
DATABASE_URL=your_postgres_connection_string
AI_INTEGRATIONS_OPENAI_BASE_URL=your_openai_base_url
AI_INTEGRATIONS_OPENAI_API_KEY=your_openai_api_key
```

## Deployment

- **Frontend** → Vercel  
- **Backend** → Render  

Set `VITE_API_URL` in Vercel to point at your Render backend URL.

## How It Works

- WebSocket handles all real-time events: messages, presence, AI streaming, timers
- REST API handles room CRUD and initial page load data
- AI conversations are kept in server memory (last 20 messages per room)
- Room timers (inactivity, empty, retention) run as Node.js `setTimeout`/`setInterval`
- The global room is seeded at startup and never deleted

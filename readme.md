# EngineX

A real-time competitive learning platform for developers — 1v1 quiz battles, multiplayer bug-finding challenges, AI voice HR interviews, and more, all built on a live game server with persistent leaderboards.

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Game Modes](#game-modes)
- [Project Structure](#project-structure)
- [Socket.IO Events Reference](#socketio-events-reference)
- [API Endpoints](#api-endpoints)
- [Deployment](#deployment)
- [Known Limitations](#known-limitations)

---

## Features

| Feature | Status |
|---------|--------|
| 1v1 live quiz (challenge system) | Live |
| Solo bug-finder challenges | Live |
| Multiplayer bug-finder (1v1) | Live |
| HR voice interview (ElevenLabs AI) | Live |
| Live transcript + session timer | Live |
| Real-time presence / online player list | Live |
| Persistent scores & leaderboard (Convex) | Live |
| Workflow graph puzzle | Live |
| Mind Snap memory game | Live |
| Toast notifications (Sonner) | Live |
| Error boundaries (route + global) | Live |
| STRUCT PAD / BIG-O SPRINT / BIT TWIDDLER | Coming soon |
| ELO ranked system | Coming soon |
| In-game chat | Coming soon |
| Reconnect-to-game grace window | Coming soon |

---

## Architecture

```
enginx/                          <- monorepo root
├── apps/
│   ├── frontend/                <- Next.js 16 app (React 19, Tailwind 4)
│   │   ├── app/                 <- App Router pages & layouts
│   │   ├── components/          <- Reusable UI components
│   │   ├── lib/                 <- Hooks, socket client, utilities
│   │   └── convex/              <- Convex schema, mutations, queries
│   └── backend/                 <- Bun + Express + Socket.IO game server
│       └── src/
│           ├── game/            <- Game managers, question packs, scoring
│           ├── socket/          <- All Socket.IO event handlers
│           ├── presence/        <- Online player registry & challenges
│           ├── auth/            <- JWT / Convex session verification
│           ├── middleware/      <- Socket auth middleware
│           └── config/          <- CORS, environment helpers
└── packages/                    <- Shared question banks (JSON)
    ├── maths.json
    ├── aiml.json
    ├── cs_fundamental.json
    └── programming.json
```

### Data flow

```
Browser  --HTTP-->  Next.js (port 3000)  --Convex SDK-->  Convex cloud
                                                          (auth, scores, users)
Browser  --WS--->  Bun/Express (port 8000)
                    └── Socket.IO
                         ├── presence / challenges
                         ├── quiz game rooms
                         └── bug-finder game rooms
```

---

## Tech Stack

### Frontend (`apps/frontend`)

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16.2 (App Router) |
| UI | React 19 |
| Styling | Tailwind CSS 4, custom `liquid-glass` utility |
| Animation | Framer Motion 12 |
| Real-time | socket.io-client 4 |
| Backend-as-a-service | Convex (auth, DB, mutations, queries) |
| Voice AI | ElevenLabs React SDK (`@elevenlabs/react`) |
| Toasts | Sonner |
| Icons | Lucide React, HugeIcons |
| Graph games | React Flow (`@xyflow/react`) |

### Backend (`apps/backend`)

| Layer | Technology |
|-------|------------|
| Runtime | Bun |
| HTTP server | Express 5 |
| WebSockets | Socket.IO 4 |
| Auth | `jose` (JWT RS256), Convex session verification |
| Language | TypeScript 5 |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) 20+ (frontend)
- [Bun](https://bun.sh) 1.3+ (backend)
- A [Convex](https://convex.dev) account and project
- An [ElevenLabs](https://elevenlabs.io) Conversational AI agent (voice interviews — optional)

### 1. Clone & install

```bash
git clone https://github.com/<org>/enginx.git
cd enginx

# Frontend
cd apps/frontend && npm install && cd ../..

# Backend
cd apps/backend && bun install && cd ../..
```

### 2. Configure Convex

```bash
cd apps/frontend
npx convex dev   # interactive setup — creates .env.local with NEXT_PUBLIC_CONVEX_URL
```

### 3. Configure the backend

```bash
cp apps/backend/.env.example apps/backend/.env
```

Edit `apps/backend/.env`. The two required values are:

```env
CONVEX_URL=https://<your-deployment>.convex.cloud   # same URL as frontend
JWT_PRIVATE_KEY=<your-rsa-private-key>
```

**Generating a key pair:**

```bash
# Private key (backend only — never commit)
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 \
  | openssl pkcs8 -topk8 -nocrypt -out private.pem

# Convert to single line for .env
awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' private.pem
```

Paste the resulting single-line value as `JWT_PRIVATE_KEY`. The corresponding public JWKS goes into both `JWKS=` in `.env` and your Convex dashboard Environment Variables.

### 4. Start dev servers

```bash
# Terminal 1 — frontend  (http://localhost:3000)
cd apps/frontend && npm run dev

# Terminal 2 — backend   (http://localhost:8000)
cd apps/backend  && bun run src/index.ts
```

---

## Environment Variables

### Backend (`apps/backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `CONVEX_URL` | Yes | Convex deployment URL |
| `JWT_PRIVATE_KEY` | Yes | RSA-2048 PKCS#8 private key (single line) |
| `JWKS` | Yes | Public JWKS JSON from Convex dashboard |
| `FRONTEND_URL` | Yes | Full URL of the Next.js app (CORS) |
| `PORT` | No | HTTP/WS port (default `8000`) |
| `HOST` | No | Bind address (default `0.0.0.0`) |
| `SOCKET_IO_PATH` | No | Socket.IO path (default `/socket.io`) |
| `SUPERPLANE_API_TOKEN` | No | SuperPlane integration token |

> The server validates `CONVEX_URL` and `FRONTEND_URL` at startup and exits immediately if they are missing or malformed.

### Frontend (`apps/frontend/.env.local`)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_CONVEX_URL` | Yes | Convex deployment URL |
| `CONVEX_DEPLOYMENT` | Yes | Set automatically by `npx convex dev` |
| `NEXT_PUBLIC_GAME_SERVER_URL` | No | Backend URL (default `http://localhost:8000`) |
| `ELEVENLABS_API_KEY` | No | ElevenLabs API key (voice interviews) |
| `ELEVENLABS_AGENT_ID` | No | ElevenLabs Conversational AI agent ID |

---

## Game Modes

### 1v1 Quiz Battle — `/play/multi`

Challenge any online player from the presence list. Each match runs up to 10 rounds with a 10-second server-enforced timer per question. Points awarded per round with streak bonuses. Final scores persisted to Convex.

**Categories:** Mathematics · AI/ML · CS Fundamentals · Programming

### Solo Bug Finder — `/play/bug-finder`

Fill-in-the-blank code challenges. Identify the missing token in a broken snippet. Three difficulty tiers — easy (80 pts) · medium (100 pts) · hard (120 pts). Filterable by concept. Full explanation shown after each answer.

### Multiplayer Bug Finder — `/play/bug-finder/multi`

Same format, live 1v1. Both players receive identical challenges via a deterministic seeded shuffle — same seed, same question order.

### HR Voice Interview — `/interview`

Live voice session with an ElevenLabs Conversational AI acting as an HR interviewer. Real-time transcript panel, session timer, and copy-to-clipboard. Four interview scenarios: behavioral (STAR), general screening, communication skills, situational.

**Setup required:** `ELEVENLABS_API_KEY` + `ELEVENLABS_AGENT_ID` in `apps/frontend/.env.local`.

### Workflow Graph Puzzle — `/play/workflow`

Connect algorithm nodes in the correct order to build a valid flowchart. Powered by React Flow.

### Mind Snap — `/play/mind-snap`

Memorise a grid pattern and reproduce it from memory.

---

## Project Structure

```
apps/frontend/
├── app/
│   ├── layout.tsx                       # Root layout — fonts, providers, Toaster
│   ├── error.tsx                        # Route-level error boundary
│   ├── global-error.tsx                 # Root layout error boundary
│   ├── dashboard/page.tsx               # Main hub
│   ├── interview/page.tsx               # ElevenLabs voice interview
│   ├── login/page.tsx
│   ├── signup/page.tsx
│   └── play/
│       ├── multi/page.tsx               # 1v1 quiz
│       ├── bug-finder/page.tsx          # Solo bug finder
│       ├── bug-finder/multi/            # Multiplayer bug finder
│       ├── run/page.tsx                 # Solo quiz run
│       ├── mind-snap/page.tsx
│       └── workflow/page.tsx
├── components/
│   ├── ui/
│   │   ├── badge.tsx                    # Badge + DifficultyBadge
│   │   ├── progress.tsx                 # Progress bar (4 colours)
│   │   ├── skeleton.tsx                 # Loading skeletons
│   │   └── code-terminal.tsx            # macOS-style terminal chrome
│   ├── bug-finder/CodeWithBlank.tsx
│   ├── dashboard/                       # QuizArenaSection, BugFinderSection, etc.
│   ├── game/                            # QuestionRenderer, GameHud, question types
│   └── workflow/                        # React Flow components
└── lib/
    ├── useMultiplayerQuiz.ts            # Quiz multiplayer state hook
    ├── useBugFinderMultiplayer.ts
    ├── socket.ts                        # Authenticated socket factory
    ├── session.tsx                      # Token provider (localStorage)
    └── auth.ts                          # useAuthState

apps/backend/src/
├── index.ts                             # Entry — env validation, server start
├── server.ts                            # Express + Socket.IO assembly
├── socket/socket.ts                     # All Socket.IO event handlers
├── game/
│   ├── gameManager.ts                   # Quiz room lifecycle
│   ├── bugFinderGameManager.ts
│   ├── packLoader.ts                    # Pack loader + seededShuffle
│   ├── bugFinderCodes.ts                # Bug-finder loader + runtime validation
│   ├── quizEvaluator.ts                 # Answer checking, scoring payloads
│   └── scoring.ts                       # Points / streak / bonus
├── presence/presenceManager.ts          # Online registry + challenge records
├── auth/sessionVerify.ts                # Convex session → userId
├── middleware/auth.ts                   # Socket auth middleware
└── config/cors.ts                       # CORS origin validation
```

---

## Socket.IO Events Reference

Connect with `socket.handshake.auth.token = <convex-session-token>`.

### Presence

| Direction | Event | Payload |
|-----------|-------|---------|
| emit | `register_presence` | `{ username?: string }` |
| emit | `challenge_user` | `{ targetUserId, username?, gameType?: "quiz" \| "bug_finder" }` |
| emit | `challenge_response` | `{ challengeId, accept: boolean }` |
| on | `presence_update` | `{ users: { userId, username }[] }` |
| on | `challenge_received` | `{ challengeId, fromUserId, fromUsername, gameType }` |
| on | `challenge_declined` | `{ challengeId }` |
| on | `challenge_cancelled` | `{ challengeId }` |
| on | `challenge_expired` | `{ challengeId }` |

### Quiz game

| Direction | Event | Payload |
|-----------|-------|---------|
| emit | `submit-answer` | `{ roomId, answer }` — max 500 chars, rate-limited 500 ms |
| emit | `get-state` | `{ roomId }` → callback with full room state |
| on | `game-started` | `{ roomId, players[] }` |
| on | `question` | `{ questionIndex, totalQuestions, question }` |
| on | `answer-time-up` | `{ correctAnswer, scores }` |
| on | `leaderboard-update` | `{ leaderboard[] }` |
| on | `game-ended` | `{ finalLeaderboard[], message }` |
| on | `player-disconnected` | `{ message }` |

### Bug finder game

Same pattern with `bf-` prefix: `bf-game-started`, `bf-question`, `bf-answer-time-up`, `bf-leaderboard-update`, `bf-game-ended`.  
Submit: `submit-bug-answer` → `{ roomId, answer }`.

---

## API Endpoints

### Backend

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check — `{ status: "ok", timestamp }` |
| `GET` | `/game/info` | Server metadata |

### Frontend (Next.js route handlers)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/elevenlabs/signed-url` | Returns short-lived ElevenLabs WebSocket URL |

---

## Deployment

### Frontend — Vercel

```bash
cd apps/frontend && vercel deploy
```

Set in Vercel dashboard: `NEXT_PUBLIC_CONVEX_URL`, `NEXT_PUBLIC_GAME_SERVER_URL` (your backend URL), and optionally `ELEVENLABS_API_KEY` + `ELEVENLABS_AGENT_ID`.

### Backend — Railway / Render / Fly.io

```bash
cd apps/backend
bun build ./src/index.ts --outdir ./dist --target node
node dist/index.js
```

Set secrets via your platform's secret manager:

```
CONVEX_URL, JWT_PRIVATE_KEY, JWKS, FRONTEND_URL, PORT
```

> For horizontal scaling, a Socket.IO Redis adapter is required (the presence list is currently in-memory per process).

---

## Development Scripts

```bash
# Root
npm run build              # Build both apps
npm run build:frontend
npm run build:backend
npm run typecheck:backend

# Frontend (apps/frontend/)
npm run dev
npm run lint
npm run convex:dev         # Convex watcher
npm run convex:push        # One-shot deploy

# Backend (apps/backend/)
bun run src/index.ts       # Dev server
```

---

## Known Limitations

| Area | Detail |
|------|--------|
| In-memory game state | Server restart ends active games. Persisting rooms to Convex is planned. |
| No reconnect grace window | Disconnect during a match ends the room immediately. |
| Single-process backend | Horizontal scaling requires a Redis adapter for Socket.IO. |
| No test suite | Game logic has no automated tests. |
| Session token storage | Token stored in `localStorage` — consider `httpOnly` cookies for higher security. |
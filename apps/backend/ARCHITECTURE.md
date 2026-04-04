# Real-time Multiplayer Quiz Backend Architecture

## Overview

This backend is built with **Bun**, **TypeScript**, **Express.js**, and **Socket.IO**. It's designed for a hackathon-style real-time multiplayer quiz application with Convex token-based authentication.

## Project Structure

```
src/
├── index.ts                    # Application entry point
├── server.ts                   # Express & Socket.IO server setup
├── middleware/
│   └── auth.ts                 # Authentication middleware for Socket.IO & Express
├── socket/
│   └── socket.ts               # Socket.IO event handlers and game logic
├── game/
│   ├── gameManager.ts          # In-memory game state management
│   ├── questionBank.ts         # Static question bank with 10 questions
│   └── scoring.ts              # (Future) Advanced scoring calculations
├── types/
│   └── types.ts                # TypeScript interfaces and types
└── utils/
    └── helper.ts               # (Future) Utility functions
```

## Key Features

### 1. **Authentication Flow**

- Users connect with a token from the Convex frontend auth
- Token passed via `socket.handshake.auth.token`
- Auth middleware validates presence (trusts token format for hackathon)
- User attached to socket as `socket.data.user = { id: token }`

### 2. **Game Management**

#### Room Creation
- Players connect and join a waiting queue
- When 2 players are in queue, a room is created automatically
- Each room has a unique ID: `room-{timestamp}-{random}`

#### Game Flow
1. **Waiting State**: Player waits for opponent
2. **Game Started**: 2 players joined → game begins
3. **Question State**: Send question to both players
4. **Answer Collection**: Players have `timeLimit` seconds to submit answer
5. **Answer Display**: Show correct answer and scores
6. **Next Question/End**: Move to next question or end game (10 questions total)
7. **Game Ended**: Final leaderboard shown

#### Scoring
- +10 points for correct answer
- +0 points for incorrect answer
- Scores persist across questions

### 3. **In-Memory State**

All data is stored in memory (no database):
- Active game rooms
- Player information (score, answers, username)
- Waiting queue for auto-matching
- Room timers for question timing

Data is cleared when:
- Game ends (after 5 seconds for cleanup)
- Player disconnects (room ends for both players)

### 4. **Socket Events**

#### Client → Server

```typescript
// Join the game queue
emit("join-game", { username?: "Player Name" }, callback)

// Submit an answer to current question
emit("submit-answer", { roomId: string, answer: string })

// Get current game state
emit("get-state", { roomId: string }, callback)
```

#### Server → Client

```typescript
// Player is waiting for opponent
emit("waiting-for-opponent")

// Game has started with 2 players
emit("game-started", { roomId, players })

// New question for answering
emit("question", { questionIndex, question, totalQuestions })

// Timer ran out, show correct answer and scores
emit("answer-time-up", { correctAnswer, scores })

// Updated leaderboard
emit("leaderboard-update", { leaderboard })

// Game has ended
emit("game-ended", { finalLeaderboard, message })

// Opponent disconnected
emit("player-disconnected", { message })
```

## Configuration

### Environment Variables (`.env`)

```
PORT=4000                              # Server port (default: 4000)
HOST=0.0.0.0                           # Server host
FRONTEND_URL=http://localhost:3000     # Frontend URL for CORS
NODE_ENV=development                   # Environment
```

### CORS Setup

By default, CORS is enabled for:
- Origin: Value of `FRONTEND_URL` env var (default: `http://localhost:3000`)
- Methods: GET, POST
- Credentials: true

## Question Bank

Static 10-question bank with:
- Multiple choice (4 options)
- Correct answer
- Time limit per question (8-12 seconds)

Located in `src/game/questionBank.ts`

## API Endpoints

### HTTP Endpoints

```
GET  /health              # Server health check
GET  /game/info           # Game metadata
```

### Socket.IO Endpoints

All socket communication goes through the main Socket.IO server at `/socket.io?...`

## Development

### Start Development Server

```bash
cd apps/backend
bun run src/index.ts
```

Or:

```bash
bun dev
```

### Build for Production

```bash
bun build src/index.ts --outdir dist
```

### Run Built Version

```bash
node dist/index.js
```

## Dependencies

- **express**: Web server framework
- **socket.io**: Real-time communication
- **cors**: Cross-origin resource sharing
- **dotenv**: Environment variable management
- **@types/node**: Node.js type definitions
- **@types/express**: Express.js type definitions
- **@types/cors**: CORS type definitions

## Security Notes (Hackathon)

⚠️ **For Hackathon Only** - Not Production Ready:

1. Token validation is minimal (trusts token format)
2. No rate limiting implemented
3. No input sanitization
4. All game state in memory (no persistence)
5. No logging of game events
6. No fraud detection or cheat prevention

For production:
- Validate tokens against Convex backend
- Implement rate limiting and DDoS protection
- Add input validation and sanitization
- Persist game history to database
- Add comprehensive logging
- Implement anti-cheat mechanisms
- Use HTTPS/WSS

## Performance Considerations

- Supports multiple simultaneous games (rooms)
- Each room is independent
- Memory usage grows with number of active rooms
- Each question broadcast is efficient (Socket.IO optimization)
- Question timers are per-room (efficient cleanup)

## Extending the Application

### Add Database Support

1. Replace in-memory `Map` in `gameManager.ts` with database calls
2. Store game history, questions, user stats
3. Verify tokens against actual Convex backend

### Add More Features

- Leaderboards across all games
- Player ratings/rankings
- Custom question sets
- Team mode
- Hints system
- Power-ups

### Add Admin Endpoints

- Manage questions
- View active games
- Kick players
- Force end game

## Troubleshooting

### Server won't start

- Check `PORT` is not in use
- Check `.env` file exists
- Run `bun install` to install dependencies

### Players can't connect

- Check `FRONTEND_URL` matches frontend origin
- Verify auth token is being sent
- Check browser console for connection errors

### Questions not appearing

- Check `questionBank.ts` is not empty
- Verify Socket.IO messages are being emitted
- Check Room state is "question"

## Example Frontend Integration (Next.js + Convex)

```typescript
import { useConvexAuth } from "convex/react";
import { useEffect } from "react";
import { io, Socket } from "socket.io-client";

export function GameComponent() {
  const { idToken } = useConvexAuth();

  useEffect(() => {
    if (!idToken) return;

    const socket: Socket = io("http://localhost:4000", {
      auth: { token: idToken },
    });

    socket.on("connect", () => {
      socket.emit("join-game", { username: "My Player" });
    });

    socket.on("question", (data) => {
      // Display question
    });

    return () => socket.close();
  }, [idToken]);

  return <div>{/* Game UI */}</div>;
}
```

## License

MIT

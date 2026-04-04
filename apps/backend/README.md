# Real-Time Multiplayer Quiz Backend

A lightweight, real-time multiplayer quiz game backend built with **Bun**, **TypeScript**, **Express**, and **Socket.IO**. Designed for hackathons with Convex token-based authentication.

## Quick Start

### Prerequisites
- [Bun](https://bun.com) (v1.3.5+)
- Node modules already installed

### Installation & Running

```bash
# Install dependencies (if needed)
bun install

# Start development server
bun run src/index.ts
```

The server will start on `http://0.0.0.0:4000`

### Configuration

Create a `.env` file (already created with defaults):

```env
PORT=4000
HOST=0.0.0.0
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for complete documentation on:
- Project structure
- Game flow and state management
- Socket.IO events
- Authentication flow
- Question bank
- Performance considerations

## Key Features

✅ **Real-time Multiplayer** - Socket.IO-powered live gameplay  
✅ **Auto-matching** - 2 players auto-paired into games  
✅ **Token Auth** - Convex-integrated authentication  
✅ **In-Memory** - No database (perfect for hackathons)  
✅ **Clean Architecture** - Well-organized TypeScript code  
✅ **CORS Ready** - Frontend communication enabled  

## Game Flow

1. Player connects with auth token
2. Joins waiting queue
3. Matched with another player → Game starts
4. 10 trivia questions with timed answers
5. Real-time scoring and leaderboard updates
6. Game ends → Final leaderboard shown

## Socket.IO Events

### Join Game
```typescript
socket.emit("join-game", { username: "Player Name" })

// Responses:
// - "waiting-for-opponent": Waiting for match
// - "game-started": Game ready with opponent
```

### Submit Answer
```typescript
socket.emit("submit-answer", { roomId, answer: "Selected Option" })
```

### Receive Events
```typescript
socket.on("question", (data) => {
  // New question to display
})

socket.on("answer-time-up", (data) => {
  // Time ended, show results
})

socket.on("leaderboard-update", (data) => {
  // Updated scores
})

socket.on("game-ended", (data) => {
  // Final leaderboard and winner
})
```

## Frontend Integration Example

```typescript
import { io } from "socket.io-client";
import { useConvexAuth } from "convex/react";

export function useQuizGame() {
  const { idToken } = useConvexAuth();

  const connectToGame = (username: string) => {
    const socket = io("http://localhost:4000", {
      auth: { token: idToken },
    });

    socket.emit("join-game", { username });

    socket.on("game-started", ({ players, roomId }) => {
      console.log("Starting game with", players);
    });

    return socket;
  };

  return { connectToGame };
}
```

## Development Scripts

```bash
# Start dev server  
bun run src/index.ts

# Health check
curl http://localhost:4000/health

# Game info
curl http://localhost:4000/game/info
```

## Project Structure

```
src/
├── index.ts                 # Entry point
├── server.ts                # Express + Socket.IO setup
├── middleware/auth.ts       # Auth middleware
├── socket/socket.ts         # Socket.IO handlers
├── game/
│   ├── gameManager.ts       # Game state management
│   ├── questionBank.ts      # Question data (10 questions)
│   └── scoring.ts           # Scoring logic
├── types/types.ts           # TypeScript interfaces
└── utils/helper.ts          # Utilities (optional)
```

## How It Works

### Authentication
- Players send token from Convex frontend auth via `socket.handshake.auth.token`
- Auth middleware validates presence, attaches user to socket
- Hackathon-mode: minimal validation (trusts token format)

### Game Flow
- In-memory room management with automatic 2-player matching
- Questions sent on timer (8-12 seconds each)
- Real-time score updates via Socket.IO broadcasting
- Game ends after 10 questions
- Leaderboard updated continuously

### No Database
- All game state stored in memory
- Perfect for hackathons (no DB setup needed)
- Data cleared when game ends or players disconnect
- Scales to multiple simultaneous games

## Performance

- Handles multiple simultaneous games
- Each game is an independent room
- Efficient Socket.IO message broadcasting
- Per-room timers (clean resource management)

## Notes for Production

⚠️ This is hackathon-grade code. For production:

- Validate tokens against actual Convex backend
- Add database for game history
- Implement rate limiting and DDoS protection
- Add input validation and sanitization
- Add comprehensive logging and monitoring
- Use HTTPS/WSS in production
- Implement anti-cheat mechanisms

## Troubleshooting

**Server won't start**: Check `PORT` isn't in use, verify `.env` exists  
**Players can't connect**: Verify `FRONTEND_URL` matches frontend origin  
**No questions appear**: Check Socket.IO messages in browser DevTools  

## License

MIT


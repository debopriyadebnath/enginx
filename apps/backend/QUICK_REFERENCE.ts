/**
 * Quick Reference Guide - Quiz Backend API
 */

declare const io: any;

// ============================================
// Socket.IO Client Example
// ============================================

const socket = io("http://localhost:8000", {
  auth: {
    // Convex Auth access JWT (same as useAuthToken() on the Next.js client)
    token: "<jwt>",
  },
});

// ============================================
// EVENT: join-game
// ============================================
// Sent by: Client
// Description: Player joins the game queue
// Emits back: "waiting-for-opponent" or "game-started"

socket.emit("join-game", { username: "My Player" }, (response: any) => {
  // response = {
  //   status: "waiting" | "game_started" | "error",
  //   roomId?: string,
  //   message?: string
  // }
});

// ============================================
// EVENT: waiting-for-opponent
// ============================================
// Sent by: Server
// Description: Player is waiting for a match

socket.on("waiting-for-opponent", () => {
  // Show "Waiting for opponent..." UI
});

// ============================================
// EVENT: game-started
// ============================================
// Sent by: Server
// Description: 2 players matched, game begins

socket.on("game-started", (data: any) => {
  // data = {
  //   roomId: string,
  //   players: [
  //     { socketId, username, score },
  //     { socketId, username, score }
  //   ]
  // }
});

// ============================================
// EVENT: question
// ============================================
// Sent by: Server
// Description: New question for the player

socket.on("question", (data: any) => {
  // data = {
  //   questionIndex: number,           // 0-9
  //   totalQuestions: number,          // 10
  //   question: {
  //     id: string,
  //     text: string,
  //     options: string[],             // 4 options
  //     timeLimit: number              // 8-12 seconds
  //   }
  // }
  // Display question and start countdown timer
});

// ============================================
// EVENT: submit-answer
// ============================================
// Sent by: Client
// Description: Submit player's answer

socket.emit("submit-answer", {
  roomId: "room-123456",
  answer: "Paris",  // Must match one of the options
});

// Server responds with: "answer-received"

// ============================================
// EVENT: answer-time-up
// ============================================
// Sent by: Server
// Description: Time expired, show results

socket.on("answer-time-up", (data: any) => {
  // data = {
  //   correctAnswer: string,
  //   scores: {
  //     "socket-id-1": {
  //       answer: string | null,
  //       isCorrect: boolean,
  //       points: number              // 0 or 10
  //     },
  //     "socket-id-2": { ... }
  //   }
  // }
  // Show correct answer and points earned
});

// ============================================
// EVENT: leaderboard-update
// ============================================
// Sent by: Server
// Description: Updated scores after each question

socket.on("leaderboard-update", (data: any) => {
  // data = {
  //   leaderboard: [
  //     { userId, username, score },
  //     { userId, username, score }
  //   ]
  // }
  // Update leaderboard display
});

// ============================================
// EVENT: game-ended
// ============================================
// Sent by: Server
// Description: Quiz finished after 10 questions

socket.on("game-ended", (data: any) => {
  // data = {
  //   finalLeaderboard: [
  //     { userId, username, score },
  //     { userId, username, score }
  //   ],
  //   message: "Quiz completed!"
  // }
  // Show final results screen
});

// ============================================
// EVENT: player-disconnected
// ============================================
// Sent by: Server
// Description: Opponent left the game

socket.on("player-disconnected", (data: any) => {
  // data = { message: "Opponent disconnected" }
  // End game, show message
});

// ============================================
// EVENT: get-state
// ============================================
// Sent by: Client
// Description: Query current game state

socket.emit("get-state", { roomId: "room-123" }, (state: any) => {
  // state = {
  //   roomId: string,
  //   gameState: "waiting" | "playing" | "question" | "answer" | "ended",
  //   questionIndex: number,
  //   question: { id, text, options, timeLimit },
  //   leaderboard: [{ userId, username, score }],
  //   players: [{ socketId, username, score }]
  // }
});

// ============================================
// Game Flow Timeline
// ============================================

/*
Time    Event                      Client Receives
----    -----                      ---------------
0ms     Player 1 joins             waiting-for-opponent
200ms   Player 2 joins             game-started (both)
1s      First question sent        question (index 0/10)
1s      Timer starts               [countdown 12s remaining]
10s     Time expires               answer-time-up
13s     Show results               leaderboard-update
14s     Next question sent         question (index 1/10)
...     [repeat 14s cycle]
144s    10th question sent         question (index 9/10)
154s    Final timer expires        answer-time-up
157s    Game ends                  game-ended, finalLeaderboard
*/

// ============================================
// HTTP Endpoints
// ============================================

// GET /health
// Returns: { status: "ok", timestamp: ISO string }
// Use for: Server health check

// GET /game/info
// Returns: { name, version, description }
// Use for: Game metadata

// ============================================
// Scoring Rules
// ============================================

/*
Correct Answer  → +10 points
Wrong Answer    → +0 points
No Answer       → +0 points
No Penalty      → Points only increase, never decrease

Example:
- Question 1: Player A answers correctly (+10), Player B wrong (+0)
- After Q1: A=10, B=0
- Question 2: Player A wrong (+0), Player B answers correctly (+10)
- After Q2: A=10, B=10
*/

// ============================================
// Room ID Format
// ============================================

/*
Format: room-{timestamp}-{random}
Example: room-1705329845123-a7k3x9m2

- timestamp: Date.now() when room created
- random: Random alphanumeric string
- Guaranteed unique per game
*/

// ============================================
// Authentication
// ============================================

/*
Token Format: Any string (for hackathon)
Typical: JWT from Convex frontend auth

Passed via: socket.handshake.auth.token
Trusted as: User ID in socket.data.user

In production:
- Validate token against Convex backend
- Check token expiration
- Verify signature
*/

// ============================================
// Error Handling
// ============================================

socket.on("error", (error: any) => {
  // Emitted when:
  // - No auth token provided
  // - Server encounters exception
  // - Room not found
  // - Invalid data
  console.error("Socket error:", error);
});

// ============================================
// Common Integration Steps
// ============================================

/*
1. User authenticates with Convex
   → Get idToken from Convex auth

2. Frontend creates Socket.IO connection
   → Pass idToken in auth
   → Handle "connect" event

3. Emit join-game
   → Include username
   → Handle "waiting-for-opponent" or "game-started"

4. Listen for "question"
   → Display question and options
   → Start countdown timer based on timeLimit

5. User selects answer
   → Emit "submit-answer"
   → Disable input (prevent double submission)

6. Listen for "answer-time-up"
   → Show correct answer
   → Show points earned
   → Display other player's answer

7. Listen for "leaderboard-update"
   → Update score display
   → Show current standings

8. Repeat steps 4-7 for each question

9. Listen for "game-ended"
   → Show final leaderboard
   → Show winner
   → Offer option to play again

10. Handle "player-disconnected"
    → Show message
    → Return to home/join screen
*/

// ============================================
// Performance Considerations
// ============================================

/*
Socket.IO Messages per Game:
- 2 join-game: 2
- 10 questions: 10
- 10 answer-time-up: 10
- ~20 leaderboard updates: 20
- 1 game-ended: 1
- ~10 answer-received: 10
≈ 53 messages total per game session

Bandwidth per message: ~0.1-1KB
Total per game: ~5-50KB

Memory per room: ~5-10KB
Multiple rooms: Linear scaling
1000 simultaneous games: ~5-10MB

Latency:
- Connect: 50-200ms
- Question transmission: <5ms
- Answer submission: <5ms
*/

// ============================================
// Testing Checklist
// ============================================

/*
✓ Server starts without errors
✓ /health endpoint responds
✓ /game/info endpoint responds
✓ Single player can connect
✓ Single player sees "waiting-for-opponent"
✓ Two players can match
✓ Both players see game-started
✓ First question is sent
✓ Player can submit answer
✓ Answer is collected
✓ Time runs out → answer-time-up sent
✓ Leaderboard updates
✓ Second question starts
✓ 10 questions complete
✓ Game-ended event sent
✓ Leaderboard shown
✓ Player disconnect handled
✓ Room cleaned up
✓ Can play multiple games
*/

export const API_REFERENCE = {
  socketEvents: {
    // Client → Server
    "join-game": {
      payload: { username: "string (optional)" },
      callback: "(response) => void",
    },
    "submit-answer": { roomId: "string", answer: "string" },
    "get-state": { roomId: "string" },

    // Server → Client
    "waiting-for-opponent": {},
    "game-started": { roomId: "string", players: "array" },
    question: {
      questionIndex: "number",
      totalQuestions: "number",
      question: "object",
    },
    "answer-time-up": { correctAnswer: "string", scores: "object" },
    "leaderboard-update": { leaderboard: "array" },
    "game-ended": { finalLeaderboard: "array", message: "string" },
    "player-disconnected": { message: "string" },
    "answer-received": { message: "string" },
  },
};

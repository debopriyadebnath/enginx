/**
 * Socket.IO Testing Guide
 * 
 * Methods to test the quiz backend without a frontend:
 */

// ============================================
// OPTION 1: Using socket.io-client in Node.js
// ============================================

/*
Install:
npm install socket.io-client

Code:
*/

import { io } from "socket.io-client";

const testSocket = () => {
  const socket = io("http://localhost:4000", {
    auth: {
      token: "test-token-12345",
    },
  });

  // Test 1: Connect
  socket.on("connect", () => {
    console.log("✅ Connected to server");

    // Test 2: Join game
    socket.emit("join-game", { username: "TestPlayer" }, (response: any) => {
      console.log("📝 Join response:", response);
    });
  });

  // Test 3: Listen for events
  socket.on("waiting-for-opponent", () => {
    console.log("⏳ Waiting for opponent...");
  });

  socket.on("game-started", (data: any) => {
    console.log("🎮 Game started:", data);
  });

  socket.on("question", (data: any) => {
    console.log("❓ Question received:", data.question.text);
    console.log("   Options:", data.question.options);

    // Auto-submit random answer
    setTimeout(() => {
      const randomAnswer =
        data.question.options[
          Math.floor(Math.random() * data.question.options.length)
        ];
      socket.emit("submit-answer", {
        roomId: "your-room-id",
        answer: randomAnswer,
      });
    }, 2000);
  });

  socket.on("answer-time-up", (data: any) => {
    console.log("⏸️ Answer time up:", data);
  });

  socket.on("leaderboard-update", (data: any) => {
    console.log("📊 Leaderboard:", data.leaderboard);
  });

  socket.on("game-ended", (data: any) => {
    console.log("🏁 Game ended:", data);
    socket.close();
  });

  socket.on("error", (error: any) => {
    console.error("❌ Socket error:", error);
  });

  socket.on("disconnect", () => {
    console.log("❌ Disconnected");
  });
};

// Run test
// testSocket();

// ============================================
// OPTION 2: Using curl for REST endpoints
// ============================================

/*
Test health check:
curl http://localhost:4000/health

Expected response:
{"status":"ok","timestamp":"2024-01-15T10:30:45.123Z"}

Test game info:
curl http://localhost:4000/game/info

Expected response:
{"name":"Real-time Multiplayer Quiz","version":"1.0.0","description":"..."}
*/

// ============================================
// OPTION 3: Using Testing Tools (Postman, etc)
// ============================================

/*
For Socket.IO testing in Postman:

1. Postman doesn't natively support Socket.IO testing
2. Use a Socket.IO client library or browser DevTools instead
3. Or use a dedicated tool like:
   - Socket.IO Desktop Client
   - Socketman extension
   - Custom Node script (see Option 1)
*/

// ============================================
// OPTION 4: Browser Console Testing
// ============================================

/*
In any browser connected to your frontend, run:

import { io } from "https://cdn.socket.io/4.5.4/socket.io.min.js";

const socket = io("http://localhost:4000", {
  auth: { token: "test-token-12345" }
});

socket.on("connect", () => console.log("Connected!"));
socket.emit("join-game", { username: "BrowserTest" });
socket.on("game-started", (data) => console.log("Game started:", data));
*/

// ============================================
// OPTION 5: Complete Test Scenario
// ============================================

export const runFullTest = async () => {
  // Simulate 2 players joining and playing
  const player1Socket = io("http://localhost:4000", {
    auth: { token: "player-1-token" },
  });

  const player2Socket = io("http://localhost:4000", {
    auth: { token: "player-2-token" },
  });

  const gameState = {
    roomId: null as string | null,
    currentQuestion: null as any,
    answers: {} as { [key: string]: string },
  };

  // Setup Player 1
  player1Socket.on("connect", () => {
    console.log("Player 1 connected");
    player1Socket.emit("join-game", { username: "Player 1" }, (response: any) => {
      console.log("Player 1 response:", response);
      if (response.roomId) {
        gameState.roomId = response.roomId;
      }
    });
  });

  // Setup Player 2
  player2Socket.on("connect", () => {
    console.log("Player 2 connected");
    player2Socket.emit("join-game", { username: "Player 2" }, (response: any) => {
      console.log("Player 2 response:", response);
      if (response.roomId) {
        gameState.roomId = response.roomId;
      }
    });
  });

  // Listen for game events
  const setupListener = (socket: any, playerName: string) => {
    socket.on("game-started", (data: any) => {
      console.log(`${playerName}: Game started!`, data.players);
    });

    socket.on("question", (data: any) => {
      console.log(
        `${playerName}: Question ${data.questionIndex + 1}/${data.totalQuestions}`
      );
      console.log(`  Q: ${data.question.text}`);
      console.log(`  Options: ${data.question.options.join(", ")}`);

      gameState.currentQuestion = data.question;

      // Auto-answer with delay
      setTimeout(() => {
        const answer =
          data.question.options[
            Math.floor(Math.random() * data.question.options.length)
          ];
        console.log(`${playerName}: Answering with "${answer}"`);

        if (gameState.roomId) {
          socket.emit("submit-answer", {
            roomId: gameState.roomId,
            answer,
          });
        }
      }, 1000);
    });

    socket.on("answer-time-up", (data: any) => {
      console.log(`${playerName}: Answer time up!`);
      console.log("  Correct answer:", data.correctAnswer);
      console.log("  Scores:", data.scores);
    });

    socket.on("leaderboard-update", (data: any) => {
      console.log(`${playerName}: Leaderboard update`);
      data.leaderboard.forEach((entry: any, idx: number) => {
        console.log(`  ${idx + 1}. ${entry.username} - ${entry.score} pts`);
      });
    });

    socket.on("game-ended", (data: any) => {
      console.log(`${playerName}: Game ended!`);
      console.log("  Final results:");
      data.finalLeaderboard.forEach((entry: any, idx: number) => {
        console.log(`  ${idx + 1}. ${entry.username} - ${entry.score} pts`);
      });
    });
  };

  setupListener(player1Socket, "Player 1");
  setupListener(player2Socket, "Player 2");
};

// ============================================
// OPTION 6: Testing with curl + polling
// ============================================

/*
Check server health before testing:

bash script to monitor server:

while true; do
  curl -s http://localhost:4000/health | jq .
  sleep 2
done

Or with PowerShell:

while($true) {
  Invoke-WebRequest http://localhost:4000/health -UseBasicParsing | Select-Object -ExpandProperty Content
  Start-Sleep -Seconds 2
}
*/

// ============================================
// Checklist for Manual Testing
// ============================================

/*
1. Server starts ✓
   - Run: bun src/index.ts
   - Check: See "Server running at" message

2. Health endpoints respond ✓
   - GET /health → returns status: "ok"
   - GET /game/info → returns game metadata

3. Single player can connect ✓
   - Connect with token
   - Join game
   - Should see "waiting-for-opponent"

4. Two players can match ✓
   - Connect 2 browsers/clients with different tokens
   - Both should emit join-game
   - Both should receive game-started
   - Both should receive game-started event

5. Question flow works ✓
   - Both players receive "question" event
   - Each player can submit answer
   - Both receive "answer-time-up" after timeout
   - Questions increment correctly

6. Score calculation works ✓
   - Player who selects correct answer gets +10 points
   - Player who selects wrong answer gets +0 points
   - Leaderboard reflects correct scores

7. Game ends correctly ✓
   - After 10 questions, game ends
   - Both players receive game-ended
   - Final leaderboard shown

8. Disconnect handling works ✓
   - If one player disconnects, both receive notification
   - Room is cleaned up
   - Players can rejoin for new game
*/

export const verboseTestLog = () => {
  console.log(`
╔════════════════════════════════════════╗
║  Quiz Backend Testing Guide            ║
║  =============================        ║
║                                        ║
║  Server Setup:                         ║
║  $ bun src/index.ts                   ║
║                                        ║
║  Health Check:                         ║
║  $ curl http://localhost:4000/health   ║
║                                        ║
║  Socket.IO Test (Node):               ║
║  $ node test-socket.js                ║
║                                        ║
║  Browser Console:                     ║
║  import { io } from "socket.io"      ║
║  let s = io("http://localhost:4000",  ║
║    { auth: { token: "test" } })      ║
║  s.emit("join-game", ...)             ║
║                                        ║
╚════════════════════════════════════════╝
  `);
};

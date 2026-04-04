import "dotenv/config";
import { createServer_ } from "./server.js";

const PORT = parseInt(process.env.PORT || "4000", 10);
const HOST = process.env.HOST || "0.0.0.0";

const { app, server, io } = createServer_();

server.listen(PORT, HOST, () => {
  console.log(`
╔════════════════════════════════════════╗
║  Real-time Multiplayer Quiz Backend   ║
║  =============================        ║
║  Server running at: http://${HOST}:${PORT}    ║
║  Socket.IO ready for connections      ║
╚════════════════════════════════════════╝
  `);

  // Handle graceful shutdown
  process.on("SIGTERM", () => {
    console.log("SIGTERM received, closing server...");
    server.close(() => {
      console.log("Server closed");
      process.exit(0);
    });
  });

  process.on("SIGINT", () => {
    console.log("SIGINT received, closing server...");
    server.close(() => {
      console.log("Server closed");
      process.exit(0);
    });
  });
});

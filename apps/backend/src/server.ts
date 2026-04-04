import express, { type Express, type Request, type Response } from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import { initializeSocket } from "./socket/socket.js";
import { getFrontendOrigins } from "./config/cors.js";

export function createServer_() {
  const app: Express = express();
  const server = createServer(app);

  const corsOrigin = getFrontendOrigins();

  const io = new Server(server, {
    cors: {
      origin: corsOrigin,
      methods: ["GET", "POST", "OPTIONS"],
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization"],
    },
    transports: ["websocket", "polling"],
    allowEIO3: true,
    /** Reduce spurious disconnects on slow tabs / dev tools / Wi‑Fi. */
    pingTimeout: 60_000,
    pingInterval: 25_000,
    connectTimeout: 45_000,
  });

  // Middleware
  app.use(
    cors({
      origin: corsOrigin,
      credentials: true,
      methods: ["GET", "POST", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );

  app.use(express.json());

  // Health check endpoint
  app.get("/health", (req: Request, res: Response) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Game info endpoint
  app.get("/game/info", (req: Request, res: Response) => {
    res.json({
      name: "Real-time Multiplayer Quiz",
      version: "1.0.0",
      description: "A real-time quiz game built with Socket.IO and Express",
    });
  });

  // Initialize Socket.IO event handlers
  initializeSocket(io);

  return { app, server, io };
}

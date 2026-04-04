import express, { Express, Request, Response } from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import { initializeSocket } from "./socket/socket.js";

export function createServer_() {
  const app: Express = express();
  const server = createServer(app);
  const frontendOrigin = process.env.FRONTEND_URL || "http://localhost:3000";

  // Create Socket.IO server with CORS enabled
  const io = new Server(server, {
    cors: {
      origin: frontendOrigin,
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  // Middleware
  app.use(
    cors({
      origin: frontendOrigin,
      methods: ["GET", "POST"],
      credentials: true,
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

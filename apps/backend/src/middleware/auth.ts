import type { CustomSocket } from "../types/types.js";

/**
 * Socket.IO authentication middleware
 * Extracts token from socket.handshake.auth.token and attaches user to socket.data
 * For hackathon purposes, we trust the token without full validation
 * In production, you would verify the token against Convex backend
 */
export const authMiddleware = (socket: CustomSocket, next: (err?: Error) => void) => {
  try {
    const token = socket.handshake.auth.token as string;

    if (!token) {
      return next(new Error("Authentication token required"));
    }

    // For hackathon: trust the token format
    // In production: validate against Convex or your auth provider
    // Expected format: JWT or session token from Convex frontend auth
    socket.data.user = {
      id: token, // We'll use token as user ID for this hackathon version
    };

    next();
  } catch (error) {
    next(
      new Error(
        error instanceof Error ? error.message : "Authentication failed"
      )
    );
  }
};

/**
 * Express middleware for HTTP routes (if needed)
 * Extracts token from Authorization header
 */
export const authExpressMiddleware = (
  req: any,
  res: any,
  next: (err?: Error) => void
) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ error: "Authentication token required" });
    }

    req.user = {
      id: token,
    };

    next();
  } catch (error) {
    res.status(401).json({
      error: error instanceof Error ? error.message : "Authentication failed",
    });
  }
};

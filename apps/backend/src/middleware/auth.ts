import type { CustomSocket } from "../types/types.js";

type ExpressLikeRequest = {
  headers: Record<string, string | string[] | undefined>;
  user?: { id: string };
};

type ExpressLikeResponse = {
  status: (code: number) => { json: (body: unknown) => void };
};

export const extractTokenFromSocket = (socket: CustomSocket): string | null => {
  const raw = socket.handshake.auth?.token;
  if (typeof raw !== "string") return null;

  const token = raw.trim();
  return token.length > 0 ? token : null;
};

export const minimallyValidateToken = (token: string | null): token is string => {
  if (!token) return false;

  // Hackathon validation: accept any non-empty token/user id with basic length guard.
  return token.length >= 3;
};

export const buildSocketUser = (token: string) => ({ id: token });

/**
 * Socket.IO authentication middleware
 * Extracts token from socket.handshake.auth.token and attaches user to socket.data
 * For hackathon purposes, we trust the token without full validation
 * In production, you would verify the token against Convex backend
 */
export const authMiddleware = (socket: CustomSocket, next: (err?: Error) => void) => {
  try {
    const token = extractTokenFromSocket(socket);
    if (!minimallyValidateToken(token)) {
      return next(new Error("Authentication token required"));
    }

    // For hackathon: trust the token format
    // In production: validate against Convex or your auth provider
    // Expected format: JWT or session token from Convex frontend auth
    socket.data.user = buildSocketUser(token);

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
  req: ExpressLikeRequest,
  res: ExpressLikeResponse,
  next: (err?: Error) => void
) => {
  try {
    const authHeader = req.headers.authorization;
    const rawHeader = Array.isArray(authHeader) ? authHeader[0] : authHeader;
    const token = rawHeader?.replace("Bearer ", "").trim() || null;

    if (!minimallyValidateToken(token)) {
      return res.status(401).json({ error: "Authentication token required" });
    }

    req.user = buildSocketUser(token);

    next();
  } catch (error) {
    res.status(401).json({
      error: error instanceof Error ? error.message : "Authentication failed",
    });
  }
};

export const socketAuthMiddleware = authMiddleware;

import type { Socket } from "socket.io";
import type { Request, Response, NextFunction } from "express";
import type { CustomSocket } from "../types/types.js";
import { verifySessionToken } from "../auth/sessionVerify.js";
import {
  extractHandshakeAuthToken,
  buildSocketUser,
  SocketAuthError,
} from "../auth/socketAuth.js";

export type SocketAuthNext = (err?: Error) => void;

function mapSessionError(err: unknown): string {
  if (err instanceof Error) {
    const m = err.message;
    if (/invalid|expired/i.test(m)) {
      return SocketAuthError.INVALID_TOKEN;
    }
    return m;
  }
  return SocketAuthError.INVALID_TOKEN;
}

/**
 * Socket.IO middleware — validates session token via Convex
 */
export async function socketAuthMiddleware(
  socket: CustomSocket,
  next: SocketAuthNext
): Promise<void> {
  try {
    const token = extractHandshakeAuthToken(socket as unknown as Socket);

    if (!token) {
      next(new Error(SocketAuthError.MISSING_TOKEN));
      return;
    }

    const { userId } = await verifySessionToken(token);
    socket.data.user = buildSocketUser(userId);

    next();
  } catch (error) {
    next(new Error(mapSessionError(error)));
  }
}

/**
 * Express middleware — Authorization: Bearer <session token>
 */
export function expressAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  void (async () => {
    try {
      const authHeader = req.headers.authorization;

      const bearer = authHeader?.startsWith("Bearer ")
        ? authHeader.slice(7).trim()
        : undefined;

      if (!bearer) {
        res.status(401).json({ error: SocketAuthError.MISSING_TOKEN });
        return;
      }

      const { userId } = await verifySessionToken(bearer);
      req.user = buildSocketUser(userId);

      next();
    } catch (error) {
      res.status(401).json({
        error: mapSessionError(error),
      });
    }
  })();
}

/** @deprecated Use `socketAuthMiddleware` */
export const authMiddleware = socketAuthMiddleware;

/** @deprecated Use `expressAuthMiddleware` */
export const authExpressMiddleware = expressAuthMiddleware;

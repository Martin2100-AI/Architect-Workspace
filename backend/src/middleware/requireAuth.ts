import { NextFunction, Request, RequestHandler, Response } from 'express';
import { TokenBlocklist } from '../models/TokenBlocklist';
import { isTokenRevoked, verifySessionToken } from '../services/tokenService';

export interface AuthenticatedRequest extends Request {
  userId?: number;
  tokenJti?: string;
  tokenExpiresAt?: Date;
}

export function requireAuth(blocklistModel: typeof TokenBlocklist, jwtSecret: string): RequestHandler {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const header = req.get('authorization');
    if (!header?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'MissingToken' });
      return;
    }

    let payload;
    try {
      payload = verifySessionToken(header.slice('Bearer '.length), jwtSecret);
    } catch {
      res.status(401).json({ error: 'InvalidToken' });
      return;
    }

    if (await isTokenRevoked(blocklistModel, payload.jti)) {
      res.status(401).json({ error: 'TokenRevoked' });
      return;
    }

    req.userId = payload.userId;
    req.tokenJti = payload.jti;
    req.tokenExpiresAt = payload.expiresAt;
    next();
  };
}

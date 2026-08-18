import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import { TokenBlocklist } from '../models/TokenBlocklist';

const TOKEN_EXPIRY_SECONDS = 60 * 60;

export interface SessionTokenPayload {
  userId: number;
  jti: string;
  expiresAt: Date;
}

export function createSessionToken(userId: number, secret: string): string {
  return jwt.sign({ sub: String(userId), jti: randomUUID() }, secret, { expiresIn: TOKEN_EXPIRY_SECONDS });
}

export function verifySessionToken(token: string, secret: string): SessionTokenPayload {
  const payload = jwt.verify(token, secret);
  if (typeof payload === 'string' || typeof payload.sub !== 'string' || typeof payload.jti !== 'string' || typeof payload.exp !== 'number') {
    throw new Error('Invalid token payload');
  }
  return { userId: Number(payload.sub), jti: payload.jti, expiresAt: new Date(payload.exp * 1000) };
}

export async function revokeToken(blocklistModel: typeof TokenBlocklist, jti: string, expiresAt: Date): Promise<void> {
  // findOrCreate on the unique jti column makes this idempotent — revoking the same
  // token twice inserts one blocklist row, not two.
  await blocklistModel.findOrCreate({ where: { jti }, defaults: { jti, expiresAt } });
}

export async function isTokenRevoked(blocklistModel: typeof TokenBlocklist, jti: string): Promise<boolean> {
  const found = await blocklistModel.findOne({ where: { jti } });
  return found !== null;
}

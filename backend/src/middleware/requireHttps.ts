import { NextFunction, Request, Response } from 'express';

export function requireHttps(req: Request, res: Response, next: NextFunction): void {
  if (req.secure || req.get('x-forwarded-proto') === 'https') {
    next();
    return;
  }

  res.status(403).json({ error: 'HttpsRequired' });
}

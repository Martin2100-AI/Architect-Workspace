import { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * No-op unless CORS_ORIGIN is configured — a frontend served from the same
 * origin as the API (or behind a reverse proxy) never needs this. Only one
 * origin is supported by design: a comma-separated allowlist would need its
 * own validation and isn't required by anything in this repo yet.
 */
export function createCorsMiddleware(allowedOrigin: string | undefined): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!allowedOrigin) {
      next();
      return;
    }

    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');

    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }

    next();
  };
}

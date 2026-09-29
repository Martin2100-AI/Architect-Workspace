import { NextFunction, Request, Response } from 'express';

// Pairs with requireHttps: HSTS tells the browser to upgrade every future request to
// this origin to HTTPS on its own, closing the gap where a user's very first request
// (before requireHttps has a chance to reject anything) could still be sent in the
// clear or MITM'd onto plain HTTP. Browsers only honor HSTS on a response actually
// received over HTTPS, so setting it unconditionally is safe.
export function securityHeaders(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
}

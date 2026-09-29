import { Request, Response } from 'express';
import { securityHeaders } from './securityHeaders';

function mockReqRes() {
  const headers: Record<string, string> = {};
  const req = {} as Request;
  const res = {
    setHeader(name: string, value: string) {
      headers[name] = value;
      return res;
    },
  } as unknown as Response;

  return { req, res, headers };
}

describe('securityHeaders', () => {
  it('sets a Strict-Transport-Security header covering subdomains', () => {
    const { req, res, headers } = mockReqRes();
    const next = jest.fn();

    securityHeaders(req, res, next);

    expect(headers['Strict-Transport-Security']).toBe('max-age=31536000; includeSubDomains');
  });

  it('sets X-Content-Type-Options to prevent MIME sniffing', () => {
    const { req, res, headers } = mockReqRes();
    const next = jest.fn();

    securityHeaders(req, res, next);

    expect(headers['X-Content-Type-Options']).toBe('nosniff');
  });

  it('always calls next', () => {
    const { req, res } = mockReqRes();
    const next = jest.fn();

    securityHeaders(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});

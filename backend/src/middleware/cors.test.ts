import { Request, Response } from 'express';
import { createCorsMiddleware } from './cors';

// Minimal hand-rolled req/res doubles, matching the pattern in requireHttps.test.ts.
function mockReqRes(method = 'GET') {
  const req = { method } as unknown as Request;

  const state = { statusCode: 0, headers: {} as Record<string, string>, ended: false };
  const res = {
    setHeader(name: string, value: string) {
      state.headers[name] = value;
    },
    status(code: number) {
      state.statusCode = code;
      return res;
    },
    end() {
      state.ended = true;
      return res;
    },
  } as unknown as Response;

  return { req, res, state };
}

describe('createCorsMiddleware', () => {
  it('is a no-op when no origin is configured', () => {
    const { req, res, state } = mockReqRes();
    const next = jest.fn();

    createCorsMiddleware(undefined)(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(state.headers['Access-Control-Allow-Origin']).toBeUndefined();
  });

  it('sets CORS headers and calls next for a normal request when an origin is configured', () => {
    const { req, res, state } = mockReqRes('POST');
    const next = jest.fn();

    createCorsMiddleware('http://localhost:3000')(req, res, next);

    expect(state.headers['Access-Control-Allow-Origin']).toBe('http://localhost:3000');
    expect(next).toHaveBeenCalled();
    expect(state.ended).toBe(false);
  });

  it('short-circuits an OPTIONS preflight with 204 instead of calling next', () => {
    const { req, res, state } = mockReqRes('OPTIONS');
    const next = jest.fn();

    createCorsMiddleware('http://localhost:3000')(req, res, next);

    expect(state.statusCode).toBe(204);
    expect(state.ended).toBe(true);
    expect(next).not.toHaveBeenCalled();
  });
});

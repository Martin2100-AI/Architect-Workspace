import { Request, Response } from 'express';
import { requireHttps } from './requireHttps';

// Minimal hand-rolled req/res doubles — pulling in supertest/a real app for a 3-branch
// pure function would be more setup than the thing being tested.
function mockReqRes(overrides: { secure?: boolean; forwardedProto?: string } = {}) {
  const req = {
    secure: overrides.secure ?? false,
    get: (header: string) => (header.toLowerCase() === 'x-forwarded-proto' ? overrides.forwardedProto : undefined),
  } as unknown as Request;

  const state = { statusCode: 0, body: undefined as unknown };
  const res = {
    status(code: number) {
      state.statusCode = code;
      return res;
    },
    json(payload: unknown) {
      state.body = payload;
      return res;
    },
  } as unknown as Response;

  return { req, res, state };
}

describe('requireHttps', () => {
  it('allows a request that is already secure', () => {
    const { req, res } = mockReqRes({ secure: true });
    const next = jest.fn();

    requireHttps(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('allows a request forwarded as https by a reverse proxy', () => {
    const { req, res } = mockReqRes({ forwardedProto: 'https' });
    const next = jest.fn();

    requireHttps(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('rejects a plain HTTP request with 403', () => {
    const { req, res, state } = mockReqRes();
    const next = jest.fn();

    requireHttps(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(state.statusCode).toBe(403);
  });
});

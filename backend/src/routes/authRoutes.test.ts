import request from 'supertest';
import { createTestApp, TestApp } from '../testUtils/createTestApp';

describe('POST /auth/signup', () => {
  let ctx: TestApp;

  beforeEach(async () => {
    ctx = await createTestApp();
  });

  afterEach(async () => {
    await ctx.sequelize.close();
  });

  it('creates a new user given a valid email and password', async () => {
    const res = await request(ctx.app)
      .post('/auth/signup')
      .send({ email: 'buyer@example.com', password: 'super-secret-1' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: expect.any(Number), email: 'buyer@example.com' });

    const stored = await ctx.UserModel.findOne({ where: { email: 'buyer@example.com' } });
    expect(stored).not.toBeNull();
    expect(stored?.passwordHash).not.toBe('super-secret-1');
  });

  it('rejects an invalid email format with 400', async () => {
    const res = await request(ctx.app)
      .post('/auth/signup')
      .send({ email: 'not-an-email', password: 'super-secret-1' });

    expect(res.status).toBe(400);

    const count = await ctx.UserModel.count();
    expect(count).toBe(0);
  });

  it('rejects signup with an already-registered email with 409', async () => {
    await request(ctx.app)
      .post('/auth/signup')
      .send({ email: 'buyer@example.com', password: 'super-secret-1' });

    const res = await request(ctx.app)
      .post('/auth/signup')
      .send({ email: 'buyer@example.com', password: 'a-different-secret' });

    expect(res.status).toBe(409);

    const count = await ctx.UserModel.count({ where: { email: 'buyer@example.com' } });
    expect(count).toBe(1);
  });
});

describe('POST /auth/login', () => {
  let ctx: TestApp;

  beforeEach(async () => {
    ctx = await createTestApp();
  });

  afterEach(async () => {
    await ctx.sequelize.close();
  });

  it('logs in successfully after signing up, given the correct password', async () => {
    await request(ctx.app)
      .post('/auth/signup')
      .send({ email: 'buyer@example.com', password: 'super-secret-1' });

    const res = await request(ctx.app)
      .post('/auth/login')
      .send({ email: 'buyer@example.com', password: 'super-secret-1' });

    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.user).toEqual({ id: expect.any(Number), email: 'buyer@example.com' });
  });

  it('rejects the wrong password with 401', async () => {
    await request(ctx.app)
      .post('/auth/signup')
      .send({ email: 'buyer@example.com', password: 'super-secret-1' });

    const res = await request(ctx.app)
      .post('/auth/login')
      .send({ email: 'buyer@example.com', password: 'wrong-password' });

    expect(res.status).toBe(401);
    expect(res.body.token).toBeUndefined();
  });

  it('rejects an email that never signed up with 401', async () => {
    const res = await request(ctx.app)
      .post('/auth/login')
      .send({ email: 'nobody@example.com', password: 'whatever-1' });

    expect(res.status).toBe(401);
  });
});

describe('POST /auth/password-reset/request and /confirm', () => {
  let ctx: TestApp;

  beforeEach(async () => {
    ctx = await createTestApp();
    await request(ctx.app)
      .post('/auth/signup')
      .send({ email: 'buyer@example.com', password: 'original-password' });
  });

  afterEach(async () => {
    await ctx.sequelize.close();
  });

  it('always returns the same generic response, whether or not the email is registered', async () => {
    const registered = await request(ctx.app).post('/auth/password-reset/request').send({ email: 'buyer@example.com' });
    const unregistered = await request(ctx.app)
      .post('/auth/password-reset/request')
      .send({ email: 'nobody@example.com' });

    expect(registered.status).toBe(200);
    expect(unregistered.status).toBe(200);
    expect(registered.body).toEqual(unregistered.body);
  });

  it('sends the reset token to the requesting email and not to an unregistered one', async () => {
    await request(ctx.app).post('/auth/password-reset/request').send({ email: 'buyer@example.com' });

    expect(ctx.emailSender.sentTo).toBe('buyer@example.com');
    expect(typeof ctx.emailSender.sentToken).toBe('string');
  });

  it('does not send an email for an unregistered address', async () => {
    await request(ctx.app).post('/auth/password-reset/request').send({ email: 'nobody@example.com' });

    expect(ctx.emailSender.sentTo).toBeUndefined();
  });

  it('resets the password given a valid token, and the new password can then log in', async () => {
    await request(ctx.app).post('/auth/password-reset/request').send({ email: 'buyer@example.com' });
    const token = ctx.emailSender.sentToken;
    expect(token).toBeDefined();

    const confirmRes = await request(ctx.app)
      .post('/auth/password-reset/confirm')
      .send({ token, newPassword: 'brand-new-password' });
    expect(confirmRes.status).toBe(200);

    const loginWithNewPassword = await request(ctx.app)
      .post('/auth/login')
      .send({ email: 'buyer@example.com', password: 'brand-new-password' });
    expect(loginWithNewPassword.status).toBe(200);

    const loginWithOldPassword = await request(ctx.app)
      .post('/auth/login')
      .send({ email: 'buyer@example.com', password: 'original-password' });
    expect(loginWithOldPassword.status).toBe(401);
  });

  it('rejects an expired token with 400', async () => {
    await request(ctx.app).post('/auth/password-reset/request').send({ email: 'buyer@example.com' });
    const token = ctx.emailSender.sentToken;
    const record = await ctx.ResetTokenModel.findOne();
    await record?.update({ expiresAt: new Date(Date.now() - 1000) });

    const res = await request(ctx.app)
      .post('/auth/password-reset/confirm')
      .send({ token, newPassword: 'brand-new-password' });

    expect(res.status).toBe(400);
  });

  it('rejects an unknown token with 400', async () => {
    const res = await request(ctx.app)
      .post('/auth/password-reset/confirm')
      .send({ token: 'not-a-real-token', newPassword: 'brand-new-password' });

    expect(res.status).toBe(400);
  });
});

describe('POST /auth/logout', () => {
  let ctx: TestApp;

  beforeEach(async () => {
    ctx = await createTestApp();
    await request(ctx.app)
      .post('/auth/signup')
      .send({ email: 'buyer@example.com', password: 'super-secret-1' });
  });

  afterEach(async () => {
    await ctx.sequelize.close();
  });

  async function loginAndGetToken(): Promise<string> {
    const res = await request(ctx.app)
      .post('/auth/login')
      .send({ email: 'buyer@example.com', password: 'super-secret-1' });
    return res.body.token as string;
  }

  it('logs out successfully given a valid token', async () => {
    const token = await loginAndGetToken();

    const res = await request(ctx.app).post('/auth/logout').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
  });

  it('rejects a second logout with the same (now-revoked) token with 401', async () => {
    const token = await loginAndGetToken();

    await request(ctx.app).post('/auth/logout').set('Authorization', `Bearer ${token}`);
    const res = await request(ctx.app).post('/auth/logout').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'TokenRevoked' });
  });

  it('rejects logout with no Authorization header with 401', async () => {
    const res = await request(ctx.app).post('/auth/logout');

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'MissingToken' });
  });

  it('rejects logout with a malformed token with 401', async () => {
    const res = await request(ctx.app).post('/auth/logout').set('Authorization', 'Bearer not-a-real-token');

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'InvalidToken' });
  });

  it('still allows a fresh login after logging out an earlier session', async () => {
    const firstToken = await loginAndGetToken();
    await request(ctx.app).post('/auth/logout').set('Authorization', `Bearer ${firstToken}`);

    const res = await request(ctx.app)
      .post('/auth/login')
      .send({ email: 'buyer@example.com', password: 'super-secret-1' });

    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.token).not.toBe(firstToken);
  });
});

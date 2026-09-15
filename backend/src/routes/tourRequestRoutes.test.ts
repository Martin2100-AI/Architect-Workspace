import request from 'supertest';
import { createTestApp, TestApp } from '../testUtils/createTestApp';

async function signUpAndLogIn(ctx: TestApp): Promise<string> {
  await request(ctx.app).post('/auth/signup').send({ email: 'buyer@example.com', password: 'super-secret-1' });
  const loginRes = await request(ctx.app)
    .post('/auth/login')
    .send({ email: 'buyer@example.com', password: 'super-secret-1' });
  return loginRes.body.token;
}

function futureDateParts(): { preferredDate: string; preferredTime: string } {
  const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return {
    preferredDate: future.toISOString().slice(0, 10),
    preferredTime: '14:30',
  };
}

const validTourRequest = {
  propertyId: 'stub-1',
  ...futureDateParts(),
  buyerName: 'Jordan Buyer',
  phoneNumber: '555-0100',
  email: 'jordan@example.com',
  message: 'Looking forward to seeing the kitchen.',
};

describe('tour requests', () => {
  let ctx: TestApp;

  beforeEach(async () => {
    ctx = await createTestApp();
  });

  afterEach(async () => {
    await ctx.sequelize.close();
  });

  // Given a property, when a tour is requested, then the user should receive a confirmation.
  it('creates a tour request and sends a confirmation email with accurate details', async () => {
    const token = await signUpAndLogIn(ctx);

    const res = await request(ctx.app).post('/tours').set('Authorization', `Bearer ${token}`).send(validTourRequest);

    expect(res.status).toBe(200);
    expect(res.body.confirmationSent).toBe(true);
    expect(res.body.tourRequest.propertyId).toBe('stub-1');
    expect(res.body.tourRequest.buyerName).toBe('Jordan Buyer');
    expect(res.body.tourRequest.phoneNumber).toBe('555-0100');
    expect(await ctx.TourRequestModel.count()).toBe(1);

    // Trust: confirmed accurately -- the captured email reflects the real property, not fabricated data.
    expect(ctx.emailSender.sentTourConfirmationTo).toBe('jordan@example.com');
    expect(ctx.emailSender.sentTourConfirmationDetails?.propertyAddress).toBe('123 Maple St, Springfield, IL');
  });

  // Given a tour request, when details are incomplete, then the user should be prompted to complete them.
  it('rejects incomplete details with a 400 error and creates no tour request', async () => {
    const token = await signUpAndLogIn(ctx);
    const { buyerName: _drop, ...incomplete } = validTourRequest;

    const res = await request(ctx.app).post('/tours').set('Authorization', `Bearer ${token}`).send(incomplete);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('ValidationError');
    expect(await ctx.TourRequestModel.count()).toBe(0);
  });

  it('rejects a request for an unknown property with 400 and creates no tour request', async () => {
    const token = await signUpAndLogIn(ctx);

    const res = await request(ctx.app)
      .post('/tours')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...validTourRequest, propertyId: 'does-not-exist' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('PropertyNotFound');
    expect(await ctx.TourRequestModel.count()).toBe(0);
  });

  // Trust: Tour requests are logged and confirmed accurately.
  it('logs the tour request with a timestamp in the audit trail', async () => {
    const token = await signUpAndLogIn(ctx);

    await request(ctx.app).post('/tours').set('Authorization', `Bearer ${token}`).send(validTourRequest);

    const auditEntries = await ctx.AuditLogModel.findAll({ where: { action: 'tour_requested' } });
    expect(auditEntries).toHaveLength(1);
    expect(auditEntries[0].createdAt).toBeInstanceOf(Date);
  });

  // Failure path: confirmation is not received -- the booking must still succeed.
  it('still creates the tour request when confirmation email delivery fails, and reports it honestly', async () => {
    const token = await signUpAndLogIn(ctx);
    ctx.emailSender.shouldFailTourConfirmation = true;

    const res = await request(ctx.app).post('/tours').set('Authorization', `Bearer ${token}`).send(validTourRequest);

    expect(res.status).toBe(200);
    expect(res.body.confirmationSent).toBe(false);
    expect(await ctx.TourRequestModel.count()).toBe(1);
  });

  it('rejects an attempt to request a tour without being logged in', async () => {
    const res = await request(ctx.app).post('/tours').send(validTourRequest);

    expect(res.status).toBe(401);
    expect(await ctx.TourRequestModel.count()).toBe(0);
  });

  it('requesting the same tour twice does not create a duplicate', async () => {
    const token = await signUpAndLogIn(ctx);

    await request(ctx.app).post('/tours').set('Authorization', `Bearer ${token}`).send(validTourRequest);
    const secondRes = await request(ctx.app)
      .post('/tours')
      .set('Authorization', `Bearer ${token}`)
      .send(validTourRequest);

    expect(secondRes.status).toBe(200);
    expect(secondRes.body.tourRequest.alreadyScheduled).toBe(true);
    expect(await ctx.TourRequestModel.count()).toBe(1);
  });
});

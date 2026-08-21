import request from 'supertest';
import { createTestApp, TestApp } from '../testUtils/createTestApp';

async function signUpAndLogIn(ctx: TestApp): Promise<string> {
  await request(ctx.app).post('/auth/signup').send({ email: 'buyer@example.com', password: 'super-secret-1' });
  const loginRes = await request(ctx.app)
    .post('/auth/login')
    .send({ email: 'buyer@example.com', password: 'super-secret-1' });
  return loginRes.body.token;
}

describe('favorites', () => {
  let ctx: TestApp;

  beforeEach(async () => {
    ctx = await createTestApp();
  });

  afterEach(async () => {
    await ctx.sequelize.close();
  });

  it('saves a property and it appears in the user favorites', async () => {
    const token = await signUpAndLogIn(ctx);

    const saveRes = await request(ctx.app).post('/favorites/stub-1').set('Authorization', `Bearer ${token}`);
    expect(saveRes.status).toBe(200);

    const listRes = await request(ctx.app).get('/favorites').set('Authorization', `Bearer ${token}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body).toEqual({ propertyIds: ['stub-1'] });
  });

  it('saving the same property twice does not create a duplicate favorite', async () => {
    const token = await signUpAndLogIn(ctx);

    await request(ctx.app).post('/favorites/stub-1').set('Authorization', `Bearer ${token}`);
    await request(ctx.app).post('/favorites/stub-1').set('Authorization', `Bearer ${token}`);

    const listRes = await request(ctx.app).get('/favorites').set('Authorization', `Bearer ${token}`);
    expect(listRes.body).toEqual({ propertyIds: ['stub-1'] });

    const count = await ctx.FavoriteModel.count();
    expect(count).toBe(1);
  });

  it('rejects an attempt to save a property without being logged in', async () => {
    const res = await request(ctx.app).post('/favorites/stub-1');

    expect(res.status).toBe(401);

    const count = await ctx.FavoriteModel.count();
    expect(count).toBe(0);
  });
});

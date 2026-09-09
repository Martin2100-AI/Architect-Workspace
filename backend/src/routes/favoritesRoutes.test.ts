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

  it('saves a property with the default category and it appears in the user favorites', async () => {
    const token = await signUpAndLogIn(ctx);

    const saveRes = await request(ctx.app).post('/favorites/stub-1').set('Authorization', `Bearer ${token}`);
    expect(saveRes.status).toBe(200);

    const listRes = await request(ctx.app).get('/favorites').set('Authorization', `Bearer ${token}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body).toEqual({ favorites: [{ propertyId: 'stub-1', category: 'favorites' }] });
  });

  it('saving the same property to the same category twice does not create a duplicate favorite', async () => {
    const token = await signUpAndLogIn(ctx);

    await request(ctx.app).post('/favorites/stub-1').set('Authorization', `Bearer ${token}`);
    await request(ctx.app).post('/favorites/stub-1').set('Authorization', `Bearer ${token}`);

    const listRes = await request(ctx.app).get('/favorites').set('Authorization', `Bearer ${token}`);
    expect(listRes.body).toEqual({ favorites: [{ propertyId: 'stub-1', category: 'favorites' }] });

    const count = await ctx.FavoriteModel.count();
    expect(count).toBe(1);
  });

  it('rejects an attempt to save a property without being logged in', async () => {
    const res = await request(ctx.app).post('/favorites/stub-1');

    expect(res.status).toBe(401);

    const count = await ctx.FavoriteModel.count();
    expect(count).toBe(0);
  });

  it('saves a property to a chosen category and it appears in that selected category', async () => {
    const token = await signUpAndLogIn(ctx);

    const saveRes = await request(ctx.app)
      .post('/favorites/stub-1')
      .set('Authorization', `Bearer ${token}`)
      .send({ category: 'want-to-tour' });
    expect(saveRes.status).toBe(200);

    const listRes = await request(ctx.app).get('/favorites').set('Authorization', `Bearer ${token}`);
    expect(listRes.body).toEqual({ favorites: [{ propertyId: 'stub-1', category: 'want-to-tour' }] });
  });

  it('saving the same property to a different category creates a second, independent entry', async () => {
    const token = await signUpAndLogIn(ctx);

    await request(ctx.app).post('/favorites/stub-1').set('Authorization', `Bearer ${token}`).send({ category: 'favorites' });
    await request(ctx.app).post('/favorites/stub-1').set('Authorization', `Bearer ${token}`).send({ category: 'maybe' });

    const listRes = await request(ctx.app).get('/favorites').set('Authorization', `Bearer ${token}`);
    expect(listRes.body.favorites).toHaveLength(2);
    expect(listRes.body.favorites).toEqual(
      expect.arrayContaining([
        { propertyId: 'stub-1', category: 'favorites' },
        { propertyId: 'stub-1', category: 'maybe' },
      ]),
    );
  });

  it('rejects a save with an invalid category with 400', async () => {
    const token = await signUpAndLogIn(ctx);

    const res = await request(ctx.app)
      .post('/favorites/stub-1')
      .set('Authorization', `Bearer ${token}`)
      .send({ category: 'not-a-real-category' });

    expect(res.status).toBe(400);
    expect(await ctx.FavoriteModel.count()).toBe(0);
  });

  it('removes a saved property from its category, and it no longer appears in favorites', async () => {
    const token = await signUpAndLogIn(ctx);
    await request(ctx.app).post('/favorites/stub-1').set('Authorization', `Bearer ${token}`).send({ category: 'favorites' });

    const removeRes = await request(ctx.app)
      .delete('/favorites/stub-1')
      .set('Authorization', `Bearer ${token}`)
      .send({ category: 'favorites' });
    expect(removeRes.status).toBe(200);

    const listRes = await request(ctx.app).get('/favorites').set('Authorization', `Bearer ${token}`);
    expect(listRes.body).toEqual({ favorites: [] });
  });

  it('removing a property from one category does not remove it from another it was independently saved to', async () => {
    const token = await signUpAndLogIn(ctx);
    await request(ctx.app).post('/favorites/stub-1').set('Authorization', `Bearer ${token}`).send({ category: 'favorites' });
    await request(ctx.app).post('/favorites/stub-1').set('Authorization', `Bearer ${token}`).send({ category: 'maybe' });

    await request(ctx.app).delete('/favorites/stub-1').set('Authorization', `Bearer ${token}`).send({ category: 'favorites' });

    const listRes = await request(ctx.app).get('/favorites').set('Authorization', `Bearer ${token}`);
    expect(listRes.body).toEqual({ favorites: [{ propertyId: 'stub-1', category: 'maybe' }] });
  });

  it('removing a property that was never saved is a no-op, not an error', async () => {
    const token = await signUpAndLogIn(ctx);

    const removeRes = await request(ctx.app)
      .delete('/favorites/stub-1')
      .set('Authorization', `Bearer ${token}`)
      .send({ category: 'favorites' });

    expect(removeRes.status).toBe(200);
    expect(await ctx.FavoriteModel.count()).toBe(0);
  });

  it('rejects a remove request missing the required category with 400', async () => {
    const token = await signUpAndLogIn(ctx);
    await request(ctx.app).post('/favorites/stub-1').set('Authorization', `Bearer ${token}`);

    const res = await request(ctx.app).delete('/favorites/stub-1').set('Authorization', `Bearer ${token}`).send({});

    expect(res.status).toBe(400);
    expect(await ctx.FavoriteModel.count()).toBe(1);
  });

  it('rejects an attempt to remove a property without being logged in', async () => {
    const res = await request(ctx.app).delete('/favorites/stub-1').send({ category: 'favorites' });

    expect(res.status).toBe(401);
  });
});

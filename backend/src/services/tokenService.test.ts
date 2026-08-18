import { Sequelize } from 'sequelize';
import { initTokenBlocklistModel, TokenBlocklist } from '../models/TokenBlocklist';
import { createSessionToken, isTokenRevoked, revokeToken, verifySessionToken } from './tokenService';

describe('tokenService signing', () => {
  it('creates a token that verifies back to the same user id', () => {
    const token = createSessionToken(42, 'test-secret');

    const payload = verifySessionToken(token, 'test-secret');
    expect(payload.userId).toBe(42);
    expect(typeof payload.jti).toBe('string');
  });

  it('rejects a token verified with the wrong secret', () => {
    const token = createSessionToken(42, 'test-secret');

    expect(() => verifySessionToken(token, 'wrong-secret')).toThrow();
  });

  it('gives each token a distinct jti', () => {
    const a = verifySessionToken(createSessionToken(1, 'test-secret'), 'test-secret');
    const b = verifySessionToken(createSessionToken(1, 'test-secret'), 'test-secret');

    expect(a.jti).not.toBe(b.jti);
  });
});

describe('tokenService revocation', () => {
  let sequelize: Sequelize;
  let BlocklistModel: typeof TokenBlocklist;

  beforeEach(async () => {
    sequelize = new Sequelize({ dialect: 'sqlite', storage: ':memory:', logging: false });
    BlocklistModel = initTokenBlocklistModel(sequelize);
    await sequelize.sync();
  });

  afterEach(async () => {
    await sequelize.close();
  });

  it('reports a fresh token as not revoked', async () => {
    const payload = verifySessionToken(createSessionToken(1, 'test-secret'), 'test-secret');

    expect(await isTokenRevoked(BlocklistModel, payload.jti)).toBe(false);
  });

  it('reports a revoked token as revoked', async () => {
    const payload = verifySessionToken(createSessionToken(1, 'test-secret'), 'test-secret');

    await revokeToken(BlocklistModel, payload.jti, payload.expiresAt);

    expect(await isTokenRevoked(BlocklistModel, payload.jti)).toBe(true);
  });

  it('revoking the same token twice does not error and stays revoked', async () => {
    const payload = verifySessionToken(createSessionToken(1, 'test-secret'), 'test-secret');

    await revokeToken(BlocklistModel, payload.jti, payload.expiresAt);
    await revokeToken(BlocklistModel, payload.jti, payload.expiresAt);

    expect(await isTokenRevoked(BlocklistModel, payload.jti)).toBe(true);
    expect(await BlocklistModel.count({ where: { jti: payload.jti } })).toBe(1);
  });
});

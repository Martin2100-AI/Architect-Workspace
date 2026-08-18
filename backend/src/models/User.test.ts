import { Sequelize } from 'sequelize';
import { initUserModel, User } from './User';

describe('User model', () => {
  let sequelize: Sequelize;

  beforeEach(async () => {
    sequelize = new Sequelize({ dialect: 'sqlite', storage: ':memory:', logging: false });
    initUserModel(sequelize);
    await sequelize.sync();
  });

  afterEach(async () => {
    await sequelize.close();
  });

  it('creates a user with an email and password hash', async () => {
    const user = await User.create({ email: 'buyer@example.com', passwordHash: 'hashed-value' });

    expect(user.id).toBeDefined();
    expect(user.email).toBe('buyer@example.com');
    expect(user.passwordHash).toBe('hashed-value');
  });

  it('rejects a second user with the same email', async () => {
    await User.create({ email: 'buyer@example.com', passwordHash: 'hashed-value' });

    await expect(
      User.create({ email: 'buyer@example.com', passwordHash: 'another-hash' }),
    ).rejects.toThrow();
  });
});

import { Sequelize } from 'sequelize';
import { initPasswordResetTokenModel, PasswordResetToken } from '../models/PasswordResetToken';
import { initUserModel, User } from '../models/User';
import { EmailSender } from './notificationService';
import { requestPasswordReset } from './passwordResetService';

class ThrowingEmailSender implements EmailSender {
  async sendPasswordResetEmail(): Promise<void> {
    throw new Error('Resend is down');
  }
}

describe('requestPasswordReset', () => {
  let sequelize: Sequelize;

  beforeEach(async () => {
    sequelize = new Sequelize({ dialect: 'sqlite', storage: ':memory:', logging: false });
    initUserModel(sequelize);
    initPasswordResetTokenModel(sequelize);
    await sequelize.sync();
    await User.create({ email: 'buyer@example.com', passwordHash: 'hashed-value' });
  });

  afterEach(async () => {
    await sequelize.close();
  });

  it('does not throw when the email sender fails, so the route response stays uniform', async () => {
    await expect(
      requestPasswordReset(User, PasswordResetToken, new ThrowingEmailSender(), 'buyer@example.com'),
    ).resolves.toBeUndefined();
  });

  it('still creates the reset token row even when the email sender fails', async () => {
    await requestPasswordReset(User, PasswordResetToken, new ThrowingEmailSender(), 'buyer@example.com');

    const count = await PasswordResetToken.count();
    expect(count).toBe(1);
  });

  it('does not create a token or call the sender for an unregistered email, even a failing one', async () => {
    const sender = new ThrowingEmailSender();
    const spy = jest.spyOn(sender, 'sendPasswordResetEmail');

    await requestPasswordReset(User, PasswordResetToken, sender, 'nobody@example.com');

    expect(spy).not.toHaveBeenCalled();
    expect(await PasswordResetToken.count()).toBe(0);
  });
});

import { PasswordResetToken } from '../models/PasswordResetToken';
import { User } from '../models/User';
import { EmailSender } from './notificationService';
import { hashPassword } from './passwordService';
import { generateResetToken, hashResetToken } from './resetTokenService';

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

export class InvalidOrExpiredResetTokenError extends Error {
  constructor() {
    super('Reset token is invalid or expired');
    this.name = 'InvalidOrExpiredResetTokenError';
  }
}

export async function requestPasswordReset(
  userModel: typeof User,
  resetTokenModel: typeof PasswordResetToken,
  emailSender: EmailSender,
  email: string,
): Promise<void> {
  const user = await userModel.findOne({ where: { email } });
  if (!user) {
    // The route answers with the same generic message either way, so a client can't
    // use this to discover which emails are registered.
    return;
  }

  const { token, tokenHash } = generateResetToken();
  await resetTokenModel.create({
    userId: user.id,
    tokenHash,
    expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
  });

  await emailSender.sendPasswordResetEmail(user.email, token);
}

export async function resetPassword(
  userModel: typeof User,
  resetTokenModel: typeof PasswordResetToken,
  token: string,
  newPassword: string,
): Promise<void> {
  const resetRecord = await resetTokenModel.findOne({
    where: { tokenHash: hashResetToken(token), used: false },
  });

  if (!resetRecord || resetRecord.expiresAt.getTime() < Date.now()) {
    throw new InvalidOrExpiredResetTokenError();
  }

  const user = await userModel.findByPk(resetRecord.userId);
  if (!user) {
    throw new InvalidOrExpiredResetTokenError();
  }

  user.passwordHash = await hashPassword(newPassword);
  await user.save();

  resetRecord.used = true;
  await resetRecord.save();
}

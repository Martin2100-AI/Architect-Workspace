import { User } from '../models/User';
import { hashPassword, verifyPassword } from './passwordService';

export class EmailAlreadyExistsError extends Error {
  constructor(email: string) {
    super(`Email already in use: ${email}`);
    this.name = 'EmailAlreadyExistsError';
  }
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super('Invalid email or password');
    this.name = 'InvalidCredentialsError';
  }
}

export async function signup(userModel: typeof User, email: string, password: string): Promise<User> {
  const existing = await userModel.findOne({ where: { email } });
  if (existing) {
    throw new EmailAlreadyExistsError(email);
  }

  const passwordHash = await hashPassword(password);
  return userModel.create({ email, passwordHash });
}

export async function login(userModel: typeof User, email: string, password: string): Promise<User> {
  const user = await userModel.findOne({ where: { email } });
  if (!user) {
    // Same error as a wrong password below — don't let a client learn whether the email exists.
    throw new InvalidCredentialsError();
  }

  const passwordMatches = await verifyPassword(password, user.passwordHash);
  if (!passwordMatches) {
    throw new InvalidCredentialsError();
  }

  return user;
}

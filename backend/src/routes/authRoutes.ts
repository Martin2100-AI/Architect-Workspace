import { Router } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest, requireAuth } from '../middleware/requireAuth';
import { PasswordResetToken } from '../models/PasswordResetToken';
import { TokenBlocklist } from '../models/TokenBlocklist';
import { User } from '../models/User';
import { EmailAlreadyExistsError, InvalidCredentialsError, login, signup } from '../services/authService';
import { EmailSender } from '../services/notificationService';
import {
  InvalidOrExpiredResetTokenError,
  requestPasswordReset,
  resetPassword,
} from '../services/passwordResetService';
import { createSessionToken, revokeToken } from '../services/tokenService';

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const passwordResetRequestSchema = z.object({
  email: z.string().email(),
});

const passwordResetConfirmSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8),
});

export interface AuthRouterDependencies {
  userModel: typeof User;
  resetTokenModel: typeof PasswordResetToken;
  blocklistModel: typeof TokenBlocklist;
  emailSender: EmailSender;
  jwtSecret: string;
}

export function createAuthRouter(deps: AuthRouterDependencies): Router {
  const { userModel, resetTokenModel, blocklistModel, emailSender, jwtSecret } = deps;
  const router = Router();

  router.post('/signup', async (req, res, next) => {
    const parseResult = signupSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'ValidationError', details: parseResult.error.flatten() });
      return;
    }

    try {
      const user = await signup(userModel, parseResult.data.email, parseResult.data.password);
      res.status(201).json({ id: user.id, email: user.email });
    } catch (err) {
      if (err instanceof EmailAlreadyExistsError) {
        res.status(409).json({ error: 'EmailAlreadyExists' });
        return;
      }
      next(err);
    }
  });

  router.post('/login', async (req, res, next) => {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'ValidationError', details: parseResult.error.flatten() });
      return;
    }

    try {
      const user = await login(userModel, parseResult.data.email, parseResult.data.password);
      const token = createSessionToken(user.id, jwtSecret);
      res.status(200).json({ token, user: { id: user.id, email: user.email } });
    } catch (err) {
      if (err instanceof InvalidCredentialsError) {
        res.status(401).json({ error: 'InvalidCredentials' });
        return;
      }
      next(err);
    }
  });

  router.post('/logout', requireAuth(blocklistModel, jwtSecret), async (req: AuthenticatedRequest, res, next) => {
    try {
      await revokeToken(blocklistModel, req.tokenJti as string, req.tokenExpiresAt as Date);
      res.status(200).json({ message: 'Logged out.' });
    } catch (err) {
      next(err);
    }
  });

  router.post('/password-reset/request', async (req, res, next) => {
    const parseResult = passwordResetRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'ValidationError', details: parseResult.error.flatten() });
      return;
    }

    try {
      await requestPasswordReset(userModel, resetTokenModel, emailSender, parseResult.data.email);
      res.status(200).json({ message: 'If that email is registered, a password reset link has been sent.' });
    } catch (err) {
      next(err);
    }
  });

  router.post('/password-reset/confirm', async (req, res, next) => {
    const parseResult = passwordResetConfirmSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'ValidationError', details: parseResult.error.flatten() });
      return;
    }

    try {
      await resetPassword(userModel, resetTokenModel, parseResult.data.token, parseResult.data.newPassword);
      res.status(200).json({ message: 'Password reset successful.' });
    } catch (err) {
      if (err instanceof InvalidOrExpiredResetTokenError) {
        res.status(400).json({ error: 'InvalidOrExpiredResetToken' });
        return;
      }
      next(err);
    }
  });

  return router;
}

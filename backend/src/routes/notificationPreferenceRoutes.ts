import { Router } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest, requireAuth } from '../middleware/requireAuth';
import { NotificationPreference } from '../models/NotificationPreference';
import { TokenBlocklist } from '../models/TokenBlocklist';
import {
  getOrCreateNotificationPreferences,
  upsertNotificationPreferences,
} from '../services/notificationPreferenceService';

const notificationPreferenceBodySchema = z.object({
  newMatch: z.boolean(),
  priceReduction: z.boolean(),
  openHouse: z.boolean(),
  statusChange: z.boolean(),
  backOnMarket: z.boolean(),
  underContract: z.boolean(),
  tourConfirmation: z.boolean(),
});

export interface NotificationPreferenceRouterDependencies {
  notificationPreferenceModel: typeof NotificationPreference;
  blocklistModel: typeof TokenBlocklist;
  jwtSecret: string;
}

export function createNotificationPreferenceRouter(deps: NotificationPreferenceRouterDependencies): Router {
  const { notificationPreferenceModel, blocklistModel, jwtSecret } = deps;
  const router = Router();
  const auth = requireAuth(blocklistModel, jwtSecret);

  router.get('/', auth, async (req: AuthenticatedRequest, res, next) => {
    try {
      const userId = req.userId as number;
      const preferences = await getOrCreateNotificationPreferences(notificationPreferenceModel, userId);
      res.status(200).json({ preferences });
    } catch (err) {
      next(err);
    }
  });

  router.put('/', auth, async (req: AuthenticatedRequest, res, next) => {
    const parseResult = notificationPreferenceBodySchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'ValidationError', details: parseResult.error.flatten() });
      return;
    }

    try {
      const userId = req.userId as number;
      const preferences = await upsertNotificationPreferences(notificationPreferenceModel, userId, parseResult.data);
      res.status(200).json({ preferences });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

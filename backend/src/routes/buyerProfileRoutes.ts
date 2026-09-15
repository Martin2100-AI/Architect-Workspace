import { Router } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest, requireAuth } from '../middleware/requireAuth';
import { AuditLog } from '../models/AuditLog';
import { BUYER_PROFILE_PROPERTY_TYPES, BuyerProfile } from '../models/BuyerProfile';
import { TokenBlocklist } from '../models/TokenBlocklist';
import { recordAuditEvent } from '../services/auditLogService';
import { upsertBuyerProfile } from '../services/buyerProfileService';

const buyerProfileBodySchema = z
  .object({
    preferredLocations: z.array(z.string().min(1)).min(1),
    minPrice: z.number().nonnegative(),
    maxPrice: z.number().nonnegative(),
    bedrooms: z.number().nonnegative(),
    bathrooms: z.number().nonnegative(),
    propertyType: z.enum(BUYER_PROFILE_PROPERTY_TYPES),
    downPayment: z.number().nonnegative(),
    desiredFeatures: z.array(z.string().min(1)).optional(),
  })
  .refine((data) => data.minPrice <= data.maxPrice, {
    message: 'minPrice must be less than or equal to maxPrice',
    path: ['maxPrice'],
  });

export interface BuyerProfileRouterDependencies {
  buyerProfileModel: typeof BuyerProfile;
  auditLogModel: typeof AuditLog;
  blocklistModel: typeof TokenBlocklist;
  jwtSecret: string;
}

export function createBuyerProfileRouter(deps: BuyerProfileRouterDependencies): Router {
  const { buyerProfileModel, auditLogModel, blocklistModel, jwtSecret } = deps;
  const router = Router();
  const auth = requireAuth(blocklistModel, jwtSecret);

  router.post('/', auth, async (req: AuthenticatedRequest, res, next) => {
    const parseResult = buyerProfileBodySchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'ValidationError', details: parseResult.error.flatten() });
      return;
    }

    try {
      const userId = req.userId as number;
      const profile = await upsertBuyerProfile(buyerProfileModel, userId, parseResult.data);
      // Trust criterion (REQ-015 / STORY-014): profile creation is logged with a
      // timestamp via the shared audit trail built for STORY-015. Never throws back
      // into the request -- see auditLogService.ts.
      await recordAuditEvent(auditLogModel, userId, 'buyer_profile_created');
      res.status(200).json({ profile });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

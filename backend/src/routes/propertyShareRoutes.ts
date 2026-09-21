import { Router } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest, requireAuth } from '../middleware/requireAuth';
import { AuditLog } from '../models/AuditLog';
import { TokenBlocklist } from '../models/TokenBlocklist';
import { recordAuditEvent } from '../services/auditLogService';
import { MlsClient, MlsUnavailableError } from '../services/mlsClient';
import { EmailSender } from '../services/notificationService';
import { getPropertyById, PropertyNotFoundError } from '../services/propertyLookupService';
import { buildShareUrl } from '../services/propertyShareService';

const shareBodySchema = z.object({
  recipientEmail: z.string().email(),
  // Client-generated, stable for one share attempt -- see PropertyShareDetails for why.
  requestId: z.string().min(1),
});

export interface PropertyShareRouterDependencies {
  auditLogModel: typeof AuditLog;
  blocklistModel: typeof TokenBlocklist;
  jwtSecret: string;
  mlsClient: MlsClient;
  emailSender: EmailSender;
  appBaseUrl: string;
}

export function createPropertyShareRouter(deps: PropertyShareRouterDependencies): Router {
  const { auditLogModel, blocklistModel, jwtSecret, mlsClient, emailSender, appBaseUrl } = deps;
  const router = Router();
  const auth = requireAuth(blocklistModel, jwtSecret);

  router.post('/:id/share', auth, async (req: AuthenticatedRequest, res, next) => {
    const parseResult = shareBodySchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'ValidationError', details: parseResult.error.flatten() });
      return;
    }

    const propertyId = req.params.id;

    let property;
    try {
      property = await getPropertyById(mlsClient, propertyId);
    } catch (err) {
      if (err instanceof PropertyNotFoundError) {
        res.status(404).json({ error: 'PropertyNotFound' });
        return;
      }
      if (err instanceof MlsUnavailableError) {
        res.status(503).json({ error: 'MlsUnavailable' });
        return;
      }
      next(err);
      return;
    }

    const { recipientEmail, requestId } = parseResult.data;
    const shareUrl = buildShareUrl(appBaseUrl, propertyId);

    // Unlike a tour-confirmation email, this send is the entire point of the request --
    // there is no already-real side effect to fall back on -- so a delivery failure fails
    // the whole request honestly instead of reporting a success the recipient never got.
    try {
      await emailSender.sendPropertyShareEmail(recipientEmail, {
        propertyId,
        propertyAddress: property.address,
        listingPrice: property.listingPrice,
        requestId,
      });
    } catch (err) {
      const errorClass = err instanceof Error ? err.constructor.name : 'UnknownError';
      console.error(
        JSON.stringify({ level: 'error', event: 'property_share_email_failed', error_class: errorClass }),
      );
      res.status(502).json({ error: 'EmailDeliveryFailed' });
      return;
    }

    await recordAuditEvent(auditLogModel, (req.userId as number), 'property_shared_via_email');

    res.status(200).json({ shared: true, shareUrl });
  });

  return router;
}

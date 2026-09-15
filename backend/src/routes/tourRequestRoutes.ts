import { Router } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest, requireAuth } from '../middleware/requireAuth';
import { AuditLog } from '../models/AuditLog';
import { TokenBlocklist } from '../models/TokenBlocklist';
import { TourRequest } from '../models/TourRequest';
import { recordAuditEvent } from '../services/auditLogService';
import { EmailSender } from '../services/notificationService';
import { getPropertyById, PropertyNotFoundError } from '../services/propertyLookupService';
import { InvalidTourDatetimeError, scheduleTour } from '../services/tourService';
import { MlsClient } from '../services/mlsClient';

const tourRequestBodySchema = z.object({
  propertyId: z.string().min(1),
  preferredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'preferredDate must be in YYYY-MM-DD format'),
  preferredTime: z.string().regex(/^\d{2}:\d{2}$/, 'preferredTime must be in HH:MM format'),
  buyerName: z.string().min(1),
  phoneNumber: z.string().min(1),
  email: z.string().email(),
  message: z.string().max(500).optional(),
});

export interface TourRequestRouterDependencies {
  tourRequestModel: typeof TourRequest;
  auditLogModel: typeof AuditLog;
  blocklistModel: typeof TokenBlocklist;
  jwtSecret: string;
  mlsClient: MlsClient;
  emailSender: EmailSender;
}

export function createTourRequestRouter(deps: TourRequestRouterDependencies): Router {
  const { tourRequestModel, auditLogModel, blocklistModel, jwtSecret, mlsClient, emailSender } = deps;
  const router = Router();
  const auth = requireAuth(blocklistModel, jwtSecret);

  router.post('/', auth, async (req: AuthenticatedRequest, res, next) => {
    const parseResult = tourRequestBodySchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'ValidationError', details: parseResult.error.flatten() });
      return;
    }

    const { propertyId, preferredDate, preferredTime, buyerName, phoneNumber, email, message } = parseResult.data;
    const requestedAt = new Date(`${preferredDate}T${preferredTime}:00`);

    let result;
    try {
      result = await scheduleTour(tourRequestModel, mlsClient, {
        propertyId,
        requestedAt,
        buyerEmail: email,
        buyerName,
        phoneNumber,
        notes: message,
      });
    } catch (err) {
      if (err instanceof PropertyNotFoundError) {
        res.status(400).json({ error: 'PropertyNotFound', message: err.message });
        return;
      }
      if (err instanceof InvalidTourDatetimeError) {
        res.status(400).json({ error: 'InvalidTourDatetime', message: err.message });
        return;
      }
      next(err);
      return;
    }

    // Confirmation delivery is best-effort: a failed send must never undo or hide a
    // real, already-persisted tour request (see the "Confirmation is not received"
    // failure path this story names explicitly) -- mirrors passwordResetService.ts's
    // handling of email-send failures. The response honestly reports whether it went
    // out so the happy path and this failure path stay independently observable.
    let confirmationSent = false;
    try {
      const property = await getPropertyById(mlsClient, propertyId);
      await emailSender.sendTourConfirmationEmail(email, {
        tourRequestId: result.tourRequest.id,
        propertyAddress: property.address,
        requestedAt: result.tourRequest.requestedAt,
      });
      confirmationSent = true;
    } catch (err) {
      const errorClass = err instanceof Error ? err.constructor.name : 'UnknownError';
      console.error(
        JSON.stringify({
          level: 'error',
          event: 'tour_confirmation_email_failed',
          error_class: errorClass,
          tourRequestId: result.tourRequest.id,
        }),
      );
    }

    // Trust criterion (REQ-005 / STORY-008): tour requests are logged with a
    // timestamp via the shared audit trail built for STORY-015. Never throws back
    // into the request -- see auditLogService.ts.
    await recordAuditEvent(auditLogModel, req.userId as number, 'tour_requested');

    res.status(200).json({
      tourRequest: {
        id: result.tourRequest.id,
        propertyId: result.tourRequest.propertyId,
        requestedAt: result.tourRequest.requestedAt,
        buyerEmail: result.tourRequest.buyerEmail,
        buyerName: result.tourRequest.buyerName,
        phoneNumber: result.tourRequest.phoneNumber,
        notes: result.tourRequest.notes,
        alreadyScheduled: result.alreadyScheduled,
      },
      confirmationSent,
    });
  });

  return router;
}

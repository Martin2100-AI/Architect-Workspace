import { MlsClient } from './mlsClient';
import { getPropertyById } from './propertyLookupService';
import { TourRequest } from '../models/TourRequest';

export class InvalidTourDatetimeError extends Error {
  constructor(message = 'requestedAt must be a valid date in the future') {
    super(message);
    this.name = 'InvalidTourDatetimeError';
  }
}

export interface ScheduleTourInput {
  propertyId: string;
  requestedAt: Date;
  buyerEmail: string;
  notes?: string;
}

export interface ScheduleTourResult {
  tourRequest: TourRequest;
  alreadyScheduled: boolean;
}

export interface ScheduleTourProgress {
  step: number;
  total: number;
  message: string;
}

export type OnScheduleTourProgress = (progress: ScheduleTourProgress) => void | Promise<void>;

const SCHEDULE_TOUR_STEP_COUNT = 3;

export async function scheduleTour(
  tourRequestModel: typeof TourRequest,
  mlsClient: MlsClient,
  input: ScheduleTourInput,
  onProgress?: OnScheduleTourProgress,
): Promise<ScheduleTourResult> {
  await onProgress?.({
    step: 1,
    total: SCHEDULE_TOUR_STEP_COUNT,
    message: `Looking up property ${input.propertyId}`,
  });
  await getPropertyById(mlsClient, input.propertyId); // throws PropertyNotFoundError if unknown

  await onProgress?.({ step: 2, total: SCHEDULE_TOUR_STEP_COUNT, message: 'Validating requested tour time' });
  if (Number.isNaN(input.requestedAt.getTime()) || input.requestedAt.getTime() <= Date.now()) {
    throw new InvalidTourDatetimeError();
  }

  await onProgress?.({
    step: 3,
    total: SCHEDULE_TOUR_STEP_COUNT,
    message: `Recording tour request for ${input.buyerEmail}`,
  });
  // findOrCreate keyed on the (propertyId, buyerEmail, requestedAt) unique index --
  // scheduling the same tour twice is a no-op, not a duplicate row.
  const [tourRequest, created] = await tourRequestModel.findOrCreate({
    where: {
      propertyId: input.propertyId,
      buyerEmail: input.buyerEmail,
      requestedAt: input.requestedAt,
    },
    defaults: {
      propertyId: input.propertyId,
      buyerEmail: input.buyerEmail,
      requestedAt: input.requestedAt,
      notes: input.notes ?? null,
    },
  });

  return { tourRequest, alreadyScheduled: !created };
}

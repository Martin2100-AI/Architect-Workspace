import { Router } from 'express';
import { MlsClient, MlsUnavailableError } from '../services/mlsClient';

export interface PropertyRouterDependencies {
  mlsClient: MlsClient;
}

export function createPropertyRouter(deps: PropertyRouterDependencies): Router {
  const { mlsClient } = deps;
  const router = Router();

  router.get('/', async (_req, res, next) => {
    try {
      const properties = await mlsClient.getPropertyFeed();
      res.status(200).json({ properties });
    } catch (err) {
      if (err instanceof MlsUnavailableError) {
        res.status(503).json({ error: 'MlsUnavailable' });
        return;
      }
      next(err);
    }
  });

  return router;
}

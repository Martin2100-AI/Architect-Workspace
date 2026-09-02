import { Router } from 'express';
import { MlsClient, MlsUnavailableError } from '../services/mlsClient';
import { getPropertyById, PropertyNotFoundError } from '../services/propertyLookupService';

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

  router.get('/:id', async (req, res, next) => {
    try {
      const property = await getPropertyById(mlsClient, req.params.id);
      res.status(200).json({ property });
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
    }
  });

  return router;
}

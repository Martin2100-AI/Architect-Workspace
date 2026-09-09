import { Router } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest, requireAuth } from '../middleware/requireAuth';
import { FAVORITE_CATEGORIES, Favorite } from '../models/Favorite';
import { TokenBlocklist } from '../models/TokenBlocklist';
import { listFavorites, removeFavorite, saveFavorite } from '../services/favoritesService';

const saveBodySchema = z.object({
  category: z.enum(FAVORITE_CATEGORIES).optional(),
});

const removeBodySchema = z.object({
  category: z.enum(FAVORITE_CATEGORIES),
});

export interface FavoritesRouterDependencies {
  favoriteModel: typeof Favorite;
  blocklistModel: typeof TokenBlocklist;
  jwtSecret: string;
}

export function createFavoritesRouter(deps: FavoritesRouterDependencies): Router {
  const { favoriteModel, blocklistModel, jwtSecret } = deps;
  const router = Router();
  const auth = requireAuth(blocklistModel, jwtSecret);

  router.post('/:propertyId', auth, async (req: AuthenticatedRequest, res, next) => {
    const parseResult = saveBodySchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'ValidationError', details: parseResult.error.flatten() });
      return;
    }

    try {
      await saveFavorite(favoriteModel, req.userId as number, req.params.propertyId, parseResult.data.category);
      res.status(200).json({ propertyId: req.params.propertyId, category: parseResult.data.category ?? 'favorites' });
    } catch (err) {
      next(err);
    }
  });

  router.delete('/:propertyId', auth, async (req: AuthenticatedRequest, res, next) => {
    const parseResult = removeBodySchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'ValidationError', details: parseResult.error.flatten() });
      return;
    }

    try {
      await removeFavorite(favoriteModel, req.userId as number, req.params.propertyId, parseResult.data.category);
      res.status(200).json({ propertyId: req.params.propertyId, category: parseResult.data.category });
    } catch (err) {
      next(err);
    }
  });

  router.get('/', auth, async (req: AuthenticatedRequest, res, next) => {
    try {
      const favorites = await listFavorites(favoriteModel, req.userId as number);
      res.status(200).json({ favorites });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

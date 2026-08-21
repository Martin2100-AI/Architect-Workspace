import { Router } from 'express';
import { Favorite } from '../models/Favorite';
import { TokenBlocklist } from '../models/TokenBlocklist';
import { AuthenticatedRequest, requireAuth } from '../middleware/requireAuth';
import { listFavoritePropertyIds, saveFavorite } from '../services/favoritesService';

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
    try {
      await saveFavorite(favoriteModel, req.userId as number, req.params.propertyId);
      res.status(200).json({ propertyId: req.params.propertyId });
    } catch (err) {
      next(err);
    }
  });

  router.get('/', auth, async (req: AuthenticatedRequest, res, next) => {
    try {
      const propertyIds = await listFavoritePropertyIds(favoriteModel, req.userId as number);
      res.status(200).json({ propertyIds });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

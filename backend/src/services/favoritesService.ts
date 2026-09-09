import { Favorite, FavoriteCategory } from '../models/Favorite';

const DEFAULT_CATEGORY: FavoriteCategory = 'favorites';

export interface FavoriteRecord {
  propertyId: string;
  category: FavoriteCategory;
}

export async function saveFavorite(
  favoriteModel: typeof Favorite,
  userId: number,
  propertyId: string,
  category: FavoriteCategory = DEFAULT_CATEGORY,
): Promise<void> {
  // findOrCreate keyed on the (userId, propertyId, category) unique index -- saving
  // the same property to the same category twice is a no-op, not a duplicate row.
  // Saving it to a *different* category creates a separate row, by design (see
  // Favorite.ts): a property can independently sit in more than one category.
  await favoriteModel.findOrCreate({ where: { userId, propertyId, category } });
}

export async function removeFavorite(
  favoriteModel: typeof Favorite,
  userId: number,
  propertyId: string,
  category: FavoriteCategory,
): Promise<void> {
  // Scoped to one category -- removing a property from "Maybe" does not remove it
  // from "Want to Tour" if it was independently saved there too. Removing something
  // that was never saved is a no-op (destroy() on zero matching rows is a 0, not an
  // error), matching this repo's idempotency rule for side effects.
  await favoriteModel.destroy({ where: { userId, propertyId, category } });
}

export async function listFavorites(favoriteModel: typeof Favorite, userId: number): Promise<FavoriteRecord[]> {
  const favorites = await favoriteModel.findAll({ where: { userId } });
  return favorites.map((favorite) => ({ propertyId: favorite.propertyId, category: favorite.category }));
}

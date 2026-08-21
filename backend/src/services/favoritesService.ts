import { Favorite } from '../models/Favorite';

export async function saveFavorite(favoriteModel: typeof Favorite, userId: number, propertyId: string): Promise<void> {
  // findOrCreate keyed on the (userId, propertyId) unique index — saving the same
  // property twice is a no-op, not a duplicate row.
  await favoriteModel.findOrCreate({ where: { userId, propertyId } });
}

export async function listFavoritePropertyIds(favoriteModel: typeof Favorite, userId: number): Promise<string[]> {
  const favorites = await favoriteModel.findAll({ where: { userId } });
  return favorites.map((favorite) => favorite.propertyId);
}

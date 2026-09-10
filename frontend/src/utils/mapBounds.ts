import { Property } from '../types/property';

/** A map viewport's visible area, in the same lat/lng shape MapLibre GL reports on move/zoom. */
export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

/**
 * Properties missing coordinates were never placed on the map (see Property.latitude/
 * longitude), so they're excluded here rather than counted as "in view" or "out of view."
 */
export function filterPropertiesInBounds(properties: Property[], bounds: MapBounds): Property[] {
  return properties.filter((property) => {
    if (property.latitude == null || property.longitude == null) return false;
    return (
      property.latitude <= bounds.north &&
      property.latitude >= bounds.south &&
      property.longitude <= bounds.east &&
      property.longitude >= bounds.west
    );
  });
}

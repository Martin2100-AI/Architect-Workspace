import React, { useEffect, useRef, useState } from 'react';
import { LngLatBounds, Map as MaplibreMap, Marker, NavigationControl, Popup } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { filterPropertiesInBounds, MapBounds } from '../utils/mapBounds';
import { Property } from '../types/property';

const DEFAULT_CENTER: [number, number] = [-95.4, 29.75]; // Houston — matches the SimplyRETS demo dataset's area
const DEFAULT_ZOOM = 10;

interface MapViewProps {
  properties: Property[];
}

function toMapBounds(bounds: LngLatBounds): MapBounds {
  return {
    north: bounds.getNorth(),
    south: bounds.getSouth(),
    east: bounds.getEast(),
    west: bounds.getWest(),
  };
}

function formatPreviewHtml(property: Property): string {
  const price = property.listingPrice.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  return `
    <div class="map-preview">
      <strong>${price}</strong>
      <div>${property.address}</div>
      <div>${property.bedrooms} bd | ${property.bathrooms} ba | ${property.squareFootage.toLocaleString()} sqft</div>
    </div>
  `;
}

/** REQ-008/REQ-016 (STORY-007): interactive map with property markers, previews, and
 * search-area controls. Uses MapLibre GL JS against MapTiler vector tiles.
 *
 * maplibre-gl is pinned to 5.24.0, not the newest 6.x line: 6.9.0 was tested live
 * against this exact MapTiler style and its `isStyleLoaded()`/`loaded()` state hung
 * false forever with no error event, so 'load' never fired and no tiles were ever
 * requested — confirmed by inspecting the live Map instance in a real browser, not
 * a guess. 5.24.0 loads correctly and reliably against the same style/key. */
export function MapView({ properties }: MapViewProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MaplibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const [visibleProperties, setVisibleProperties] = useState<Property[]>([]);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const apiKey = process.env.REACT_APP_MAPTILER_API_KEY;
    if (!apiKey || !containerRef.current) {
      setLoadError(true);
      return;
    }

    const map = new MaplibreMap({
      container: containerRef.current,
      style: `https://api.maptiler.com/maps/streets-v2/style.json?key=${apiKey}`,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
    });
    mapRef.current = map;
    map.addControl(new NavigationControl(), 'top-right');

    map.on('error', () => setLoadError(true));

    // properties is read fresh via closure on each 'load'/'moveend' firing rather than
    // added as an effect dependency — the map itself is only ever created once per mount.
    const updateVisibleProperties = (): void => {
      setVisibleProperties(filterPropertiesInBounds(properties, toMapBounds(map.getBounds())));
    };

    map.on('load', updateVisibleProperties);
    map.on('moveend', updateVisibleProperties);

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    const map = mapRef.current;
    if (!map) return;

    markersRef.current = visibleProperties
      .filter((property) => property.latitude != null && property.longitude != null)
      .map((property) => {
        const popup = new Popup({ offset: 25 }).setHTML(formatPreviewHtml(property));
        return new Marker()
          .setLngLat([property.longitude as number, property.latitude as number])
          .setPopup(popup)
          .addTo(map);
      });
  }, [visibleProperties]);

  if (loadError) {
    return (
      <p role="alert" className="map-view__error">
        We couldn&apos;t load the map right now. Please try again shortly.
      </p>
    );
  }

  return (
    <div className="map-view">
      {/* This app has no stylesheet anywhere (see STORY-006's PROGRESS.md note) — a map
          needs concrete pixel dimensions to render at all, so this is set inline rather
          than left to rely on CSS that doesn't exist yet. */}
      <div
        ref={containerRef}
        data-testid="map-container"
        className="map-view__container"
        style={{ width: '100%', height: '500px' }}
      />
    </div>
  );
}

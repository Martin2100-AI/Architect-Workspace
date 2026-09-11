/**
 * Jest-only stand-in for the real `maplibre-gl` package (wired via moduleNameMapper in
 * package.json). maplibre-gl ships ESM-only with no CJS entry, which Jest's default
 * resolver/transformer can't load, and it also needs real WebGL, unavailable in jsdom.
 * Any test that actually asserts map behavior (MapView.test.tsx) replaces this with its
 * own richer jest.mock() factory; this stub only has to exist so that tests which merely
 * import a component that imports maplibre-gl (without exercising it) don't crash.
 */
class StubMap {
  on(): void {}
  off(): void {}
  addControl(): void {}
  remove(): void {}
  getBounds() {
    return { getNorth: () => 90, getSouth: () => -90, getEast: () => 180, getWest: () => -180 };
  }
}

class StubNavigationControl {}

class StubMarker {
  setLngLat(): this {
    return this;
  }
  setPopup(): this {
    return this;
  }
  addTo(): this {
    return this;
  }
  remove(): void {}
}

class StubPopup {
  setHTML(): this {
    return this;
  }
}

const stub = { Map: StubMap, Marker: StubMarker, Popup: StubPopup, NavigationControl: StubNavigationControl };
export default stub;
export { StubMap as Map, StubMarker as Marker, StubPopup as Popup, StubNavigationControl as NavigationControl };

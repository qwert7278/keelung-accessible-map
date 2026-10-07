import type L from 'leaflet';

// Keep failures tied to tile elements: an error from an old view must not
// remain attached to the map after panning, zooming, or unloading that tile.
export function watchMapTileHealth(map: L.Map, tiles: L.TileLayer, onChange: (failed: boolean) => void) {
  const failures = new Set<HTMLElement>();
  const refresh = () => {
    const viewport = map.getContainer().getBoundingClientRect();
    onChange([...failures].some(tile => {
      const rect = tile.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 &&
        rect.left < viewport.right && rect.right > viewport.left &&
        rect.top < viewport.bottom && rect.bottom > viewport.top;
    }));
  };
  const fail = (event: L.LeafletEvent) => {
    failures.add((event as L.TileErrorEvent).tile);
    refresh();
  };
  const recover = (event: L.LeafletEvent) => {
    failures.delete((event as L.TileEvent).tile);
    refresh();
  };
  tiles.on('tileerror', fail);
  tiles.on('tileload tileunload', recover);
  tiles.on('load', refresh);
  map.on('moveend zoomend resize', refresh);
  return () => {
    tiles.off('tileerror', fail);
    tiles.off('tileload tileunload', recover);
    tiles.off('load', refresh);
    map.off('moveend zoomend resize', refresh);
    failures.clear();
  };
}

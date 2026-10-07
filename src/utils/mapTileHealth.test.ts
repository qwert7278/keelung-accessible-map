import { describe, expect, it, vi } from 'vitest';
import type L from 'leaflet';
import { watchMapTileHealth } from './mapTileHealth';

class Events {
  handlers = new Map<string, Set<(event: unknown) => void>>();
  on(names: string, handler: (event: unknown) => void) {
    for (const name of names.split(' ')) {
      if (!this.handlers.has(name)) this.handlers.set(name, new Set());
      this.handlers.get(name)!.add(handler);
    }
  }
  off(names: string, handler: (event: unknown) => void) {
    for (const name of names.split(' ')) this.handlers.get(name)?.delete(handler);
  }
  fire(name: string, event: unknown = {}) {
    for (const handler of this.handlers.get(name) || []) handler(event);
  }
}
function setup() {
  const map = Object.assign(new Events(), {
    getContainer: () => ({ getBoundingClientRect: () => ({ left: 0, right: 500, top: 0, bottom: 400 }) }),
  });
  const tiles = new Events();
  const changed = vi.fn();
  const stop = watchMapTileHealth(map as unknown as L.Map, tiles as unknown as L.TileLayer, changed);
  let left = 20;
  const tile = { getBoundingClientRect: () => ({ left, right: left + 256, top: 0, bottom: 256, width: 256, height: 256 }) };
  return { map, tiles, changed, stop, tile, panAway: () => { left = 600; } };
}

describe('map tile failure recovery', () => {
  it('clears the warning when the failed tile loads successfully', () => {
    const { tiles, changed, tile } = setup();
    tiles.fire('tileerror', { tile });
    expect(changed).toHaveBeenLastCalledWith(true);
    tiles.fire('tileload', { tile });
    expect(changed).toHaveBeenLastCalledWith(false);
  });
  it('does not mistake a completed loading batch or another successful tile for recovery', () => {
    const { tiles, changed, tile } = setup();
    tiles.fire('tileerror', { tile });
    tiles.fire('tileload', { tile: {} });
    tiles.fire('load');
    expect(changed).toHaveBeenLastCalledWith(true);
  });
  it('clears errors outside the current viewport after a pan', () => {
    const { map, tiles, changed, tile, panAway } = setup();
    tiles.fire('tileerror', { tile });
    panAway();
    map.fire('moveend');
    expect(changed).toHaveBeenLastCalledWith(false);
  });
  it('clears unloaded errors during zooming or redraw, and ignores late events after disposal', () => {
    const { map, tiles, changed, tile, stop } = setup();
    tiles.fire('tileerror', { tile });
    tiles.fire('tileunload', { tile });
    expect(changed).toHaveBeenLastCalledWith(false);
    stop();
    changed.mockClear();
    tiles.fire('tileerror', { tile });
    map.fire('resize');
    expect(changed).not.toHaveBeenCalled();
  });
});

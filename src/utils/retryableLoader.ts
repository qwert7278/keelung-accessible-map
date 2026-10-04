// Share pending/successful loads; a transient failure must allow a fresh attempt.
export function retryableLoader<Key, Value>(load: (key: Key) => Promise<Value>) {
  const cache = new Map<Key, Promise<Value>>();
  return (key: Key): Promise<Value> => {
    const existing = cache.get(key);
    if (existing) return existing;
    const request = Promise.resolve().then(() => load(key)).catch(error => {
      cache.delete(key);
      throw error;
    });
    cache.set(key, request);
    return request;
  };
}

// Ignore results from an older request or an unmounted owner.
export function revisionGate() {
  let revision = 0;
  return { next: () => ++revision, current: (id: number) => id === revision, invalidate: () => { ++revision; } };
}

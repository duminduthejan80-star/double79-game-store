/** One native request at a time, shared by every subscriber. */
export const createDesktopPoller = <T,>(
  fetchItems: () => Promise<T[]>,
  interval: (items: T[]) => number,
) => {
  let items: T[] = [];
  let fingerprint = "[]";
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending = false;
  let refreshAfterPending = false;
  const listeners = new Set<() => void>();
  const poll = async () => {
    if (timer) clearTimeout(timer);
    timer = undefined;
    if (!listeners.size) return;
    if (pending) { refreshAfterPending = true; return; }
    pending = true;
    try {
      const next = await fetchItems();
      const serialized = JSON.stringify(next);
      if (serialized !== fingerprint) {
        items = next;
        fingerprint = serialized;
        listeners.forEach((notify) => notify());
      }
    } finally {
      pending = false;
      if (listeners.size) timer = setTimeout(poll, refreshAfterPending ? 0 : interval(items));
      refreshAfterPending = false;
    }
  };
  return {
    getSnapshot: () => items,
    refresh: () => { void poll(); },
    subscribe: (notify: () => void) => {
      listeners.add(notify);
      if (listeners.size === 1) void poll();
      return () => {
        listeners.delete(notify);
        if (!listeners.size && timer) { clearTimeout(timer); timer = undefined; }
      };
    },
  };
};
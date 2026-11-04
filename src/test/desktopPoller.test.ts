import { afterEach, describe, expect, it, vi } from "vitest";
import { createDesktopPoller } from "@/lib/desktopPoller";

afterEach(() => vi.useRealTimers());

describe("shared native polling", () => {
  it("shares requests, prevents overlap and stops when nobody subscribes", async () => {
    vi.useFakeTimers();
    let resolve: ((value: number[]) => void) | undefined;
    const fetch = vi.fn(() => new Promise<number[]>((done) => { resolve = done; }));
    const store = createDesktopPoller(fetch, () => 750);
    const first = vi.fn();
    const second = vi.fn();
    const stopFirst = store.subscribe(first);
    const stopSecond = store.subscribe(second);
    store.refresh();
    await vi.advanceTimersByTimeAsync(5000);
    expect(fetch).toHaveBeenCalledTimes(1);
    resolve?.([1]);
    await vi.advanceTimersByTimeAsync(0);
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledTimes(2);
    stopFirst();
    stopSecond();
    resolve?.([1]);
    await vi.advanceTimersByTimeAsync(10000);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("keeps the snapshot stable when native data hasn't changed", async () => {
    vi.useFakeTimers();
    const fetch = vi.fn(async () => [{ id: "game" }]);
    const store = createDesktopPoller(fetch, () => 750);
    const notify = vi.fn();
    const stop = store.subscribe(notify);
    await vi.advanceTimersByTimeAsync(0);
    const snapshot = store.getSnapshot();
    await vi.advanceTimersByTimeAsync(1500);
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(notify).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot()).toBe(snapshot);
    stop();
  });
});
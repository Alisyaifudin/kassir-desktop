import { beforeEach, describe, expect, test } from "bun:test";
import { render, screen, waitFor } from "@testing-library/react";
import { useMemo } from "react";
import { Effect, Stream } from "effect";
import { createPageData, Gate, pageCache, type PageDataApi } from "~/components/page-data";

/**
 * The cache's promises, pinned:
 *
 * - a return visit paints the last answer instead of a skeleton;
 * - a one-shot read is **not** repeated while nothing invalidated it;
 * - an invalidation reaches a mounted page *and* a future mount;
 * - the params are part of the answer, so going back to a filter is free;
 * - failures are never cached, and a failed revalidation never eats good data.
 *
 * Every test starts from an empty store: it is a module singleton, so one test's
 * entries would otherwise be the next one's cache hit.
 */

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

beforeEach(() => {
  pageCache.reset();
});

function Widget<E>({ api }: { api: PageDataApi<{ value: string }, E> }) {
  const res = api.use("value");
  return (
    <Gate res={res} delay={0} skeleton={<span data-testid="skeleton" />}>
      {({ data, refetching }) => (
        <span data-testid="body">
          {data}/{refetching ? "stale" : "segar"}
        </span>
      )}
    </Gate>
  );
}

/** A registry over one `value` key, so each test can pick its cache settings. */
function registry(cache?: boolean) {
  return createPageData<{ value: string }, never>("CacheTest", { cache });
}

function countingRead() {
  const state = { runs: 0 };
  const value = Effect.gen(function* () {
    yield* Effect.sleep("10 millis");
    state.runs += 1;
    return `nilai-${state.runs}`;
  });
  return { state, value };
}

const body = () => screen.getByTestId("body").textContent;

describe("page data cache", () => {
  test("a return visit paints the last answer and does not read again", async () => {
    const pageData = registry(true);
    const { state, value } = countingRead();

    const first = render(
      <pageData.Provider sources={{ value }}>
        <Widget api={pageData} />
      </pageData.Provider>,
    );
    // First visit: nothing cached, so the widget starts as a skeleton.
    expect(screen.queryByTestId("body")).toBeNull();
    await waitFor(() => expect(body()).toBe("nilai-1/segar"));
    first.unmount();

    render(
      <pageData.Provider sources={{ value }}>
        <Widget api={pageData} />
      </pageData.Provider>,
    );

    // Second visit: data on the first frame, no skeleton, and no second read.
    expect(body()).toBe("nilai-1/segar");
    await sleep(60);
    expect(state.runs).toBe(1);
  });

  test("without the cache, a return visit reads again — the behaviour being replaced", async () => {
    const pageData = registry();
    const { state, value } = countingRead();

    const first = render(
      <pageData.Provider sources={{ value }}>
        <Widget api={pageData} />
      </pageData.Provider>,
    );
    await waitFor(() => expect(body()).toBe("nilai-1/segar"));
    first.unmount();

    render(
      <pageData.Provider sources={{ value }}>
        <Widget api={pageData} />
      </pageData.Provider>,
    );

    expect(screen.queryByTestId("body")).toBeNull();
    await waitFor(() => expect(body()).toBe("nilai-2/segar"));
    expect(state.runs).toBe(2);
  });

  test("an invalidation reaches a page that is already mounted", async () => {
    const pageData = registry(true);
    const { state, value } = countingRead();

    render(
      <pageData.Provider sources={{ value }}>
        <Widget api={pageData} />
      </pageData.Provider>,
    );
    await waitFor(() => expect(body()).toBe("nilai-1/segar"));

    pageData.invalidate("value");

    // Painted as stale first (the value stays), then replaced by the new read.
    await waitFor(() => expect(body()).toBe("nilai-1/stale"));
    await waitFor(() => expect(body()).toBe("nilai-2/segar"));
    expect(state.runs).toBe(2);
  });

  test("an invalidation while unmounted makes the next visit read", async () => {
    const pageData = registry(true);
    const { state, value } = countingRead();

    const first = render(
      <pageData.Provider sources={{ value }}>
        <Widget api={pageData} />
      </pageData.Provider>,
    );
    await waitFor(() => expect(body()).toBe("nilai-1/segar"));
    first.unmount();

    pageData.invalidate("value");

    render(
      <pageData.Provider sources={{ value }}>
        <Widget api={pageData} />
      </pageData.Provider>,
    );

    // The last answer is still painted — a remount is not an error — but it is
    // flagged, because the store knows it is owed.
    expect(body()).toBe("nilai-1/stale");
    await waitFor(() => expect(body()).toBe("nilai-2/segar"));
    expect(state.runs).toBe(2);
  });

  test("the params are part of the answer: going back to a filter is free", async () => {
    const pageData = registry(true);
    const state = { runs: 0 };
    const read = (days: number) =>
      Effect.gen(function* () {
        yield* Effect.sleep("10 millis");
        state.runs += 1;
        return `${days}:nilai-${state.runs}`;
      });

    function Screen({ days }: { days: number }) {
      const sources = useMemo(() => ({ value: read(days) }), [days]);
      return (
        <pageData.Provider sources={sources} deps={[days]}>
          <Widget api={pageData} />
        </pageData.Provider>
      );
    }

    const view = render(<Screen days={7} />);
    await waitFor(() => expect(body()).toBe("7:nilai-1/segar"));

    view.rerender(<Screen days={30} />);
    await waitFor(() => expect(body()).toBe("30:nilai-2/segar"));

    view.rerender(<Screen days={7} />);

    // The 7-day question was already answered: painted at once, nothing re-read.
    expect(body()).toBe("7:nilai-1/segar");
    await sleep(60);
    expect(state.runs).toBe(2);
  });

  test("a live stream is subscribed on every visit — it is the truth, not a copy", async () => {
    const pageData = registry(true);
    const state = { subs: 0 };
    const value = Stream.fromEffect(
      Effect.gen(function* () {
        state.subs += 1;
        const run = state.subs;
        yield* Effect.sleep("10 millis");
        return `nilai-${run}`;
      }),
    );

    const mount = () =>
      render(
        <pageData.Provider sources={{ value }}>
          <Widget api={pageData} />
        </pageData.Provider>,
      );

    const first = mount();
    await waitFor(() => expect(body()).toBe("nilai-1/segar"));
    first.unmount();

    mount();

    // The cached value is painted at once, but flagged: a live source has not
    // confirmed it yet, so a screen that writes from it can wait one tick.
    expect(body()).toBe("nilai-1/stale");
    await waitFor(() => expect(body()).toBe("nilai-2/segar"));
    expect(state.subs).toBe(2);
  });

  test("a one-shot seed is confirmed at once; a live seed is not", async () => {
    const pageData = createPageData<{ once: string; live: string }, never>("CacheTest", {
      cache: true,
    });
    const once = Effect.zipRight(Effect.sleep("10 millis"), Effect.succeed("sekali"));
    const live = Stream.fromEffect(
      Effect.zipRight(Effect.sleep("30 millis"), Effect.succeed("langsung")),
    );

    function Both() {
      const onceRes = pageData.use("once");
      const liveRes = pageData.use("live");
      const flag = (res: { type: string; refetching?: boolean }) =>
        res.type === "success" ? (res.refetching === true ? "belum" : "siap") : "…";
      return (
        <span data-testid="body">
          {flag(onceRes)}/{flag(liveRes)}
        </span>
      );
    }

    const mount = () =>
      render(
        <pageData.Provider sources={{ once, live }}>
          <Both />
        </pageData.Provider>,
      );

    const first = mount();
    await waitFor(() => expect(body()).toBe("siap/siap"));
    first.unmount();

    mount();
    // The `Effect` key was read once and never invalidated: it is confirmed. The
    // `Stream` key still has to hear from its subscription.
    expect(body()).toBe("siap/belum");
    await waitFor(() => expect(body()).toBe("siap/siap"));
  });

  test("a failed revalidation keeps the value and leaves the entry owed", async () => {
    const pageData = createPageData<{ value: string }, string>("CacheTest", { cache: true });
    const state = { failing: false, runs: 0 };
    const value = Effect.gen(function* () {
      yield* Effect.sleep("10 millis");
      state.runs += 1;
      if (state.failing) return yield* Effect.fail("putus");
      return `nilai-${state.runs}`;
    });

    const view = render(
      <pageData.Provider sources={{ value }}>
        <Widget api={pageData} />
      </pageData.Provider>,
    );
    await waitFor(() => expect(body()).toBe("nilai-1/segar"));

    state.failing = true;
    pageData.invalidate("value");

    // The failed revalidation is recorded, but the last good answer stays on
    // screen: a dropped connection must not empty a screen being read.
    await waitFor(() => expect(pageCache.peek("CacheTest:value", "")?.error).toBe("putus"));
    expect(pageCache.peek("CacheTest:value", "")?.stale).toBe(true);
    expect(body()).toBe("nilai-1/segar");

    // …and the next visit tries again rather than trusting it.
    view.unmount();
    state.failing = false;
    render(
      <pageData.Provider sources={{ value }}>
        <Widget api={pageData} />
      </pageData.Provider>,
    );
    await waitFor(() => expect(body()).toBe("nilai-3/segar"));
  });

  test("a failure is never cached", async () => {
    const pageData = createPageData<{ value: string }, string>("CacheTest", { cache: true });
    const state = { runs: 0 };
    const value = Effect.gen(function* () {
      yield* Effect.sleep("5 millis");
      state.runs += 1;
      return yield* Effect.fail("selalu gagal");
    });

    function Broken() {
      const res = pageData.use("value");
      return (
        <Gate res={res} delay={0}>
          {({ data }) => <span data-testid="body">{data}</span>}
        </Gate>
      );
    }

    const mount = () =>
      render(
        <pageData.Provider sources={{ value }}>
          <Broken />
        </pageData.Provider>,
      );

    const first = mount();
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("selalu gagal"));
    first.unmount();

    // Nothing was stored, so there is nothing to paint and nothing to trust.
    expect(pageCache.peek("CacheTest:value", "")).toBeUndefined();

    mount();
    await waitFor(() => expect(state.runs).toBe(2));
    expect(screen.getByRole("alert").textContent).toContain("selalu gagal");
  });

  test("a skipped key never enters the store — the till's own working state", async () => {
    // `Pos` keeps a cart open by writing one when its draft list is empty, so a
    // cached list must never be what that decision reads.
    const pageData = createPageData<{ value: string }, never>("CacheTest", {
      cache: { skip: ["value"] },
    });
    const { state, value } = countingRead();

    const mount = () =>
      render(
        <pageData.Provider sources={{ value }}>
          <Widget api={pageData} />
        </pageData.Provider>,
      );

    const first = mount();
    await waitFor(() => expect(body()).toBe("nilai-1/segar"));
    first.unmount();

    expect(pageCache.peek("CacheTest:value", "")).toBeUndefined();

    mount();
    // No cached frame: the widget starts empty exactly like an uncached page.
    expect(screen.queryByTestId("body")).toBeNull();
    await waitFor(() => expect(body()).toBe("nilai-2/segar"));
    expect(state.runs).toBe(2);
  });

  test("the store is capped, oldest-used first", () => {
    pageCache.write({ tag: "a", deps: "", kind: "once", data: 1 });
    pageCache.write({ tag: "b", deps: "", kind: "once", data: 2 });
    pageCache.write({ tag: "c", deps: "", kind: "once", data: 3 });

    pageCache.limit(2);

    expect(pageCache.snapshot().entries.map((entry) => entry.tag).sort()).toEqual(["b", "c"]);
    expect(pageCache.snapshot().stats.evictions).toBe(1);
  });
});

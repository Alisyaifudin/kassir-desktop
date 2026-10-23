import { describe, expect, test } from "bun:test";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Data, Deferred, Effect, Queue, Stream, SubscriptionRef } from "effect";
import { createPageData, Gate } from "~/components/page-data";

/**
 * These tests pin the three promises the pattern makes: keys load in parallel,
 * a widget waits for the last key it reads (not the first), and a failure or a
 * slow key never blocks anything but its own widget.
 */

class Boom extends Data.TaggedError("Boom")<{ message: string }> {}

const sleep = (ms: number) => Effect.sleep(`${ms} millis`);

/** A source that reports when it is subscribed, then answers after `ms`. */
function probe(name: string, ms: number, started: string[]): Stream.Stream<string, never> {
  return Stream.fromEffect(
    Effect.zipRight(
      Effect.sync(() => {
        started.push(name);
      }),
      Effect.zipRight(sleep(ms), Effect.succeed(name)),
    ),
  );
}

describe("page data", () => {
  test("static chrome paints immediately and only the gate waits", async () => {
    const pageData = createPageData<{ slow: string }>("Static");
    const slow = Stream.fromEffect(Effect.zipRight(sleep(60), Effect.succeed("selesai")));

    function Widget() {
      const res = pageData.use("slow");
      return (
        <Gate res={res} delay={20} skeleton={<span data-testid="skeleton" />}>
          {({ data }) => <span data-testid="body">{data}</span>}
        </Gate>
      );
    }

    render(
      <pageData.Provider sources={{ slow }}>
        <p>chrome</p>
        <Widget />
      </pageData.Provider>,
    );

    // First frame: the page is there, the widget is not pretending to be.
    expect(screen.getByText("chrome")).toBeDefined();
    expect(screen.queryByTestId("body")).toBeNull();
    expect(screen.queryByTestId("skeleton")).toBeNull();

    await waitFor(() => expect(screen.getByTestId("body")).toBeDefined());
    expect(screen.getByTestId("body").textContent).toBe("selesai");
  });

  test("every key subscribes before any key answers", async () => {
    const pageData = createPageData<{ fast: string; slow: string; later: string }>("Parallel");
    const started: string[] = [];
    const sources = {
      fast: probe("fast", 10, started),
      slow: probe("slow", 40, started),
      later: probe("later", 80, started),
    };

    function Widget() {
      const res = pageData.use("fast");
      return (
        <Gate res={res} delay={0} skeleton={<span data-testid="skeleton" />}>
          {({ data }) => <span data-testid="fast">{data}</span>}
        </Gate>
      );
    }

    render(
      <pageData.Provider sources={sources}>
        <Widget />
      </pageData.Provider>,
    );

    await waitFor(() => expect(screen.getByTestId("fast")).toBeDefined());

    // The first answer is in, yet all three are already subscribed: no waterfall.
    expect(started.sort()).toEqual(["fast", "later", "slow"]);
  });

  test("useAll waits for the last key it reads", async () => {
    const pageData = createPageData<{ fast: string; slow: string }>("All");
    // A key that stays pending until the test decides: only a push makes it ready.
    const queue = Effect.runSync(Queue.unbounded<string>());
    const slow = Stream.fromQueue(queue);
    const fast = Stream.fromEffect(Effect.zipRight(sleep(10), Effect.succeed("cepat")));

    function Widget() {
      const res = pageData.useAll("fast", "slow");
      return (
        <Gate res={res} delay={0} skeleton={<span data-testid="skeleton" />}>
          {({ data }) => (
            <span data-testid="pair">
              {data.fast}/{data.slow}
            </span>
          )}
        </Gate>
      );
    }

    render(
      <pageData.Provider sources={{ fast, slow }}>
        <Widget />
      </pageData.Provider>,
    );

    // `fast` has answered, `slow` has not: the pair must not render half-filled.
    await waitFor(() => expect(screen.getByTestId("skeleton")).toBeDefined());
    expect(screen.queryByTestId("pair")).toBeNull();

    Effect.runSync(Queue.offer(queue, "lambat"));

    await waitFor(() => expect(screen.getByTestId("pair")).toBeDefined());
    expect(screen.getByTestId("pair").textContent).toBe("cepat/lambat");
  });

  test("a failure stays inside its own widget and can be retried", async () => {
    const pageData = createPageData<{ broken: string }, Boom>("Broken");
    let attempts = 0;
    const broken = Stream.fromEffect(
      Effect.zipRight(
        Effect.sync(() => {
          attempts += 1;
        }),
        Effect.zipRight(sleep(5), Effect.fail(new Boom({ message: "gagal total" }))),
      ),
    );

    function Widget() {
      const res = pageData.use("broken");
      const refresh = pageData.useRefresh();
      return (
        <Gate res={res} delay={0} onRetry={() => refresh("broken")}>
          {({ data }) => <span>{data}</span>}
        </Gate>
      );
    }

    render(
      <pageData.Provider sources={{ broken }}>
        <p>chrome</p>
        <Widget />
      </pageData.Provider>,
    );

    await waitFor(() => expect(screen.getByRole("alert")).toBeDefined());
    expect(screen.getByRole("alert").textContent).toContain("gagal total");
    // The page around it is untouched.
    expect(screen.getByText("chrome")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: /coba lagi/i }));
    await waitFor(() => expect(attempts).toBe(2));
  });

  test("useAll reports a failure without waiting for the other keys", async () => {
    const pageData = createPageData<{ broken: string; pending: string }, Boom>("AllError");
    const pending = Stream.never;
    const broken = Stream.fromEffect(
      Effect.zipRight(sleep(10), Effect.fail(new Boom({ message: "putus" }))),
    );

    function Widget() {
      const res = pageData.useAll("broken", "pending");
      return (
        <Gate res={res} delay={0} skeleton={<span data-testid="skeleton" />}>
          {() => <span data-testid="body" />}
        </Gate>
      );
    }

    render(
      <pageData.Provider sources={{ broken, pending }}>
        <Widget />
      </pageData.Provider>,
    );

    await waitFor(() => expect(screen.getByRole("alert")).toBeDefined());
    expect(screen.getByRole("alert").textContent).toContain("putus");
    expect(screen.queryByTestId("body")).toBeNull();
  });

  test("a refresh keeps the old value on screen and flags it as stale", async () => {
    const pageData = createPageData<{ value: string }>("Refresh");
    let calls = 0;
    const value = Stream.fromEffect(
      Effect.zipRight(
        Effect.sync(() => {
          calls += 1;
        }),
        // Read `calls` when the value is produced, not when the test is built.
        Effect.zipRight(sleep(10), Effect.sync(() => `nilai-${calls}`)),
      ),
    );

    function Widget() {
      const res = pageData.use("value");
      const refresh = pageData.useRefresh();
      return (
        <>
          <Gate res={res} delay={0} skeleton={<span data-testid="skeleton" />}>
            {({ data, refetching }) => (
              <span data-testid="body">
                {data}/{refetching ? "stale" : "segar"}
              </span>
            )}
          </Gate>
          <button onClick={() => refresh("value")}>segarkan</button>
        </>
      );
    }

    render(
      <pageData.Provider sources={{ value }}>
        <Widget />
      </pageData.Provider>,
    );

    await waitFor(() => expect(screen.getByTestId("body").textContent).toBe("nilai-1/segar"));

    fireEvent.click(screen.getByRole("button", { name: "segarkan" }));

    // The old value stays; only its freshness flag moves.
    await waitFor(() => expect(screen.getByTestId("body").textContent).toBe("nilai-1/stale"));
    expect(screen.queryByTestId("skeleton")).toBeNull();

    await waitFor(() => expect(screen.getByTestId("body").textContent).toBe("nilai-2/segar"));
    expect(calls).toBe(2);
  });
});

describe("page data mutations", () => {
  test("a mutation keeps the value on screen and flags it stale until the refetch lands", async () => {
    const pageData = createPageData<{ value: string }>("Mutate");
    let runs = 0;
    // A one-shot source: a successful mutation must re-run it.
    const value = Effect.gen(function* () {
      yield* Effect.sleep("10 millis");
      runs += 1;
      return `nilai-${runs}`;
    });
    const gate = Effect.runSync(Deferred.make<void>());

    function Widget() {
      const res = pageData.use("value");
      const write = pageData.useMutation<void, void, never>(() => Deferred.await(gate), {
        refetch: ["value"],
      });
      return (
        <>
          <Gate res={res} delay={0} skeleton={<span data-testid="skeleton" />}>
            {({ data, refetching }) => (
              <span data-testid="body">
                {data}/{refetching ? "stale" : "segar"}
              </span>
            )}
          </Gate>
          <button onClick={() => void write.mutate()}>tulis</button>
        </>
      );
    }

    render(
      <pageData.Provider sources={{ value }}>
        <Widget />
      </pageData.Provider>,
    );
    await waitFor(() => expect(screen.getByTestId("body").textContent).toBe("nilai-1/segar"));

    fireEvent.click(screen.getByRole("button", { name: "tulis" }));

    // Still the old value, now flagged — the component can dim it.
    await waitFor(() => expect(screen.getByTestId("body").textContent).toBe("nilai-1/stale"));
    expect(screen.queryByTestId("skeleton")).toBeNull();

    Effect.runSync(Deferred.succeed(gate, undefined));

    // The flag survives the answer and only clears with the refetched value.
    await waitFor(() => expect(screen.getByTestId("body").textContent).toBe("nilai-2/segar"));
    expect(runs).toBe(2);
  });

  test("a live key is stale only while the write runs, and is not re-subscribed", async () => {
    const pageData = createPageData<{ live: number }>("LiveMutate");
    const ref = Effect.runSync(SubscriptionRef.make(0));
    let subscriptions = 0;
    // A `SubscriptionRef.changes`-shaped source: replaying it must not be needed.
    const live = Stream.unwrap(
      Effect.sync(() => {
        subscriptions += 1;
        return ref.changes;
      }),
    );
    const gate = Effect.runSync(Deferred.make<void>());

    function Widget() {
      const res = pageData.use("live");
      const write = pageData.useMutation<void, void, never>(() => Deferred.await(gate), {
        refetch: ["live"],
      });
      return (
        <>
          <Gate res={res} delay={0} skeleton={<span data-testid="skeleton" />}>
            {({ data, refetching }) => (
              <span data-testid="body">
                {data}/{refetching ? "stale" : "segar"}
              </span>
            )}
          </Gate>
          <button onClick={() => void write.mutate()}>tulis</button>
        </>
      );
    }

    render(
      <pageData.Provider sources={{ live }}>
        <Widget />
      </pageData.Provider>,
    );
    await waitFor(() => expect(screen.getByTestId("body").textContent).toBe("0/segar"));

    fireEvent.click(screen.getByRole("button", { name: "tulis" }));
    await waitFor(() => expect(screen.getByTestId("body").textContent).toBe("0/stale"));

    // The write pushes through the ref, as a service would, and settles.
    Effect.runSync(SubscriptionRef.set(ref, 7));
    Effect.runSync(Deferred.succeed(gate, undefined));

    await waitFor(() => expect(screen.getByTestId("body").textContent).toBe("7/segar"));
    expect(subscriptions).toBe(1);
  });

  test("a failed mutation clears the flag and leaves the data alone", async () => {
    const pageData = createPageData<{ value: string }, Boom>("FailedMutate");
    let runs = 0;
    const value = Effect.gen(function* () {
      yield* Effect.sleep("10 millis");
      runs += 1;
      return `nilai-${runs}`;
    });
    const gate = Effect.runSync(Deferred.make<void>());

    function Widget() {
      const res = pageData.use("value");
      const write = pageData.useMutation<void, never, Boom>(
        () =>
          Deferred.await(gate).pipe(Effect.zipRight(Effect.fail(new Boom({ message: "ditolak" })))),
        { refetch: ["value"] },
      );
      return (
        <>
          <Gate res={res} delay={0} skeleton={<span data-testid="skeleton" />}>
            {({ data, refetching }) => (
              <span data-testid="body">
                {data}/{refetching ? "stale" : "segar"}
              </span>
            )}
          </Gate>
          <button onClick={() => void write.mutate()}>tulis</button>
          {write.error === null ? null : <span data-testid="error">{write.error.message}</span>}
        </>
      );
    }

    render(
      <pageData.Provider sources={{ value }}>
        <Widget />
      </pageData.Provider>,
    );
    await waitFor(() => expect(screen.getByTestId("body").textContent).toBe("nilai-1/segar"));

    fireEvent.click(screen.getByRole("button", { name: "tulis" }));
    await waitFor(() => expect(screen.getByTestId("body").textContent).toBe("nilai-1/stale"));

    Effect.runSync(Deferred.succeed(gate, undefined));

    await waitFor(() => expect(screen.getByTestId("error").textContent).toBe("ditolak"));
    expect(screen.getByTestId("body").textContent).toBe("nilai-1/segar");
    // Nothing was re-read: the mutation did not land.
    expect(runs).toBe(1);
  });

  test("only the keys the mutation names go stale", async () => {
    const pageData = createPageData<{ a: string; b: string }>("Scoped");
    const a = Effect.gen(function* () {
      yield* Effect.sleep("10 millis");
      return "a1";
    });
    const b = Effect.gen(function* () {
      yield* Effect.sleep("10 millis");
      return "b1";
    });
    const gate = Effect.runSync(Deferred.make<void>());

    function Widget() {
      const resA = pageData.use("a");
      const resB = pageData.use("b");
      const write = pageData.useMutation<void, void, never>(() => Deferred.await(gate), {
        refetch: ["a"],
      });
      const flag = (res: typeof resA) =>
        res.type === "success" ? (res.refetching === true ? "stale" : "segar") : res.type;
      return (
        <>
          <span data-testid="a">{flag(resA)}</span>
          <span data-testid="b">{flag(resB)}</span>
          <button onClick={() => void write.mutate()}>tulis</button>
        </>
      );
    }

    render(
      <pageData.Provider sources={{ a, b }}>
        <Widget />
      </pageData.Provider>,
    );
    await waitFor(() => expect(screen.getByTestId("a").textContent).toBe("segar"));
    expect(screen.getByTestId("b").textContent).toBe("segar");

    fireEvent.click(screen.getByRole("button", { name: "tulis" }));

    await waitFor(() => expect(screen.getByTestId("a").textContent).toBe("stale"));
    expect(screen.getByTestId("b").textContent).toBe("segar");

    Effect.runSync(Deferred.succeed(gate, undefined));
    await waitFor(() => expect(screen.getByTestId("a").textContent).toBe("segar"));
  });
});

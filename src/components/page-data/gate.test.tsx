import { describe, expect, test } from "bun:test";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Data, Effect, Stream } from "effect";
import { createPageData } from "~/components/page-data";

class Boom extends Data.TaggedError("Boom")<{ message: string }> {}

const sleep = (ms: number) => Effect.sleep(`${ms} millis`);

function later<A>(ms: number, value: A): Stream.Stream<A, never> {
  return Stream.fromEffect(Effect.zipRight(sleep(ms), Effect.succeed(value)));
}

/**
 * What `pageData.Gate` promises: the pulse is drawn once and held back, the body
 * waits for *every* declared key, a failure is typed, and a refetch never blanks
 * a region or brings the pulse back.
 */
describe("pageData.Gate", () => {
  test("the body renders only after every declared key has answered", async () => {
    const pageData = createPageData<{ fast: string; slow: string }>("Multi");

    render(
      <pageData.Provider sources={{ fast: later(10, "cepat"), slow: later(40, "lambat") }}>
        <pageData.Gate keys={["fast", "slow"]} delay={0} pulse={<span data-testid="pulse" />}>
          {({ fast, slow }) => <span data-testid="body">{`${fast}+${slow}`}</span>}
        </pageData.Gate>
      </pageData.Provider>,
    );

    expect(screen.getByTestId("pulse")).toBeDefined();
    expect(screen.queryByTestId("body")).toBeNull();

    await waitFor(() => expect(screen.getByTestId("body").textContent).toBe("cepat+lambat"));
    expect(screen.queryByTestId("pulse")).toBeNull();
  });

  test("the first key arriving does not remount the pulse", async () => {
    const pageData = createPageData<{ fast: string; slow: string }>("Settled");

    function Status() {
      return <span data-testid="fast">{pageData.useStatus("fast")}</span>;
    }

    render(
      <pageData.Provider sources={{ fast: later(10, "cepat"), slow: Stream.never }}>
        <Status />
        <pageData.Gate keys={["fast", "slow"]} delay={0} pulse={<span data-testid="pulse" />}>
          {({ fast, slow }) => <span data-testid="body">{`${fast}+${slow}`}</span>}
        </pageData.Gate>
      </pageData.Provider>,
    );

    const first = screen.getByTestId("pulse");

    // `fast` lands; `slow` never does. The region must keep the *same* placeholder
    // node — remounting it would restart the anti-flash window and blink.
    await waitFor(() => expect(screen.getByTestId("fast").textContent).toBe("ready"));
    expect(screen.getByTestId("pulse")).toBe(first);
    expect(screen.queryByTestId("body")).toBeNull();
  });

  test("the pulse is held back, so a fast region never flashes it", async () => {
    const pageData = createPageData<{ value: string }>("AntiFlash");

    render(
      <pageData.Provider sources={{ value: Stream.never }}>
        <pageData.Gate keys={["value"]} pulse={<span data-testid="pulse" />}>
          {({ value }) => <span data-testid="body">{value}</span>}
        </pageData.Gate>
      </pageData.Provider>,
    );

    expect(screen.queryByTestId("pulse")).toBeNull();
    await waitFor(() => expect(screen.getByTestId("pulse")).toBeDefined());
  });

  test("a failed key reaches the typed error slot", async () => {
    const pageData = createPageData<{ broken: string }, Boom>("Typed");

    render(
      <pageData.Provider
        sources={{
          broken: Stream.fromEffect(
            Effect.zipRight(sleep(10), Effect.fail(new Boom({ message: "putus" }))),
          ),
        }}
      >
        <pageData.Gate
          keys={["broken"]}
          delay={0}
          pulse={<span data-testid="pulse" />}
          error={(error) => <span data-testid="error">{error.message}</span>}
        >
          {({ broken }) => <span data-testid="body">{broken}</span>}
        </pageData.Gate>
      </pageData.Provider>,
    );

    await waitFor(() => expect(screen.getByTestId("error").textContent).toBe("putus"));
    expect(screen.queryByTestId("body")).toBeNull();
  });

  test("without an error slot, a failure is retryable in place", async () => {
    const pageData = createPageData<{ value: string }, Boom>("Retry");
    let runs = 0;
    const value = Effect.gen(function* () {
      runs += 1;
      const run = runs;
      yield* sleep(10);
      if (run === 1) return yield* Effect.fail(new Boom({ message: "sekali saja" }));
      return `nilai-${run}`;
    });

    render(
      <pageData.Provider sources={{ value }}>
        <pageData.Gate keys={["value"]} delay={0} pulse={<span data-testid="pulse" />}>
          {({ value: text }) => <span data-testid="body">{text}</span>}
        </pageData.Gate>
      </pageData.Provider>,
    );

    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain("sekali saja"),
    );

    // The default slot wires its own retry — no `onRetry` to remember.
    fireEvent.click(screen.getByRole("button", { name: "Coba lagi" }));

    await waitFor(() => expect(screen.getByTestId("body").textContent).toBe("nilai-2"));
    expect(runs).toBe(2);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  test("a refetch keeps the value on screen and never brings the pulse back", async () => {
    const pageData = createPageData<{ value: string }>("KeepValue");
    let calls = 0;
    const value = Stream.fromEffect(
      Effect.zipRight(
        Effect.sync(() => {
          calls += 1;
        }),
        Effect.zipRight(sleep(10), Effect.sync(() => `nilai-${calls}`)),
      ),
    );

    function Body() {
      const value = pageData.use("value");
      const refresh = pageData.useRefresh();
      return (
        <>
          <button onClick={() => refresh("value")}>segarkan</button>
          <pageData.Gate keys={["value"]} delay={0} pulse={<span data-testid="pulse" />}>
            {() => (
              <span data-testid="body">
                {value.type === "success" ? value.data : "?"}/
                {value.type === "success" && value.refetching === true ? "stale" : "segar"}
              </span>
            )}
          </pageData.Gate>
        </>
      );
    }

    render(
      <pageData.Provider sources={{ value }}>
        <Body />
      </pageData.Provider>,
    );

    await waitFor(() => expect(screen.getByTestId("body").textContent).toBe("nilai-1/segar"));

    fireEvent.click(screen.getByRole("button", { name: "segarkan" }));

    // The old value stays and the pulse is never drawn.
    expect(screen.getByTestId("body").textContent).toBe("nilai-1/stale");
    expect(screen.queryByTestId("pulse")).toBeNull();

    await waitFor(() => expect(screen.getByTestId("body").textContent).toBe("nilai-2/segar"));
    expect(calls).toBe(2);
  });

  test("a lost refetch keeps the last value and reports it as stale", async () => {
    const pageData = createPageData<{ value: string }, Boom>("Stale");
    let runs = 0;
    const value = Effect.gen(function* () {
      runs += 1;
      const run = runs;
      yield* sleep(10);
      if (run > 1) return yield* Effect.fail(new Boom({ message: "gagal menyegarkan" }));
      return "nilai-awal";
    });

    function Body() {
      const status = pageData.useStatus("value");
      const frame = pageData.useFrame(["value"]);
      const refresh = pageData.useRefresh();
      return (
        <>
          <button onClick={() => refresh("value")}>segarkan</button>
          <span data-testid="status">
            {status}/{frame.status}
          </span>
          <pageData.Gate keys={["value"]} delay={0} pulse={<span data-testid="pulse" />} error={null}>
            {({ value: text }) => <span data-testid="body">{text}</span>}
          </pageData.Gate>
        </>
      );
    }

    render(
      <pageData.Provider sources={{ value }}>
        <Body />
      </pageData.Provider>,
    );

    await waitFor(() => expect(screen.getByTestId("body").textContent).toBe("nilai-awal"));
    expect(screen.getByTestId("status").textContent).toBe("ready/ready");

    fireEvent.click(screen.getByRole("button", { name: "segarkan" }));

    // Value kept, no pulse, no error slot — only the word changes.
    await waitFor(() => expect(screen.getByTestId("status").textContent).toBe("stale/stale"));
    expect(screen.getByTestId("body").textContent).toBe("nilai-awal");
    expect(screen.queryByTestId("pulse")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  test("a write whose refetch loses reports stale and never blanks the region", async () => {
    const pageData = createPageData<{ value: string }, Boom>("WriteStale");
    let runs = 0;
    // Read-once: a write re-runs it, which is what a mutation does. A live stream
    // is never re-read — the service pushes into it instead.
    const value = Effect.gen(function* () {
      runs += 1;
      const run = runs;
      yield* sleep(10);
      if (run > 1) return yield* Effect.fail(new Boom({ message: "gagal menyegarkan" }));
      return "nilai-awal";
    });
    const write = () => Effect.zipRight(sleep(10), Effect.succeed({ saved: true }));

    function Body() {
      const status = pageData.useStatus("value");
      const save = pageData.useMutation(write, { refetch: ["value"] });
      const line = save.pending
        ? "pending"
        : save.refetching
          ? "refetching"
          : save.stale
            ? "stale"
            : "idle";

      return (
        <>
          <span data-testid="status">{status}</span>
          <span data-testid="write">{line}</span>
          <button onClick={() => void save.mutate(undefined)}>simpan</button>
          <pageData.Gate keys={["value"]} delay={0} pulse={<span data-testid="pulse" />}>
            {({ value: text }) => <span data-testid="body">{text}</span>}
          </pageData.Gate>
        </>
      );
    }

    render(
      <pageData.Provider sources={{ value }}>
        <Body />
      </pageData.Provider>,
    );

    await waitFor(() => expect(screen.getByTestId("body").textContent).toBe("nilai-awal"));
    expect(screen.getByTestId("write").textContent).toBe("idle");

    fireEvent.click(screen.getByRole("button", { name: "simpan" }));

    // Write lands, refetch behind it does not: both sides say the same word, and
    // the region is never blanked.
    await waitFor(() => expect(screen.getByTestId("write").textContent).toBe("stale"));
    expect(screen.getByTestId("status").textContent).toBe("stale");
    expect(screen.getByTestId("body").textContent).toBe("nilai-awal");
    expect(screen.queryByTestId("pulse")).toBeNull();
  });

  test("a card's frame reads state, and a value gates itself", async () => {
    const pageData = createPageData<{ stats: { orders: number } }, Boom>("Frame");

    function Card() {
      const frame = pageData.useFrame(["stats"]);
      return (
        <div>
          <span data-testid="frame">{frame.status}</span>
          {frame.error === null ? null : <span data-testid="frame-error">{frame.error.message}</span>}
          <pageData.Gate keys={["stats"]} delay={0} pulse={<span data-testid="pulse" />} error={null}>
            {({ stats }) => <span data-testid="value">{stats.orders}</span>}
          </pageData.Gate>
        </div>
      );
    }

    render(
      <pageData.Provider sources={{ stats: later(20, { orders: 7 }) }}>
        <Card />
      </pageData.Provider>,
    );

    expect(screen.getByTestId("frame").textContent).toBe("pending");
    expect(screen.getByTestId("pulse")).toBeDefined();

    await waitFor(() => expect(screen.getByTestId("value").textContent).toBe("7"));
    expect(screen.getByTestId("frame").textContent).toBe("ready");
    expect(screen.queryByTestId("frame-error")).toBeNull();
  });
});

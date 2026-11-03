import { beforeEach, describe, expect, mock, test } from "bun:test";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Effect, Stream } from "effect";
import { SYNC_GROUPS, SYNC_IDLE, type SyncState } from "~/services/sync";

/**
 * The bottom-left status pill.
 *
 * A sync is a background task, so this pill is the only thing that says one is
 * happening — and, when one fails, the only thing that says so at all (nothing
 * brings a cashier to Pengaturan → Sinkronisasi). The rules under test:
 *
 *   * nothing on screen while nothing runs;
 *   * a running sync is announced once, in words that do not change per frame;
 *   * a failure stays until it is seen, then goes away;
 *   * its dialog can cancel the run, and closing the dialog cannot.
 */
let state: Stream.Stream<SyncState> = Stream.make(SYNC_IDLE);
const calls: string[] = [];

mock.module("~/services", () => ({
  service: {
    sync: {
      get state() {
        return state;
      },
      start: () =>
        Effect.sync(() => {
          calls.push("start");
          return "started" as const;
        }),
      cancel: () =>
        Effect.sync(() => {
          calls.push("cancel");
        }),
    },
  },
}));

const { SyncPill } = await import("./z-Pill");

function runningState(): SyncState {
  return {
    ...SYNC_IDLE,
    status: "running",
    message: "Menyinkronkan…",
    startedAt: 1_000,
    groups: SYNC_IDLE.groups.map((group) => ({
      ...group,
      phase: "pull" as const,
      message: "Mengunduh perubahan…",
      progress: 0.3,
    })),
  };
}

function failedState(): SyncState {
  return {
    ...SYNC_IDLE,
    status: "failed",
    message: "Server tidak menjawab",
    error: "Server tidak menjawab",
    startedAt: 1_000,
    finishedAt: 2_000,
  };
}

beforeEach(() => {
  state = Stream.make(SYNC_IDLE);
  calls.length = 0;
});

describe("SyncPill", () => {
  test("nothing at all while no run is happening", () => {
    render(<SyncPill />);

    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  test("a running sync is one announced pill, and it opens the details", async () => {
    state = Stream.make(runningState());
    render(<SyncPill />);

    const pill = await screen.findByRole("status");
    // One word, no counters: a live region that narrates every frame is torture.
    expect(pill.textContent).toBe("Menyinkronkan");
    expect(pill.getAttribute("aria-live")).toBe("polite");

    fireEvent.click(screen.getByRole("button", { name: /menyinkronkan/i }));

    expect(await screen.findByRole("dialog")).toBeTruthy();
    // One row per synced group: its name, its phase, its counters.
    expect(screen.getByText("Kas & Uang")).toBeTruthy();
    expect(screen.getAllByText(/Mengunduh perubahan…/)).toHaveLength(SYNC_GROUPS.length);
    const bars = screen.getAllByRole("progressbar");
    expect(bars).toHaveLength(SYNC_GROUPS.length);
    expect(bars[0]?.getAttribute("aria-valuenow")).toBe("30");
  });

  test("Batal asks the service to cancel; closing asks nothing of it", async () => {
    state = Stream.make(runningState());
    render(<SyncPill />);

    fireEvent.click(await screen.findByRole("button", { name: /menyinkronkan/i }));
    fireEvent.click(await screen.findByRole("button", { name: /batal/i }));
    await waitFor(() => expect(calls).toEqual(["cancel"]));

    // Closing the dialog is not a cancel: the run is a background task, and the
    // pill keeps showing it.
    fireEvent.click(screen.getByRole("button", { name: /tutup/i }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(calls).toEqual(["cancel"]);
    expect(screen.getByRole("status").textContent).toBe("Menyinkronkan");
  });

  test("a failure stays on screen until its dialog is closed", async () => {
    state = Stream.make(failedState());
    render(<SyncPill />);

    const pill = await screen.findByRole("status");
    expect(pill.textContent).toBe("Sinkronisasi gagal");

    fireEvent.click(screen.getByRole("button", { name: /sinkronisasi gagal/i }));
    // Twice on purpose: the sentence is the dialog's description *and* the error
    // line under it — the same string the panel shows.
    expect(await screen.findAllByText("Server tidak menjawab")).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: /tutup/i }));
    await waitFor(() => expect(screen.queryByRole("status")).toBeNull());
  });

  test("a new failure comes back after an older one was dismissed", async () => {
    state = Stream.make(failedState());
    const { unmount } = render(<SyncPill />);

    fireEvent.click(await screen.findByRole("button", { name: /sinkronisasi gagal/i }));
    fireEvent.click(screen.getByRole("button", { name: /tutup/i }));
    await waitFor(() => expect(screen.queryByRole("status")).toBeNull());
    unmount();

    // Same component, a later failure: keyed on `finishedAt`, not on "was it seen".
    state = Stream.make({ ...failedState(), finishedAt: 5_000 });
    render(<SyncPill />);
    expect(await screen.findByRole("status")).toBeTruthy();
  });
});

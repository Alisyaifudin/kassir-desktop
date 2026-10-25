import { useEffect } from "react";
import { Effect, Option, Stream } from "effect";
import { toast } from "sonner";
import { log } from "~/lib/log";
import { service } from "~/services";

/**
 * The cart reaches SQLite on a 100 ms debounce (`schedule()` in
 * `services/transaction/live.ts`), so closing the window used to drop the last
 * edit of the sale being rung up — invisibly, because a *lost* write looks
 * exactly like a successful one. Closing the app at the end of a shift is the
 * normal way to leave, so this hook puts the pending edits on disk first and
 * holds the window when they could not be written.
 *
 * Mounted once, by the authenticated layout.
 *
 * The window's close is a promise: `@tauri-apps/api` awaits this handler and only
 * then destroys the window — and it destroys it *only* when the handler returns
 * without `preventDefault()`. Which means a handler that throws, or one that
 * awaits something that never settles, is an app with no way out and nothing on
 * screen to explain it. That is what this file got wrong: the flush read the
 * cart's save-error channel, which no write ever clears when there is nothing to
 * write, so one failed write — or one `reportError` from a dropped UI fiber —
 * kept `preventDefault()` firing for the rest of the session. Every path here now
 * has to end.
 */

/** How long a close waits for the cart before it stops waiting and lets go. */
const FLUSH_TIMEOUT_MS = 5_000;

const TIMEOUT_MESSAGE = "Keranjang belum tersimpan: penyimpanan tidak menjawab";

/**
 * What a close does with the flush's answer.
 *
 * Hold the window the *first* time, so the operator hears about the failure while
 * the sale is still on screen; let the second attempt through, because an app that
 * cannot be quit is worse than the last second of edits, and the cart is written
 * on a 100 ms debounce — the risk is what the debounce still holds, not the sale.
 */
export function closeDecision(failure: string | null, alreadyHeld: boolean): "close" | "hold" {
  if (failure === null) return "close";
  return alreadyHeld ? "close" : "hold";
}

/** `work`, or `TIMEOUT_MESSAGE` when it outlasts the deadline. */
async function withDeadline(work: Promise<string | null>, ms: number): Promise<string | null> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const deadline = new Promise<string>((resolve) => {
    timer = setTimeout(() => resolve(TIMEOUT_MESSAGE), ms);
  });
  try {
    return await Promise.race([work, deadline]);
  } finally {
    if (timer !== null) clearTimeout(timer);
  }
}

/** The message on the cart's save-error channel, or `null` when all is written. */
async function saveErrorMessage(): Promise<string | null> {
  const head = await Effect.runPromise(
    Stream.runHead(service.transaction.get.saveError).pipe(
      Effect.catchAll(() => Effect.succeed(Option.none())),
    ),
  );
  return Option.getOrNull(head);
}

/**
 * Flush the cart, then report whether anything is still unsaved. `flush()` writes
 * the whole cart in one pass and leaves the channel saying what that pass did, so
 * what is read back here belongs to this close attempt and not to an older one.
 */
async function flushCart(): Promise<string | null> {
  await Effect.runPromise(service.transaction.flush()).catch((error: unknown) => {
    log.error(
      error instanceof Error ? error : new Error(`Gagal menyimpan keranjang: ${String(error)}`),
    );
  });
  return saveErrorMessage();
}

/** Flush within the deadline, and never throw: the close handler must not reject. */
async function flushForClose(): Promise<string | null> {
  try {
    return await withDeadline(flushCart(), FLUSH_TIMEOUT_MS);
  } catch (error) {
    log.error(
      error instanceof Error ? error : new Error(`Gagal menyimpan keranjang: ${String(error)}`),
    );
    return TIMEOUT_MESSAGE;
  }
}

export function useFlushOnExit() {
  useEffect(() => {
    let disposed = false;
    let unlisten: (() => void) | null = null;
    // Set once the operator has been told the cart could not be written; the next
    // close is theirs to make.
    let held = false;

    // Alt+F4, the taskbar's close, a Windows shutdown: the webview is torn down
    // as soon as this handler settles, so the write happens inside it.
    void (async () => {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      return getCurrentWindow().onCloseRequested(async (event) => {
        try {
          const failure = await flushForClose();
          const decision = closeDecision(failure, held);
          if (decision === "close") {
            if (failure !== null) {
              log.error(`Keluar tanpa menyimpan keranjang: ${failure}`);
              toast.error(`${failure} — keluar tanpa menyimpan.`);
            }
            return;
          }
          held = true;
          log.error(`Tutup ditahan: ${failure ?? "tidak diketahui"}`);
          event.preventDefault();
          toast.error(`${failure ?? TIMEOUT_MESSAGE}. Tutup sekali lagi untuk keluar tanpa menyimpan.`);
        } catch (error) {
          // Nothing to do but let the window go: a rejection here would be
          // swallowed by the listener and the window would never be destroyed.
          log.error(
            error instanceof Error ? error : new Error(`Gagal menutup: ${String(error)}`),
          );
        }
      });
    })()
      .then((off) => {
        if (disposed) off();
        else unlisten = off;
      })
      .catch((error: unknown) => {
        // No window API (unit tests, the browser harness): nothing to hook.
        log.info(`Tidak ada window Tauri untuk flush saat keluar: ${String(error)}`);
      });

    // A webview reload (F5, a dev refresh) never reaches the window's close
    // handler. The flush is fire-and-forget because the page is going away.
    const onPageHide = () => {
      void Effect.runPromise(Effect.exit(service.transaction.flush()));
    };
    window.addEventListener("pagehide", onPageHide);

    return () => {
      disposed = true;
      unlisten?.();
      window.removeEventListener("pagehide", onPageHide);
    };
  }, []);
}

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
 * keeps the window open when they could not be written.
 *
 * Mounted once, by the authenticated layout.
 */

/** The message on the cart's save-error channel, or `null` when all is written. */
async function saveErrorMessage(): Promise<string | null> {
  const head = await Effect.runPromise(
    Stream.runHead(service.transaction.get.saveError).pipe(Effect.catchAll(() => Effect.succeed(Option.none()))),
  );
  return Option.getOrNull(head);
}

/** Flush the cart, then report whether anything is still unsaved. */
async function flushCart(): Promise<string | null> {
  await Effect.runPromise(service.transaction.flush()).catch((error: unknown) => {
    log.error(error instanceof Error ? error : new Error(`Gagal menyimpan keranjang: ${String(error)}`));
  });
  return saveErrorMessage();
}

export function useFlushOnExit() {
  useEffect(() => {
    let disposed = false;
    let unlisten: (() => void) | null = null;

    // Alt+F4, the taskbar's close, a Windows shutdown: the webview is torn down
    // as soon as this handler settles, so the write happens inside it. Tauri
    // waits for the returned promise, and `preventDefault()` keeps the window
    // (and the cashier's chance to retry) when the cart could not be saved.
    void (async () => {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      return getCurrentWindow().onCloseRequested(async (event) => {
        const error = await flushCart();
        if (error === null) return;
        event.preventDefault();
        toast.error(error);
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

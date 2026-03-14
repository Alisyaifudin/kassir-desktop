import { Effect, Either, pipe } from "effect";
import PQueue from "p-queue";

class QueueManager {
  pq = new PQueue({ concurrency: 1 });
  private static instance: QueueManager;

  private constructor() {}

  static getInstance(): QueueManager {
    if (!QueueManager.instance) {
      QueueManager.instance = new QueueManager();
    }
    return QueueManager.instance;
  }
  size() {
    return this.pq.size;
  }
  pending() {
    return this.pq.pending;
  }
  on(event: "idle" | "active", callback: () => void) {
    this.pq.on(event, callback);
  }
  off(event: "idle" | "active", callback: () => void) {
    this.pq.off(event, callback);
  }
  add<A = void, E = never>(
    effect: Effect.Effect<A, E>,
    options?: { onFailure?: (e: E) => void; onSuccess?: (v: A) => void },
  ) {
    this.pq.add(() =>
      pipe(effect, Effect.either, Effect.runPromise).then((either) => {
        Either.match(either, {
          onLeft(left) {
            options?.onFailure?.(left);
          },
          onRight(right) {
            options?.onSuccess?.(right);
          },
        });
      }),
    );
  }
}

export const queue = QueueManager.getInstance();

// export async function retry<E>(
//   n: number,
//   func: (...args: any[]) => Promise<E | null>,
//   errCallback?: (e: E) => void,
// ): Promise<"Gagal" | null> {
//   for (let i = 0; i < n; i++) {
//     const errMsg = await queue.add(func);
//     if (errMsg !== null) {
//       if (errCallback !== undefined) errCallback(errMsg);
//       continue;
//     }
//     return null;
//   }
//   return "Gagal";
// }

// export async function retry<E, T>(
//   n: number,
//   func: (...args: any[]) => Promise<Result<E, T>>,
//   errCallback?: (e: E) => void,
// ): Promise<Result<"Gagal", T>>;
// export async function retry<E, T>(
//   n: number,
//   func: (...args: any[]) => Promise<Result<E, T>> ,
//   errCallback?: (e: E) => void,
// ): Promise<Result<"Gagal", T>> {
//   for (let i = 0; i < n; i++) {
//     const [errMsg, res] = await queue.add(func);
//     if (errMsg !== null) {
//       if (errCallback !== undefined) errCallback(errMsg);
//       continue;
//     }
//     return ok(res as T);
//   }
//   return err("Gagal");
// }

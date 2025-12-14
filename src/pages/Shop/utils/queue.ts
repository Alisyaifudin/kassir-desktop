import PQueue from "p-queue";

export const queue = new PQueue({ concurrency: 1 });

export async function retry<E>(
  n: number,
  func: (...args: any[]) => Promise<E | null>,
  errCallback?: (e: E) => void,
): Promise<"Gagal" | null> {
  for (let i = 0; i < n; i++) {
    const errMsg = await queue.add(func);
    if (errMsg !== null) {
      if (errCallback !== undefined) errCallback(errMsg);
      continue;
    }
    return null;
  }
  return "Gagal";
}

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

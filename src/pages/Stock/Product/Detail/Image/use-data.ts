import { db } from "~/database";
import { image } from "~/lib/image";
import { useId } from "../use-id";
import { Effect } from "effect";
import { Result } from "~/lib/result";

const KEY = "images";

export function useData() {
  const id = useId();
  const res = Result.use({
    fn: () => program(id),
    key: KEY,
  });
  return res;
}

export function revalidate() {
  Result.revalidate(KEY);
}

export type ImageResult =
  | {
      success: true;
      href: string;
      order: number;
      id: string;
    }
  | {
      success: false;
      order: number;
      href: undefined;
      id: string;
    };

const HIGH_NUMBER = 10000;

export function program(id: string) {
  return Effect.gen(function* () {
    const imagesMeta = yield* db.image.get.byProductId(id);
    const images: ImageResult[] = yield* Effect.all(
      imagesMeta.map((img, i) =>
        image.load(img.id, img.mime).pipe(
          Effect.map((href) => ({
            success: true as const,
            href,
            id: img.id,
            order: img.order,
          })),
          Effect.catchTag("IOError", (e) => {
            console.error(e);
            return Effect.succeed({
              success: false as const,
              order: HIGH_NUMBER + i,
              href: undefined,
              id: img.id,
            });
          }),
        ),
      ),
      { concurrency: 5 },
    );
    return images;
  });
}

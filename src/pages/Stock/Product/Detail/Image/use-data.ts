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
    revalidateOn: {
      unmount: true,
    },
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
      id: number;
    }
  | {
      success: false;
      href: undefined;
      id: number;
    };


export function program(id: number) {
  return Effect.gen(function* () {
    const imagesMeta = yield* db.image.get.byProductId(id);
    const images: ImageResult[] = yield* Effect.all(
      imagesMeta.map((img) =>
        image.load(img.name, img.mime).pipe(
          Effect.map((href) => ({
            success: true as const,
            href,
            id: img.id,
          })),
          Effect.catchTag("IOError", (e) => {
            console.error(e);
            return Effect.succeed({ success: false as const, href: undefined, id: img.id });
          }),
        ),
      ),
      { concurrency: 5 },
    );
    return images;
  });
}

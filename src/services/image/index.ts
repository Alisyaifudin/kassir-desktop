import { Context, Effect } from "effect";
import { ImageError } from "./error";
import { ImageResult } from "./type";


export class ImageService extends Context.Tag("ImageService")<
  ImageService,
  {
    loader(productId: string): Effect.Effect<void, ImageError>;
    useImages(): ImageResult[];
    add(productId: string, file: File): Effect.Effect<void, ImageError>;
    delete(productId: string, id: string): Effect.Effect<void, ImageError>;
    swap(a: string, b: string): Effect.Effect<void, ImageError>;
  }
>() {}

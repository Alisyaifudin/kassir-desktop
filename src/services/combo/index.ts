import { Effect, Context, Data, Stream } from "effect";

export class ComboError extends Data.TaggedError("ComboError")<{ message: string }> {}

export type ComboMime = "image/png" | "image/jpeg" | "image/webp";

export type ComboCover = { name: string; mime: ComboMime };

export type ComboComponent = {
  id: string;
  listingId: string;
  quantity: number;
  order: number;
};

export type ComboExtra = {
  id: string;
  extraId: string;
  order: number;
};

/** A catalogue template. Child ids reference live listings and Extra presets. */
export type Combo = {
  id: string;
  name: string;
  active: boolean;
  cover: ComboCover | null;
  components: ComboComponent[];
  extras: ComboExtra[];
  updatedAt: number;
  syncAt: number | null;
};

export type ComboInput = {
  name: string;
  active: boolean;
  cover: ComboCover | null;
  components: { listingId: string; quantity: number }[];
  extraIds: string[];
};

export class ComboService extends Context.Tag("ComboService")<
  ComboService,
  {
    refresh: () => Effect.Effect<void, ComboError>;
    get: {
      all: () => Effect.Effect<Combo[], ComboError>;
      changes: Stream.Stream<Combo[], ComboError>;
    };
    add: (input: ComboInput) => Effect.Effect<string, ComboError>;
    set: { info: (id: string, input: ComboInput) => Effect.Effect<void, ComboError> };
    /** Soft-deletes the template and removes its optional cover file. */
    delete: { byId: (id: string) => Effect.Effect<void, ComboError> };
  }
>() {}

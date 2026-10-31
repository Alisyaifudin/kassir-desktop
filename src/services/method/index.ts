import { Effect, Context, Data, Stream } from "effect";
import type { DefaultableKind, MethodKind } from "~/lib/constants";

export class MethodError extends Data.TaggedError("MethodError")<{ message: string }> {}

/** A payment method. `name` is null for the four built-in base methods. */
export type Method = {
  id: string;
  name: string | null;
  kind: MethodKind;
  deletedAt: number | null;
};

/** The method id chosen as the default for a kind; a kind is absent when none is. */
export type MethodDefaults = Partial<Record<DefaultableKind, string>>;

/** The catalog and the defaults together, so a reader cannot see one without the other. */
export type MethodCatalog = {
  methods: Method[];
  defaults: MethodDefaults;
};

/** A method being added — the id and the sync bookkeeping are the service's. */
export type MethodInput = {
  name: string;
  kind: MethodKind;
};

export class MethodService extends Context.Tag("MethodService")<
  MethodService,
  {
    /**
     * Re-reads the method catalog after a sync merge. Names, kinds and tombstones
     * can all arrive from the server; the ref the POS reads is hydrated once.
     */
    refresh: () => Effect.Effect<void, MethodError>;
    get: {
      all: () => Effect.Effect<Method[], MethodError>;
      catalog: () => Effect.Effect<MethodCatalog, MethodError>;
      /** The methods alone, for readers with no use for the defaults. */
      changes: Stream.Stream<Method[], MethodError>;
      /** Re-emits when either slice moves; the method array keeps its identity. */
      catalogChanges: Stream.Stream<MethodCatalog, MethodError>;
    };
    add: (input: MethodInput) => Effect.Effect<string, MethodError>;
    set: {
      name: (id: string, name: string) => Effect.Effect<void, MethodError>;
      /** `null` clears the kind's default. */
      default: (kind: DefaultableKind, id: string | null) => Effect.Effect<void, MethodError>;
    };
    /** Soft-deletes the method; records referencing it keep their row. */
    delete: { byId: (id: string) => Effect.Effect<void, MethodError> };
  }
>() {}

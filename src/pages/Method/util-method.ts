import type { DefaultableKind } from "~/lib/constants";
import type { Method } from "~/services/method";

/**
 * A method the page can edit: a named one of a kind that can have a default.
 * The kind's base row carries `name === null` and is listed by no tab.
 */
export type NamedMethod = Method & { name: string; kind: DefaultableKind };

/**
 * The editable methods of one kind.
 *
 * The base row is the reason this exists: `method_name` is NULL for it, and the
 * legacy filter tested `name !== undefined`, which a NULL sails straight
 * through — so the row it was written to exclude was the one row it kept.
 */
export function namedMethodsOf(methods: Method[], kind: DefaultableKind): NamedMethod[] {
  return methods.filter(
    (method): method is NamedMethod => method.kind === kind && method.name !== null,
  );
}

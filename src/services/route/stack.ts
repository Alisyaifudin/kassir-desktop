import { z } from "zod";

/**
 * The navigation stack, as pure functions.
 *
 * The app keeps its own history instead of letting `window.history` keep it: every
 * navigation is written as a `replace`, so the browser holds exactly one entry and
 * this stack is the history. That is what makes "back" a decision the app makes
 * rather than one the webview makes, and it is why `url_back` — a return URL
 * threaded through every link that had to lead back somewhere — is no longer
 * needed: the stack already knows where the operator came from, for more than one
 * hop.
 *
 * Nothing here touches Effect, the DOM or React, so the whole contract is a table
 * of (stack, intent, landed location) → stack. `live.ts` owns the state and
 * `react.tsx` owns the router; both are thin around this file.
 */

/**
 * One screen the operator has been on.
 *
 * `url` is pathname + search, never the hash: under the hash router the hash *is*
 * the pathname, so a `#` in the stored value would be a second fragment.
 */
export type RouteEntry = {
  readonly url: string;
  /** react-router's `location.key`. Identifies the entry, not the screen. */
  readonly key: string;
};

/**
 * What the history did, in this file's vocabulary — react-router's
 * `useNavigationType`.
 *
 * A `pop` the app did not announce is the webview's own history moving (an
 * Alt+Left, a mouse's back button), which the stack reconciles rather than records.
 */
export type RouteAction = "push" | "replace" | "pop";

/**
 * What a navigation does to the stack.
 *
 * - `push` — a new screen: it goes on top, and `back` returns to what was showing.
 * - `replace` — the same screen rewritten (a filter, a tab, a sort): the entry is
 *   rewritten in place, so `back` still leaves the screen instead of stepping
 *   through every facet the operator touched. This is the half that twelve
 *   `setSearchParams(..., { replace: true })` call sites used to spell out by hand.
 * - `pop` — leaving a screen the way it was entered.
 * - `root` — arriving at a *section*: everything above the root is pulled off first,
 *   so the new screen hangs off `/` instead of off whatever detour led here. A top
 *   nav tab is this: `Beranda → Produk → Teh → Toko` leaves `Back` pointing at
 *   `Beranda`, not at the product the operator happened to be reading.
 */
export type RouteBehavior = RouteAction | "root";

/** The screen every section hangs off. */
export const ROOT_URL = "/";

/** A navigation the caller has announced but the router has not landed yet. */
export type RouteIntent = { readonly url: string; readonly behavior: RouteBehavior };

export type RouteStack = readonly RouteEntry[];

/**
 * How many screens we remember.
 *
 * A cap, not a policy: the stack is a fallback for a webview whose session history
 * is gone (a relaunch, a hard reload), and a relaunch that resumes fifty screens
 * ago is not a stack the operator can still reason about. Oldest entries fall off.
 */
export const STACK_LIMIT = 50;

/** The URL without its query, which is what "is this the same screen?" asks. */
export function pathnameOf(url: string): string {
  const cut = url.search(/[?#]/);
  return cut === -1 ? url : url.slice(0, cut);
}

/** The stack of an app that has only ever shown one screen. */
export function stackOf(url: string, key: string): RouteStack {
  return [{ url, key }];
}

/** A new screen on top, capped. */
export function pushOnto(stack: RouteStack, entry: RouteEntry): RouteStack {
  const next = [...stack, entry];
  return next.length > STACK_LIMIT ? next.slice(next.length - STACK_LIMIT) : next;
}

/** The same screen, rewritten: the top entry is the one that changes. */
export function replaceTop(stack: RouteStack, entry: RouteEntry): RouteStack {
  return stack.length === 0 ? [entry] : [...stack.slice(0, -1), entry];
}

/**
 * The top entry discarded, `entry` becoming the screen that is showing again.
 *
 * `entry` is the *previous* screen re-entered, so it carries a fresh `key` — the
 * replace that got us here minted a new one. Keeping the old entry instead would
 * leave two identical URLs on the stack, and a second `back` would then have to be
 * a no-op the operator cannot see.
 */
export function popOff(stack: RouteStack, entry: RouteEntry): RouteStack {
  return stack.length < 2 ? [entry] : [...stack.slice(0, -2), entry];
}

/**
 * The stack of a section: the root, and the screen the operator arrived at.
 *
 * Landing on the root itself is just the root — one entry, not two identical ones.
 * The root entry is reused when the stack already has one, so `/` keeps its
 * identity across tab switches instead of being minted again every time.
 */
export function rootThenPush(
  stack: RouteStack,
  entry: RouteEntry,
  root: string = ROOT_URL,
): RouteStack {
  if (entry.url === root) return [entry];
  const base = stack.find((item) => item.url === root) ?? { url: root, key: "root" };
  return [base, entry];
}

/**
 * The screen behind this one, rewritten.
 *
 * For the one flow where the screen the operator came from stops describing where
 * they are: flipping a record's mode writes a copy and soft-deletes the original,
 * so the list they opened it from — filtered by the old mode — no longer holds it.
 * `Back` has to land on that list with its filter moved, and the list is the entry
 * *below* the one showing, not a `url_back` the record page can rewrite.
 *
 * Below two entries there is nothing behind, so there is nothing to rewrite.
 */
export function retargetBack(stack: RouteStack, url: string): RouteStack {
  if (stack.length < 2) return stack;
  const behind = stack.length - 2;
  return [...stack.slice(0, behind), { ...stack[behind], url }, stack[stack.length - 1]];
}

/**
 * The stack after the router landed on `entry`.
 *
 * A recorded intent wins only when it names the URL we actually landed on — the
 * router can land somewhere else (a loader redirect, a `useBlocker` the operator
 * then dismisses), and an intent applied to the wrong location would write a
 * navigation that never happened.
 *
 * `action` is what the history did, from react-router's `useNavigationType`. While
 * a `pop` is the app's own `back`, every one of them is not: the webview keeps a
 * history of its own, and a back gesture, a mouse's back button or a raw
 * `window.location` write moves it without asking us. Reconciling means the stack
 * truncates to the screen the pop landed on — which is the same answer the operator
 * expects — instead of recording a bogus new screen on top.
 *
 * With no intent and no pop, the URL is the only signal left, so the policy reads
 * it: a different pathname is a different screen, the same pathname is the same
 * screen rewritten.
 */
export function commitTo(
  stack: RouteStack,
  intent: RouteIntent | null,
  entry: RouteEntry,
  action: RouteAction = "push",
): RouteStack {
  const previous = stack[stack.length - 1];
  if (previous === undefined) return [entry];

  // Same screen, same entry: React's StrictMode runs the sync effect twice, and a
  // reload lands on the entry already stored. Neither is a navigation.
  if (intent === null && previous.url === entry.url && previous.key === entry.key) {
    return stack;
  }

  if (intent !== null && intent.url === entry.url) {
    switch (intent.behavior) {
      case "push":
        return pushOnto(stack, entry);
      case "replace":
        return replaceTop(stack, entry);
      case "pop":
        return popOff(stack, entry);
      case "root":
        return rootThenPush(stack, entry);
    }
  }

  if (action === "pop") {
    const landed = lastIndexUrl(stack, entry.url);
    // A screen this stack has never held: whatever moved the history was not a
    // traversal the app can follow, so the landing screen becomes the top.
    return landed === -1 ? replaceTop(stack, entry) : [...stack.slice(0, landed), entry];
  }

  if (pathnameOf(previous.url) !== pathnameOf(entry.url)) return pushOnto(stack, entry);
  return replaceTop(stack, entry);
}

/** The stack position of `url`, searching from the screen showing backwards. */
function lastIndexUrl(stack: RouteStack, url: string): number {
  for (let index = stack.length - 1; index >= 0; index -= 1) {
    if (stack[index].url === url) return index;
  }
  return -1;
}

/**
 * The stored stack, parsed rather than trusted.
 *
 * localStorage outlives app versions: an entry from a build that stored something
 * else has to be dropped, not crash the boot. Within-app paths only — these values
 * become navigation targets, and `//evil.com` is the shape that stops being an
 * in-app path.
 */
const storedEntry = z.object({
  url: z.string().refine((value) => value.startsWith("/") && !value.startsWith("//")),
  key: z.string(),
});

export function parseStack(value: unknown): RouteStack {
  const parsed = z.array(z.unknown()).safeParse(value);
  if (!parsed.success) return [];
  const entries = parsed.data.flatMap((item) => {
    const entry = storedEntry.safeParse(item);
    return entry.success ? [entry.data] : [];
  });
  return entries.length > STACK_LIMIT ? entries.slice(entries.length - STACK_LIMIT) : entries;
}

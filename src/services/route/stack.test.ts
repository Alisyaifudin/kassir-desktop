import { describe, expect, test } from "bun:test";
import {
  STACK_LIMIT,
  commitTo,
  parseStack,
  pathnameOf,
  popOff,
  pushOnto,
  replaceTop,
  rootThenPush,
  type RouteEntry,
  type RouteIntent,
  type RouteStack,
} from "./stack";

/**
 * The stack is a table of (stack, intent, landed location) → stack. Everything the
 * app promises about `back` is one of these rows, so they are pinned here rather
 * than through a router: the router only decides *which* location we land on.
 */
function entry(url: string, key = url): RouteEntry {
  return { url, key };
}

function stack(...urls: string[]): RouteStack {
  return urls.map((url) => entry(url));
}

function intent(url: string, behavior: RouteIntent["behavior"]): RouteIntent {
  return { url, behavior };
}

const urlsOf = (value: RouteStack) => value.map((item) => item.url);

describe("pathnameOf", () => {
  test("drops the query, which is what 'the same screen' asks", () => {
    expect(pathnameOf("/products?q=teh")).toBe("/products");
    expect(pathnameOf("/records?day=1&tab=detail")).toBe("/records");
  });

  test("a URL without a query is its own pathname", () => {
    expect(pathnameOf("/products")).toBe("/products");
  });
});

describe("commitTo", () => {
  test("the first screen of a session seeds the stack", () => {
    expect(urlsOf(commitTo([], null, entry("/")))).toEqual(["/"]);
  });

  test("a push intent adds a screen", () => {
    const after = commitTo(stack("/products", "/products/1"), intent("/products/2", "push"), entry("/products/2", "k3"));

    expect(urlsOf(after)).toEqual(["/products", "/products/1", "/products/2"]);
  });

  test("a replace intent rewrites the screen showing", () => {
    const after = commitTo(stack("/products"), intent("/products?q=teh", "replace"), entry("/products?q=teh", "k2"));

    expect(urlsOf(after)).toEqual(["/products?q=teh"]);
  });

  test("a pop intent discards the screen being left", () => {
    const after = commitTo(
      stack("/products?q=teh", "/products/1?url_back=x"),
      intent("/products?q=teh", "pop"),
      entry("/products?q=teh", "k3"),
    );

    // The old entry is gone, not merely written over: a second `back` leaves the
    // list instead of landing on it again.
    expect(urlsOf(after)).toEqual(["/products?q=teh"]);
    expect(after[0].key).toBe("k3");
  });

  test("a pop at the root keeps exactly one entry", () => {
    expect(urlsOf(commitTo(stack("/"), intent("/", "pop"), entry("/", "k2")))).toEqual(["/"]);
  });

  test("with no intent, a different pathname is a new screen", () => {
    // A redirect the app did not announce, a `window.location` write, a reload.
    const after = commitTo(stack("/products"), null, entry("/login", "k2"));

    expect(urlsOf(after)).toEqual(["/products", "/login"]);
  });

  test("with no intent, a query-only change is the same screen rewritten", () => {
    // The policy the twelve `setSearchParams(..., { replace: true })` call sites
    // used to spell out by hand, now the default nobody has to remember.
    const after = commitTo(stack("/records"), null, entry("/records?day=2", "k2"));

    expect(urlsOf(after)).toEqual(["/records?day=2"]);
  });

  test("an intent that names another URL is ignored, and the URL decides", () => {
    // The navigation that was announced did not happen — a loader redirected
    // somewhere else. Trusting the intent would record a screen nobody saw.
    const after = commitTo(stack("/records"), intent("/records/1", "push"), entry("/login", "k2"));

    expect(urlsOf(after)).toEqual(["/records", "/login"]);
  });

  test("a root intent pulls the stack back to the section root", () => {
    // A top nav tab: `/pos` hangs off home, not off the product that was being
    // read when the operator tapped it.
    const after = commitTo(
      stack("/", "/products", "/products/1"),
      intent("/pos", "root"),
      entry("/pos", "k4"),
    );

    expect(urlsOf(after)).toEqual(["/", "/pos"]);
  });

  test("a root intent for the root itself leaves one entry", () => {
    const after = commitTo(stack("/", "/products/1"), intent("/", "root"), entry("/", "k3"));

    expect(urlsOf(after)).toEqual(["/"]);
  });

  test("a webview pop truncates to the screen it landed on", () => {
    // Alt+Left, a mouse back button: the history moved without the app asking.
    const after = commitTo(
      stack("/", "/products", "/products/1"),
      null,
      entry("/products", "k4"),
      "pop",
    );

    expect(urlsOf(after)).toEqual(["/", "/products"]);
  });

  test("a pop to a screen this stack never held becomes the top", () => {
    // The webview's history is not the stack's any more; the landing screen is
    // what is showing, so it is what the stack describes.
    const after = commitTo(stack("/", "/products"), null, entry("/login", "k3"), "pop");

    expect(urlsOf(after)).toEqual(["/", "/login"]);
  });

  test("an announced back is a pop even when the history says push", () => {
    // Every app navigation is written as a replace, so the only pop the history
    // reports is the webview's. The intent is the app's own answer and it wins.
    const after = commitTo(
      stack("/", "/products"),
      intent("/", "pop"),
      entry("/", "k3"),
      "replace",
    );

    expect(urlsOf(after)).toEqual(["/"]);
  });

  test("landing on the entry already stored is not a navigation", () => {
    // React's StrictMode runs the sync effect twice, and a reload lands on the
    // entry the stack already holds.
    const before = stack("/products");

    expect(commitTo(before, null, entry("/products"))).toBe(before);
  });
});

describe("the building blocks", () => {
  test("pushOnto keeps the newest entries and drops the oldest", () => {
    const full = stack(...Array.from({ length: STACK_LIMIT }, (_, index) => `/screen-${index}`));

    const after = pushOnto(full, entry("/newest"));

    expect(after.length).toBe(STACK_LIMIT);
    expect(after[after.length - 1].url).toBe("/newest");
    expect(after[0].url).toBe("/screen-1");
  });

  test("replaceTop of an empty stack is that entry", () => {
    expect(urlsOf(replaceTop([], entry("/")))).toEqual(["/"]);
  });

  test("rootThenPush reuses the root already on the stack", () => {
    const after = rootThenPush(stack("/", "/products"), entry("/pos", "k3"));

    expect(urlsOf(after)).toEqual(["/", "/pos"]);
    expect(after[0].key).toBe("/");
  });

  test("rootThenPush mints the root when the stack has none", () => {
    // A deep link straight into a section: the section still hangs off home, so
    // `Back` has somewhere to go.
    const after = rootThenPush(stack("/products/1"), entry("/pos", "k3"));

    expect(urlsOf(after)).toEqual(["/", "/pos"]);
  });

  test("popOff below two entries still leaves one screen", () => {
    expect(urlsOf(popOff(stack("/"), entry("/", "k2")))).toEqual(["/"]);
  });
});

describe("parseStack", () => {
  test("a stack from a previous session is read back", () => {
    expect(urlsOf(parseStack([{ url: "/", key: "a" }, { url: "/products?q=x", key: "b" }]))).toEqual([
      "/",
      "/products?q=x",
    ]);
  });

  test("anything that is not a stack is no stack", () => {
    expect(parseStack(undefined)).toEqual([]);
    expect(parseStack("route-stack")).toEqual([]);
    expect(parseStack({ url: "/" })).toEqual([]);
  });

  test("entries a build could not have written are dropped, not kept", () => {
    // These values become navigation targets, so the rule `urlBackOf` applies to
    // `url_back` applies here too: rooted, non-protocol-relative, in-app only.
    const parsed = parseStack([
      { url: "https://evil.com", key: "a" },
      { url: "//evil.com", key: "b" },
      { url: "products", key: "c" },
      { url: 7, key: "d" },
      { url: "/products", key: "e" },
    ]);

    expect(urlsOf(parsed)).toEqual(["/products"]);
  });

  test("a stored stack longer than the limit is trimmed to the newest", () => {
    const long = Array.from({ length: STACK_LIMIT + 5 }, (_, index) => ({
      url: `/screen-${index}`,
      key: `k${index}`,
    }));

    const parsed = parseStack(long);

    expect(parsed.length).toBe(STACK_LIMIT);
    expect(parsed[parsed.length - 1].url).toBe(`/screen-${STACK_LIMIT + 4}`);
  });
});

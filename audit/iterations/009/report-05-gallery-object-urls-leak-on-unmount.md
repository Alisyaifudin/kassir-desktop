---
slug: gallery-object-urls-leak-on-unmount
title: "Unsaved product-gallery drafts leak their blob URLs when the page is left"
severity: low
category: performance
iteration: 9
created: 2026-10-21T21:32:45.309Z
files:
  - "src/pages/Product/Detail/Image/use-gallery.ts"
  - "src/pages/Product/Detail/Image/page.tsx"
---

# Unsaved product-gallery drafts leak their blob URLs when the page is left

- **Severity:** low
- **Category:** performance
- **Files:** `src/pages/Product/Detail/Image/use-gallery.ts`, `src/pages/Product/Detail/Image/page.tsx`
- **Iteration:** 9

## Summary

`useGallery` calls `URL.createObjectURL` for every picked image and releases it only on an explicit discard or a successful save, with no unmount cleanup — so picking up to 10 files (50 MB cap) and then navigating away with the browser back/Home link pins those blobs for the rest of the session, in an app that by design is never closed between shifts.

## Details

## Evidence

`src/pages/Product/Detail/Image/use-gallery.ts` creates an object URL for every picked file and only releases it
on an explicit discard or a successful save:

```ts
function pick(files: File[], current: Draft[]) {        // :180
  …
  accepted.push({ id, name, mime, file, href: URL.createObjectURL(file) });   // :215
}

const discard = useCallback((draft: Draft) => {
  URL.revokeObjectURL(draft.href);                       // :116 — only path that releases an unsaved draft
  setDrafts((prev) => prev.filter((d) => d.id !== draft.id));
}, []);

const save = useCallback(async () => {                   // :156
  …
  if (error === null) { drafts.forEach((draft) => URL.revokeObjectURL(draft.href)); setDrafts([]); … }
}, [drafts, items, productId]);
```

There is no `useEffect` cleanup on unmount, and the hooks that would call `discardAll` are only reachable while
the page is mounted. The batch limits make the size concrete: `MAX_DRAFTS = 10`, `MAX_FILE_SIZE = 10e6`,
`MAX_DRAFT_SIZE = 50e6` — i.e. up to **50 MB of live blobs** can be pinned by one product page.

The reachable sequence is the normal one, not an abuse: open a product → pick five cover photos → notice it is
the wrong product → press the back/Home link (or `Alt+2`) instead of "Batal". `drafts` state is dropped with the
component, the `File` objects are garbage, and the `blob:` URLs stay registered for the lifetime of the webview.

## Why it matters

A POS desktop app is not closed between sales; it runs for a full shift and often for weeks (`useDayStart` in
`src/hooks/use-day-start.ts` exists precisely because "a shop PC is never closed"). Leaked blob URLs pin the
decoded image memory in the webview process, and the fix is exactly the line that was written for the discard
case. On a low-RAM till this compounds into the renderer being reaped by Windows, which is a crash during a sale.

The same hook also leaves `arranged` (a drag order that may reference drafts it has since dropped) in place
across saves, but the leak is the part with a memory consequence.

## Recommended fix

Own the lifetime of the URLs in one effect, so *any* unmount releases them:

```ts
// Release every live blob URL when the gallery goes away. Drafts can only be
// saved or discarded while the page is mounted, so anything still here at
// unmount was abandoned by navigation.
const draftsRef = useRef<Draft[]>([]);
draftsRef.current = drafts;
useEffect(
  () => () => {
    for (const draft of draftsRef.current) URL.revokeObjectURL(draft.href);
  },
  [],
);
```

(Keep the existing per-draft `revokeObjectURL` calls in `discard`/`discardAll`/`save` — the ref-based cleanup is
the unmount backstop, and revoking twice is a no-op.)

If you would rather not keep a ref, move the URLs out of state: store the `File` and derive `href` with a
`useMemo` + `useEffect` pair keyed on the draft ids, which has the same lifetime as the component.

## Acceptance criteria

- Navigating away from a product's image tab with N unsaved drafts leaves no registered blob URL for them
  (assert `URL.revokeObjectURL` was called once per draft, with a test that mounts `useGallery`, calls `add`,
  then unmounts).
- Discarding a single draft still revokes exactly its own URL, and a successful save still revokes all of them.
- No double-revoke warning in the console after discard-then-unmount.

## Verification

```
bun test src/pages/Product/Detail/Image            # new unmount-cleanup test
bunx tsc --noEmit && bunx eslint . --max-warnings 0
```

Manual: in a dev build, pick three photos on a product, navigate to Home, then
`performance.memory.usedJSHeapSize` (or the DevTools Memory panel) should not keep the 3-bitmap growth.

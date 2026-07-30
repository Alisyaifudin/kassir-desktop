# AGENT.md — Code Patterns

## Architecture

```
src/components/
  block/         thin wrappers around native HTML / Radix primitives
                 only stylex.props, no visual styling, no variants.
                 it should have explicit minimal props only.
  ui/            styled components built on top of blocks
                 stylex.create for visual styles, tokens from ~/tokens.stylex
```

### Block (`src/components/block/`)

- Accept `style?: StyleXStyles` + `ref` + explicit domain props
- Destructure `stylex.props(style)` and merge with `cssVars` into a single `style` object:
  ```tsx
  const { className, style: sxStyle } = stylex.props(style)
  return <div className={className} style={{ ...cssVars, ...sxStyle }} {...props}>
  ```
- **Never** accept `className`
- **Never** hardcode visual values — those belong in `ui/`

### UI (`src/components/ui/`)

- Import a block, add `stylex.create` styles, merge with caller's `style`
- Accept `style?: StyleXStyles` — **never** `className`
- All CSS values come from `~/tokens.stylex` (`colors.*`, `sizes.*`)

---

## Component Signature

```tsx
// ✅ CORRECT
type ButtonProps = {
  variant?: keyof typeof colorVariants;
  style?: StyleXStyles;
  children?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  ref?: Ref<HTMLButtonElement>;
};

export function Button({
  variant = "default",
  style,
  children,
  onClick,
  disabled,
  ref,
}: ButtonProps) { ... }
```

- **Named `*Props` type** — explicit, not `React.ComponentProps<"element">`
- **`ref` as a regular prop** — NOT `React.forwardRef`
- **Regular function** — not arrow, not `forwardRef`
- **`style?: StyleXStyles`** — never `className`

---

## Style Merging

```tsx
// Merge base + variant + caller's style
const merged = [baseStyle.base, variantStyle, style] as StyleXStyles;
```

- Always an array cast to `StyleXStyles`
- Pass to block via `style={merged}`
- Or spread via `{...stylex.props(merged)}` directly on a native element

---

## Dynamic Values — CSS Variables

StyleX handles static styles. For runtime/dynamic values, use CSS custom properties via `cssVars`:

```tsx
// 1. Reference the variable in your StyleX style
const styles = stylex.create({
  fill: {
    width: "var(--progress-width)",   // dynamic, comes from cssVars
    height: sizes.gap,                  // static, from tokens
  },
})

// 2. Pass the dynamic value via cssVars prop on the Block
<Block
  style={styles.fill}
  cssVars={{ "--progress-width": `${pct}%` }}
/>
```

- **`var(--name)`** in `stylex.create` — references a CSS variable
- **`cssVars` prop** on `Block` — provides the runtime values
- **Never** use inline `style={{ width: ... }}` alongside `stylex.props` on the same element
- The block merges `cssVars` and stylex `style` into a single `style` object

---

## Tokens (`src/tokens.stylex.ts`)

- **All** design values live here — `colors.*` and `sizes.*`
- **Never** hardcode `px`, `rem`, color values, or shadows in components
- If a token doesn't exist yet, add it to `tokens.stylex.ts` first

---

## Imports

```tsx
import * as stylex from "@stylexjs/stylex";
import type { StyleXStyles } from "@stylexjs/stylex";
import type { ReactNode, Ref } from "react";
import { colors, sizes } from "~/tokens.stylex";
```

---

## File Layout

```tsx
import { ... } from "..."

// ── Styles ───────────────────────────────────────────────────────────────

const styles = stylex.create({ ... })

// ── Component ────────────────────────────────────────────────────────────

type FooProps = { style?: StyleXStyles; ... }
export function Foo({ style, ... }: FooProps) { ... }
```

---

## Don't Do

- ❌ `React.forwardRef` — put `ref` in props instead
- ❌ `React.ComponentProps<"element">` — use a named `*Props` type
- ❌ `className` prop — use `style?: StyleXStyles`
- ❌ `cn()` / Tailwind classes — use `stylex.create`
- ❌ `cva` / `class-variance-authority` — use `stylex.create` objects + lookup maps
- ❌ Hardcoded CSS values — put them in `tokens.stylex.ts`
- ❌ Inline `style={{}}` on the same element as `stylex.props` — use `cssVars` + `var(--name)` instead
- ❌ `const Component = (props) => <...>` arrow functions — use `export function Component`
- ❌ Modifying a `block/` component unless absolutely necessary

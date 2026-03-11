# Shadcn UI Best Practices

Because shadcn/ui provides source code, you must treat components as part of the project's logic, not external dependencies.

## Rules for New Components
1. **Source Ownership**: Never treat `src/components/ui` as a black box. If a component needs a permanent change, edit it directly.
2. **Variants First**: If a component needs a new style (e.g., a "ghostly" button), add a new `variant` in the `cva()` definition of the component file rather than adding ad-hoc Tailwind classes in the consumer.
3. **Icons**: Always use `lucide-react`. Ensure consistent sizing (standard is `size={16}` or `size={18}` for buttons).
4. **Accessibility**: Radix primitives are included for a reason. Never remove `asChild` if it's there; it prevents invalid HTML nesting.

## Design Tokens
- Use CSS variables from `index.css` (e.g., `var(--primary)`) to ensure the agent respects your theme.
- When creating "premium" effects, use `backdrop-blur` and `shadow-[0_8px_30px_rgb(0,0,0,0.12)]`.

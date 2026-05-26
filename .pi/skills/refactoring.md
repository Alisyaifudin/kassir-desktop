# Refactoring Checklist (Learned the Hard Way)

When asked to refactor a file, do **all** of these, not just the first one. Do not stop until the checklist is exhausted.

## 1. Extract Effect programs
Move any `Effect.gen(function* () { ... })` block into a `programX.ts` file.
Return `Effect.Effect<null, string>` (null = success, string = error message).
Follow existing patterns: `programDeleteRecord`, `programPrint`, `programClearTab`.

## 2. Extract big logic into custom hooks
If a component has `useState`, `useRef`, `useEffect`, or async handler functions that span more than ~3 lines → extract into a `use-*.ts` hook.
The component should only call hooks and render JSX. No inline state management, no inline handlers.

## 3. Extract presentational sub-components into `z-*.tsx` files
Every `function X() { return <div>...</div> }` inside a component file is a violation.
Move it to its own `z-X.tsx` file. File name has `z-` prefix, exported component name does not.

## 4. Self-review: did I actually follow all conventions?
After editing, mentally check:
- [ ] All big logic extracted into hooks? (No inline useState/useRef/useEffect blocks)
- [ ] All sub-components in their own `z-*.tsx` files?
- [ ] All Effect programs in `program-*.ts` files?
- [ ] Each file is small and single-purpose?
- [ ] Component is now a thin shell that just calls hooks and renders?

## Root Causes of Past Failures

### "Just enough" mindset
Defaulted to extracting only the most obvious thing (Effect programs) and stopped.
Did not push to full compliance without being nudged.

### Mistaking conventions as guidelines
`agents.md` says "always refactor" and "use custom hooks for big logic."
These are RULES, not suggestions. Follow them completely.

### Optimizing for fewer files
Subconscious bias: "more files = bad." The convention explicitly values many small files
over one large file. "Too massive component is hard to read (for human)."

### Not checking work against conventions
Did not run the mental checklist above before considering the task done.

### Misinterpreting "strict focus"
"Strict focus" means don't add unrelated features. It does NOT mean do a half-job.
When asked to refactor, refactor fully. The user means "make it compliant with all conventions."

---

## The Iron Rule

**A refactored component file should contain ONLY:**
- Imports
- Hook calls (destructuring returned values)
- JSX (rendering imported `z-*` components)

**Nothing else.** No inline functions. No inline state. No inline effects. No inline sub-components.

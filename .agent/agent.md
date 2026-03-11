# Kassir Desktop Agent Profile

You are the Lead Engineer AI for **Kassir Desktop**, a modern, high-performance retail/POS application built on the Tauri framework.

## 🛠️ Technology Stack
- **Framework**: React 19 (Functional components, Hooks)
- **Styling**: Tailwind CSS 4 + shadcn/ui (Radix primitives)
- **Logic**: Effect-ts (`effect`) for functional programming and side-effect management.
- **Desktop**: Tauri v2 (Rust backend, Web frontend)
- **Routing**: React Router v7
- **Forms/Validation**: TanStack Form + Zod
- **State**: XState Store + Immer

## 🎨 Design Vibe
- **Premium Desktop Feel**: The app should feel like a native macOS/Windows application, not a website.
- **Aesthetics**: Clean, minimal, high contrast, smooth transitions (using `lucide-react` icons).
- **Responsiveness**: Primarily optimized for desktop screens (POS terminals, laptops).

## 🧠 Engineering Principles
1. **Effect-ts First**: Prefer using `Effect` for complex logic, error handling, and async operations over raw `try/catch` or `Promise`.
2. **Type Safety**: Strictly typed TypeScript. No `any`. Use Zod for runtime validation.
3. **Component Architecture**: 
   - Use shadcn/ui components as the base.
   - Keep components small and focused. 
   - Use the `z-` prefix for local/private sub-components (as seen in `z-UserInfo.tsx`).
4. **Tauri Integration**: Use `@tauri-apps/api/v2` for system interop (FS, SQL, etc.).

## 🚀 Vibe Coding Instructions
- When asked to "beautify" or "improve UI," prioritize modern design trends: glassmorphism, subtle shadows, and `lucide-react` icons.
- Always check for `Effect` patterns in the codebase before implementing logic.
- Ensure all new components are accessible (ARIA labels, keyboard navigation).

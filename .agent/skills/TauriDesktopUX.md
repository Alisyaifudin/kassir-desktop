# Native Desktop UX (Tauri)

The application should not feel like a website.

## 1. Interaction Rules
- **Text Selection**: Disable selection on UI elements (`select-none`) unless it's user-generated content or data the user needs to copy.
- **Context Menus**: Use Tauri's native context menu or a high-quality shadcn `ContextMenu`.
- **Drag & Drop**: If a file drop is needed, use `@tauri-apps/plugin-upload` patterns.

## 2. Visual Polish
- **Window Drag**: Use the `data-tauri-drag-region` attribute on custom title bars.
- **Transitions**: Every interaction should have a subtle micro-animation (e.g., `transition-all duration-200`).
- **Loading States**: Use "Skeleton" screens rather than spinning wheels for a more desktop-like feel.

## 3. IPC (Inner-Process Communication)
- Keep the frontend "thin." Complex computations or FS operations should be handled via Tauri Commands (`invoke`).

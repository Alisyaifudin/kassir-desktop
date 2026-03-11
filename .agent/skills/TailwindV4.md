# Tailwind CSS v4 Rules

Since we are using **Tailwind v4**, follow these new patterns.

## 1. No tailwind.config.js
Configuration is now handled directly in your CSS file using `@theme` and `@plugin`.
- Edit `src/index.css` to add custom colors or spacing.

## 2. Component Design
- Use the `@apply` directive sparingly. Prefer utility classes in the TSX for better "Vibe Coding" visibility.
- Use the new container query support (`@container`) if the layout needs to adapt to sidebar visibility.

## 3. Dynamic Styles
Use `clsx` and `tailwind-merge` (the `cn` utility) for every component to handle dynamic props safely.

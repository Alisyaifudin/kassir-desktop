import { render as renderRaw, type RenderOptions } from "@testing-library/react";
import { MemoryRouter } from "react-router";

/**
 * Wraps component in MemoryRouter for React Router context, then calls
 * @testing-library/react's render.
 */
export function render(ui: React.ReactElement, options?: RenderOptions) {
  return renderRaw(ui, { wrapper: MemoryRouter, ...options });
}

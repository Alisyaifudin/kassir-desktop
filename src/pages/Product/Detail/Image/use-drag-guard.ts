import { useCallback, useRef } from "react";

/**
 * Keeps a drag from also selecting the thumbnail it moved.
 *
 * Motion does not swallow the `click` that follows a drag, so the click landing
 * right after a drop has to be ignored by hand. The flag is cleared on the next
 * frame: that click fires before the browser paints, so it is already handled by
 * then, while a plain click never sets the flag in the first place.
 */
export function useDragGuard(onClick: () => void) {
  const dragged = useRef(false);

  const onDragStart = useCallback(() => {
    dragged.current = true;
  }, []);

  const onDragEnd = useCallback(() => {
    requestAnimationFrame(() => {
      dragged.current = false;
    });
  }, []);

  const handleClick = useCallback(() => {
    if (dragged.current) return;
    onClick();
  }, [onClick]);

  return { onDragStart, onDragEnd, handleClick };
}

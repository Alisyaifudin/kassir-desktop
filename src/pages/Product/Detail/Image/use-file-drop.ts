import { useCallback, useRef, useState } from "react";

/**
 * Drag and drop for files onto an element.
 *
 * Enter and leave are counted rather than toggled, because dragging over a child
 * fires a leave on the parent and would otherwise strobe the highlight. Same shape
 * as the upload zones in `Setting/Data`.
 */
export function useFileDrop(onFiles: (files: File[]) => void) {
  const depth = useRef(0);
  const [active, setActive] = useState(false);

  const onDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    depth.current += 1;
    setActive(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    depth.current -= 1;
    if (depth.current <= 0) {
      depth.current = 0;
      setActive(false);
    }
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
    if (depth.current === 0) {
      depth.current = 1;
      setActive(true);
    }
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      depth.current = 0;
      setActive(false);
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) onFiles(files);
    },
    [onFiles],
  );

  return { active, handlers: { onDragEnter, onDragLeave, onDragOver, onDrop } } as const;
}

import { useRef, useLayoutEffect, useState } from "react";
import { Input } from "./ui/input";

export function NumberField({
  value,
  onValueChange,
  ...props
}: React.ComponentProps<"input"> & { onValueChange: (value: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [caretPos, setCaretPos] = useState<number | null>(null);

  // Format the number with Indonesian locale (e.g., 100000 -> 100.000)
  const formattedValue = value === "" ? "" : Number(value).toLocaleString("id-ID");

  // Apply caret position after render
  useLayoutEffect(() => {
    if (caretPos !== null && inputRef.current) {
      inputRef.current.setSelectionRange(caretPos, caretPos);
      setCaretPos(null); // Reset after applying
    }
  }, [formattedValue, caretPos]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const rawValue = input.value;
    if (rawValue === "") {
      setCaretPos(0);
      onValueChange("");
      return;
    }
    const selectionStart = input.selectionStart || 0;

    // Remove all thousand separators and parse
    const cleanValue = rawValue.replaceAll(".", "");
    const num = Number(cleanValue);

    if (isNaN(num)) return;

    // Calculate new caret position
    const newFormatted = num.toLocaleString("id-ID");
    const newCaretPos = calculateNewCaretPos(rawValue, selectionStart, newFormatted);

    setCaretPos(newCaretPos);
    onValueChange(String(num));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const selectionStart = input.selectionStart || 0;
    const selectionEnd = input.selectionEnd || 0;

    // Handle Delete key (Delete . should delete next character)
    if (e.key === "Delete" || e.key === "Del") {
      const value = input.value;

      // If caret is right before a dot, skip the dot and delete next digit
      if (value[selectionStart] === "." && selectionStart === selectionEnd) {
        e.preventDefault();
        // Delete the character after the dot (skip the dot)
        const newValue = value.slice(0, selectionStart) + value.slice(selectionStart + 2);

        // Update value and caret
        const cleanValue = newValue.replaceAll(".", "");
        const num = Number(cleanValue);
        if (!isNaN(num)) {
          const newFormatted = num.toLocaleString("id-ID");
          const newCaretPos = calculateNewCaretPos(
            value,
            selectionStart,
            newFormatted,
            true, // deletion mode
          );
          setCaretPos(newCaretPos);
          onValueChange(String(num));
        }
      }
    }

    // Handle Backspace (optional: similar logic for consistency)
    if (e.key === "Backspace") {
      const value = input.value;

      // If caret is right after a dot, skip the dot and delete previous digit
      if (value[selectionStart - 1] === "." && selectionStart === selectionEnd) {
        e.preventDefault();
        const newValue = value.slice(0, selectionStart - 2) + value.slice(selectionStart);

        const cleanValue = newValue.replaceAll(".", "");
        const num = Number(cleanValue);
        if (!isNaN(num)) {
          const newFormatted = num.toLocaleString("id-ID");
          const newCaretPos = calculateNewCaretPos(value, selectionStart - 1, newFormatted, true);
          setCaretPos(newCaretPos);
          onValueChange(String(num));
        }
      }
    }
  }

  return (
    <Input
      ref={inputRef}
      type="text"
      inputMode="decimal"
      value={formattedValue}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      {...props}
    />
  );
}

// Helper to calculate where caret should be after formatting change
function calculateNewCaretPos(
  oldValue: string,
  oldCaretPos: number,
  newValue: string,
  isDeletion: boolean = false,
): number {
  // Count digits before caret in old value
  let digitsBeforeCaret = 0;
  for (let i = 0; i < oldCaretPos && i < oldValue.length; i++) {
    if (oldValue[i] !== ".") {
      digitsBeforeCaret++;
    }
  }

  // Find position in new value with same number of digits before it
  let newPos = 0;
  let digitsCounted = 0;

  while (newPos < newValue.length && digitsCounted < digitsBeforeCaret) {
    if (newValue[newPos] !== ".") {
      digitsCounted++;
    }
    newPos++;
  }

  // Adjust for edge cases
  if (isDeletion && newPos > 0 && newValue[newPos - 1] === ".") {
    newPos--; // Stay before the dot after deletion
  }

  return Math.min(newPos, newValue.length);
}

import * as PopoverPrimitive from "@radix-ui/react-popover";
import * as stylex from "@stylexjs/stylex";
import type { StyleXStyles } from "@stylexjs/stylex";
import type { Ref } from "react";

import { colors, sizes } from "~/tokens.stylex";

// ── Styles ───────────────────────────────────────────────────────────────────

const contentStyles = stylex.create({
  base: {
    zIndex: 50,
    width: sizes.popoverWidth,
    borderRadius: sizes.radiusMd,
    borderWidth: sizes.borderWidth,
    borderStyle: "solid",
    borderColor: colors.inputBorder,
    backgroundColor: colors.popover,
    padding: sizes.buttonPadX,
    color: colors.popoverForeground,
    boxShadow: colors.shadow,
    outline: "none",
  },
});

// ── Components ───────────────────────────────────────────────────────────────

const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;
const PopoverAnchor = PopoverPrimitive.Anchor;

type PopoverContentProps = {
  style?: StyleXStyles;
  ref?: Ref<HTMLDivElement>;
  align?: "center" | "start" | "end";
  sideOffset?: number;
};

function PopoverContent({
  style,
  ref,
  align = "center",
  sideOffset = 4,
  ...props
}: PopoverContentProps) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        ref={ref}
        align={align}
        sideOffset={sideOffset}
        {...stylex.props([contentStyles.base, style] as StyleXStyles)}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor };

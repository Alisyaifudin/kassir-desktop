import * as React from "react"
import * as SeparatorPrimitive from "@radix-ui/react-separator"
import * as stylex from "@stylexjs/stylex"
import type { StyleXStyles } from "@stylexjs/stylex"
import type { Ref } from "react"

import { colors, sizes } from "~/tokens.stylex"

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = stylex.create({
  base: {
    flexShrink: 0,
    backgroundColor: colors.border,
  },
  horizontal: {
    height: sizes.separatorHeight,
    width: "100%",
  },
  vertical: {
    height: "100%",
    width: sizes.separatorHeight,
  },
})

// ── Component ────────────────────────────────────────────────────────────────

type SeparatorProps = {
  style?: StyleXStyles
  ref?: Ref<HTMLDivElement>
  orientation?: "horizontal" | "vertical"
  decorative?: boolean
}

function Separator({
  style,
  ref,
  orientation = "horizontal",
  decorative = true,
  ...props
}: SeparatorProps) {
  const orientationStyle =
    orientation === "horizontal" ? styles.horizontal : styles.vertical

  return (
    <SeparatorPrimitive.Root
      ref={ref}
      decorative={decorative}
      orientation={orientation}
      {...stylex.props([styles.base, orientationStyle, style] as StyleXStyles)}
      {...props}
    />
  )
}
Separator.displayName = SeparatorPrimitive.Root.displayName

export { Separator }

import * as stylex from "@stylexjs/stylex"
import type { StyleXStyles } from "@stylexjs/stylex"
import type { Ref } from "react"

import { Block } from "../block/block"
import { colors, sizes } from "~/tokens.stylex"

// ── Styles ───────────────────────────────────────────────────────────────────

const pulse = stylex.keyframes({
  "50%": { opacity: 0.5 },
})

const styles = stylex.create({
  base: {
    backgroundColor: colors.muted,
    borderRadius: sizes.radiusMd,
    animationName: pulse,
    animationDuration: "2s",
    animationTimingFunction: "cubic-bezier(0.4, 0, 0.6, 1)",
    animationIterationCount: "infinite",
  },
})

// ── Component ────────────────────────────────────────────────────────────────

type SkeletonProps = {
  style?: StyleXStyles
  ref?: Ref<HTMLDivElement>
}

export function Skeleton({ style, ref, ...props }: SkeletonProps) {
  return (
    <Block
      ref={ref}
      data-slot="skeleton"
      style={[styles.base, style] as StyleXStyles}
      {...props}
    />
  )
}

import * as stylex from "@stylexjs/stylex";
import type { StyleXStyles } from "@stylexjs/stylex";

import { colors, sizes } from "~/tokens.stylex";
import { Block } from "../block/block";

// ── Styles ───────────────────────────────────────────────────────────────────

const progressIndeterminate = stylex.keyframes({
  from: { transform: "translateX(-100%)" },
  to: { transform: "translateX(400%)" },
});

const styles = stylex.create({
  track: {
    height: sizes.gapSm,
    width: "100%",
    overflow: "hidden",
    borderRadius: sizes.radiusFull,
    backgroundColor: colors.muted,
  },
  fill: {
    height: "100%",
    width: "var(--progress-width)",
    borderRadius: sizes.radiusFull,
    backgroundColor: colors.primary,
    transitionProperty: "all",
    transitionDuration: "300ms",
    transitionTimingFunction: "ease-out",
  },
  indeterminateFill: {
    height: "100%",
    width: "33.333%",
    borderRadius: sizes.radiusFull,
    backgroundColor: colors.primary,
    animationName: progressIndeterminate,
    animationDuration: "1.5s",
    animationTimingFunction: "ease-in-out",
    animationIterationCount: "infinite",
  },
});

// ── Components ───────────────────────────────────────────────────────────────

type ProgressProps = {
  value: number;
  max: number;
  style?: StyleXStyles;
};

export function Progress({ value, max, style }: ProgressProps) {
  const pct = max === 0 ? 0 : Math.min(100, Math.round((value / max) * 100));

  return (
    <Block
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      style={[styles.track, style] as StyleXStyles}
    >
      <Block
        style={styles.fill}
        cssVars={{
          "--progress-width": `${pct}%`,
        }}
      />
    </Block>
  );
}

type ProgressIndeterminateProps = {
  style?: StyleXStyles;
};

export function ProgressIndeterminate({ style }: ProgressIndeterminateProps) {
  return (
    <Block role="progressbar" aria-label="Mengunduh" style={[styles.track, style] as StyleXStyles}>
      <Block style={styles.indeterminateFill} />
    </Block>
  );
}

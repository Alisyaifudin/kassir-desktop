import * as stylex from "@stylexjs/stylex";
import type { StyleXStyles } from "@stylexjs/stylex";
import type { ReactNode, Ref } from "react";

import { Label as LabelBase } from "../block/label";
import { sizes } from "~/tokens.stylex";

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = stylex.create({
  base: {
    fontSize: sizes.textSm,
    lineHeight: 1,
  },
});

// ── Component ────────────────────────────────────────────────────────────────

type LabelProps = {
  style?: StyleXStyles;
  children?: ReactNode;
  ref?: Ref<HTMLLabelElement>;
};

export function Label({ style, children, ref, ...props }: LabelProps) {
  return (
    <LabelBase
      ref={ref}
      style={[styles.base, style] as StyleXStyles}
      {...props}
    >
      {children}
    </LabelBase>
  );
}

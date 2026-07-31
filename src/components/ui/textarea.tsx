import * as stylex from "@stylexjs/stylex";
import type { StyleXStyles } from "@stylexjs/stylex";
import type { Ref } from "react";
import { TextareaBase } from "../block/textarea";
import { colors, sizes } from "~/tokens.stylex";

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = stylex.create({
  base: {
    display: "flex",
    minHeight: sizes.textareaMinHeight,
    width: "100%",
    borderRadius: sizes.radiusMd,
    borderWidth: sizes.borderWidth,
    borderStyle: "solid",
    borderColor: colors.inputBorder,
    backgroundColor: "transparent",
    paddingLeft: sizes.inputPadX,
    paddingRight: sizes.inputPadX,
    paddingTop: sizes.gapSm,
    paddingBottom: sizes.gapSm,
    boxShadow: colors.shadowSm,
    fontSize: sizes.textSm,
    ":focus-visible": {
      outline: "none",
      boxShadow: `0 0 0 1px ${colors.ring}`,
    },
    ":disabled": {
      cursor: "not-allowed",
      opacity: 0.5,
    },
    "::placeholder": {
      color: colors.mutedForeground,
    },
  },
});

// ── Component ────────────────────────────────────────────────────────────────

type TextareaProps = {
  style?: StyleXStyles;
  ref?: Ref<HTMLTextAreaElement>;
};

export function Textarea({ style, ref, ...props }: TextareaProps) {
  return <TextareaBase ref={ref} style={[styles.base, style] as StyleXStyles} {...props} />;
}

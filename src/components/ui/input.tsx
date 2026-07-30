import * as React from "react";
import * as stylex from "@stylexjs/stylex";
import type { StyleXStyles } from "@stylexjs/stylex";

import { InputText } from "../block/input";
import { colors, sizes } from "~/tokens.stylex";

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = stylex.create({
  base: {
    display: "flex",
    width: "100%",
    borderRadius: sizes.radiusMd,
    borderWidth: sizes.borderWidth,
    borderStyle: "solid",
    borderColor: colors.inputBorder,
    backgroundColor: "transparent",
    paddingLeft: sizes.inputPadX,
    paddingRight: sizes.inputPadX,
    paddingTop: sizes.inputPadY,
    paddingBottom: sizes.inputPadY,
    boxShadow: colors.shadowSm,
    transitionProperty: "color",
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

type InputProps = {
  style?: StyleXStyles;
  ref?: React.Ref<HTMLInputElement>;
  id?: string;
  onChange?: (value: string) => void;
  value?: string;
  disabled?: boolean
};

const Input = ({ style, ref, ...props }: InputProps) => {
  return <InputText ref={ref} style={[styles.base, style] as StyleXStyles} {...props} />;
};
Input.displayName = "Input";

export { Input };

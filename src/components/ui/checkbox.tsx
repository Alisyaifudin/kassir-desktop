import type { ReactNode, Ref } from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import * as stylex from "@stylexjs/stylex";
import type { StyleXStyles } from "@stylexjs/stylex";
import { Check } from "lucide-react";
import { colors, sizes } from "~/tokens.stylex";

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = stylex.create({
  root: {
    height: sizes.checkboxSize,
    width: sizes.checkboxSize,
    flexShrink: 0,
    borderRadius: sizes.radiusSm,
    borderWidth: sizes.borderWidth,
    borderStyle: "solid",
    borderColor: colors.primary,
    boxShadow: colors.shadow,
    background: "none",
    padding: 0,
    cursor: "pointer",
    ":focus-visible": {
      outline: "none",
      boxShadow: `0 0 0 1px ${colors.ring}`,
    },
    ":disabled": {
      cursor: "not-allowed",
      opacity: 0.5,
    },
  },
  indicator: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "currentColor",
  },
  check: {
    height: sizes.checkboxSize,
    width: sizes.checkboxSize,
  },
});

// ── Component ────────────────────────────────────────────────────────────────

type CheckboxProps = {
  ref?: Ref<HTMLButtonElement>;
  style?: StyleXStyles;
  children?: ReactNode;
};

const Checkbox = ({ style, ref, ...props }: CheckboxProps) => {
  const merged = [styles.root, style] as StyleXStyles;
  return (
    <CheckboxPrimitive.Root
      ref={ref}
      {...stylex.props(merged)}
      {...props}
      data-checkbox-root=""
    >
      <CheckboxPrimitive.Indicator {...stylex.props(styles.indicator)}>
        <Check {...stylex.props(styles.check)} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
};

export { Checkbox };

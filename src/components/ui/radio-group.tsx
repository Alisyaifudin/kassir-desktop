import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { Circle } from "lucide-react";
import * as stylex from "@stylexjs/stylex";
import type { StyleXStyles } from "@stylexjs/stylex";
import type { Ref } from "react";

import { colors, sizes } from "~/tokens.stylex";

// ── Styles ───────────────────────────────────────────────────────────────────

const groupStyles = stylex.create({
  base: {
    display: "grid",
    gap: sizes.gap,
  },
});

const itemStyles = stylex.create({
  base: {
    aspectRatio: 1,
    height: sizes.iconSize,
    width: sizes.iconSize,
    borderRadius: sizes.radiusFull,
    borderWidth: sizes.borderWidth,
    borderStyle: "solid",
    borderColor: colors.primary,
    color: colors.primary,
    boxShadow: colors.shadow,
    background: "none",
    padding: 0,
    cursor: "pointer",
    ":focus": {
      outline: "none",
    },
    ":focus-visible": {
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
  },
  icon: {
    height: sizes.textSm,
    width: sizes.textSm,
    fill: colors.primary,
    color: colors.primary,
  },
});

// ── Components ───────────────────────────────────────────────────────────────

type RadioGroupProps = {
  style?: StyleXStyles;
  ref?: Ref<HTMLDivElement>;
};

function RadioGroup({ style, ref, ...props }: RadioGroupProps) {
  return (
    <RadioGroupPrimitive.Root
      ref={ref}
      {...stylex.props([groupStyles.base, style] as StyleXStyles)}
      {...props}
    />
  );
}
RadioGroup.displayName = RadioGroupPrimitive.Root.displayName;

type RadioGroupItemProps = {
  style?: StyleXStyles;
  ref?: Ref<HTMLButtonElement>;
  value: string;
};

function RadioGroupItem({ style, ref, ...props }: RadioGroupItemProps) {
  return (
    <RadioGroupPrimitive.Item
      ref={ref}
      {...stylex.props([itemStyles.base, style] as StyleXStyles)}
      {...props}
    >
      <RadioGroupPrimitive.Indicator {...stylex.props(itemStyles.indicator)}>
        <Circle {...stylex.props(itemStyles.icon)} />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  );
}
RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName;

export { RadioGroup, RadioGroupItem };

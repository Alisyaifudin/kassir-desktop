import * as stylex from "@stylexjs/stylex";
import type { StyleXStyles } from "@stylexjs/stylex";
import type { ReactNode, Ref } from "react";

type LabelProps = {
  style?: StyleXStyles;
  children?: ReactNode;
  ref?: Ref<HTMLLabelElement>;
  for?: string;
};

export function Label({ style, children, ref, for: f, ...rest }: LabelProps) {
  return (
    <label htmlFor={f} ref={ref} {...stylex.props(style)} {...rest}>
      {children}
    </label>
  );
}


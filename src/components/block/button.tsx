import * as stylex from "@stylexjs/stylex";
import type { StyleXStyles } from "@stylexjs/stylex";
import type { ReactNode } from "react";

type ButtonProps = {
  style?: StyleXStyles;
  children?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  ref?: React.Ref<HTMLButtonElement>;
};

export function ButtonBase({
  style,
  children,
  onClick,
  disabled,
  ref,
}: ButtonProps) {
  return (
    <button
      {...stylex.props(style)}
      onClick={onClick}
      disabled={disabled}
      ref={ref}
      type="button"
    >
      {children}
    </button>
  );
}

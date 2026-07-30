import * as stylex from "@stylexjs/stylex";
import type { StyleXStyles } from "@stylexjs/stylex";
import type { ReactNode } from "react";

type ButtonProps = {
  style?: StyleXStyles;
  children?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  cssVars?: Record<string, number | string>;
  ref?: React.Ref<HTMLButtonElement>;
};

export function ButtonBase({ style, children, onClick, disabled, ref, cssVars }: ButtonProps) {
  const { style: sxStyle, ...rest } = stylex.props(style);
  return (
    <button
      {...rest}
      style={{
        ...cssVars,
        ...sxStyle,
      }}
      onClick={onClick}
      disabled={disabled}
      ref={ref}
      type="button"
    >
      {children}
    </button>
  );
}

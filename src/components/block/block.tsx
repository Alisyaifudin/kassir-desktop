import * as stylex from "@stylexjs/stylex";
import type { StyleXStyles } from "@stylexjs/stylex";
import type { ReactNode } from "react";

type Props = {
  style?: StyleXStyles;
  children?: ReactNode;
  ref?: React.Ref<HTMLDivElement>;
  role?: "progressbar" | "group";
  cssVars?: Record<string, string | number>;
  "aria-valuenow"?: number;
  "aria-valuemin"?: number;
  "aria-valuemax"?: number;
  "aria-label"?: string;
  onClick?: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
};

export function Block({ children, ref, style, cssVars, ...props }: Props) {
  const { style: sxStyle, ...rest } = stylex.props(style);
  return (
    <div ref={ref} style={{ ...cssVars, ...sxStyle }} {...rest} {...props}>
      {children}
    </div>
  );
}

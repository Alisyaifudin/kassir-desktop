import * as stylex from "@stylexjs/stylex";
import type { StyleXStyles } from "@stylexjs/stylex";
import type { ReactNode } from "react";

type BlockProps = {
  id?: string;
  style?: StyleXStyles;
  children?: ReactNode;
  ref?: React.Ref<HTMLDivElement>;
  role?: "progressbar" | "group";
  cssVars?: Record<string, string | number | undefined>;
  onClick?: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
} & React.AriaAttributes;

export function Block({ children, ref, style, cssVars, ...props }: BlockProps) {
  const { style: sxStyle, ...rest } = stylex.props(style);
  return (
    <div ref={ref} style={{ ...cssVars, ...sxStyle }} {...rest} {...props}>
      {children}
    </div>
  );
}

type HeaderProps = {
  style?: StyleXStyles;
  children?: ReactNode;
  ref?: React.Ref<HTMLDivElement>;
};

export function Header({ children, ref, style, ...props }: HeaderProps) {
  return (
    <header ref={ref} {...stylex.props(style)} {...props}>
      {children}
    </header>
  );
}

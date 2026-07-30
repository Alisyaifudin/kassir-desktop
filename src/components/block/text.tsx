import * as stylex from "@stylexjs/stylex";
import type { StyleXStyles } from "@stylexjs/stylex";
import type { ReactNode, Ref } from "react";

type TextProps = {
  style?: StyleXStyles;
  children?: ReactNode;
  ref?: Ref<HTMLParagraphElement>;
};

export function Text({ style, children, ref, ...rest }: TextProps) {
  return (
    <p ref={ref} {...stylex.props(style)} {...rest}>
      {children}
    </p>
  );
}

type TextInlineProps = {
  style?: StyleXStyles;
  children?: ReactNode;
  ref?: Ref<HTMLSpanElement>;
};

export function TextInline({ style, children, ref, ...rest }: TextInlineProps) {
  return (
    <span ref={ref} {...stylex.props(style)} {...rest}>
      {children}
    </span>
  );
}

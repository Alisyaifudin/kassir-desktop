import * as stylex from "@stylexjs/stylex";
import type { StyleXStyles } from "@stylexjs/stylex";
import type { ReactNode, Ref } from "react";

type TextProps = {
  id?: string;
  style?: StyleXStyles;
  children?: ReactNode;
  ref?: Ref<HTMLParagraphElement>;
} & React.AriaAttributes;

export function Text({ style, children, ref, ...props }: TextProps) {
  return (
    <p ref={ref} {...stylex.props(style)} {...props}>
      {children}
    </p>
  );
}

type TextInlineProps = {
  id?: string;
  style?: StyleXStyles;
  children?: ReactNode;
  ref?: Ref<HTMLSpanElement>;
} & React.AriaAttributes;

export function Span({ style, children, ref, ...props }: TextInlineProps) {
  return (
    <span ref={ref} aria-hidden {...stylex.props(style)} {...props}>
      {children}
    </span>
  );
}

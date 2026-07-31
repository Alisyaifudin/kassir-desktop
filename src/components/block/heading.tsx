import * as stylex from "@stylexjs/stylex";
import type { StyleXStyles } from "@stylexjs/stylex";
import type { ReactNode, Ref } from "react";

type HeadingProps = {
  id?: string;
  style?: StyleXStyles;
  children?: ReactNode;
  ref?: Ref<HTMLHeadingElement>;
} & React.AriaAttributes;

export function H1({ style, children, ref, ...props }: HeadingProps) {
  return (
    <h1 ref={ref} {...stylex.props(style)} {...props}>
      {children}
    </h1>
  );
}

export function H2({ style, children, ref, ...props }: HeadingProps) {
  return (
    <h2 ref={ref} {...stylex.props(style)} {...props}>
      {children}
    </h2>
  );
}
export function H3({ style, children, ref, ...props }: HeadingProps) {
  return (
    <h3 ref={ref} {...stylex.props(style)} {...props}>
      {children}
    </h3>
  );
}
export function H4({ style, children, ref, ...props }: HeadingProps) {
  return (
    <h4 ref={ref} {...stylex.props(style)} {...props}>
      {children}
    </h4>
  );
}
export function H5({ style, children, ref, ...props }: HeadingProps) {
  return (
    <h5 ref={ref} {...stylex.props(style)} {...props}>
      {children}
    </h5>
  );
}

export function H6({ style, children, ref, ...props }: HeadingProps) {
  return (
    <h6 ref={ref} {...stylex.props(style)} {...props}>
      {children}
    </h6>
  );
}

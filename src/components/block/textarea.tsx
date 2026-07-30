import * as stylex from "@stylexjs/stylex";
import type { StyleXStyles } from "@stylexjs/stylex";
import type { Ref } from "react";

type TextareaProps = {
  style?: StyleXStyles;
  ref?: Ref<HTMLTextAreaElement>;
};

export function TextareaBase({ style, ref, ...rest }: TextareaProps) {
  return <textarea ref={ref} {...stylex.props(style)} {...rest} />;
}

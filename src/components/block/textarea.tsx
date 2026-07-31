import * as stylex from "@stylexjs/stylex";
import type { StyleXStyles } from "@stylexjs/stylex";
import type { Ref } from "react";

type TextareaProps = {
  id?: string;
  style?: StyleXStyles;
  ref?: Ref<HTMLTextAreaElement>;
} & React.AriaAttributes;

export function TextareaBase({ style, ref, ...props }: TextareaProps) {
  return <textarea ref={ref} {...stylex.props(style)} {...props} />;
}

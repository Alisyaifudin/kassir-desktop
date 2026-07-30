import { Text } from "./block/text";
import * as stylex from "@stylexjs/stylex";
import { colors, sizes } from "~/tokens.stylex";
import type { StyleXStyles } from "@stylexjs/stylex";

const localStyle = stylex.create({
  base: {
    color: colors.destructive,
    fontSize: sizes.textSm,
    lineHeight: sizes.lineHeightSm,
  },
});

type TextErrorProps = (
  | { children: string | null | undefined }
  | {
      when: boolean;
      children: string;
    }
) & { style?: StyleXStyles };

export function TextError(props: TextErrorProps) {
  if ("when" in props) {
    if (typeof props.when === "boolean") {
      if (props.when) {
        return <Text style={[localStyle.base, props.style]}>{props.children}</Text>;
      }
      return null;
    }
  } else {
    if (props.children === null || props.children === undefined || props.children === "")
      return null;
    return <Text style={[localStyle.base, props.style]}>{props.children}</Text>;
  }
}

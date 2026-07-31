import { memo } from "react";
import { Input } from "~/components/ui/input";
import * as stylex from "@stylexjs/stylex";
import { colors } from "~/tokens.stylex";

const styles = stylex.create({
  base: {
    backgroundColor: colors.background,
    borderColor: colors.border,
  },
});

type Props = {
  name: string;
  setName: (v: string) => void;
  disabled: boolean;
};

export const NameInput = memo(function NameInput({ name, setName, disabled }: Props) {
  return <Input disabled={disabled} value={name} onChange={setName} style={styles.base} />;
});

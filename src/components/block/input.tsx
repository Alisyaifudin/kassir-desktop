import * as stylex from "@stylexjs/stylex";
import type { StyleXStyles } from "@stylexjs/stylex";

type InputProps = {
  style?: StyleXStyles;
  ref?: React.Ref<HTMLInputElement>;
  id?: string;
  onChange?: (value: string) => void;
  value?: string;
  disabled?: boolean;
};

export function InputText({ style, ref, onChange, ...rest }: InputProps) {
  return (
    <input
      type="text"
      ref={ref}
      {...stylex.props(style)}
      onChange={(e) => onChange?.(e.currentTarget.value)}
      {...rest}
    />
  );
}

export function InputPassword({ style, ref, onChange, ...rest }: InputProps) {
  return (
    <input
      type="password"
      ref={ref}
      {...stylex.props(style)}
      onChange={(e) => onChange?.(e.currentTarget.value)}
      {...rest}
    />
  );
}

type InputFileProps = {
  style?: StyleXStyles;
  ref?: React.Ref<HTMLInputElement>;
  id?: string;
  onChange?: (file?: File) => void;
};

export function InputFile({ style, ref, onChange, ...rest }: InputFileProps) {
  return (
    <input
      type="file"
      ref={ref}
      {...stylex.props(style)}
      onChange={(e) => {
        const file = e.currentTarget.files?.[0];
        onChange?.(file);
      }}
      {...rest}
    />
  );
}

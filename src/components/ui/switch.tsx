import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"
import * as stylex from "@stylexjs/stylex"
import type { StyleXStyles } from "@stylexjs/stylex"
import type { Ref } from "react"

import { colors, sizes } from "~/tokens.stylex"

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = stylex.create({
  root: {
    display: "inline-flex",
    height: sizes.kbdHeight,
    width: sizes.iconButtonSize,
    flexShrink: 0,
    cursor: "pointer",
    alignItems: "center",
    borderRadius: sizes.radiusFull,
    borderWidth: "2px",
    borderStyle: "solid",
    borderColor: "transparent",
    boxShadow: colors.shadowSm,
    transitionProperty: "color, background-color, border-color",
    ":focus-visible": {
      outline: "none",
      boxShadow: `0 0 0 2px ${colors.ring}, 0 0 0 4px ${colors.background}`,
    },
    ":disabled": {
      cursor: "not-allowed",
      opacity: 0.5,
    },
  },
  thumb: {
    display: "block",
    height: sizes.iconSize,
    width: sizes.iconSize,
    borderRadius: sizes.radiusFull,
    backgroundColor: colors.background,
    boxShadow: colors.shadow,
    transitionProperty: "transform",
    pointerEvents: "none",
  },
})

// State-dependent styles merged at runtime
const checkedRoot = stylex.create({
  checked: {
    backgroundColor: colors.primary,
  },
  unchecked: {
    backgroundColor: colors.inputBorder,
  },
})

const checkedThumb = stylex.create({
  checked: {
    transform: `translateX(${sizes.iconSize})`,
  },
  unchecked: {
    transform: "translateX(0)",
  },
})

// ── Component ────────────────────────────────────────────────────────────────

type SwitchProps = {
  style?: StyleXStyles
  ref?: Ref<HTMLButtonElement>
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
}

function Switch({
  style,
  ref,
  checked: controlledChecked,
  defaultChecked,
  onCheckedChange,
  ...props
}: SwitchProps) {
  const [uncontrolledChecked, setUncontrolledChecked] = React.useState(
    defaultChecked ?? false,
  )
  const isControlled = controlledChecked !== undefined
  const checked = isControlled ? controlledChecked : uncontrolledChecked

  const handleCheckedChange = (value: boolean) => {
    if (!isControlled) setUncontrolledChecked(value)
    onCheckedChange?.(value)
  }

  const stateKey = checked ? "checked" : "unchecked"

  return (
    <SwitchPrimitives.Root
      ref={ref}
      checked={checked}
      onCheckedChange={handleCheckedChange}
      {...stylex.props([
        styles.root,
        checkedRoot[stateKey],
        style,
      ] as StyleXStyles)}
      {...props}
    >
      <SwitchPrimitives.Thumb
        {...stylex.props([styles.thumb, checkedThumb[stateKey]] as StyleXStyles)}
      />
    </SwitchPrimitives.Root>
  )
}
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }

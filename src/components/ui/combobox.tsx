"use client";

import { useRef } from "react";
import { Combobox as ComboboxPrimitive } from "@base-ui/react";
import { CheckIcon, ChevronDownIcon, XIcon } from "lucide-react";

import * as stylex from "@stylexjs/stylex";
import type { StyleXStyles } from "@stylexjs/stylex";
import { colors, sizes } from "~/tokens.stylex";
import { Icon } from "~/components/ui/icon";
import { InputGroup, InputGroupAddon, InputGroupInput } from "~/components/ui/input-group";

// ── Styles ───────────────────────────────────────────────────────────────────

const comboboxInputGroupStyle = stylex.create({
  inputGroup: {
    width: "auto",
  },
});

const triggerIcon = stylex.create({
  base: {
    pointerEvents: "none",
    width: sizes.iconSize,
    height: sizes.iconSize,
    color: colors.mutedForeground,
  },
});

const clearIcon = stylex.create({
  base: {
    pointerEvents: "none",
  },
});

const contentPositioner = stylex.create({
  base: {
    isolation: "isolate",
    zIndex: 50,
  },
});

const indicatorSpan = stylex.create({
  base: {
    pointerEvents: "none",
    position: "absolute",
    right: sizes.gapSm,
    display: "flex",
    width: sizes.iconSize,
    height: sizes.iconSize,
    alignItems: "center",
    justifyContent: "center",
  },
});

const checkIcon = stylex.create({
  base: {
    pointerEvents: "none",
    width: sizes.iconSize,
    height: sizes.iconSize,
  },
});

const chipRemove = stylex.create({
  base: {
    marginLeft: `-${sizes.inputPadY}`,
    opacity: 0.5,
    ":hover": {
      opacity: 1,
    },
  },
});

const chipRemoveIcon = stylex.create({
  base: {
    pointerEvents: "none",
  },
});

const styles = stylex.create({
  label: {
    paddingLeft: sizes.gapSm,
    paddingRight: sizes.gapSm,
    paddingTop: sizes.selectPadY,
    paddingBottom: sizes.selectPadY,
    fontSize: sizes.textXs,
    color: colors.mutedForeground,
  },
  empty: {
    display: "none",
    width: "100%",
    justifyContent: "center",
    paddingTop: sizes.gapSm,
    paddingBottom: sizes.gapSm,
    textAlign: "center",
    fontSize: sizes.textSm,
    color: colors.mutedForeground,
  },
  separator: {
    marginLeft: `-${sizes.inputPadY}`,
    marginRight: `-${sizes.inputPadY}`,
    marginTop: sizes.inputPadY,
    marginBottom: sizes.inputPadY,
    height: sizes.separatorHeight,
    backgroundColor: colors.border,
  },
  chipsInput: {
    minWidth: sizes.comboboxChipMinWidth,
    flex: 1,
    outline: "none",
  },
  chips: {
    display: "flex",
    minHeight: sizes.inputHeight,
    flexWrap: "wrap",
    alignItems: "center",
    gap: sizes.selectPadY,
    borderRadius: sizes.radiusMd,
    borderWidth: sizes.borderWidth,
    borderStyle: "solid",
    borderColor: colors.inputBorder,
    backgroundColor: "transparent",
    backgroundClip: "padding-box",
    paddingLeft: sizes.buttonSmPadX,
    paddingRight: sizes.buttonSmPadX,
    paddingTop: sizes.selectPadY,
    paddingBottom: sizes.selectPadY,
    fontSize: sizes.textSm,
    boxShadow: colors.shadowSm,
    transitionProperty: "color, box-shadow",
  },
  chip: {
    display: "flex",
    height: sizes.comboboxChipHeight,
    width: "fit-content",
    alignItems: "center",
    justifyContent: "center",
    gap: sizes.gapSm,
    borderRadius: sizes.radiusSm,
    backgroundColor: colors.muted,
    paddingLeft: sizes.selectPadY,
    paddingRight: sizes.selectPadY,
    fontSize: sizes.textXs,
    fontWeight: 500,
    whiteSpace: "nowrap",
    color: colors.foreground,
  },
  list: {
    overflowY: "auto",
    padding: sizes.inputPadY,
  },
  item: {
    position: "relative",
    display: "flex",
    width: "100%",
    cursor: "default",
    alignItems: "center",
    gap: sizes.gapSm,
    borderRadius: sizes.radiusSm,
    paddingTop: sizes.selectPadY,
    paddingBottom: sizes.selectPadY,
    paddingRight: sizes.selectItemPadRight,
    paddingLeft: sizes.gapSm,
    fontSize: sizes.textSm,
    outline: "none",
    userSelect: "none",
  },
});

// ── Components ───────────────────────────────────────────────────────────────

const Combobox = ComboboxPrimitive.Root;

function ComboboxValue({
  style,
  ...props
}: Omit<ComboboxPrimitive.Value.Props, "className" | "style"> & {
  style?: StyleXStyles;
}) {
  return <ComboboxPrimitive.Value data-slot="combobox-value" {...stylex.props(style)} {...props} />;
}

type ComboboxTriggerProps = {
  style?: StyleXStyles;
  render?: React.ReactElement;
  children?: React.ReactNode;
  disabled?: boolean;
};

function ComboboxTrigger({ style, children, render, ...props }: ComboboxTriggerProps) {
  return (
    <ComboboxPrimitive.Trigger
      data-slot="combobox-trigger"
      data-combobox-trigger=""
      render={render}
      {...stylex.props(style)}
      {...props}
    >
      {children}
      <ChevronDownIcon data-slot="combobox-trigger-icon" {...stylex.props(triggerIcon.base)} />
    </ComboboxPrimitive.Trigger>
  );
}

type ComboboxClearProps = {
  style?: StyleXStyles;
  disabled?: boolean;
};

function ComboboxClear({ style, ...props }: ComboboxClearProps) {
  return (
    <ComboboxPrimitive.Clear
      data-slot="combobox-clear"
      render={<Icon variant="ghost" />}
      {...stylex.props(style)}
      {...props}
    >
      <XIcon {...stylex.props(clearIcon.base)} />
    </ComboboxPrimitive.Clear>
  );
}

type ComboboxInputProps = {
  style?: StyleXStyles;
  children?: React.ReactNode;
  disabled?: boolean;
  showTrigger?: boolean;
  showClear?: boolean;
};

function ComboboxInput({
  style,
  children,
  disabled = false,
  showTrigger = true,
  showClear = false,
  ...props
}: ComboboxInputProps) {
  return (
    <InputGroup style={[comboboxInputGroupStyle.inputGroup, style] as StyleXStyles}>
      <ComboboxPrimitive.Input render={<InputGroupInput disabled={disabled} />} {...props} />
      <InputGroupAddon align="inline-end">
        {showTrigger && !showClear && (
          <ComboboxTrigger
            render={<Icon variant="ghost" />}
            data-slot="input-group-button"
            disabled={disabled}
          />
        )}
        {showClear && <ComboboxClear disabled={disabled} />}
      </InputGroupAddon>
      {children}
    </InputGroup>
  );
}

type ComboboxContentProps = {
  style?: StyleXStyles;
  children?: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  sideOffset?: number;
  align?: "start" | "center" | "end";
  alignOffset?: number;
  anchor?: React.RefObject<HTMLElement | null>;
};

function ComboboxContent({
  style,
  children,
  side = "bottom",
  sideOffset = 6,
  align = "start",
  alignOffset = 0,
  anchor,
  ...props
}: ComboboxContentProps) {
  return (
    <ComboboxPrimitive.Portal>
      <ComboboxPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        anchor={anchor}
        {...stylex.props(contentPositioner.base)}
      >
        <ComboboxPrimitive.Popup
          data-slot="combobox-content"
          data-combobox-content=""
          data-chips={!!anchor}
          {...stylex.props(style)}
          {...props}
        >
          {children}
        </ComboboxPrimitive.Popup>
      </ComboboxPrimitive.Positioner>
    </ComboboxPrimitive.Portal>
  );
}

type ComboboxListProps = {
  style?: StyleXStyles;
  children?: React.ReactNode;
};

function ComboboxList({ style, ...props }: ComboboxListProps) {
  return (
    <ComboboxPrimitive.List
      data-slot="combobox-list"
      data-combobox-list=""
      {...stylex.props([styles.list, style] as StyleXStyles)}
      {...props}
    />
  );
}

type ComboboxItemProps = {
  style?: StyleXStyles;
  children?: React.ReactNode;
};

function ComboboxItem({ style, children, ...props }: ComboboxItemProps) {
  return (
    <ComboboxPrimitive.Item
      data-slot="combobox-item"
      data-combobox-item=""
      {...stylex.props([styles.item, style] as StyleXStyles)}
      {...props}
    >
      {children}
      <ComboboxPrimitive.ItemIndicator
        data-slot="combobox-item-indicator"
        render={<span {...stylex.props(indicatorSpan.base)} />}
      >
        <CheckIcon {...stylex.props(checkIcon.base)} />
      </ComboboxPrimitive.ItemIndicator>
    </ComboboxPrimitive.Item>
  );
}

type ComboboxGroupProps = {
  style?: StyleXStyles;
  children?: React.ReactNode;
};

function ComboboxGroup({ style, ...props }: ComboboxGroupProps) {
  return <ComboboxPrimitive.Group data-slot="combobox-group" {...stylex.props(style)} {...props} />;
}

type ComboboxLabelProps = {
  style?: StyleXStyles;
  children?: React.ReactNode;
};

function ComboboxLabel({ style, ...props }: ComboboxLabelProps) {
  return (
    <ComboboxPrimitive.GroupLabel
      data-slot="combobox-label"
      {...stylex.props([styles.label, style] as StyleXStyles)}
      {...props}
    />
  );
}

function ComboboxCollection({ ...props }: ComboboxPrimitive.Collection.Props) {
  return <ComboboxPrimitive.Collection data-slot="combobox-collection" {...props} />;
}

type ComboboxEmptyProps = {
  style?: StyleXStyles;
  children?: React.ReactNode;
};

function ComboboxEmpty({ style, ...props }: ComboboxEmptyProps) {
  return (
    <ComboboxPrimitive.Empty
      data-slot="combobox-empty"
      data-combobox-empty=""
      {...stylex.props([styles.empty, style] as StyleXStyles)}
      {...props}
    />
  );
}

type ComboboxSeparatorProps = {
  style?: StyleXStyles;
};

function ComboboxSeparator({ style, ...props }: ComboboxSeparatorProps) {
  return (
    <ComboboxPrimitive.Separator
      data-slot="combobox-separator"
      {...stylex.props([styles.separator, style] as StyleXStyles)}
      {...props}
    />
  );
}

type ComboboxChipsProps = {
  style?: StyleXStyles;
  children?: React.ReactNode;
};

function ComboboxChips({ style, ...props }: ComboboxChipsProps) {
  return (
    <ComboboxPrimitive.Chips
      data-slot="combobox-chips"
      data-combobox-chips=""
      {...stylex.props([styles.chips, style] as StyleXStyles)}
      {...props}
    />
  );
}

type ComboboxChipProps = {
  style?: StyleXStyles;
  children?: React.ReactNode;
  showRemove?: boolean;
};

function ComboboxChip({ style, children, showRemove = true, ...props }: ComboboxChipProps) {
  return (
    <ComboboxPrimitive.Chip
      data-slot="combobox-chip"
      data-combobox-chip=""
      {...stylex.props([styles.chip, style] as StyleXStyles)}
      {...props}
    >
      {children}
      {showRemove && (
        <ComboboxPrimitive.ChipRemove
          render={<Icon variant="ghost" />}
          {...stylex.props(chipRemove.base)}
          data-slot="combobox-chip-remove"
        >
          <XIcon {...stylex.props(chipRemoveIcon.base)} />
        </ComboboxPrimitive.ChipRemove>
      )}
    </ComboboxPrimitive.Chip>
  );
}

type ComboboxChipsInputProps = {
  style?: StyleXStyles;
  children?: React.ReactNode;
};

function ComboboxChipsInput({ style, ...props }: ComboboxChipsInputProps) {
  return (
    <ComboboxPrimitive.Input
      data-slot="combobox-chip-input"
      {...stylex.props([styles.chipsInput, style] as StyleXStyles)}
      {...props}
    />
  );
}

function useComboboxAnchor() {
  return useRef<HTMLDivElement | null>(null);
}

export {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxGroup,
  ComboboxLabel,
  ComboboxCollection,
  ComboboxEmpty,
  ComboboxSeparator,
  ComboboxChips,
  ComboboxChip,
  ComboboxChipsInput,
  ComboboxTrigger,
  ComboboxValue,
  useComboboxAnchor,
};

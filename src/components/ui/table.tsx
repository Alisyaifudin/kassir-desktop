import * as stylex from "@stylexjs/stylex"
import type { StyleXStyles } from "@stylexjs/stylex"
import type { Ref } from "react"

import { colors, sizes } from "~/tokens.stylex"
import { Block } from "../block/block"

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = stylex.create({
  wrapper: {
    position: "relative",
    width: "100%",
    overflowY: "auto",
    maxHeight: "100%",
    height: "auto",
  },
  table: {
    width: "100%",
    captionSide: "bottom",
    borderCollapse: "collapse",
    height: "auto",
  },
  header: {
    position: "sticky",
    top: 0,
    zIndex: 10,
    backgroundColor: colors.primaryForeground,
  },
  body: {
    height: "auto",
  },
  footer: {
    borderTopWidth: sizes.borderWidth,
    borderTopStyle: "solid",
    borderTopColor: colors.border,
    backgroundColor: colors.muted,
    fontWeight: 500,
  },
  row: {
    height: "auto",
    borderBottomWidth: sizes.borderWidth,
    borderBottomStyle: "solid",
    borderBottomColor: colors.border,
    transitionProperty: "color",
    ":hover": {
      backgroundColor: colors.muted,
    },
  },
  head: {
    height: sizes.tableHeaderHeight,
    paddingLeft: sizes.inputPadY,
    paddingRight: sizes.inputPadY,
    textAlign: "left",
    verticalAlign: "middle",
    fontWeight: 500,
    color: colors.mutedForeground,
  },
  cell: {
    paddingTop: sizes.gap,
    paddingBottom: sizes.gap,
    paddingLeft: sizes.inputPadY,
    paddingRight: sizes.inputPadY,
    verticalAlign: "middle",
  },
  caption: {
    marginTop: sizes.buttonPadX,
    fontSize: sizes.textSm,
    color: colors.mutedForeground,
  },
})

// ── Components ───────────────────────────────────────────────────────────────

type TableProps = {
  style?: StyleXStyles
  ref?: Ref<HTMLTableElement>
}

function Table({ style, ref, ...props }: TableProps) {
  return (
    <Block style={(styles.wrapper)}>
      <table
        ref={ref}
        {...stylex.props([styles.table, style] as StyleXStyles)}
        {...props}
      />
    </Block>
  )
}
Table.displayName = "Table"

type TableHeaderProps = {
  style?: StyleXStyles
  ref?: Ref<HTMLTableSectionElement>
}

function TableHeader({ style, ref, ...props }: TableHeaderProps) {
  return (
    <thead
      ref={ref}
      {...stylex.props([styles.header, style] as StyleXStyles)}
      {...props}
    />
  )
}
TableHeader.displayName = "TableHeader"

type TableBodyProps = {
  style?: StyleXStyles
  ref?: Ref<HTMLTableSectionElement>
}

function TableBody({ style, ref, ...props }: TableBodyProps) {
  return (
    <tbody
      ref={ref}
      {...stylex.props([styles.body, style] as StyleXStyles)}
      {...props}
    />
  )
}
TableBody.displayName = "TableBody"

type TableFooterProps = {
  style?: StyleXStyles
  ref?: Ref<HTMLTableSectionElement>
}

function TableFooter({ style, ref, ...props }: TableFooterProps) {
  return (
    <tfoot
      ref={ref}
      {...stylex.props([styles.footer, style] as StyleXStyles)}
      {...props}
    />
  )
}
TableFooter.displayName = "TableFooter"

type TableRowProps = {
  style?: StyleXStyles
  ref?: Ref<HTMLTableRowElement>
}

function TableRow({ style, ref, ...props }: TableRowProps) {
  return (
    <tr
      ref={ref}
      {...stylex.props([styles.row, style] as StyleXStyles)}
      {...props}
    />
  )
}
TableRow.displayName = "TableRow"

type TableHeadProps = {
  style?: StyleXStyles
  ref?: Ref<HTMLTableCellElement>
}

function TableHead({ style, ref, ...props }: TableHeadProps) {
  return (
    <th
      ref={ref}
      {...stylex.props([styles.head, style] as StyleXStyles)}
      {...props}
    />
  )
}
TableHead.displayName = "TableHead"

type TableCellProps = {
  style?: StyleXStyles
  ref?: Ref<HTMLTableCellElement>
}

function TableCell({ style, ref, ...props }: TableCellProps) {
  return (
    <td
      ref={ref}
      {...stylex.props([styles.cell, style] as StyleXStyles)}
      {...props}
    />
  )
}
TableCell.displayName = "TableCell"

type TableCaptionProps = {
  style?: StyleXStyles
  ref?: Ref<HTMLTableCaptionElement>
}

function TableCaption({ style, ref, ...props }: TableCaptionProps) {
  return (
    <caption
      ref={ref}
      {...stylex.props([styles.caption, style] as StyleXStyles)}
      {...props}
    />
  )
}
TableCaption.displayName = "TableCaption"

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}

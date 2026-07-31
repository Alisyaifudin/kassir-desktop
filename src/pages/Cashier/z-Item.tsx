import { TextError } from "~/components/TextError";
import { Spinner } from "~/components/Spinner";
import { memo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Show } from "~/components/Show";
import { Cashier } from "~/services/cashier";
import z from "zod";
import { HStack, VStack } from "~/components/block/stack";
import * as stylex from "@stylexjs/stylex";
import type { StyleXStyles } from "@stylexjs/stylex";
import { colors, sizes } from "~/tokens.stylex";
import { Expandable } from "~/components/block/expandable";
import { Text } from "~/components/block/text";
import { NameInput } from "./z-NameInput";
import { DeleteDialog } from "./z-DeleteDialog";
import { Block } from "~/components/block/block";

// ── Styles ───────────────────────────────────────────────────────────────────


const mainStyles = stylex.create({
  base: {
    gap: sizes.gapMd,
  },
});

const rowStyles = stylex.create({
  base: {
    alignItems: "center",
    gap: sizes.gapMd,
    borderRadius: sizes.radiusXl2,
    transitionProperty: "color, background-color",
    transitionDuration: sizes.transitionDuration,
    ":hover": {
      backgroundColor: `color-mix(in oklch, ${colors.accent} 50%, transparent)`,
    },
  },
});

const nameColumnStyles = stylex.create({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: sizes.inputPadY,
  },
});

const selfNameStyles = stylex.create({
  base: {
    paddingLeft: sizes.gapMd,
    color: colors.foreground,
    fontWeight: 500,
  },
});

const selectColumnStyles = stylex.create({
  base: {
    width: sizes.cashierSelectWidth,
  },
});

const selectTriggerStyles = stylex.create({
  base: {
    width: "100%",
  },
});

const deleteColumnStyles = stylex.create({
  base: {
    width: sizes.cashierDeleteWidth,
  },
});

// ── Component ────────────────────────────────────────────────────────────────

type ItemProps = {
  cashier: Cashier;
  currentUserName: string;
  onUpdateName: (id: string, name: string) => Promise<string | null>;
  onUpdateRole: (id: string, role: DBNamespace.Role) => Promise<string | null>;
  onDelete: (id: string) => Promise<string | null>;
};

export function CashierItem({
  cashier,
  currentUserName,
  onUpdateName,
  onUpdateRole,
  onDelete,
}: ItemProps) {
  const isSelf = currentUserName === cashier.name;
  const [error, setError] = useState<null | string>(null);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(cashier.name);
  const [role, setRole] = useState(cashier.role);

  async function handleNameSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    const formdata = new FormData(e.currentTarget);
    const parsed = z.string().nonempty("Harus ada").safeParse(formdata.get("name"));
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Harus diisi");
      return;
    }
    const name = parsed.data;
    setLoading(true);
    const error = await onUpdateName(cashier.id, name);
    setLoading(false);
    setError(error);
  }

  async function handleRoleChange(newRole: string) {
    if (newRole !== "admin" && newRole !== "user" && newRole !== role) return;
    // optimistic update
    setRole(newRole);
    if (loading) return;
    setLoading(true);
    const error = await onUpdateRole(cashier.id, newRole);
    setLoading(false);
    setError(error);
    if (error !== null) {
      // undo optimistic update
      setRole(role);
    }
  }

  return (
    <VStack style={mainStyles.base}>
      <HStack style={rowStyles.base}>
        <Expandable style={nameColumnStyles.base}>
          {isSelf ? (
            <Text style={selfNameStyles.base}>{cashier.name}</Text>
          ) : (
            <NameInput disabled={loading} name={name} setName={setName} />
          )}
        </Expandable>
        <Block style={selectColumnStyles.base}>
          <Select value={role} onValueChange={handleRoleChange} disabled={isSelf}>
            <SelectTrigger style={selectTriggerStyles.base}>
              <SelectValue placeholder="Peran" />
            </SelectTrigger>
            <SelectContent position="item-aligned">
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="user">User</SelectItem>
            </SelectContent>
          </Select>
        </Block>
        <Show when={!loading && !isSelf} fallback={<Spinner when />}>
          <Block style={deleteColumnStyles.base}>
            <DeleteDialog
              name={cashier.name}
              id={cashier.id}
              onDelete={onDelete}
              isLoading={loading}
            />
          </Block>
        </Show>
      </HStack>
      <TextError>{error}</TextError>
    </VStack>
  );
}

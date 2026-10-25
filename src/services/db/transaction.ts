import type { Binding, Statement } from ".";

/**
 * sqlx numbers `$N` across the *whole* multi-statement query, not per statement:
 * a statement's local `$1` is really the first binding of the batch, so every
 * statement after the first would reuse the first statement's values. Shift
 * each statement's placeholders by the number of bindings before it.
 */
export function flattenTransaction(statements: Statement[]): {
  query: string;
  bindings: Binding[];
} {
  const parts: string[] = [];
  const bindings: Binding[] = [];
  let offset = 0;

  for (const statement of statements) {
    parts.push(
      statement.sql.replace(/\$(\d+)/g, (_match, index: string) => `$${offset + Number(index)}`),
    );
    bindings.push(...(statement.bindings ?? []));
    offset += statement.bindings?.length ?? 0;
  }

  return { query: parts.join(";\n"), bindings };
}

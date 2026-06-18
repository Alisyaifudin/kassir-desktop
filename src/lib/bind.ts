export function createBindings() {
  let paramIndex = 1;
  let bindings: unknown[] = [];
  const bind = (v: unknown) => {
    bindings.push(v);
    return `$${paramIndex++}`;
  };
  const reset = () => {
    bindings = [];
    paramIndex = 1;
  };
  return { bind, bindings, reset };
}


export function capitalize(name: string): string {
  const terms = name.split(" ");
  return terms.map((t) => t[0].toUpperCase() + t.slice(1)).join(" ");
}
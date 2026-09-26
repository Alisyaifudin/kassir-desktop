export function formatTick(tick: number) {
  if (tick < 1000) {
    return tick.toString();
  }
  if (tick < 1_000_000) {
    tick /= 1000;
    return `${tick}K`;
  }
  if (tick < 1_000_000_000) {
    tick /= 1000_000;
    return `${tick}M`;
  }
  tick /= 1_000_000_000;
  return `${tick}B`;
}

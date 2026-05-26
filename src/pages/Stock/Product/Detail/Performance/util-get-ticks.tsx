export function getTicks(max: number): number[] {
  if (max <= 2) {
    return [1];
  }
  const magnitude = Math.pow(10, Math.floor(Math.log10(max)));
  let interval = magnitude;
  if (max < 2 * magnitude) {
    interval = magnitude / 2;
  } else if (max < 5 * magnitude) {
    interval = magnitude;
  } else {
    interval = magnitude * 2;
  }
  const ticks: number[] = [];
  for (let tick = interval; tick < max; tick += interval) {
    ticks.push(tick);
  }

  return ticks;
}

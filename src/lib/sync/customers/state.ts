/** Accumulated pull bytes from the server. */
export const pulledData: number[] = [];

/** Push buffer and cursor for streaming local data back. */
export const pushState = {
  pushedData: [] as number[],
  pushCursor: 0,
};

/** Reset all shared state (call between sync cycles if needed). */
export function cleanup() {
  pulledData.length = 0;
  pushState.pushedData = [];
  pushState.pushCursor = 0;
}

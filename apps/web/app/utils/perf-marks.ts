export function markMutation(id: string): void {
  if (typeof performance === "undefined") return;
  performance.mark(`mutation:${id}:start`);
}

export function measureMutation(id: string): number | undefined {
  if (typeof performance === "undefined") return;
  try {
    performance.measure(`mutation:${id}`, `mutation:${id}:start`);
    const entries = performance.getEntriesByName(`mutation:${id}`);
    const last = entries[entries.length - 1];
    return last?.duration;
  } catch {
    return undefined;
  }
}

"use client";

import { useEffect, useState } from "react";
import { formatAbsoluteShort, formatRelative } from "@deckgauge/shared";

interface RelativeTimeProps {
  date: Date | string;
}

const REFRESH_INTERVAL_MS = 60_000;

/**
 * Render a date as relative time ("5m ago") with SSR-safe hydration.
 *
 * Bug avoided: `formatRelative` calls `new Date()` on every render, so SSR's
 * "now" and the client's "now" at hydration produce different text whenever
 * the date sits near a bucket boundary (e.g., "59m ago" vs "1h ago") or near
 * midnight UTC. That mismatch triggers React #425 and the hydration fallback
 * (#422).
 *
 * Fix: initial render uses `formatAbsoluteShort` — deterministic (no
 * Date.now(), pinned to UTC + en-US) — so server and client first paint
 * identical markup. A `useEffect` then swaps in the relative-time label and
 * refreshes it once a minute while mounted.
 */
export function RelativeTime({ date }: RelativeTimeProps) {
  const [label, setLabel] = useState<string>(() => formatAbsoluteShort(date));

  useEffect(() => {
    const tick = () => setLabel(formatRelative(date));
    tick();
    const id = setInterval(tick, REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [date]);

  return <>{label}</>;
}

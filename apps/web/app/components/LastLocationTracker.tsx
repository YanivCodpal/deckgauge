"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { isResumableLocation, setLastLocationCookie } from "../utils/last-location-cookie";

/**
 * Records the last workspace location the user visited — board (`/?boardId=…`),
 * roadmap, org tree, or timesheet — so the top-nav "Home" link can return them
 * there instead of always opening the last board. Chrome routes (Settings /
 * Sources / login) are skipped; see isResumableLocation. Renders nothing.
 */
export function LastLocationTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname || !isResumableLocation(pathname)) return;
    const qs = searchParams?.toString();
    setLastLocationCookie(qs ? `${pathname}?${qs}` : pathname);
  }, [pathname, searchParams]);

  return null;
}

"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useCallback } from "react";

/**
 * Hook to manage group collapse state via URL search params.
 * @param groupKey - Unique key for the group (e.g., "my-projects")
 * @returns { collapsed, toggle }
 */
export function useGroupCollapse(groupKey: string) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const collapsed = searchParams.get("collapsed")?.split(",").includes(groupKey) ?? false;

  const toggle = useCallback(() => {
    const params = new URLSearchParams(searchParams);
    const collapsedGroups = params.get("collapsed")?.split(",").filter(Boolean) ?? [];

    if (collapsed) {
      // Remove from collapsed list
      const updated = collapsedGroups.filter((key) => key !== groupKey);
      if (updated.length) {
        params.set("collapsed", updated.join(","));
      } else {
        params.delete("collapsed");
      }
    } else {
      // Add to collapsed list
      collapsedGroups.push(groupKey);
      params.set("collapsed", collapsedGroups.join(","));
    }

    router.push(`?${params.toString()}`);
  }, [collapsed, groupKey, router, searchParams]);

  return { collapsed, toggle };
}

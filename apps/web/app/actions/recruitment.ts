"use server";

import { apiRequest } from "./api";
import { revalidateTag } from "next/cache";
import { boardsListTag } from "../utils/cache-tags";

/**
 * Result union — server-action throws reach the browser as an opaque digest, so we
 * catch and return the API's message (e.g. "already onboarded") for the UI to show.
 */
export type OnboardOutcome =
  | { ok: true; employeeId: string }
  | { ok: false; error: string };

export async function onboardCandidate(
  boardId: string,
  projectId: string,
  orgTreeId: string,
): Promise<OnboardOutcome> {
  try {
    const res = await apiRequest(
      `/boards/${boardId}/candidates/${projectId}/onboard`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgTreeId }),
      },
    );
    const data = (await res.json()) as { employeeId: string };
    revalidateTag(boardsListTag());
    return { ok: true, employeeId: data.employeeId };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Onboarding failed";
    return { ok: false, error: message };
  }
}

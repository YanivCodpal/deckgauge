/**
 * Pure helpers for turning a Microsoft-calendar event subject into a candidate name.
 * Kept separate from the handler so they can be unit-tested without any Graph/Prisma
 * doubles. No I/O, no side effects.
 */

/** True when the subject looks like an interview event. */
export function isInterviewEvent(subject: string): boolean {
  return /interview/i.test(subject);
}

// Leading "<ordinal> Interview <separator>" prefix, e.g. "Second Interview:",
// "Final interview -", "Interview with". The separator (":", "-"/en-dash, or the
// word "with"/"for") is consumed so it doesn't leak into the parsed name.
const INTERVIEW_PREFIX =
  /^\s*(?:(?:first|second|third|fourth|fifth|sixth|final|initial|last|\d+(?:st|nd|rd|th)?)\s+)?interview\b\s*[:\-–—]?\s*(?:with\s+|for\s+)?/i;

// Residual delimiters once the prefix is gone: a pipe, a space-padded hyphen (so
// hyphenated names like "Anne-Marie" survive), or a space-padded "with".
const NAME_DELIMITER = /\s*\|\s*|\s+-\s+|\s+with\s+/i;

/**
 * Extract the candidate's name from an interview event subject, or null when the
 * subject carries no name. Strips a leading ordinal-interview prefix, then takes the
 * text before the first pipe / hyphen / " with " and trims it.
 */
export function parseCandidateName(subject: string): string | null {
  const stripped = subject.replace(INTERVIEW_PREFIX, '');
  const name = stripped.split(NAME_DELIMITER)[0]?.trim() ?? '';
  return name.length > 0 ? name : null;
}

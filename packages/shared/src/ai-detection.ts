// AI-assistance detection for commits and PRs.
// Pure function — no I/O. Consumed by worker processors before
// writing to ClickHouse columns ai_assisted / ai_confidence / ai_signals.
// Spec: planning/ENGINEERING-INTELLIGENCE.md §6.

export interface AiSignalInput {
  commitMessage?: string;
  prTitle?: string;
  prBody?: string;
  branchName?: string;
  authorLogin?: string;
  // For PRs: the messages of the PR's own commits. AI signatures
  // (Co-Authored-By: Claude, "Generated with Claude Code", 🤖) usually live in
  // commit trailers, not the PR title/body — so a PR with clean text but
  // AI-authored commits is only detectable when these are folded in.
  commitMessages?: string[];
}

export interface AiDetectionResult {
  aiAssisted: boolean;
  confidence: number;
  signals: Record<string, unknown>;
}

const COAUTHOR_PATTERNS = [
  /co-authored-by:\s*claude/i,
  /co-authored-by:\s*copilot/i,
  /co-authored-by:\s*github copilot/i,
  /co-authored-by:\s*cursor/i,
  /co-authored-by:\s*chatgpt/i,
  /co-authored-by:\s*gpt[- ]?4/i,
  /co-authored-by:\s*aider/i,
  /co-authored-by:\s*windsurf/i,
];

const MESSAGE_MARKERS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /🤖/, label: "robot_emoji" },
  { pattern: /\bgenerated\s+with\s+(claude|copilot|chatgpt|cursor|aider)/i, label: "generated_with" },
  { pattern: /\[AI\]/i, label: "ai_tag" },
  { pattern: /\[Claude\]/i, label: "claude_tag" },
  { pattern: /\[Copilot\]/i, label: "copilot_tag" },
  { pattern: /\bclaude code\b/i, label: "claude_code_mention" },
];

const BRANCH_PREFIXES = ["claude/", "copilot/", "cursor/", "ai/", "aider/", "windsurf/"];

const AUTHOR_PATTERNS = [
  /^claude[-_]?bot$/i,
  /^copilot[-_]?bot$/i,
  /^github-actions\[bot\]$/i,
  /^cursor[-_]?bot$/i,
];

const AI_AUTHOR_SUBSTRINGS = ["claude", "copilot", "cursor", "aider"];

// Weights tuned so a single strong signal (co-author trailer) crosses the 0.5
// threshold on its own, while a single weak signal (branch prefix) does not.
const W_COAUTHOR = 0.75;
const W_MESSAGE_MARKER = 0.55;
const W_BRANCH_PREFIX = 0.35;
const W_AUTHOR_BOT = 0.4;
const W_AUTHOR_AI_SUBSTRING = 0.25;

const THRESHOLD = 0.5;

export function detectAiAssistance(input: AiSignalInput): AiDetectionResult {
  const text = [
    input.commitMessage ?? "",
    input.prTitle ?? "",
    input.prBody ?? "",
    ...(input.commitMessages ?? []),
  ]
    .filter((s) => s.length > 0)
    .join("\n");

  const signals: Record<string, unknown> = {};
  let confidence = 0;

  for (const pat of COAUTHOR_PATTERNS) {
    if (pat.test(text)) {
      signals.co_author = pat.source;
      confidence += W_COAUTHOR;
      break;
    }
  }

  for (const marker of MESSAGE_MARKERS) {
    if (marker.pattern.test(text)) {
      signals.message_marker = marker.label;
      confidence += W_MESSAGE_MARKER;
      break;
    }
  }

  const branch = input.branchName ?? "";
  for (const prefix of BRANCH_PREFIXES) {
    if (branch.toLowerCase().startsWith(prefix)) {
      signals.branch_prefix = prefix;
      confidence += W_BRANCH_PREFIX;
      break;
    }
  }

  const author = input.authorLogin ?? "";
  let authorMatched = false;
  for (const pat of AUTHOR_PATTERNS) {
    if (pat.test(author)) {
      signals.author_pattern = pat.source;
      confidence += W_AUTHOR_BOT;
      authorMatched = true;
      break;
    }
  }
  if (!authorMatched && author.length > 0) {
    const lower = author.toLowerCase();
    for (const sub of AI_AUTHOR_SUBSTRINGS) {
      if (lower.includes(sub)) {
        signals.author_substring = sub;
        confidence += W_AUTHOR_AI_SUBSTRING;
        break;
      }
    }
  }

  if (confidence > 1) confidence = 1;

  return {
    aiAssisted: confidence >= THRESHOLD,
    confidence: Number(confidence.toFixed(2)),
    signals,
  };
}

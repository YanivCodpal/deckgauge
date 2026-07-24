"use client";

import React, { useState, useEffect, useTransition } from "react";
import { SlideOverPanel } from "@deckgauge/ui";
import {
  fetchAutomations,
  createAutomation,
  updateAutomation,
  deleteAutomation,
  fetchGroups,
} from "../actions/projects";
import { fetchBoardStatuses } from "../actions/board-statuses";
import type { BoardStatus } from "@deckgauge/shared";

interface AutomationRule {
  id: string;
  name: string;
  trigger: { type: string; field?: string; value?: string };
  action: { type: string; targetGroupId?: string; targetStatus?: string; message?: string };
  enabled: boolean;
}

interface Group {
  id: string;
  name: string;
  color: string;
}

const TRIGGER_TYPES = [
  { value: "status_change", label: "When status changes to" },
  { value: "item_created", label: "When item is created" },
];

const ACTION_TYPES = [
  { value: "move_to_group", label: "Move to group" },
  { value: "change_status", label: "Change status" },
  { value: "notify", label: "Log notification" },
];

interface AutomationPanelProps {
  boardId: string;
  onClose: () => void;
}

export function AutomationPanel({ boardId, onClose }: AutomationPanelProps) {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [boardStatuses, setBoardStatuses] = useState<BoardStatus[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [validationError, setValidationError] = useState("");

  const [triggerType, setTriggerType] = useState("status_change");
  const [triggerValue, setTriggerValue] = useState("");
  const [actionType, setActionType] = useState("change_status");
  const [actionStatus, setActionStatus] = useState("");
  const [actionGroupId, setActionGroupId] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [ruleName, setRuleName] = useState("");

  useEffect(() => {
    loadRules();
    loadGroups();
    loadBoardStatuses();
  }, [boardId]);

  // Clear actionGroupId when switching away from move_to_group to avoid stale state
  useEffect(() => {
    if (actionType !== "move_to_group") {
      setActionGroupId("");
    }
  }, [actionType]);

  // Initialise trigger/action status selects once board statuses are loaded.
  // The guard (!triggerValue / !actionStatus) is intentional — it ensures this
  // effect only fires on first load and never resets user selections on re-render.
  // triggerValue and actionStatus are intentionally omitted from the dep array;
  // including them would re-run on every user selection, defeating the guard.
  useEffect(() => {
    if (boardStatuses.length > 0 && !triggerValue) {
      setTriggerValue(boardStatuses[0].label);
    }
    if (boardStatuses.length > 0 && !actionStatus) {
      setActionStatus(boardStatuses[0].label);
    }
  }, [boardStatuses]);

  async function loadRules() {
    try {
      const data = await fetchAutomations(boardId);
      setRules(data);
    } catch {
      // ignore
    }
  }

  async function loadGroups() {
    try {
      const data = await fetchGroups(boardId);
      setGroups(data);
      // Auto-select the first available group for a smoother UX
      if (data.length > 0 && !actionGroupId) {
        setActionGroupId(data[0].id);
      }
    } catch {
      // Gracefully handle fetch failures — groups list stays empty
    }
  }

  async function loadBoardStatuses() {
    try {
      const data = await fetchBoardStatuses(boardId);
      setBoardStatuses(data);
    } catch {
      // Gracefully handle fetch failures — status list stays empty.
    }
  }

  function describeTrigger(rule: AutomationRule): string {
    if (rule.trigger.type === "status_change") {
      return `When status changes to ${rule.trigger.value || "any"}`;
    }
    if (rule.trigger.type === "item_created") {
      return "When item is created";
    }
    return rule.trigger.type;
  }

  function describeAction(rule: AutomationRule): string {
    if (rule.action.type === "move_to_group") {
      const group = groups.find((g) => g.id === rule.action.targetGroupId);
      return `Move to group ${group?.name || "?"}`;
    }
    if (rule.action.type === "change_status") {
      return `Change status to ${rule.action.targetStatus || "?"}`;
    }
    if (rule.action.type === "notify") {
      return `Log: ${rule.action.message || "notification"}`;
    }
    return rule.action.type;
  }

  const handleCreate = () => {
    // Require a group selection before submitting a move_to_group automation
    if (actionType === "move_to_group" && !actionGroupId) {
      setValidationError("Please select a group to move items to.");
      return;
    }
    setValidationError("");

    const name = ruleName.trim() || `${triggerType} \u2192 ${actionType}`;
    startTransition(async () => {
      await createAutomation(boardId, {
        name,
        trigger: {
          type: triggerType,
          ...(triggerType === "status_change" && { value: triggerValue }),
        },
        action: {
          type: actionType,
          ...(actionType === "move_to_group" && { targetGroupId: actionGroupId }),
          ...(actionType === "change_status" && { targetStatus: actionStatus }),
          ...(actionType === "notify" && { message: actionMessage || "Automation triggered" }),
        },
      });
      setIsAdding(false);
      setRuleName("");
      await loadRules();
    });
  };

  return (
    <SlideOverPanel isOpen onClose={onClose} title="Automations">
      <div className="space-y-4">
        {rules.length === 0 && !isAdding && (
          <p className="text-sm text-slate-500">No automation rules yet.</p>
        )}

        {rules.map((rule) => (
          <div
            key={rule.id}
            className="flex items-center justify-between border border-slate-200 rounded-lg p-3 bg-slate-50"
          >
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-700">{rule.name}</p>
              <p className="text-xs text-slate-500">
                {describeTrigger(rule)} {"\u2192"} {describeAction(rule)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  startTransition(async () => {
                    await updateAutomation(
                      rule.id,
                      { enabled: !rule.enabled },
                      boardId,
                    );
                    await loadRules();
                  });
                }}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  rule.enabled
                    ? "bg-indigo-500"
                    : "bg-slate-200"
                }`}
                aria-label={rule.enabled ? "Disable" : "Enable"}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                    rule.enabled ? "translate-x-4" : "translate-x-0.5"
                  }`}
                />
              </button>
              <button
                type="button"
                onClick={() => {
                  startTransition(async () => {
                    await deleteAutomation(rule.id, boardId);
                    await loadRules();
                  });
                }}
                className="text-xs text-red-600 hover:text-red-500 transition-colors"
              >
                {"\u2715"}
              </button>
            </div>
          </div>
        ))}

        {isAdding ? (
          <div className="border border-slate-200 rounded-lg p-4 space-y-3 bg-slate-50">
            <h4 className="text-sm font-medium text-slate-700">
              New Automation
            </h4>

            <div>
              <label className="block text-xs text-slate-500 mb-1">Name</label>
              <input
                type="text"
                value={ruleName}
                onChange={(e) => setRuleName(e.target.value)}
                placeholder="Rule name (optional)"
                className="input-dark text-sm py-1.5"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-500 mb-1">
                Trigger
              </label>
              <select
                value={triggerType}
                onChange={(e) => setTriggerType(e.target.value)}
                className="select-dark text-sm py-1.5"
              >
                {TRIGGER_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              {triggerType === "status_change" && (
                <select
                  value={triggerValue}
                  onChange={(e) => setTriggerValue(e.target.value)}
                  className="select-dark text-sm py-1.5 mt-2"
                >
                  {boardStatuses.map((s) => (
                    <option key={s.id} value={s.label}>
                      {s.label}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs text-slate-500 mb-1">
                Action
              </label>
              <select
                value={actionType}
                onChange={(e) => setActionType(e.target.value)}
                className="select-dark text-sm py-1.5"
              >
                {ACTION_TYPES.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
              {actionType === "move_to_group" && (
                groups.length > 0 ? (
                  <select
                    value={actionGroupId}
                    onChange={(e) => setActionGroupId(e.target.value)}
                    className="select-dark text-sm py-1.5 mt-2"
                  >
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-xs text-slate-500 mt-2">
                    No groups available. Create a group first.
                  </p>
                )
              )}
              {actionType === "change_status" && (
                <select
                  value={actionStatus}
                  onChange={(e) => setActionStatus(e.target.value)}
                  className="select-dark text-sm py-1.5 mt-2"
                >
                  {boardStatuses.map((s) => (
                    <option key={s.id} value={s.label}>
                      {s.label}
                    </option>
                  ))}
                </select>
              )}
              {actionType === "notify" && (
                <input
                  type="text"
                  value={actionMessage}
                  onChange={(e) => setActionMessage(e.target.value)}
                  placeholder="Notification message"
                  className="input-dark text-sm py-1.5 mt-2"
                />
              )}
            </div>

            {validationError && (
              <p className="text-xs text-red-500">{validationError}</p>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleCreate}
                disabled={isPending}
                className="btn-primary text-sm py-1.5"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="btn-ghost"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="text-sm text-indigo-500 hover:text-indigo-400 transition-colors"
          >
            + Add automation
          </button>
        )}
      </div>
    </SlideOverPanel>
  );
}

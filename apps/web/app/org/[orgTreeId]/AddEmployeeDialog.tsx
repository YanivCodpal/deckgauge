'use client';

import { useRef, useTransition } from 'react';
import { createEmployee } from '../../actions/org-trees';

interface AddEmployeeDialogProps {
  orgTreeId: string;
  managerId: string | null;
  onClose: () => void;
  onCreated: () => void;
}

export function AddEmployeeDialog({
  orgTreeId,
  managerId,
  onClose,
  onCreated,
}: AddEmployeeDialogProps) {
  const nameRef = useRef<HTMLInputElement>(null);
  const roleRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = nameRef.current?.value.trim() ?? '';
    if (!name) return;
    const role = roleRef.current?.value.trim() || null;

    startTransition(async () => {
      await createEmployee(orgTreeId, { name, role, managerId });
      onCreated();
      onClose();
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Add direct report"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="w-80 rounded-lg border border-gray-200 bg-white p-5 shadow-xl"
      >
        <h2 className="mb-4 text-sm font-semibold text-gray-800">Add direct report</h2>

        <label className="mb-1 block text-xs text-gray-600" htmlFor="add-emp-name">
          Name <span className="text-red-500">*</span>
        </label>
        <input
          id="add-emp-name"
          ref={nameRef}
          type="text"
          required
          autoFocus
          className="mb-3 w-full rounded border border-gray-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          placeholder="Full name"
        />

        <label className="mb-1 block text-xs text-gray-600" htmlFor="add-emp-role">
          Role
        </label>
        <input
          id="add-emp-role"
          ref={roleRef}
          type="text"
          className="mb-4 w-full rounded border border-gray-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          placeholder="e.g. Software Engineer"
        />

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="rounded bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {isPending ? 'Adding…' : 'Add'}
          </button>
        </div>
      </form>
    </div>
  );
}

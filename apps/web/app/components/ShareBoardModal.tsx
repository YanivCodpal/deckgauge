'use client';

import { useState, useTransition } from 'react';
import { useAuthFetch } from '../hooks/useAuthFetch';

interface AccessEntry {
  id: string;
  boardId: string;
  userId: string;
  role: 'OWNER' | 'EDITOR' | 'VIEWER';
  user: { id: string; name: string; email: string; avatarUrl: string | null };
}

interface UserResult {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

interface ShareBoardModalProps {
  boardId: string;
  currentUserId: string;
  initialAccess: AccessEntry[];
  onClose: () => void;
}

export function ShareBoardModal({
  boardId,
  currentUserId,
  initialAccess,
  onClose,
}: ShareBoardModalProps) {
  const authFetch = useAuthFetch();
  const [access, setAccess] = useState<AccessEntry[]>(initialAccess);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserResult | null>(null);
  const [newRole, setNewRole] = useState<'OWNER' | 'EDITOR' | 'VIEWER'>('EDITOR');
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const handleSearch = async (q: string) => {
    setSearch(q);
    if (q.trim().length < 1) {
      setSearchResults([]);
      return;
    }
    const res = await authFetch(`/users/search?q=${encodeURIComponent(q)}`);
    if (res.ok) setSearchResults(await res.json());
  };

  const handleAdd = () => {
    if (!selectedUser) return;
    setError(null);
    startTransition(async () => {
      const res = await authFetch(`/boards/${boardId}/access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUser.id, role: newRole }),
      });
      if (!res.ok) {
        const body = await res.json();
        setError(body.error ?? 'Failed to add user');
        return;
      }
      const entry = await res.json();
      setAccess((prev) => [...prev, { ...entry, user: selectedUser }]);
      setSelectedUser(null);
      setSearch('');
      setSearchResults([]);
    });
  };

  const _handleRoleChange = (userId: string, role: 'OWNER' | 'EDITOR' | 'VIEWER') => {
    startTransition(async () => {
      const res = await authFetch(`/boards/${boardId}/access/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      if (res.ok) {
        setAccess((prev) => prev.map((a) => (a.userId === userId ? { ...a, role } : a)));
      }
    });
  };

  const handleRevoke = (userId: string) => {
    startTransition(async () => {
      const res = await authFetch(`/boards/${boardId}/access/${userId}`, {
        method: 'DELETE',
      });
      if (res.status === 409) {
        setError('Cannot remove the last board owner');
        return;
      }
      if (res.ok) setAccess((prev) => prev.filter((a) => a.userId !== userId));
    });
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Share board</h2>
          <button
            aria-label="Close"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl"
          >
            ✕
          </button>
        </div>

        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search users..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchResults.length > 0 && (
              <ul className="absolute left-0 right-0 top-full mt-1 bg-white border rounded-lg shadow z-10 max-h-40 overflow-y-auto">
                {searchResults.map((u) => (
                  <li
                    key={u.id}
                    className="px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer"
                    onClick={() => {
                      setSelectedUser(u);
                      setSearch(u.name);
                      setSearchResults([]);
                    }}
                  >
                    {u.name} <span className="text-gray-400 text-xs">{u.email}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <select
            value={newRole}
            onChange={(e) => setNewRole(e.target.value as 'OWNER' | 'EDITOR' | 'VIEWER')}
            className="border rounded-lg px-2 py-2 text-sm"
          >
            <option value="VIEWER">Viewer</option>
            <option value="EDITOR">Editor</option>
            <option value="OWNER">Owner</option>
          </select>
          <button
            onClick={handleAdd}
            disabled={!selectedUser}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50"
          >
            Add
          </button>
        </div>

        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

        <ul className="space-y-2">
          {access.map((entry) => (
            <li key={entry.userId} className="flex items-center justify-between text-sm">
              <div>
                <span className="font-medium">{entry.user.name}</span>
                <span className="text-gray-400 text-xs ml-2">{entry.user.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 uppercase">{entry.role}</span>
                {entry.userId !== currentUserId && (
                  <button
                    onClick={() => handleRevoke(entry.userId)}
                    className="text-gray-300 hover:text-red-400 text-xs"
                    aria-label={`Remove ${entry.user.name}`}
                  >
                    ✕
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

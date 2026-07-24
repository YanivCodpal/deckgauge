'use client';

import React, { useState } from 'react';
import { JiraInstanceForm } from './JiraInstanceForm';

export interface JiraInstance {
  id?: string;
  name: string;
  url: string;
  email: string;
  token?: string;
  projectKeys: string[];
}

interface JiraInstanceManagerProps {
  initialInstances: JiraInstance[];
}

const emptyInstance: JiraInstance = {
  name: '',
  url: '',
  email: '',
  token: '',
  projectKeys: [],
};

export function JiraInstanceManager({ initialInstances }: JiraInstanceManagerProps) {
  const [instances, setInstances] = useState<JiraInstance[]>(initialInstances);
  const [showForm, setShowForm] = useState(false);
  const [editingInstance, setEditingInstance] = useState<JiraInstance | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleAdd = (instance: JiraInstance) => {
    setIsLoading(true);
    setInstances((prev) => [...prev, { ...instance, id: crypto.randomUUID() }]);
    setShowForm(false);
    setIsLoading(false);
  };

  const handleEdit = (instance: JiraInstance) => {
    setIsLoading(true);
    setInstances((prev) =>
      prev.map((i) => (i.id === instance.id ? instance : i))
    );
    setEditingInstance(null);
    setIsLoading(false);
  };

  const handleDelete = (id: string) => {
    setInstances((prev) => prev.filter((i) => i.id !== id));
  };

  return (
    <div className="space-y-4">
      {instances.map((instance) =>
        editingInstance?.id === instance.id && editingInstance ? (
          <JiraInstanceForm
            key={instance.id}
            instance={editingInstance}
            isLoading={isLoading}
            onSubmit={handleEdit}
            onCancel={() => setEditingInstance(null)}
          />
        ) : (
          <div
            key={instance.id}
            className="glass flex items-center justify-between p-4"
          >
            <div>
              <p className="text-sm font-medium text-slate-700">{instance.name}</p>
              <p className="text-xs text-slate-500">{instance.url}</p>
              <p className="text-xs text-slate-500">
                Projects: {instance.projectKeys.join(', ')}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setEditingInstance(instance)}
                className="text-sm text-blue-600 hover:text-blue-500 transition-colors"
              >
                Edit
              </button>
              <button
                onClick={() => instance.id && handleDelete(instance.id)}
                className="text-sm text-red-600 hover:text-red-500 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        )
      )}

      {showForm ? (
        <JiraInstanceForm
          instance={emptyInstance}
          isLoading={isLoading}
          onSubmit={handleAdd}
          onCancel={() => setShowForm(false)}
        />
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="w-full py-2.5 px-4 text-sm font-medium text-indigo-500 border border-dashed border-indigo-500 rounded-xl bg-transparent hover:bg-indigo-50 transition-all"
        >
          + Add Jira Instance
        </button>
      )}
    </div>
  );
}

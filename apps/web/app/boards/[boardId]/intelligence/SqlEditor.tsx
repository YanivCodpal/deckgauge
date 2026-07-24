'use client';

import { useEffect, useRef } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import type { IntelligenceSchema } from '@deckgauge/shared';

interface Props {
  value: string;
  onChange: (v: string) => void;
  schema: IntelligenceSchema | null;
  onRun?: () => void;
}

export function SqlEditor({ value, onChange, schema, onRun }: Props) {
  // schema is accepted for forward-compat with PR-5 (Monaco completion provider).
  void schema;

  // Use a ref so the Monaco command always sees the latest onRun closure.
  // Monaco's addCommand captures values at registration time; without this,
  // Cmd+Enter would call a stale callback bound to the first render.
  const onRunRef = useRef(onRun);
  useEffect(() => {
    onRunRef.current = onRun;
  });

  const handleMount: OnMount = (editor, monaco) => {
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      onRunRef.current?.();
    });
  };

  return (
    <Editor
      height="240px"
      defaultLanguage="sql"
      value={value}
      onChange={(v) => onChange(v ?? '')}
      onMount={handleMount}
      options={{ minimap: { enabled: false }, fontSize: 13 }}
    />
  );
}

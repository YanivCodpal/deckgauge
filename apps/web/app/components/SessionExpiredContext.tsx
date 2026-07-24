'use client';

import { createContext, useContext, useState } from 'react';

interface SessionExpiredContextValue {
  isSessionExpired: boolean;
  setSessionExpired: (expired: boolean) => void;
}

const SessionExpiredContext = createContext<SessionExpiredContextValue | null>(
  null,
);

export function SessionExpiredProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSessionExpired, setSessionExpired] = useState(false);

  return (
    <SessionExpiredContext.Provider
      value={{ isSessionExpired, setSessionExpired }}
    >
      {children}
    </SessionExpiredContext.Provider>
  );
}

export function useSessionExpired() {
  const ctx = useContext(SessionExpiredContext);
  if (!ctx) {
    throw new Error(
      'useSessionExpired must be used within SessionExpiredProvider',
    );
  }
  return ctx;
}

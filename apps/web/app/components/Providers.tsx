'use client';

import { SessionProvider } from 'next-auth/react';
import { SessionExpiredProvider } from './SessionExpiredContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchInterval={4 * 60}>
      <SessionExpiredProvider>{children}</SessionExpiredProvider>
    </SessionProvider>
  );
}

import Link from 'next/link';
import type { ReactNode } from 'react';

const TABS = [{ href: '/settings/timesheet-statuses', label: 'Timesheet Statuses' }];

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="mb-4 text-xl font-semibold">Settings</h1>
      <nav className="mb-6 flex gap-2 border-b border-slate-200">
        {TABS.map((t) => (
          <Link key={t.href} href={t.href} className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900">
            {t.label}
          </Link>
        ))}
      </nav>
      {children}
    </main>
  );
}

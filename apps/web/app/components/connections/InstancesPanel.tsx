'use client';
import { useEffect, useState } from 'react';
import type { SourceInstanceRow, RefreshResult } from '../../actions/connections';
import { TokenTutorial } from '../board-sources/providers/TokenTutorial';
import type { Provider } from '../board-sources/providers/roles';
import { TokenRefreshBox } from './TokenRefreshBox';

type Health = 'unknown' | 'valid' | 'expired';

interface InstancesPanelProps {
  provider: Provider;
  title: string;
  instances: SourceInstanceRow[];
  onTest: (id: string) => Promise<RefreshResult>;
  onRefresh: (id: string, token: string) => Promise<RefreshResult>;
}

const badgeLabel: Record<Health, string> = { unknown: 'Unknown', valid: 'Valid', expired: 'Expired' };
const badgeClass: Record<Health, string> = {
  unknown: 'bg-slate-100 text-slate-600',
  valid: 'bg-emerald-100 text-emerald-700',
  expired: 'bg-rose-100 text-rose-700',
};

export function InstancesPanel({ provider, title, instances, onTest, onRefresh }: InstancesPanelProps) {
  const [health, setHealth] = useState<Record<string, Health>>({});
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    instances.forEach((inst) => {
      onTest(inst.id).then((r) => {
        if (active) setHealth((h) => ({ ...h, [inst.id]: r.ok ? 'valid' : 'expired' }));
      });
    });
    return () => {
      active = false;
    };
  }, [instances, onTest]);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6">
      <h2 className="text-base font-semibold text-slate-900">{title} connections</h2>
      {instances.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">No {title} instances connected.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {instances.map((inst) => {
            const h = health[inst.id] ?? 'unknown';
            return (
              <li key={inst.id} className="rounded border border-slate-100 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-slate-900">{inst.label}</div>
                    <div className="text-xs text-slate-500">{inst.sublabel}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${badgeClass[h]}`}>{badgeLabel[h]}</span>
                    <button
                      onClick={() => setOpenId(openId === inst.id ? null : inst.id)}
                      className="text-sm text-indigo-600 hover:underline"
                    >
                      Refresh token
                    </button>
                  </div>
                </div>
                {openId === inst.id ? (
                  <div className="mt-3 space-y-2">
                    <TokenTutorial provider={provider} mode="reconnect" />
                    <TokenRefreshBox
                      onRefresh={(tok) => onRefresh(inst.id, tok)}
                      onSuccess={() => {
                        setOpenId(null);
                        setHealth((h) => ({ ...h, [inst.id]: 'valid' }));
                      }}
                    />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

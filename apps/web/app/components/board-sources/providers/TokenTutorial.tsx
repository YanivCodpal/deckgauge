import { PROVIDER_ONBOARDING } from './onboarding';
import type { Provider } from './roles';

interface TokenTutorialProps {
  provider: Provider;
  /** 'create' (default) keeps the guide's final step; 'reconnect' swaps it. */
  mode?: 'create' | 'reconnect';
}

const RECONNECT_FINAL_STEP = 'Paste the new token above and save to reconnect.';

/**
 * Inline "how to get a token" walkthrough. Gives a deep-link to the provider's
 * token page, the exact scopes to grant, and a short numbered guide — so users
 * never have to leave the flow or guess what to fill in. Shared by the create
 * form, the board-tab reconnect banner, and the /sources InstancesPanel.
 */
export function TokenTutorial({ provider, mode = 'create' }: TokenTutorialProps) {
  const guide = PROVIDER_ONBOARDING[provider];
  const steps =
    mode === 'reconnect' ? [...guide.steps.slice(0, -1), RECONNECT_FINAL_STEP] : guide.steps;
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3 space-y-2">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="h-3.5 w-3.5 text-indigo-500"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4M12 8h.01" strokeLinecap="round" />
        </svg>
        How to get your token
      </p>
      <ol className="space-y-1.5">
        {steps.map((step, i) => (
          <li key={i} className="flex gap-2 text-[11px] leading-relaxed text-slate-600">
            <span className="mt-px flex h-4 w-4 flex-none items-center justify-center rounded-full border border-slate-300 text-[9px] font-semibold text-slate-500">
              {i + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
      <a
        href={guide.tokenUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 rounded-md border border-indigo-500 bg-white px-2 py-1 text-[11px] font-medium text-indigo-600 hover:bg-indigo-50"
      >
        {guide.linkLabel}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="h-3 w-3"
          aria-hidden="true"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
        </svg>
      </a>
      {guide.scopes && (
        <div className="flex flex-wrap gap-1" aria-label="Required scopes">
          {guide.scopes.map((scope) => (
            <span
              key={scope}
              className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-1.5 py-0.5 font-mono text-[10px] text-slate-700"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                className="h-2.5 w-2.5 text-emerald-600"
                aria-hidden="true"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 12.5 9.5 18 20 6" />
              </svg>
              {scope}
            </span>
          ))}
        </div>
      )}
      {guide.note && <p className="text-[11px] text-slate-500">{guide.note}</p>}
    </div>
  );
}

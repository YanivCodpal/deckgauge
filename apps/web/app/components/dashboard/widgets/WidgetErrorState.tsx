'use client';

interface Props {
  message?: string;
}

// Per-widget failure UI. Shown when useWidgetData captures a fetch error.
// Keeps the rest of the dashboard rendering instead of bubbling the error
// up to Next.js's global error overlay.
export function WidgetErrorState({ message }: Props) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center h-full p-3 text-center"
    >
      <svg
        className="w-6 h-6 text-rose-400 mb-1.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v3.75m0 3.75h.008v.008H12v-.008zM21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <p className="text-xs font-medium text-rose-700">Failed to load</p>
      {message && <p className="text-[11px] text-slate-500 mt-0.5">{message}</p>}
    </div>
  );
}

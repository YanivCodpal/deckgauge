'use client';

import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';

export default function LoginPage() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') ?? '/';

  const keycloakIssuer = process.env.NEXT_PUBLIC_KEYCLOAK_ISSUER ?? 'http://localhost:8080/realms/vp-cockpit';
  const keycloakClientId = process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID ?? 'vp-cockpit-web';
  const redirectUri = typeof window !== 'undefined'
    ? `${window.location.origin}/api/auth/callback/keycloak`
    : 'http://localhost:3000/api/auth/callback/keycloak';

  const registrationUrl =
    `${keycloakIssuer}/protocol/openid-connect/registrations` +
    `?client_id=${encodeURIComponent(keycloakClientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&scope=openid`;

  return (
    <div className="min-h-screen flex flex-col bg-surface-0">
      {/* App shell nav bar */}
      <nav className="border-b border-white/10 bg-gradient-to-r from-teal-800 via-teal-700 to-emerald-600 shadow-[0_1px_0_rgba(255,255,255,0.12)_inset,0_2px_8px_rgba(49,46,129,0.25)]">
        <div className="flex h-14 items-center gap-2.5 px-4 sm:px-6">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-[13px] font-bold tracking-tight text-teal-600 shadow-sm ring-1 ring-black/5">
            DG
          </span>
          <span className="text-[15px] leading-none text-white">
            <span className="font-semibold tracking-tight">Deck</span>
            <span className="font-light text-white/85">gauge</span>
          </span>
        </div>
      </nav>

      {/* Centered login card */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          {/* Logo icon */}
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-teal-600 to-emerald-600 shadow-sm">
            <span className="text-xl font-bold text-white">D</span>
          </div>

          <h1 className="text-lg font-semibold text-slate-800">Sign in to Deckgauge</h1>
          <p className="mt-1 text-sm text-slate-500">Manage your engineering portfolio</p>

          <div className="mt-6 space-y-3">
            <button
              onClick={() => signIn('keycloak', { callbackUrl })}
              className="btn-primary w-full"
            >
              Continue with Keycloak
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-surface-0 px-2 text-slate-400">or</span>
              </div>
            </div>

            <a
              href={registrationUrl}
              className="btn-secondary inline-block w-full text-center"
            >
              Create an account
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

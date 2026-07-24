'use client';

import { signIn } from 'next-auth/react';
import { useSessionExpired } from './SessionExpiredContext';

export function SessionExpiredOverlay() {
  const { isSessionExpired } = useSessionExpired();

  if (!isSessionExpired) return null;

  const keycloakIssuer =
    process.env.NEXT_PUBLIC_KEYCLOAK_ISSUER ??
    'http://localhost:8080/realms/vp-cockpit';
  const keycloakClientId =
    process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID ?? 'vp-cockpit-web';
  const redirectUri =
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/auth/callback/keycloak`
      : 'http://localhost:3000/api/auth/callback/keycloak';

  const registrationUrl =
    `${keycloakIssuer}/protocol/openid-connect/registrations` +
    `?client_id=${encodeURIComponent(keycloakClientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&scope=openid`;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 text-center shadow-xl">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-sm">
          <span className="text-xl font-bold text-white">V</span>
        </div>

        <h2 className="text-lg font-semibold text-slate-800">
          Your session has expired
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Please sign in again to continue
        </p>

        <div className="mt-6 space-y-3">
          <button
            onClick={() => signIn('keycloak')}
            className="btn-primary w-full"
          >
            Continue with Keycloak
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-2 text-slate-400">or</span>
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
  );
}

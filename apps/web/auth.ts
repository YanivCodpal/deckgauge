import NextAuth from 'next-auth';
import Keycloak from 'next-auth/providers/keycloak';
import { isAuthorized } from './lib/is-authorized';

// Server-side calls use the Docker-internal URL when available (container→container);
// falls back to KEYCLOAK_ISSUER for local dev where localhost:8080 is directly reachable.
const keycloakServerUrl = process.env.KEYCLOAK_INTERNAL_URL ?? process.env.KEYCLOAK_ISSUER!;

async function refreshKeycloakToken(refreshToken: string) {
  const issuer = keycloakServerUrl;
  const res = await fetch(`${issuer}/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: process.env.KEYCLOAK_CLIENT_ID!,
      client_secret: process.env.KEYCLOAK_CLIENT_SECRET!,
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) throw new Error('Token refresh failed');
  return res.json() as Promise<{
    access_token: string;
    expires_in: number;
    refresh_token?: string;
  }>;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  pages: {
    signIn: '/login',
  },
  providers: [
    Keycloak({
      clientId: process.env.KEYCLOAK_CLIENT_ID!,
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET!,
      issuer: process.env.KEYCLOAK_ISSUER!,
      // In Docker, KEYCLOAK_ISSUER is localhost (for browser redirects) but containers
      // can't reach localhost:8080. Override all endpoints to bypass OIDC discovery:
      // - authorization: browser redirect → uses KEYCLOAK_ISSUER (localhost, reachable by browser)
      // - token/userinfo/jwks: server-side → uses KEYCLOAK_INTERNAL_URL (Docker service name)
      ...(process.env.KEYCLOAK_INTERNAL_URL && {
        authorization: `${process.env.KEYCLOAK_ISSUER}/protocol/openid-connect/auth`,
        token: `${process.env.KEYCLOAK_INTERNAL_URL}/protocol/openid-connect/token`,
        userinfo: `${process.env.KEYCLOAK_INTERNAL_URL}/protocol/openid-connect/userinfo`,
      }),
    }),
  ],
  callbacks: {
    authorized({ auth }) {
      return isAuthorized(auth as Parameters<typeof isAuthorized>[0]);
    },
    async jwt({ token, account }) {
      if (account) {
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          expiresAt: account.expires_at,
        };
      }
      if (
        typeof token.expiresAt === 'number' &&
        Date.now() / 1000 > token.expiresAt - 60
      ) {
        try {
          const refreshed = await refreshKeycloakToken(token.refreshToken as string);
          return {
            ...token,
            accessToken: refreshed.access_token,
            expiresAt: Math.floor(Date.now() / 1000) + refreshed.expires_in,
            refreshToken: refreshed.refresh_token ?? token.refreshToken,
            error: undefined,
          };
        } catch {
          return { ...token, error: 'RefreshAccessTokenError' };
        }
      }
      return token;
    },
    async session({ session, token }) {
      return {
        ...session,
        user: { ...session.user, id: token.sub },
        accessToken: token.accessToken as string,
        error: token.error as string | undefined,
      };
    },
  },
});

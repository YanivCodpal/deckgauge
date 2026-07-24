import { auth, signIn } from '@/auth';

/** Returns the Keycloak access token for the current session.
 *  If the token has expired and couldn't be refreshed, triggers re-login.
 */
export async function getAccessToken(): Promise<string> {
  const session = await auth();
  if (!session) await signIn('keycloak');
  if (session?.error === 'RefreshAccessTokenError') await signIn('keycloak');
  return session!.accessToken as string;
}

import { auth } from '@/auth';

export function getApiUrl(): string {
  return process.env.API_URL ?? 'http://localhost:3001';
}

export async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    const session = await auth();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const token = (session as any)?.accessToken as string | undefined;
    if (token) return { Authorization: `Bearer ${token}` };
  } catch {
    // No session available — continue without auth
  }
  return {};
}

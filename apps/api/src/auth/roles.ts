export const ADMIN_ROLE = process.env.COCKPIT_ADMIN_ROLE ?? 'cockpit-admin';

export function hasAdminRole(
  claims: { realm_access?: { roles?: string[] } },
  roleName: string = ADMIN_ROLE,
): boolean {
  return claims.realm_access?.roles?.includes(roleName) ?? false;
}

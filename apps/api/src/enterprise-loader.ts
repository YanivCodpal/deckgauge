/**
 * PUBLIC runtime loader for the open-core seam. Ships open-source.
 *
 * The free platform must build and run WITHOUT the private @deckgauge/enterprise
 * package present. So we never import it statically or declare it as a dependency
 * — we resolve it at runtime, by an explicit path, only when running the
 * enterprise edition. Absent/failed load → the app runs as Community.
 *
 * See planning/OPEN-CORE-ARCHITECTURE.md §4.
 */
import type { EnterpriseModule, LicenseStatus } from './enterprise-contract.js';

export const COMMUNITY_STATUS: LicenseStatus = {
  state: 'absent',
  edition: 'community',
  features: [],
  token: null,
  message: 'Community edition — enterprise features are not installed.',
};

export async function loadEnterprise(): Promise<EnterpriseModule | null> {
  if (process.env.DECKGAUGE_EDITION !== 'enterprise') {
    return null;
  }

  // Resolve by explicit path only. Bare-specifier resolution is intentionally
  // NOT attempted — apps must not depend on the private package.
  const modulePath = process.env.DECKGAUGE_ENTERPRISE_MODULE;
  if (!modulePath) {
    return null;
  }

  try {
    const mod = (await import(modulePath)) as {
      createEnterprise?: () => EnterpriseModule;
    };
    if (typeof mod.createEnterprise !== 'function') {
      return null;
    }
    return mod.createEnterprise();
  } catch (err) {
    console.warn('[enterprise] edition requested but module failed to load; running Community.', err);
    return null;
  }
}

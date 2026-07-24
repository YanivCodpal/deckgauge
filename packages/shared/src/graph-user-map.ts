export interface GraphUser {
  id: string;
  displayName: string | null;
  jobTitle: string | null;
  mail: string | null;
  userPrincipalName: string | null;
  officeLocation: string | null;
  mobilePhone: string | null;
  businessPhones: string[] | null;
  employeeId: string | null;
  employeeType: string | null;
  employeeHireDate?: string | null;
  department: string | null;
  /** Azure AD sign-in enabled flag. Departed staff keep their manager→directReports
   *  edge until the account is deleted, but their account is disabled first, so a
   *  `false` here marks someone who has left and must be excluded from the org tree. */
  accountEnabled?: boolean | null;
}

export interface MappedGraphEmployee {
  msGraphId: string;
  name: string;
  businessTitle: string | null;
  email: string | null;
  location: string | null;
  phone: string | null;
  employeeDisplayId: string | null;
  employeeType: string | null;
  hireDate: string | null;
  role: string | null;
}

export function mapGraphUserToEmployee(u: GraphUser): MappedGraphEmployee {
  return {
    msGraphId: u.id,
    name: u.displayName ?? u.userPrincipalName ?? u.mail ?? 'Unknown',
    businessTitle: u.jobTitle ?? null,
    email: u.mail ?? u.userPrincipalName ?? null,
    location: u.officeLocation ?? null,
    phone: u.mobilePhone ?? u.businessPhones?.[0] ?? null,
    employeeDisplayId: u.employeeId ?? null,
    employeeType: u.employeeType ?? null,
    hireDate: u.employeeHireDate ?? null,
    role: u.department ?? null,
  };
}

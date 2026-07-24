import { z } from 'zod/v4';

export const AzureDevOpsConfigInstanceSchema = z.object({
  name: z.string().min(1),
  orgUrl: z.string().url(),
  authMethod: z.enum(['PAT', 'BASIC']),
  accessToken: z.string().min(1),
  username: z.string().optional(),
  projects: z.array(z.string()).min(1),
});

export const AzureDevOpsConfigSchema = z.object({
  instances: z.array(AzureDevOpsConfigInstanceSchema).min(1),
});

export type AzureDevOpsConfig = z.infer<typeof AzureDevOpsConfigSchema>;

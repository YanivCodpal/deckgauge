import { z } from "zod/v4";

export const JiraConfigSchema = z.object({
  atlassianUrl: z.string().url("atlassianUrl must be a valid URL"),
  email: z.string().email("email must be a valid email address"),
  apiToken: z.string().min(1, "apiToken is required"),
  projectKeys: z
    .array(z.string())
    .min(1, "projectKeys must contain at least one key"),
});

export type JiraConfig = z.infer<typeof JiraConfigSchema>;

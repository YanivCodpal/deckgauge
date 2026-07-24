import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@deckgauge/db";
import { JiraInstanceService } from "./jira-instance.service.js";
import {
  CreateJiraInstanceInputSchema,
  UpdateJiraInstanceInputSchema,
} from "@deckgauge/shared";

export async function jiraInstanceRoutes(
  app: FastifyInstance,
  { prisma }: { prisma: PrismaClient },
) {
  const service = new JiraInstanceService(prisma);

  // GET /jira/instances — list all configured instances (tokens masked)
  app.get("/jira/instances", async (_req, reply) => {
    const instances = await service.list();
    return reply.send(instances);
  });

  // POST /jira/instances — add a new Jira instance
  app.post("/jira/instances", async (req, reply) => {
    const parsed = CreateJiraInstanceInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }
    const instance = await service.create(parsed.data);
    return reply.status(201).send(instance);
  });

  // PATCH /jira/instances/:id — update an instance
  app.patch<{ Params: { id: string } }>(
    "/jira/instances/:id",
    async (req, reply) => {
      const parsed = UpdateJiraInstanceInputSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.flatten() });
      }
      const instance = await service.update(req.params.id, parsed.data);
      if (!instance)
        return reply.status(404).send({ error: "Instance not found" });
      return reply.send(instance);
    },
  );

  // DELETE /jira/instances/:id — remove an instance
  app.delete<{ Params: { id: string } }>(
    "/jira/instances/:id",
    async (req, reply) => {
      const deleted = await service.delete(req.params.id);
      if (!deleted)
        return reply.status(404).send({ error: "Instance not found" });
      return reply.status(204).send();
    },
  );

  // POST /jira/instances/:id/test — test connectivity
  app.post<{ Params: { id: string } }>(
    "/jira/instances/:id/test",
    async (req, reply) => {
      const instance = await service.getRawById(req.params.id);
      if (!instance)
        return reply.status(404).send({ error: "Instance not found" });

      // Allow self-signed certs (corporate proxies)
      const origTls = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

      try {
        const credentials = `${instance.email}:${instance.apiToken}`;
        const encoded = Buffer.from(credentials).toString("base64");
        const baseUrl = instance.atlassianUrl.replace(/\/+$/, "");
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const res = await fetch(`${baseUrl}/rest/api/3/myself`, {
          headers: {
            Authorization: `Basic ${encoded}`,
            Accept: "application/json",
          },
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!res.ok) {
          const text = await res.text();
          return reply
            .status(422)
            .send({ ok: false, error: `Jira returned ${res.status}: ${text}` });
        }

        return reply.send({ ok: true });
      } catch (err: unknown) {
        let message = "Unknown error";
        if (err instanceof Error) {
          message = err.message;
          const cause = (err as Error & { cause?: Error }).cause;
          if (cause) message += ` — ${cause.message}`;
        }
        return reply.status(422).send({ ok: false, error: message });
      } finally {
        // Restore original TLS setting
        if (origTls !== undefined) {
          process.env.NODE_TLS_REJECT_UNAUTHORIZED = origTls;
        } else {
          delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
        }
      }
    },
  );

  // POST /jira/instances/:id/projects — discover accessible Jira projects
  app.post<{ Params: { id: string } }>(
    "/jira/instances/:id/projects",
    async (req, reply) => {
      const instance = await service.getRawById(req.params.id);
      if (!instance)
        return reply.status(404).send({ error: "Instance not found" });

      const origTls = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

      try {
        const credentials = `${instance.email}:${instance.apiToken}`;
        const encoded = Buffer.from(credentials).toString("base64");
        const baseUrl = instance.atlassianUrl.replace(/\/+$/, "");
        const response = await fetch(`${baseUrl}/rest/api/3/project`, {
          headers: {
            Authorization: `Basic ${encoded}`,
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          const text = await response.text();
          return reply
            .status(422)
            .send({ error: `Jira API error: ${response.status} ${text}` });
        }

        const projects = (await response.json()) as Array<{
          key: string;
          name: string;
        }>;
        return reply.send(
          projects.map((p) => ({ key: p.key, name: p.name })),
        );
      } catch (err: unknown) {
        let message = "Unknown error";
        if (err instanceof Error) {
          message = err.message;
          const cause = (err as Error & { cause?: Error }).cause;
          if (cause) message += ` — ${cause.message}`;
        }
        return reply
          .status(422)
          .send({ error: `Failed to fetch projects: ${message}` });
      } finally {
        if (origTls !== undefined) {
          process.env.NODE_TLS_REJECT_UNAUTHORIZED = origTls;
        } else {
          delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
        }
      }
    },
  );

  // GET /jira/instances/:id/projects/:projectKey/issue-types
  // Returns alphabetically sorted list of issue type names from the Jira project.
  app.get<{ Params: { id: string; projectKey: string } }>(
    "/jira/instances/:id/projects/:projectKey/issue-types",
    async (req, reply) => {
      const instance = await service.getRawById(req.params.id);
      if (!instance)
        return reply.status(404).send({ error: "Instance not found" });

      const origTls = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

      try {
        const credentials = `${instance.email}:${instance.apiToken}`;
        const encoded = Buffer.from(credentials).toString("base64");
        const baseUrl = instance.atlassianUrl.replace(/\/+$/, "");
        const response = await fetch(
          `${baseUrl}/rest/api/3/project/${req.params.projectKey}`,
          {
            headers: {
              Authorization: `Basic ${encoded}`,
              Accept: "application/json",
            },
          },
        );

        if (!response.ok) {
          const text = await response.text();
          return reply
            .status(422)
            .send({ error: `Jira API error: ${response.status} ${text}` });
        }

        const project = (await response.json()) as {
          issueTypes?: Array<{ name: string; subtask?: boolean }>;
        };

        const types = (project.issueTypes ?? [])
          .filter((t) => t.name && !t.subtask) // exclude Sub-task by default
          .map((t) => t.name)
          .sort();

        return reply.send(types);
      } catch (err: unknown) {
        let message = "Unknown error";
        if (err instanceof Error) {
          const cause = (err as Error & { cause?: Error }).cause;
          message = cause ? `${err.message} — ${cause.message}` : err.message;
        }
        return reply
          .status(422)
          .send({ error: `Failed to fetch issue types: ${message}` });
      } finally {
        if (origTls !== undefined) {
          process.env.NODE_TLS_REJECT_UNAUTHORIZED = origTls;
        } else {
          delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
        }
      }
    },
  );
}

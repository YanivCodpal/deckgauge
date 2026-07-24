import type { FastifyInstance } from "fastify";
import {
  ProjectService,
  CreateProjectInputSchema,
  UpdateProjectInputSchema,
  ReorderInputSchema,
} from "./project.service.js";
import { AutomationService } from "../automations/automation.service.js";
import type { PrismaClient } from "@deckgauge/db";
import { z } from "zod";

// Bulk delete accepts a batch of project ids. The board's "delete selected"
// action chunks large selections client-side; this cap bounds a single request
// body well under Fastify's default limit while still covering normal batches.
const MoveToBoardSchema = z.object({ targetGroupId: z.string().uuid() });

const BulkDeleteSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(10000),
});

// Optional server-side filtering/sorting for the board project list. All fields
// optional → omitting them all reproduces the original unfiltered behavior.
// `status` accepts a repeated param or a comma-separated string.
const ProjectListQuerySchema = z.object({
  boardId: z.string().uuid().optional(),
  groupId: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(500).optional(),
  search: z.string().trim().min(1).optional(),
  status: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) =>
      v === undefined ? undefined : Array.isArray(v) ? v : v.split(","),
    ),
  sortColumn: z.enum(["name", "owner", "status", "updatedAt"]).optional(),
  sortDir: z.enum(["asc", "desc"]).optional(),
});

export async function projectRoutes(
  app: FastifyInstance,
  { prisma }: { prisma: PrismaClient },
) {
  const service = new ProjectService(prisma);
  const automationService = new AutomationService(prisma);

  // GET /projects?boardId=&groupId=&page=&pageSize=&search=&status=&sortColumn=&sortDir=
  //   → { items, total, hasMore }
  app.get("/projects", async (req, reply) => {
    const parsed = ProjectListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }
    const q = parsed.data;
    const result = await service.list({
      boardId: q.boardId,
      groupId: q.groupId,
      page: q.page,
      pageSize: q.pageSize,
      search: q.search,
      statuses: q.status,
      sort: q.sortColumn
        ? { column: q.sortColumn, direction: q.sortDir ?? "asc" }
        : undefined,
    });
    return reply.send(result);
  });

  // GET /projects/:id (includes field values)
  app.get<{ Params: { id: string } }>(
    "/projects/:id",
    async (req, reply) => {
      const project = await service.getById(req.params.id);
      if (!project) return reply.status(404).send({ error: "Not found" });
      const fieldValues = await prisma.projectFieldValue.findMany({
        where: { projectId: req.params.id },
      });
      return reply.send({ ...project, fieldValues });
    },
  );

  // POST /projects
  app.post("/projects", async (req, reply) => {
    const parsed = CreateProjectInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }
    const project = await service.create(parsed.data);
    return reply.status(201).send(project);
  });

  // PATCH /projects/:id
  app.patch<{ Params: { id: string } }>(
    "/projects/:id",
    async (req, reply) => {
      const parsed = UpdateProjectInputSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.flatten() });
      }

      // Get current state for automation trigger evaluation
      const before = await service.getById(req.params.id);
      if (!before) return reply.status(404).send({ error: "Not found" });

      const project = await service.update(req.params.id, parsed.data, req.user?.id);
      if (!project) return reply.status(404).send({ error: "Not found" });

      // Evaluate automation triggers if the project has a board.
      // Pass both enum status and statusId so custom board-status changes also fire.
      if (project.boardId) {
        try {
          await automationService.evaluateTriggers(project.boardId, project.id, {
            status: project.status,
            previousStatus: before.status,
            statusId: project.statusId,
            previousStatusId: before.statusId,
          });
        } catch (err) {
          app.log.error(err, 'Automation trigger evaluation failed');
        }
      }

      return reply.send(project);
    },
  );

  // DELETE /projects/:id
  app.delete<{ Params: { id: string } }>(
    "/projects/:id",
    async (req, reply) => {
      const deleted = await service.delete(req.params.id, req.user?.id);
      if (!deleted) return reply.status(404).send({ error: "Not found" });
      return reply.status(204).send();
    },
  );

  // POST /projects/bulk-delete  { ids: string[] } → { deleted: number }
  // One request deletes the whole batch; replaces the old client loop that
  // issued one DELETE per id (which timed out on large selections).
  app.post("/projects/bulk-delete", async (req, reply) => {
    const parsed = BulkDeleteSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }
    const deleted = await service.deleteMany(parsed.data.ids, req.user?.id);
    return reply.send({ deleted });
  });

  // POST /projects/reorder
  app.post("/projects/reorder", async (req, reply) => {
    const parsed = ReorderInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }
    const projects = await service.reorder(parsed.data);
    return reply.send(projects);
  });

  // POST /projects/:id/move-to-board
  app.post<{ Params: { id: string } }>('/projects/:id/move-to-board', async (req, reply) => {
    const parsed = MoveToBoardSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    try {
      const result = await service.moveProjectToBoard(req.params.id, parsed.data.targetGroupId, req.user?.id);
      return reply.send(result);
    } catch (err) {
      const msg = (err as Error).message;
      const code = msg.endsWith('_NOT_FOUND') ? 404 : 400;
      return reply.code(code).send({ error: msg });
    }
  });
}

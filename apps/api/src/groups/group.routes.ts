import type { FastifyInstance } from "fastify";
import {
  GroupService,
  CreateGroupInputSchema,
  UpdateGroupInputSchema,
  ReorderGroupsInputSchema,
} from "./group.service.js";
import type { PrismaClient } from "@deckgauge/db";

export async function groupRoutes(
  app: FastifyInstance,
  { prisma }: { prisma: PrismaClient },
) {
  const service = new GroupService(prisma);

  // GET /boards/:boardId/groups
  app.get<{ Params: { boardId: string } }>(
    "/boards/:boardId/groups",
    async (req, reply) => {
      const groups = await service.listByBoard(req.params.boardId);
      return reply.send(groups);
    },
  );

  // GET /boards/:boardId/group-summaries → [{ groupId, total, statusCounts }]
  app.get<{ Params: { boardId: string } }>(
    "/boards/:boardId/group-summaries",
    async (req, reply) => {
      const summaries = await service.summariesByBoard(req.params.boardId);
      return reply.send(summaries);
    },
  );

  // GET /groups/:id
  app.get<{ Params: { id: string } }>(
    "/groups/:id",
    async (req, reply) => {
      const group = await service.getById(req.params.id);
      if (!group) return reply.status(404).send({ error: "Not found" });
      return reply.send(group);
    },
  );

  // POST /groups
  app.post("/groups", async (req, reply) => {
    const parsed = CreateGroupInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }
    const group = await service.create(parsed.data);
    if (!group) return reply.status(404).send({ error: "Board not found" });
    return reply.status(201).send(group);
  });

  // PATCH /groups/:id
  app.patch<{ Params: { id: string } }>(
    "/groups/:id",
    async (req, reply) => {
      const parsed = UpdateGroupInputSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.flatten() });
      }
      const group = await service.update(req.params.id, parsed.data);
      if (!group) return reply.status(404).send({ error: "Not found" });
      return reply.send(group);
    },
  );

  // DELETE /groups/:id
  app.delete<{ Params: { id: string } }>(
    "/groups/:id",
    async (req, reply) => {
      const result = await service.delete(req.params.id);
      if (result.deleted) return reply.status(204).send();
      return reply.status(404).send({ error: "Not found" });
    },
  );

  // POST /groups/reorder
  app.post("/groups/reorder", async (req, reply) => {
    const parsed = ReorderGroupsInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }
    const groups = await service.reorderGroups(parsed.data);
    return reply.send(groups);
  });
}

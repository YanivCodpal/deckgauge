import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@deckgauge/db";
import { ColumnService } from "./column.service.js";
import {
  CreateColumnInputSchema,
  UpdateColumnInputSchema,
  UpsertFieldValuesInputSchema,
} from "@deckgauge/shared";

export async function columnRoutes(
  app: FastifyInstance,
  { prisma }: { prisma: PrismaClient },
) {
  const service = new ColumnService(prisma);

  // GET /boards/:id/columns — list columns for a board
  app.get<{ Params: { id: string } }>(
    "/boards/:id/columns",
    async (req, reply) => {
      const columns = await service.listByBoard(req.params.id);
      return reply.send(columns);
    },
  );

  // POST /boards/:id/columns — create a column
  app.post<{ Params: { id: string } }>(
    "/boards/:id/columns",
    async (req, reply) => {
      const parsed = CreateColumnInputSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.flatten() });
      }
      const column = await service.create(req.params.id, parsed.data);
      return reply.status(201).send(column);
    },
  );

  // PATCH /columns/:id — rename or reorder a column
  app.patch<{ Params: { id: string } }>(
    "/columns/:id",
    async (req, reply) => {
      const parsed = UpdateColumnInputSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.flatten() });
      }
      const column = await service.update(req.params.id, parsed.data);
      if (!column) return reply.status(404).send({ error: "Column not found" });
      return reply.send(column);
    },
  );

  // DELETE /columns/:id — delete column and its values
  app.delete<{ Params: { id: string } }>(
    "/columns/:id",
    async (req, reply) => {
      const deleted = await service.delete(req.params.id);
      if (!deleted) return reply.status(404).send({ error: "Column not found" });
      return reply.status(204).send();
    },
  );

  // PATCH /projects/:id/fields — upsert field values
  app.patch<{ Params: { id: string } }>(
    "/projects/:id/fields",
    async (req, reply) => {
      const parsed = UpsertFieldValuesInputSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.flatten() });
      }
      const values = await service.upsertFieldValues(req.params.id, parsed.data);
      if (!values) return reply.status(404).send({ error: "Project not found" });
      return reply.send(values);
    },
  );
}

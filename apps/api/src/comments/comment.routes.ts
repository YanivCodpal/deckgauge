import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@deckgauge/db";
import type { Prisma } from "@deckgauge/db";
import { CommentService } from "./comment.service.js";
import { CreateCommentInputSchema, UpdateCommentInputSchema } from "@deckgauge/shared";
import { z } from "zod";
import type { UploadService } from "../uploads/upload.service.js";

const UuidSchema = z.string().uuid();

export async function commentRoutes(
  app: FastifyInstance,
  { prisma, uploadService }: { prisma: PrismaClient; uploadService?: UploadService },
) {
  const service = new CommentService(prisma, uploadService);

  // GET /projects/comment-counts?projectIds=id1,id2
  // Registered first to avoid conflict with /projects/:id/comments
  app.get<{ Querystring: { projectIds?: string } }>(
    "/projects/comment-counts",
    async (req, reply) => {
      const raw = req.query.projectIds;
      if (!raw) return reply.send({});
      const ids = raw.split(",").filter(Boolean);
      const invalid = ids.some((id) => !UuidSchema.safeParse(id).success);
      if (invalid) {
        return reply.status(400).send({ error: "Invalid project ID in list" });
      }
      const counts = await service.countByProject(ids);
      return reply.send(counts);
    },
  );

  // GET /projects/:id/comments
  app.get<{ Params: { id: string } }>(
    "/projects/:id/comments",
    async (req, reply) => {
      const idParsed = UuidSchema.safeParse(req.params.id);
      if (!idParsed.success) {
        return reply.status(400).send({ error: "Invalid project ID" });
      }
      const comments = await service.listByProject(idParsed.data);
      return reply.send(comments);
    },
  );

  // POST /projects/:id/comments
  app.post<{ Params: { id: string } }>(
    "/projects/:id/comments",
    async (req, reply) => {
      const idParsed = UuidSchema.safeParse(req.params.id);
      if (!idParsed.success) {
        return reply.status(400).send({ error: "Invalid project ID" });
      }
      const parsed = CreateCommentInputSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.flatten() });
      }
      const comment = await service.create(idParsed.data, {
        content: parsed.data.content as Prisma.InputJsonValue,
        authorName: parsed.data.authorName,
        uploadIds: parsed.data.uploadIds,
      });
      return reply.status(201).send(comment);
    },
  );

  // PATCH /projects/:id/comments/:cid
  app.patch<{ Params: { id: string; cid: string } }>(
    "/projects/:id/comments/:cid",
    async (req, reply) => {
      const cidParsed = UuidSchema.safeParse(req.params.cid);
      if (!cidParsed.success) {
        return reply.status(400).send({ error: "Invalid comment ID" });
      }
      const parsed = UpdateCommentInputSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.flatten() });
      }
      const comment = await service.update(cidParsed.data, {
        ...parsed.data,
        content: parsed.data.content as Prisma.InputJsonValue | undefined,
      });
      if (!comment) return reply.status(404).send({ error: "Not found" });
      return reply.send(comment);
    },
  );

  // DELETE /projects/:id/comments/:cid
  app.delete<{ Params: { id: string; cid: string } }>(
    "/projects/:id/comments/:cid",
    async (req, reply) => {
      const cidParsed = UuidSchema.safeParse(req.params.cid);
      if (!cidParsed.success) {
        return reply.status(400).send({ error: "Invalid comment ID" });
      }
      const deleted = await service.remove(cidParsed.data);
      if (!deleted) return reply.status(404).send({ error: "Not found" });
      return reply.status(204).send();
    },
  );
}

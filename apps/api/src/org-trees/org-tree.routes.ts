import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  CreateOrgTreeSchema,
  RenameOrgTreeSchema,
  OrgEmployeeAliasInputSchema,
  CreateEmployeeSchema,
  UpdateEmployeeProfileSchema,
  MoveEmployeeSchema,
  resolveEmployeeIdentities,
  CreateEmployeeCommentInputSchema,
  UpdateEmployeeCommentInputSchema,
  SaveOrgSourceInputSchema,
  SaveOrgSourceConnectionSchema,
} from '@deckgauge/shared';
import type { OrgTreeService } from './org-tree.service.js';
import { OrgTreeCycleError, OrgEmployeeForbiddenError } from './org-tree.service.js';
import type { OrgSourceService } from './org-source.service.js';
import { parseOrgChartBuffer } from './org-chart-import.js';
import { EmployeeActivityService } from './employee-activity.service.js';
import { EmployeeCommentService } from './employee-comment.service.js';
import type { ClickHouseClient, PrismaClient } from '@deckgauge/db';
import type { Prisma } from '@deckgauge/db';
import type { UploadService } from '../uploads/upload.service.js';

export interface OrgTreeRoutesDeps {
  serviceFactory: () => OrgTreeService;
  enqueueSync: (treeId: string) => Promise<void>;
  enqueueSourceSync: (treeId: string) => Promise<void>;
  sourceService: OrgSourceService;
  clickhouse?: ClickHouseClient;
  prisma: PrismaClient;
  uploadService?: UploadService;
}

const uuid = z.string().uuid();

export function orgTreeRoutes(deps: OrgTreeRoutesDeps) {
  const service = deps.serviceFactory();
  return async function plugin(app: FastifyInstance) {
    const activityService = deps.clickhouse
      ? new EmployeeActivityService(deps.clickhouse)
      : null;
    const commentService = new EmployeeCommentService(deps.prisma, deps.uploadService);

    app.get('/org-trees', async () => service.list());

    app.post('/org-trees', async (req, reply) => {
      const body = CreateOrgTreeSchema.safeParse(req.body);
      if (!body.success) return reply.code(400).send({ error: body.error.flatten() });
      return service.create(body.data.name);
    });

    app.get<{ Params: { id: string } }>('/org-trees/:id', async (req, reply) => {
      if (!uuid.safeParse(req.params.id).success) return reply.code(400).send({ error: 'bad id' });
      const tree = await service.getWithEmployees(req.params.id, { includeSalary: req.isAdmin });
      if (!tree) return reply.code(404).send({ error: 'not found' });
      return tree;
    });

    app.patch<{ Params: { id: string } }>('/org-trees/:id', async (req, reply) => {
      if (!uuid.safeParse(req.params.id).success) return reply.code(400).send({ error: 'bad id' });
      const body = RenameOrgTreeSchema.safeParse(req.body);
      if (!body.success) return reply.code(400).send({ error: body.error.flatten() });
      const updated = await service.rename(req.params.id, body.data.name);
      if (!updated) return reply.code(404).send({ error: 'not found' });
      return updated;
    });

    app.delete<{ Params: { id: string } }>('/org-trees/:id', async (req, reply) => {
      if (!uuid.safeParse(req.params.id).success) return reply.code(400).send({ error: 'bad id' });
      await service.delete(req.params.id);
      return reply.code(204).send();
    });

    app.post<{ Params: { id: string } }>('/org-trees/:id/import', async (req, reply) => {
      if (!uuid.safeParse(req.params.id).success) return reply.code(400).send({ error: 'bad id' });
      const file = await req.file();
      if (!file) return reply.code(400).send({ error: 'no file' });
      const buf = await file.toBuffer();
      const rows = parseOrgChartBuffer(buf, file.filename);
      return service.importEmployees(req.params.id, rows);
    });

    app.post<{ Params: { id: string } }>('/org-trees/:id/sync', async (req, reply) => {
      if (!uuid.safeParse(req.params.id).success) return reply.code(400).send({ error: 'bad id' });
      try {
        await deps.enqueueSync(req.params.id);
      } catch {
        return reply.code(503).send({ error: 'sync queue unavailable' });
      }
      return reply.code(202).send({ enqueued: true });
    });

    app.get<{ Params: { id: string } }>('/org-trees/:id/sync-status', async (req, reply) => {
      if (!uuid.safeParse(req.params.id).success) return reply.code(400).send({ error: 'bad id' });
      return service.getSyncStatus(req.params.id);
    });

    app.get<{ Params: { id: string } }>('/org-trees/:id/source', async (req, reply) => {
      if (!uuid.safeParse(req.params.id).success) return reply.code(400).send({ error: 'bad id' });
      return deps.sourceService.getConfig(req.params.id);
    });

    app.put<{ Params: { id: string } }>('/org-trees/:id/source', async (req, reply) => {
      if (!uuid.safeParse(req.params.id).success) return reply.code(400).send({ error: 'bad id' });
      const body = SaveOrgSourceInputSchema.safeParse(req.body);
      if (!body.success) return reply.code(400).send({ error: body.error.flatten() });
      return deps.sourceService.saveConfig(req.params.id, body.data.rootUpn);
    });

    app.post<{ Params: { id: string } }>('/org-trees/:id/source/sync', async (req, reply) => {
      if (!uuid.safeParse(req.params.id).success) return reply.code(400).send({ error: 'bad id' });
      try {
        await deps.enqueueSourceSync(req.params.id);
        await deps.sourceService.markSyncing(req.params.id);
      } catch {
        return reply.code(503).send({ error: 'source sync queue unavailable' });
      }
      return reply.code(202).send({ enqueued: true });
    });

    // Persist a Microsoft Graph connection. Written server-to-server by the web layer
    // (a pasted access token, or a delegated refresh token) — tokens never transit
    // back to the browser.
    app.post<{ Params: { id: string } }>('/org-trees/:id/source/connection', async (req, reply) => {
      if (!uuid.safeParse(req.params.id).success) return reply.code(400).send({ error: 'bad id' });
      const body = SaveOrgSourceConnectionSchema.safeParse(req.body);
      if (!body.success) return reply.code(400).send({ error: body.error.flatten() });
      return deps.sourceService.saveConnection(req.params.id, {
        accessToken: body.data.accessToken ?? null,
        refreshToken: body.data.refreshToken ?? null,
        microsoftUpn: body.data.microsoftUpn,
        connectedByEmail: body.data.connectedByEmail ?? null,
      });
    });

    app.delete<{ Params: { id: string } }>('/org-trees/:id/source/connection', async (req, reply) => {
      if (!uuid.safeParse(req.params.id).success) return reply.code(400).send({ error: 'bad id' });
      const result = await deps.sourceService.clearConnection(req.params.id);
      if (!result) return reply.code(404).send({ error: 'not found' });
      return result;
    });

    // Comment routes — comment-counts MUST be registered before any /:id/... param route
    app.get<{ Querystring: { ids?: string } }>('/org-employees/comment-counts', async (req, reply) => {
      const raw = req.query.ids;
      if (!raw) return reply.send({});
      const ids = raw.split(',').filter(Boolean);
      if (ids.some((id) => !uuid.safeParse(id).success)) {
        return reply.code(400).send({ error: 'Invalid employee ID in list' });
      }
      return reply.send(await commentService.countByEmployee(ids));
    });

    app.get<{ Params: { id: string } }>('/org-employees/:id/comments', async (req, reply) => {
      if (!uuid.safeParse(req.params.id).success) return reply.code(400).send({ error: 'bad id' });
      return reply.send(await commentService.listByEmployee(req.params.id));
    });

    app.post<{ Params: { id: string } }>('/org-employees/:id/comments', async (req, reply) => {
      if (!uuid.safeParse(req.params.id).success) return reply.code(400).send({ error: 'bad id' });
      const parsed = CreateEmployeeCommentInputSchema.safeParse(req.body);
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
      const comment = await commentService.create(req.params.id, {
        content: parsed.data.content as Prisma.InputJsonValue,
        authorName: parsed.data.authorName,
        uploadIds: parsed.data.uploadIds,
      });
      return reply.code(201).send(comment);
    });

    app.patch<{ Params: { id: string; cid: string } }>(
      '/org-employees/:id/comments/:cid',
      async (req, reply) => {
        if (!uuid.safeParse(req.params.cid).success) return reply.code(400).send({ error: 'bad id' });
        const parsed = UpdateEmployeeCommentInputSchema.safeParse(req.body);
        if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
        const comment = await commentService.update(req.params.cid, {
          ...parsed.data,
          content: parsed.data.content as Prisma.InputJsonValue | undefined,
        });
        if (!comment) return reply.code(404).send({ error: 'Not found' });
        return reply.send(comment);
      },
    );

    app.delete<{ Params: { id: string; cid: string } }>(
      '/org-employees/:id/comments/:cid',
      async (req, reply) => {
        if (!uuid.safeParse(req.params.cid).success) return reply.code(400).send({ error: 'bad id' });
        const deleted = await commentService.remove(req.params.cid);
        if (!deleted) return reply.code(404).send({ error: 'Not found' });
        return reply.code(204).send();
      },
    );

    app.post<{ Params: { id: string } }>('/org-employees/:id/aliases', async (req, reply) => {
      if (!uuid.safeParse(req.params.id).success) return reply.code(400).send({ error: 'bad id' });
      const body = OrgEmployeeAliasInputSchema.safeParse(req.body);
      if (!body.success) return reply.code(400).send({ error: body.error.flatten() });
      return service.addAlias(req.params.id, body.data);
    });

    app.delete<{ Params: { id: string } }>('/org-employee-aliases/:id', async (req, reply) => {
      if (!uuid.safeParse(req.params.id).success) return reply.code(400).send({ error: 'bad id' });
      await service.deleteAlias(req.params.id);
      return reply.code(204).send();
    });

    app.post<{ Params: { id: string } }>('/org-trees/:id/employees', async (req, reply) => {
      if (!uuid.safeParse(req.params.id).success) return reply.code(400).send({ error: 'bad id' });
      const body = CreateEmployeeSchema.safeParse(req.body);
      if (!body.success) return reply.code(400).send({ error: body.error.flatten() });
      return service.createEmployee(req.params.id, body.data);
    });

    app.patch<{ Params: { id: string } }>('/org-employees/:id', async (req, reply) => {
      if (!uuid.safeParse(req.params.id).success) return reply.code(400).send({ error: 'bad id' });
      const body = UpdateEmployeeProfileSchema.safeParse(req.body);
      if (!body.success) return reply.code(400).send({ error: body.error.flatten() });
      try {
        await service.updateEmployee(req.params.id, body.data, { canEditSalary: req.isAdmin });
        return reply.code(204).send();
      } catch (err) {
        if (err instanceof OrgEmployeeForbiddenError) return reply.code(403).send({ error: 'forbidden' });
        throw err;
      }
    });

    app.get<{ Params: { id: string } }>('/org-employees/:id/activity', async (req, reply) => {
      if (!uuid.safeParse(req.params.id).success) return reply.code(400).send({ error: 'bad id' });
      const employee = await service.getEmployeeForActivity(req.params.id);
      if (!employee) return reply.code(404).send({ error: 'not found' });
      if (!activityService) {
        return { commits: [], pullRequests: [], assignedIssues: [] };
      }
      const identities = resolveEmployeeIdentities(employee);
      return activityService.forEmployee(identities);
    });

    app.delete<{ Params: { id: string } }>('/org-employees/:id', async (req, reply) => {
      if (!uuid.safeParse(req.params.id).success) return reply.code(400).send({ error: 'bad id' });
      await service.deleteEmployee(req.params.id);
      return reply.code(204).send();
    });

    app.patch<{ Params: { id: string } }>('/org-employees/:id/move', async (req, reply) => {
      if (!uuid.safeParse(req.params.id).success) return reply.code(400).send({ error: 'bad id' });
      const body = MoveEmployeeSchema.safeParse(req.body);
      if (!body.success) return reply.code(400).send({ error: body.error.flatten() });
      try {
        await service.moveEmployee(req.params.id, body.data);
        return reply.code(204).send();
      } catch (err) {
        if (err instanceof OrgTreeCycleError) return reply.code(409).send({ error: 'cycle' });
        throw err;
      }
    });
  };
}

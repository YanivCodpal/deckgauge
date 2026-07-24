import type { FastifyInstance } from 'fastify';
import { createReadStream } from 'node:fs';
import { join } from 'node:path';
import type { UploadService } from './upload.service.js';

const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
]);

export async function uploadRoutes(
  app: FastifyInstance,
  { service }: { service: UploadService },
) {
  // POST /api/uploads?projectId=:id  OR  /api/uploads?orgEmployeeId=:id
  app.post<{ Querystring: { projectId?: string; orgEmployeeId?: string } }>(
    '/api/uploads',
    async (req, reply) => {
      const { projectId, orgEmployeeId } = req.query;
      if (!projectId && !orgEmployeeId) {
        return reply.status(400).send({ error: 'projectId or orgEmployeeId is required' });
      }

      const data = await req.file();
      if (!data) {
        return reply.status(400).send({ error: 'No file provided' });
      }

      if (!ALLOWED_MIME_TYPES.has(data.mimetype)) {
        await data.toBuffer(); // drain
        return reply
          .status(400)
          .send({ error: `Unsupported mime type: ${data.mimetype}` });
      }

      const buffer = await data.toBuffer();

      try {
        const upload = await service.saveFile({
          projectId,
          orgEmployeeId,
          mimeType: data.mimetype,
          buffer,
        });
        return reply.send({ id: upload.id, url: `/api/uploads/${upload.id}` });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        if (msg === 'Project not found' || msg === 'Employee not found') {
          return reply.status(422).send({ error: msg });
        }
        throw err;
      }
    },
  );

  // GET /api/uploads/:id
  app.get<{ Params: { id: string } }>(
    '/api/uploads/:id',
    async (req, reply) => {
      const upload = await service.findById(req.params.id);
      if (!upload) {
        return reply.status(404).send({ error: 'Not found' });
      }

      const filePath = join(service.dir, upload.filename);
      reply.header('Content-Type', upload.mimeType);
      return reply.send(createReadStream(filePath));
    },
  );
}

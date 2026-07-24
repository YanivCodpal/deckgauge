import type { PrismaClient, RoadmapAccessRole } from '@deckgauge/db';
import type { FastifyRequest, FastifyReply } from 'fastify';

const ROLE_RANK: Record<RoadmapAccessRole, number> = { VIEWER: 0, EDITOR: 1, OWNER: 2 };

export function requireRoadmapAccess(db: PrismaClient, minRole: RoadmapAccessRole) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) return reply.code(401).send({ error: 'Unauthorized' });
    const { id } = request.params as { id: string };
    const access = await db.roadmapAccess.findUnique({
      where: { roadmapId_userId: { roadmapId: id, userId: request.user.id } },
    });
    if (!access || ROLE_RANK[access.role] < ROLE_RANK[minRole]) {
      return reply.code(403).send({ error: 'Forbidden' });
    }
  };
}

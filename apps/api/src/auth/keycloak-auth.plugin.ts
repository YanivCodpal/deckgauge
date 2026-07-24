import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import type { PrismaClient } from '@deckgauge/db';
import { verifyKeycloakJwt } from './keycloak-jwt.js';
import { UserService } from '../users/user.service.js';
import { hasAdminRole } from './roles.js';

// Returns a Fastify plugin factory that closes over the prisma client.
// Register this inside a scoped sub-app so the preHandler only applies
// to protected routes — public routes (e.g. /health) stay outside.
export function buildKeycloakAuthPlugin(prisma: PrismaClient): FastifyPluginAsync {
  return fp(async (app: FastifyInstance) => {
    const userService = new UserService(prisma);

    app.decorateRequest('isAdmin', false);

    app.addHook('preHandler', async (request, _reply) => {
      const authHeader = request.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        // V1: single-user, no auth required — allow unauthenticated access
        return;
      }
      const token = authHeader.slice(7);
      try {
        const claims = await verifyKeycloakJwt(token);
        request.user = await userService.upsertFromKeycloak({
          keycloakId: claims.sub,
          email: claims.email,
          name: claims.name ?? claims.preferred_username,
        });
        request.isAdmin = hasAdminRole(claims);
        // Best-effort: link any unlinked BoardOwner labels that match this user's email
        await prisma.boardOwner.updateMany({
          where: { userId: null, name: { equals: request.user.email, mode: 'insensitive' } },
          data: { userId: request.user.id },
        });
      } catch (err) {
        // Token invalid/expired — continue without req.user. Write routes that
        // require authentication enforce it themselves and reject with 401.
        request.log.warn(
          { err: err instanceof Error ? err.message : String(err) },
          'JWT verification failed — continuing unauthenticated',
        );
      }
    });
  });
}

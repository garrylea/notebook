import fp from 'fastify-plugin';
import { FastifyRequest, FastifyReply } from 'fastify';
import { verifyAccessToken } from '../utils/jwt';

export default fp(async (fastify) => {
    fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const authHeader = request.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return reply.error('Unauthorized', 401);
            }

            const token = authHeader.split(' ')[1];
            const payload = verifyAccessToken(token);
            request.user = { id: payload.userId };
        } catch (err) {
            return reply.error('Invalid or expired token', 401);
        }
    });
});

declare module 'fastify' {
    interface FastifyInstance {
        authenticate: any;
    }
    interface FastifyRequest {
        user: { id: string };
    }
}

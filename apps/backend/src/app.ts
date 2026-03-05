import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import responsePlugin from './plugins/response';
import errorHandlerPlugin from './plugins/errorHandler';
import authRoutes from './modules/auth/auth.route';

export function buildApp(opts = {}) {
    const app = Fastify({
        logger: {
            transport: {
                target: 'pino-pretty',
                options: {
                    translateTime: 'HH:MM:ss Z',
                    ignore: 'pid,hostname',
                },
            },
            ...opts
        }
    });

    // Configure CORS
    app.register(cors, {
        origin: '*'
    });

    // Register Plugins
    app.register(cookie);
    app.register(responsePlugin);
    app.register(errorHandlerPlugin);

    app.register(authRoutes, { prefix: '/api/v1/auth' });

    // Health check endpoint
    app.get('/api/health', async (request, reply) => {
        return reply.success({ timestamp: new Date().toISOString() }, 'System is healthy');
    });

    return app;
}

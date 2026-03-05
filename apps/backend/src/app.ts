import Fastify from 'fastify';
import cors from '@fastify/cors';
import responsePlugin from './plugins/response';
import errorHandlerPlugin from './plugins/errorHandler';

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
    app.register(responsePlugin);
    app.register(errorHandlerPlugin);

    // Health check endpoint
    app.get('/api/health', async (request, reply) => {
        return reply.success({ timestamp: new Date().toISOString() }, 'System is healthy');
    });

    return app;
}

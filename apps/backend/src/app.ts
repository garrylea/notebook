import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import multipart from '@fastify/multipart';
import responsePlugin from './plugins/response';
import errorHandlerPlugin from './plugins/errorHandler';
import authPlugin from './plugins/auth';
import authRoutes from './modules/auth/auth.route';
import attachmentRoutes from './modules/attachments/attachments.route';
import noteRoutes from './modules/notes/notes.route';
import subtaskRoutes from './modules/subtasks/subtasks.route';
import statsRoutes from './modules/stats/stats.route';
import fastifyStatic from '@fastify/static';
import path from 'path';

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
    app.register(multipart, {
        limits: {
            fileSize: (Number(process.env.MAX_UPLOAD_SIZE_MB) || 500) * 1024 * 1024,
        }
    });
    app.register(responsePlugin);
    app.register(errorHandlerPlugin);
    app.register(authPlugin);

    // Serve static uploaded files
    app.register(fastifyStatic, {
        root: path.resolve(process.cwd(), process.env.UPLOADS_DIR || 'uploads'),
        prefix: '/uploads/', // Serve at /uploads/...
    });

    // Register API Routes
    app.register(authRoutes, { prefix: '/api/v1/auth' });
    app.register(noteRoutes, { prefix: '/api/v1/notes' });
    app.register(attachmentRoutes, { prefix: '/api/v1/notes/:noteId/attachments' });
    app.register(subtaskRoutes, { prefix: '/api/v1/notes/:noteId/subtasks' });
    app.register(statsRoutes, { prefix: '/api/v1/stats' });

    // Health check endpoint
    app.get('/api/health', async (request, reply) => {
        return reply.success({ timestamp: new Date().toISOString() }, 'System is healthy');
    });

    return app;
}

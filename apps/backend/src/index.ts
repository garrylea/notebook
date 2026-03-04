import Fastify from 'fastify';
import cors from '@fastify/cors';
import responsePlugin from './plugins/response';
import errorHandlerPlugin from './plugins/errorHandler';

const fastify = Fastify({
    logger: {
        transport: {
            target: 'pino-pretty',
            options: {
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname',
            },
        },
    }
});

// Configure CORS
fastify.register(cors, {
    origin: '*'
});

// Register Plugins
fastify.register(responsePlugin);
fastify.register(errorHandlerPlugin);

// Health check endpoint
fastify.get('/api/health', async (request, reply) => {
    return reply.success({ timestamp: new Date().toISOString() }, 'System is healthy');
});

const start = async () => {
    try {
        await fastify.listen({ port: 3000, host: '0.0.0.0' });
        fastify.log.info(`Server listening at http://localhost:3000`);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();

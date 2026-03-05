import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { register, login, refresh, logout } from './auth.controller';

const authRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
    fastify.post('/register', register);
    fastify.post('/login', login);
    fastify.post('/refresh', refresh);
    fastify.post('/logout', logout);
};

export default authRoutes;

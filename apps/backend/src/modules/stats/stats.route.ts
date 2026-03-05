import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { getOverview, getTrend, getColorDistribution, getCalendarNotes } from './stats.controller';

const statsRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
    fastify.addHook('onRequest', fastify.authenticate);

    fastify.get('/overview', getOverview);
    fastify.get('/trend', getTrend);
    fastify.get('/color-distribution', getColorDistribution);
    fastify.get('/calendar', getCalendarNotes);
};

export default statsRoutes;

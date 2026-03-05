import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { createSubtask, updateSubtask, deleteSubtask, reorderSubtasks } from './subtasks.controller';

const subtaskRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
    fastify.addHook('onRequest', fastify.authenticate);

    fastify.post('/', createSubtask);
    fastify.put('/:subtaskId', updateSubtask);
    fastify.delete('/:subtaskId', deleteSubtask);
    fastify.patch('/reorder', reorderSubtasks);
};

export default subtaskRoutes;

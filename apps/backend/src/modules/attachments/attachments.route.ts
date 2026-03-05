import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { uploadSub5M, initChunk, uploadChunk, mergeChunks, deleteAttachment } from './attachments.controller';

const attachmentRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
    // All these routes need to be guarded
    fastify.addHook('onRequest', fastify.authenticate);

    fastify.post('/', uploadSub5M);
    fastify.post('/init-chunk', initChunk);
    fastify.post('/:uploadId/chunk', uploadChunk);
    fastify.post('/:uploadId/merge', mergeChunks);
    fastify.delete('/:attachmentId', deleteAttachment);
};

export default attachmentRoutes;

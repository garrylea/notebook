import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { createNote, getNotes, getNoteById, updateNoteStatus, deleteNote } from './notes.controller';

const noteRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
    fastify.addHook('onRequest', fastify.authenticate);

    fastify.post('/', createNote);
    fastify.get('/', getNotes);
    fastify.get('/:id', getNoteById);
    fastify.patch('/:id/status', updateNoteStatus);
    fastify.delete('/:id', deleteNote);
};

export default noteRoutes;

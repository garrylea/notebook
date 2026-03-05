import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { createNote, getNotes, getNoteById, updateNote, updateNoteStatus, restoreNote, deleteNote } from './notes.controller';

const noteRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
    fastify.addHook('onRequest', fastify.authenticate);

    fastify.post('/', createNote);
    fastify.get('/', getNotes);
    fastify.get('/:id', getNoteById);
    fastify.put('/:id', updateNote);
    fastify.patch('/:id/status', updateNoteStatus);
    fastify.post('/:id/restore', restoreNote);
    fastify.delete('/:id', deleteNote);
};

export default noteRoutes;

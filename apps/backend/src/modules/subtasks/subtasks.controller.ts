import { FastifyRequest, FastifyReply } from 'fastify';
import prisma from '../../utils/prisma';

export const createSubtask = async (request: FastifyRequest<{ Params: { noteId: string } }>, reply: FastifyReply) => {
    const { noteId } = request.params;
    const { title, status, parent_id, due_date, assignee } = request.body as any;
    const userId = request.user.id;

    if (!title) {
        return reply.error('Subtask title is required', 400);
    }

    const note = await prisma.note.findUnique({ where: { id: noteId } });
    if (!note || note.userId !== userId) {
        return reply.error('Note not found', 404);
    }

    // Get max sort_order
    const maxSort = await prisma.subtask.aggregate({
        where: { noteId, parent_id: parent_id || null },
        _max: { sort_order: true }
    });

    const nextOrder = (maxSort._max.sort_order || 0) + 1;

    const subtask = await prisma.subtask.create({
        data: {
            title,
            noteId,
            parent_id: parent_id || null,
            status: status || 'pending',
            is_completed: status === 'completed',
            sort_order: nextOrder,
            due_date: due_date ? new Date(due_date) : null,
            assignee
        }
    });

    return reply.success(subtask);
};

export const updateSubtask = async (request: FastifyRequest<{ Params: { noteId: string, subtaskId: string } }>, reply: FastifyReply) => {
    const { noteId, subtaskId } = request.params;
    const { title, status, sort_order, due_date, assignee } = request.body as any;
    const userId = request.user.id;

    const note = await prisma.note.findUnique({ where: { id: noteId } });
    if (!note || note.userId !== userId) {
        return reply.error('Note not found', 404);
    }

    const subtask = await prisma.subtask.findUnique({ where: { id: subtaskId, noteId } });
    if (!subtask) {
        return reply.error('Subtask not found', 404);
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (sort_order !== undefined) updateData.sort_order = sort_order;
    if (due_date !== undefined) updateData.due_date = due_date ? new Date(due_date) : null;
    if (assignee !== undefined) updateData.assignee = assignee;
    if (status !== undefined) {
        updateData.status = status;
        const isCompleted = status === 'completed';
        updateData.is_completed = isCompleted;
        if (isCompleted) updateData.completed_at = new Date();
    }

    const updated = await prisma.subtask.update({
        where: { id: subtaskId },
        data: updateData
    });

    return reply.success(updated);
};

export const deleteSubtask = async (request: FastifyRequest<{ Params: { noteId: string, subtaskId: string } }>, reply: FastifyReply) => {
    const { noteId, subtaskId } = request.params;
    const userId = request.user.id;

    const note = await prisma.note.findUnique({ where: { id: noteId } });
    if (!note || note.userId !== userId) {
        return reply.error('Note not found', 404);
    }

    const subtask = await prisma.subtask.findUnique({ where: { id: subtaskId, noteId } });
    if (!subtask) {
        return reply.error('Subtask not found', 404);
    }

    await prisma.subtask.delete({
        where: { id: subtaskId }
    });

    return reply.success(null, 'Deleted successfully');
};

export const reorderSubtasks = async (request: FastifyRequest<{ Params: { noteId: string } }>, reply: FastifyReply) => {
    const { noteId } = request.params;
    const userId = request.user.id;
    const orders = request.body as Array<{ id: string, sort_order: number }>;

    if (!Array.isArray(orders)) {
        return reply.error('Invalid payload format', 400);
    }

    const note = await prisma.note.findUnique({ where: { id: noteId } });
    if (!note || note.userId !== userId) {
        return reply.error('Note not found', 404);
    }

    // Spec dictates batch updates mapping subtask id to sort_order
    await prisma.$transaction(
        orders.map(item =>
            prisma.subtask.update({
                where: { id: item.id },
                data: { sort_order: item.sort_order }
            })
        )
    );

    return reply.success(null, 'Reordered successfully');
};

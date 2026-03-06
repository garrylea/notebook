import { FastifyRequest, FastifyReply } from 'fastify';
import prisma from '../../utils/prisma';

export const createNote = async (request: FastifyRequest, reply: FastifyReply) => {
    const { title, color, due_date, content, tags, priority } = request.body as any;
    const userId = request.user.id;

    if (!title || !color) {
        return reply.error('Title and color are required', 400);
    }

    const note = await prisma.note.create({
        data: {
            title,
            color,
            due_date: due_date ? new Date(due_date) : null,
            content: content || '',
            tags: tags ? JSON.stringify(tags) : null,
            priority: priority || 'medium',
            userId: userId,
            status: 'in_progress'
        }
    });

    return reply.success(note);
};

export const getNotes = async (request: FastifyRequest, reply: FastifyReply) => {
    const { page = 1, limit = 10, keyword, status, color, start_date, end_date, sort_by } = request.query as any;
    const userId = request.user.id;

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where: any = { userId, is_deleted: 0 };
    if (keyword) {
        where.title = { contains: keyword, mode: 'insensitive' };
    }
    if (status) {
        if (status === 'active') where.status = { in: ['draft', 'in_progress'] };
        else if (status === 'history') where.status = 'completed';
        else if (status === 'deleted') where.is_deleted = 1;
        else where.status = status;
    }
    if (color) where.color = color;
    if (start_date || end_date) {
        where.created_at = {};
        if (start_date) where.created_at.gte = new Date(start_date);
        if (end_date) where.created_at.lte = new Date(end_date);
    }

    let orderBy: any[] = [];
    if (sort_by) {
        const sorts = sort_by.split(',');
        for (const sort of sorts) {
            if (sort === 'priority_desc') orderBy.push({ priority: 'desc' });
            if (sort === 'priority_asc') orderBy.push({ priority: 'asc' });
            if (sort === 'created_at_desc') orderBy.push({ created_at: 'desc' });
            if (sort === 'created_at_asc') orderBy.push({ created_at: 'asc' });
            if (sort === 'due_date_desc') orderBy.push({ due_date: 'desc' });
            if (sort === 'due_date_asc') orderBy.push({ due_date: 'asc' });
            if (sort === 'updated_at_desc') orderBy.push({ updated_at: 'desc' });
        }
    } else {
        orderBy = [{ priority: 'desc' }, { created_at: 'desc' }];
    }

    // Spec AN-1 dictates returning total along with items
    const [total, items] = await Promise.all([
        prisma.note.count({ where }),
        prisma.note.findMany({ skip, take, where, orderBy })
    ]);

    return reply.success({
        total,
        page: Number(page),
        limit: Number(limit),
        items
    });
};

export const getNoteById = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    const userId = request.user.id;

    // Spec AN-2 describes embedding subtasks, attachments and activity logs
    const note = await prisma.note.findUnique({
        where: { id },
        include: {
            subtasks: {
                where: { parent_id: null }, // Fetch root level
                orderBy: { sort_order: 'asc' },
                include: {
                    children: {
                        orderBy: { sort_order: 'asc' },
                        include: {
                            children: { orderBy: { sort_order: 'asc' } } // Up to 3 levels
                        }
                    }
                }
            },
            attachments: {
                where: { is_deleted: 0 }
            },
            activityLogs: {
                orderBy: { created_at: 'desc' },
                take: 10
            }
        }
    });

    if (!note || note.userId !== userId) {
        return reply.error('Note not found', 404);
    }

    return reply.success(note);
};

export const updateNoteStatus = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    const { status, remark } = request.body as any;
    const userId = request.user.id;

    if (!status) return reply.error('Status is required', 400);

    const checkNote = await prisma.note.findUnique({ where: { id } });
    if (!checkNote || checkNote.userId !== userId) {
        return reply.error('Note not found', 404);
    }

    const previousStatus = checkNote.status;

    const result = await prisma.$transaction(async (tx) => {
        const updateData: any = { status };
        if (status === 'completed') {
            updateData.completed_at = new Date();
        }

        const updatedNote = await tx.note.update({
            where: { id },
            data: updateData
        });

        await tx.activityLog.create({
            data: {
                noteId: id,
                userId: userId,
                action_type: 'UPDATE_STATUS',
                detail: JSON.stringify({ from: previousStatus, to: status, remark })
            }
        });

        return updatedNote;
    });

    return reply.success(result, 'Status updated');
};

export const updateNote = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    const userId = request.user.id;
    const { title, color, content, due_date, priority, tags } = request.body as any;

    const check = await prisma.note.findUnique({ where: { id } });
    if (!check || check.userId !== userId) {
        return reply.error('Note not found', 404);
    }

    const updated = await prisma.note.update({
        where: { id },
        data: {
            title,
            color,
            content,
            priority,
            tags: tags !== undefined ? JSON.stringify(tags) : undefined,
            due_date: due_date ? new Date(due_date) : null,
        }
    });

    return reply.success(updated);
};

export const restoreNote = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    const userId = request.user.id;

    const check = await prisma.note.findUnique({ where: { id } });
    if (!check || check.userId !== userId) {
        return reply.error('Note not found', 404);
    }

    await prisma.note.update({
        where: { id },
        data: { is_deleted: 0, status: 'in_progress' }
    });

    return reply.success(null, 'Note restored to workspace');
};

export const deleteNote = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    const userId = request.user.id;

    const checkNote = await prisma.note.findUnique({ where: { id } });
    if (!checkNote || checkNote.userId !== userId) {
        return reply.error('Note not found', 404);
    }

    await prisma.note.update({
        where: { id },
        data: { is_deleted: 1 } // Soft delete
    });

    return reply.success(null, 'Note exported to recycle bin');
};

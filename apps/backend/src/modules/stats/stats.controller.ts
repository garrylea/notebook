import { FastifyRequest, FastifyReply } from 'fastify';
import prisma from '../../utils/prisma';

/**
 * GET /stats/overview
 * Returns counts of active notes grouped by status for the current user.
 */
export const getOverview = async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user.id;

    const rows = await prisma.note.groupBy({
        by: ['status'],
        where: { userId, is_deleted: 0 },
        _count: { status: true }
    });

    const result: Record<string, number> = {
        in_progress: 0,
        completed: 0,
        suspended: 0,
        draft: 0,
        archived: 0,
    };

    for (const row of rows) {
        result[row.status] = row._count.status;
    }

    // Also count deleted (recycle bin)
    const deletedCount = await prisma.note.count({ where: { userId, is_deleted: 1 } });
    result.deleted = deletedCount;

    const total = Object.values(result).reduce((acc, v) => acc + v, 0);

    return reply.success({ ...result, total_active: result.in_progress + result.draft, total });
};

/**
 * GET /stats/trend?period=week|month
 * Returns daily completed task counts over the given period.
 */
export const getTrend = async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user.id;
    const { period = 'week' } = request.query as any;

    const now = new Date();
    const days = period === 'month' ? 30 : 7;
    const startDate = new Date(now);
    startDate.setDate(now.getDate() - days);

    // Group completed notes by day using Prisma raw SQL
    const rows: any[] = await prisma.$queryRaw`
        SELECT DATE(completed_at) as date, COUNT(*) as count
        FROM busi_note
        WHERE user_id = ${userId}
          AND status = 'completed'
          AND is_deleted = 0
          AND completed_at >= ${startDate}
          AND completed_at <= ${now}
        GROUP BY DATE(completed_at)
        ORDER BY date ASC
    `;

    // Fill missing days with 0
    const dateMap = new Map(rows.map(r => {
        const dStr = r.date instanceof Date ? r.date.toISOString().slice(0, 10) : String(r.date).slice(0, 10);
        return [dStr, Number(r.count)];
    }));
    const series: { date: string; count: number }[] = [];
    for (let i = days; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const dateStr = d.toISOString().slice(0, 10);
        series.push({ date: dateStr, count: dateMap.get(dateStr) ?? 0 });
    }

    return reply.success(series);
};

/**
 * GET /stats/color-distribution
 * Returns the count of active notes per color label.
 */
export const getColorDistribution = async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user.id;

    const rows = await prisma.note.groupBy({
        by: ['color'],
        where: { userId, is_deleted: 0 },
        _count: { color: true }
    });

    const data = rows.map(r => ({ color: r.color, count: r._count.color }));
    return reply.success(data);
};

/**
 * GET /stats/calendar?start=YYYY-MM-DD&end=YYYY-MM-DD
 * Returns notes with due_date in the given range for calendar heatmap rendering.
 */
export const getCalendarNotes = async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user.id;
    const { start, end } = request.query as any;

    const where: any = {
        userId,
        is_deleted: 0,
    };

    if (start) {
        where.created_at = { gte: new Date(start + 'T00:00:00.000Z') };
    }
    if (end) {
        where.created_at = { ...where.created_at, lte: new Date(end + 'T23:59:59.999Z') };
    }

    const notes = await prisma.note.findMany({
        where,
        select: {
            id: true,
            title: true,
            color: true,
            priority: true,
            status: true,
            due_date: true,
            created_at: true,
        } as any,
        orderBy: { created_at: 'asc' }
    });

    return reply.success(notes);
};

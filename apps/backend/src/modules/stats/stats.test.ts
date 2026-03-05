import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { buildApp } from '../../app';
import prisma from '../../utils/prisma';
import { generateAccessToken } from '../../utils/jwt';

vi.mock('../../utils/prisma');

describe('Stats Module', () => {
    const app = buildApp({ logger: false });
    const mockUserId = 'user-123';
    let token: string;

    beforeAll(async () => {
        await app.ready();
        token = generateAccessToken({ userId: mockUserId });
    });

    afterAll(async () => {
        await app.close();
    });

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('GET /stats/overview', () => {
        it('should return aggregated counts by status', async () => {
            vi.mocked(prisma.note.groupBy).mockResolvedValue([
                { status: 'in_progress', _count: { status: 5 } },
                { status: 'completed', _count: { status: 12 } },
                { status: 'suspended', _count: { status: 2 } },
            ] as any);

            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/stats/overview',
                headers: { authorization: `Bearer ${token}` }
            });

            expect(response.statusCode).toBe(200);
            const body = response.json();
            expect(body.data.in_progress).toBe(5);
            expect(body.data.completed).toBe(12);
            expect(body.data.suspended).toBe(2);
        });
    });

    describe('GET /stats/trend', () => {
        it('should return daily completed note counts for a given period', async () => {
            vi.mocked(prisma.$queryRawUnsafe).mockResolvedValue([
                { date: '2026-03-01', count: 3 },
                { date: '2026-03-02', count: 5 },
            ] as any);

            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/stats/trend?period=week',
                headers: { authorization: `Bearer ${token}` }
            });

            expect(response.statusCode).toBe(200);
            const body = response.json();
            expect(Array.isArray(body.data)).toBe(true);
            expect(body.data[0]).toHaveProperty('date');
            expect(body.data[0]).toHaveProperty('count');
        });
    });

    describe('GET /stats/color-distribution', () => {
        it('should return count of notes grouped by color', async () => {
            vi.mocked(prisma.note.groupBy).mockResolvedValue([
                { color: 'red', _count: { color: 4 } },
                { color: 'blue', _count: { color: 7 } },
                { color: 'green', _count: { color: 2 } },
            ] as any);

            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/stats/color-distribution',
                headers: { authorization: `Bearer ${token}` }
            });

            expect(response.statusCode).toBe(200);
            const body = response.json();
            expect(Array.isArray(body.data)).toBe(true);
            expect(body.data.find((d: any) => d.color === 'blue').count).toBe(7);
        });
    });

    describe('GET /stats/calendar', () => {
        it('should return notes with due dates in range for calendar heatmap', async () => {
            vi.mocked(prisma.note.findMany).mockResolvedValue([
                { id: 'n1', title: 'Test', due_date: new Date('2026-03-05'), color: 'red', priority: 'urgent' }
            ] as any);

            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/stats/calendar?start=2026-03-01&end=2026-03-31',
                headers: { authorization: `Bearer ${token}` }
            });

            expect(response.statusCode).toBe(200);
            const body = response.json();
            expect(Array.isArray(body.data)).toBe(true);
            expect(body.data[0]).toHaveProperty('due_date');
        });
    });
});

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { buildApp } from '../../app';
import prisma from '../../utils/prisma';
import { generateAccessToken } from '../../utils/jwt';

vi.mock('../../utils/prisma');

describe('Subtasks Module', () => {
    const app = buildApp({ logger: false });
    const mockUserId = 'user-123';
    const mockNoteId = 'note-123';
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
        // default mock for auth checks
        vi.mocked(prisma.note.findUnique).mockResolvedValue({
            id: mockNoteId,
            userId: mockUserId
        } as any);
    });

    describe('POST /subtasks', () => {
        it('should correctly create a subtask and assign max sort order', async () => {
            vi.mocked(prisma.subtask.aggregate).mockResolvedValue({
                _max: { sort_order: 5 }
            } as any);

            vi.mocked(prisma.subtask.create).mockResolvedValue({
                id: 'sub-1',
                title: 'test subtask',
                sort_order: 6
            } as any);

            const response = await app.inject({
                method: 'POST',
                url: `/api/v1/notes/${mockNoteId}/subtasks`,
                headers: { authorization: `Bearer ${token}` },
                payload: { title: 'test subtask' }
            });

            expect(response.statusCode).toBe(200);
            const body = response.json();
            expect(body.data.sort_order).toBe(6);
            expect(prisma.subtask.create).toHaveBeenCalled();
        });
    });

    describe('PUT /subtasks/:subtaskId', () => {
        it('should update subtask including status properly', async () => {
            vi.mocked(prisma.subtask.findUnique).mockResolvedValue({ id: 'sub-1', noteId: mockNoteId } as any);
            vi.mocked(prisma.subtask.update).mockResolvedValue({ status: 'completed', is_completed: true } as any);

            const response = await app.inject({
                method: 'PUT',
                url: `/api/v1/notes/${mockNoteId}/subtasks/sub-1`,
                headers: { authorization: `Bearer ${token}` },
                payload: { status: 'completed' }
            });

            expect(response.statusCode).toBe(200);
            expect(prisma.subtask.update).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({ status: 'completed', is_completed: true })
            }));
        });
    });

    describe('DELETE /subtasks/:subtaskId', () => {
        it('should perform hard delete for subtask', async () => {
            vi.mocked(prisma.subtask.findUnique).mockResolvedValue({ id: 'sub-1', noteId: mockNoteId } as any);
            vi.mocked(prisma.subtask.delete).mockResolvedValue({} as any);

            const response = await app.inject({
                method: 'DELETE',
                url: `/api/v1/notes/${mockNoteId}/subtasks/sub-1`,
                headers: { authorization: `Bearer ${token}` }
            });

            expect(response.statusCode).toBe(200);
            expect(prisma.subtask.delete).toHaveBeenCalled();
        });
    });

    describe('PATCH /subtasks/reorder', () => {
        it('should update sort_order for multiple subtasks in a transaction', async () => {
            vi.mocked(prisma.$transaction).mockResolvedValue([] as any);

            const response = await app.inject({
                method: 'PATCH',
                url: `/api/v1/notes/${mockNoteId}/subtasks/reorder`,
                headers: { authorization: `Bearer ${token}` },
                payload: [
                    { id: 'sub-1', sort_order: 1 },
                    { id: 'sub-2', sort_order: 2 }
                ]
            });

            expect(response.statusCode).toBe(200);
            expect(prisma.$transaction).toHaveBeenCalled();
        });
    });
});

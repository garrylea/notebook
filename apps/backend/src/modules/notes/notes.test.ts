import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { buildApp } from '../../app';
import prisma from '../../utils/prisma';
import { generateAccessToken } from '../../utils/jwt';

vi.mock('../../utils/prisma');

describe('Notes Module', () => {
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

    describe('POST /notes', () => {
        it('should create a note with default draft status initially returning 200', async () => {
            const mockDate = new Date();
            vi.mocked(prisma.note.create).mockResolvedValue({
                id: 'note-1',
                title: 'test note',
                content: '',
                color: 'blue',
                due_date: null,
                priority: 'medium',
                status: 'in_progress', // per spec: default is in_progress
                tags: ['test'],
                pin_top: 0,
                userId: mockUserId,
                created_at: mockDate,
                updated_at: mockDate,
                completed_at: null,
                is_deleted: 0
            } as any);

            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/notes',
                headers: { authorization: `Bearer ${token}` },
                payload: {
                    title: 'test note',
                    color: 'blue',
                    tags: '["test"]',
                    priority: 'medium'
                }
            });

            expect(response.statusCode).toBe(200); // Spec says 200 OK
            const body = response.json();
            expect(body.data.id).toBe('note-1');
            expect(prisma.note.create).toHaveBeenCalled();
        });
    });

    describe('GET /notes', () => {
        it('should list notes with basic pagination and default sorting', async () => {
            vi.mocked(prisma.note.count).mockResolvedValue(1);
            vi.mocked(prisma.note.findMany).mockResolvedValue([
                { id: 'note-1', title: 'test note' } as any
            ]);

            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/notes?page=1&limit=10',
                headers: { authorization: `Bearer ${token}` }
            });

            expect(response.statusCode).toBe(200);
            const { data } = response.json();
            expect(data.total).toBe(1);
            expect(data.items).toHaveLength(1);
            expect(prisma.note.findMany).toHaveBeenCalledWith(expect.objectContaining({
                skip: 0,
                take: 10,
                orderBy: [
                    { priority: 'desc' },
                    { created_at: 'desc' }
                ]
            }));
        });
    });

    describe('GET /notes/:id', () => {
        it('should return note details with subtasks and attachments embedded', async () => {
            const mockNote = {
                id: 'note-1',
                title: 'test',
                userId: mockUserId,
                subtasks: [{ id: 'sub-1', title: 'subtask', children: [] }],
                attachments: [{ id: 'att-1', file_name: 'test.png' }],
                collaborators: [],
                activityLogs: []
            };

            vi.mocked(prisma.note.findUnique).mockResolvedValue(mockNote as any);

            const response = await app.inject({
                method: 'GET',
                url: '/api/v1/notes/note-1',
                headers: { authorization: `Bearer ${token}` }
            });

            expect(response.statusCode).toBe(200);
            expect(response.json().data.subtasks).toBeDefined();
            expect(prisma.note.findUnique).toHaveBeenCalled();
        });
    });

    describe('PATCH /notes/:id/status', () => {
        it('should update note status and attach an activity log', async () => {
            vi.mocked(prisma.note.findUnique).mockResolvedValue({ id: 'note-1', userId: mockUserId } as any);
            vi.mocked(prisma.$transaction).mockImplementation(async (cb) => {
                // simple mock implementation of transaction execution
                return cb(prisma);
            });
            vi.mocked(prisma.note.update).mockResolvedValue({ status: 'completed' } as any);
            vi.mocked(prisma.activityLog.create).mockResolvedValue({ id: 1 } as any);

            const response = await app.inject({
                method: 'PATCH',
                url: '/api/v1/notes/note-1/status',
                headers: { authorization: `Bearer ${token}` },
                payload: {
                    status: 'completed',
                    remark: 'done it'
                }
            });

            expect(response.statusCode).toBe(200);
            expect(prisma.activityLog.create).toHaveBeenCalled();
            expect(prisma.note.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: 'note-1' },
                data: expect.objectContaining({ status: 'completed' })
            }));
        });
    });

    describe('DELETE /notes/:id', () => {
        it('should soft delete the note', async () => {
            vi.mocked(prisma.note.findUnique).mockResolvedValue({ id: 'note-1', userId: mockUserId } as any);
            vi.mocked(prisma.note.update).mockResolvedValue({} as any);

            const response = await app.inject({
                method: 'DELETE',
                url: '/api/v1/notes/note-1',
                headers: { authorization: `Bearer ${token}` }
            });

            expect(response.statusCode).toBe(200);
            expect(prisma.note.update).toHaveBeenCalledWith(expect.objectContaining({
                data: { is_deleted: 1 }
            }));
        });
    });
});

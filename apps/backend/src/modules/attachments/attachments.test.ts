import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { buildApp } from '../../app';
import prisma from '../../utils/prisma';
import fs from 'fs/promises';
import { generateAccessToken } from '../../utils/jwt';
import FormData from 'form-data';

vi.mock('../../utils/prisma');
vi.mock('fs/promises');

describe('Attachments Module', () => {
    const app = buildApp({ logger: false });
    let token: string;
    const mockUserId = 'user-123';
    const mockNoteId = 'note-123';

    beforeAll(async () => {
        await app.ready();
        token = generateAccessToken({ userId: mockUserId });
    });

    afterAll(async () => {
        await app.close();
    });

    beforeEach(() => {
        vi.clearAllMocks();
        // Assume note belongs to user by default
        vi.mocked(prisma.note.findUnique).mockResolvedValue({
            id: mockNoteId,
            userId: mockUserId
        } as any);

        vi.mocked(fs.access).mockResolvedValue();
        vi.mocked(fs.mkdir).mockResolvedValue(undefined);
        vi.mocked(fs.writeFile).mockResolvedValue();
        vi.mocked(fs.appendFile).mockResolvedValue();
        vi.mocked(fs.readFile).mockResolvedValue(Buffer.from('mockdata'));
        vi.mocked(fs.readdir).mockResolvedValue([] as any);
        vi.mocked(fs.rm).mockResolvedValue();
        vi.mocked(fs.unlink).mockResolvedValue();
    });

    describe('POST /attachments - small file upload', () => {
        it('should return 400 if no file is provided', async () => {
            const formData = new FormData();

            const response = await app.inject({
                method: 'POST',
                url: `/api/v1/notes/${mockNoteId}/attachments`,
                headers: {
                    ...formData.getHeaders(),
                    authorization: `Bearer ${token}`
                },
                payload: formData.getBuffer()
            });

            expect(response.statusCode).toBe(400);
        });

        it('should upload small file successfully', async () => {
            const formData = new FormData();
            formData.append('file', Buffer.from('test file content'), { filename: 'test.txt', contentType: 'text/plain' });

            const mockAttachmentRecord = {
                id: 'attach-123',
                noteId: mockNoteId,
                file_name: 'test.txt',
                file_size: 17n,
                file_path: '/uploads/abc',
                md5_hash: 'hash'
            };
            vi.mocked(prisma.attachment.create).mockResolvedValue(mockAttachmentRecord as any);

            const response = await app.inject({
                method: 'POST',
                url: `/api/v1/notes/${mockNoteId}/attachments`,
                headers: {
                    ...formData.getHeaders(),
                    authorization: `Bearer ${token}`
                },
                payload: formData
            });

            expect(response.statusCode).toBe(200);
            const body = response.json();
            expect(body.code).toBe(200);
            expect(body.data[0].id).toBe('attach-123');
            expect(fs.writeFile).toHaveBeenCalled();
            expect(prisma.attachment.create).toHaveBeenCalled();
        });
    });

    describe('POST /attachments/init-chunk', () => {
        it('should initialize chunk upload and return empty progress if fresh', async () => {
            // Mock access throws to trigger catch block for fresh upload
            vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'));

            const response = await app.inject({
                method: 'POST',
                url: `/api/v1/notes/${mockNoteId}/attachments/init-chunk`,
                headers: {
                    authorization: `Bearer ${token}`
                },
                payload: {
                    filename: 'video.mp4',
                    file_size: 15000000,
                    total_chunks: 3,
                    hash: 'abc123hash'
                }
            });

            expect(response.statusCode).toBe(200);
            expect(response.json().data.upload_id).toBe('abc123hash');
            expect(response.json().data.uploaded_chunks).toEqual([]);
        });

        it('should return existing chunks if resuming upload', async () => {
            // Mock access success and readdir returning partial chunks
            vi.mocked(fs.access).mockResolvedValue();
            vi.mocked(fs.readdir).mockResolvedValue(['chunk_0', 'chunk_1'] as any);

            const response = await app.inject({
                method: 'POST',
                url: `/api/v1/notes/${mockNoteId}/attachments/init-chunk`,
                headers: {
                    authorization: `Bearer ${token}`
                },
                payload: {
                    filename: 'video.mp4',
                    file_size: 15000000,
                    total_chunks: 3,
                    hash: 'abc123hash'
                }
            });

            expect(response.statusCode).toBe(200);
            expect(response.json().data.uploaded_chunks).toEqual([0, 1]);
        });
    });

    describe('POST /attachments/:uploadId/chunk', () => {
        it('should receive and write a chunk', async () => {
            const formData = new FormData();
            formData.append('chunk_index', '1');
            formData.append('chunk_data', Buffer.from('chunk content inside file stream'), { filename: 'blob', contentType: 'application/octet-stream' });

            const uploadId = 'abc123hash';

            const response = await app.inject({
                method: 'POST',
                url: `/api/v1/notes/${mockNoteId}/attachments/${uploadId}/chunk`,
                headers: {
                    ...formData.getHeaders(),
                    authorization: `Bearer ${token}`
                },
                payload: formData
            });

            expect(response.statusCode).toBe(200);
            expect(fs.writeFile).toHaveBeenCalled();
            // Call 1 of writeFile, should include the uploadId and chunk_1
            const writeFileCall = vi.mocked(fs.writeFile).mock.calls[0][0];
            expect(writeFileCall).toMatch(/abc123hash/);
            expect(writeFileCall).toMatch(/chunk_1/);
        });
    });

    describe('POST /attachments/:uploadId/merge', () => {
        it('should reject if chunks are missing', async () => {
            vi.mocked(fs.access).mockResolvedValue();
            vi.mocked(fs.readdir).mockResolvedValue(['chunk_0'] as any); // Only 1 chunk exists

            const response = await app.inject({
                method: 'POST',
                url: `/api/v1/notes/${mockNoteId}/attachments/abc123hash/merge`,
                headers: { authorization: `Bearer ${token}` },
                payload: {
                    filename: 'video.mp4',
                    total_chunks: 2,
                    hash: 'abc123hash'
                }
            });

            expect(response.statusCode).toBe(400);
            expect(response.json().message).toBe('Missing chunks, cannot merge');
        });

        it('should merge chunks and create db record successfully', async () => {
            vi.mocked(fs.access).mockResolvedValue();
            vi.mocked(fs.readdir).mockResolvedValue(['chunk_0', 'chunk_1'] as any);

            // To pass the verify hash step we need our fake md5 to match the payload's hash
            const crypto = await import('crypto');
            const fakeMergedBuffer = Buffer.from('mockdata');
            const mergedHash = crypto.createHash('md5').update(fakeMergedBuffer).digest('hex');

            const mockAttachmentRecord = {
                id: 'attach-merged',
                noteId: mockNoteId,
                file_name: 'video.mp4',
                file_size: 100n,
                file_path: '/uploads/merged.mp4',
                md5_hash: mergedHash
            };
            vi.mocked(prisma.attachment.create).mockResolvedValue(mockAttachmentRecord as any);

            const response = await app.inject({
                method: 'POST',
                url: `/api/v1/notes/${mockNoteId}/attachments/abc123hash/merge`,
                headers: { authorization: `Bearer ${token}` },
                payload: {
                    filename: 'video.mp4',
                    total_chunks: 2,
                    hash: mergedHash
                }
            });

            expect(response.statusCode).toBe(200);
            expect(fs.appendFile).toHaveBeenCalledTimes(2); // Because total_chunks is 2
            expect(prisma.attachment.create).toHaveBeenCalled();
            expect(fs.rm).toHaveBeenCalled(); // cleanup temp folder
        });
    });

    describe('DELETE /attachments/:attachmentId', () => {
        it('should soft delete attachment', async () => {
            vi.mocked(prisma.attachment.findUnique).mockResolvedValue({ id: 'att-1' } as any);
            vi.mocked(prisma.attachment.update).mockResolvedValue({} as any);

            const response = await app.inject({
                method: 'DELETE',
                url: `/api/v1/notes/${mockNoteId}/attachments/att-1`,
                headers: { authorization: `Bearer ${token}` }
            });

            expect(response.statusCode).toBe(200);
            expect(prisma.attachment.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: 'att-1' },
                data: { is_deleted: 1 }
            }));
        });
    });
});

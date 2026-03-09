import { FastifyRequest, FastifyReply } from 'fastify';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import prisma from '../../utils/prisma';

const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads');
const CHUNK_DIR = path.join(UPLOADS_DIR, '.tmp');
const MAX_UPLOAD_MB = Number(process.env.MAX_UPLOAD_SIZE_MB) || 500;

const ensureDirs = async () => {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
    await fs.mkdir(CHUNK_DIR, { recursive: true });
};

// Start ensure dir
ensureDirs().catch(console.error);

export const uploadSub5M = async (request: FastifyRequest<{ Params: { noteId: string } }>, reply: FastifyReply) => {
    const data = await request.file();
    if (!data) return reply.error('No file provided', 400);

    const noteId = request.params.noteId;
    const userId = request.user.id;

    // Auth Check: Does note belong to user? (MVP validation)
    const note = await prisma.note.findUnique({ where: { id: noteId } });
    if (!note || note.userId !== userId) {
        return reply.error('Note not found or unauthorized', 403);
    }

    const buffer = await data.toBuffer();

    // File size guard
    if (buffer.length > MAX_UPLOAD_MB * 1024 * 1024) {
        return reply.error(`File size exceeds ${MAX_UPLOAD_MB}MB limit format. Please use chunked upload.`, 400);
    }

    const hash = crypto.createHash('md5').update(buffer).digest('hex');
    const secureId = crypto.randomUUID();
    const finalPath = path.join(UPLOADS_DIR, userId, noteId);
    await fs.mkdir(finalPath, { recursive: true });

    const filePath = path.join(finalPath, `${secureId}_${data.filename}`);
    await fs.writeFile(filePath, buffer);

    const relativeUrl = `/uploads/${userId}/${noteId}/${secureId}_${data.filename}`;

    const attachmentRecord = await prisma.attachment.create({
        data: {
            noteId,
            file_name: data.filename,
            file_type: data.mimetype || 'application/octet-stream',
            file_size: buffer.length,
            file_path: relativeUrl,
            md5_hash: hash
        }
    });

    // We stringify BigInt for JSON serialization 
    const responseData = {
        ...attachmentRecord,
        file_size: Number(attachmentRecord.file_size)
    };

    return reply.success([responseData]);
};

export const initChunk = async (request: FastifyRequest<{ Params: { noteId: string }, Body: { filename: string, file_size: number, total_chunks: number, hash: string } }>, reply: FastifyReply) => {
    const { hash } = request.body;
    const noteId = request.params.noteId;

    const existingChunkDir = path.join(CHUNK_DIR, hash);
    try {
        await fs.access(existingChunkDir);
        const files = await fs.readdir(existingChunkDir);
        const uploadedChunks = files
            .map(f => parseInt(f.replace('chunk_', '')))
            .filter(n => !isNaN(n));

        return reply.success({
            upload_id: hash,
            uploaded_chunks: uploadedChunks
        });
    } catch (e) {
        // Doesn't exist, start fresh
        await fs.mkdir(existingChunkDir, { recursive: true });
        return reply.success({
            upload_id: hash,
            uploaded_chunks: []
        });
    }
};

export const uploadChunk = async (request: FastifyRequest<{ Params: { uploadId: string } }>, reply: FastifyReply) => {
    const uploadId = request.params.uploadId;
    const data = await request.file();

    if (!data) return reply.error('No chunk data provided', 400);

    const chunkIndexField = data.fields['chunk_index'] as any;
    if (!chunkIndexField) return reply.error('No chunk index provided', 400);

    const chunkIndex = chunkIndexField.value;

    const chunkPath = path.join(CHUNK_DIR, uploadId, `chunk_${chunkIndex}`);
    const buffer = await data.toBuffer();
    await fs.writeFile(chunkPath, buffer);

    return reply.success(null, 'Chunk uploaded successfully');
};

export const mergeChunks = async (request: FastifyRequest<{ Params: { noteId: string, uploadId: string }, Body: { filename: string, total_chunks: number, hash: string } }>, reply: FastifyReply) => {
    const { uploadId, noteId } = request.params;
    const { filename, total_chunks, hash } = request.body;
    const userId = request.user.id;

    const chunkFolderPath = path.join(CHUNK_DIR, uploadId);

    try {
        await fs.access(chunkFolderPath);
    } catch {
        return reply.error('Upload session not found', 404);
    }

    // Verify all chunks exist
    const files = await fs.readdir(chunkFolderPath);
    if (files.length !== total_chunks) {
        return reply.error('Missing chunks, cannot merge', 400);
    }

    const secureId = crypto.randomUUID();
    const finalDir = path.join(UPLOADS_DIR, userId, noteId);
    await fs.mkdir(finalDir, { recursive: true });

    const ext = path.extname(filename);
    const finalFilePath = path.join(finalDir, `${secureId}${ext}`);

    // Create write stream
    try {
        for (let i = 0; i < total_chunks; i++) {
            const currentChunkPath = path.join(chunkFolderPath, `chunk_${i}`);
            const data = await fs.readFile(currentChunkPath);
            await fs.appendFile(finalFilePath, data);
        }

        // Verify hash roughly
        const mergedBuffer = await fs.readFile(finalFilePath);
        const mergedHash = crypto.createHash('md5').update(mergedBuffer).digest('hex');

        if (mergedHash !== hash) {
            await fs.unlink(finalFilePath);
            return reply.error('Hash verification failed', 400);
        }

        // Cleanup
        await fs.rm(chunkFolderPath, { recursive: true, force: true });

        const relativeUrl = `/uploads/${userId}/${noteId}/${secureId}${ext}`;
        const record = await prisma.attachment.create({
            data: {
                noteId,
                file_name: filename,
                file_type: 'application/octet-stream',
                file_size: mergedBuffer.length,
                file_path: relativeUrl,
                md5_hash: mergedHash
            }
        });

        return reply.success({
            ...record,
            file_size: Number(record.file_size)
        });

    } catch (e: any) {
        return reply.error('Merge error: ' + e.message, 500);
    }
};

export const deleteAttachment = async (request: FastifyRequest<{ Params: { attachmentId: string } }>, reply: FastifyReply) => {
    const attachmentId = request.params.attachmentId;

    const attachment = await prisma.attachment.findUnique({ where: { id: attachmentId } });
    if (!attachment) {
        return reply.error('Attachment not found', 404);
    }

    await prisma.attachment.update({
        where: { id: attachmentId },
        data: { is_deleted: 1 }
    });

    return reply.success(null, 'Deleted successfully');
};

/**
 * Full E2E Integration Test Suite — Real SQLite database, no mocks.
 *
 * Covers the core business flows described in Phase 2 TestCase design:
 * TC-AUTH-01 ~ TC-AUTH-04, TC-NOTE-01 ~ TC-NOTE-05, TC-STAT-01
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../app';

const app = buildApp({ logger: false });

// Shared state across tests (reflects real DB)
let accessToken: string;
let noteId: string;
let subtaskId: string;

beforeAll(async () => {
    await app.ready();
});

afterAll(async () => {
    await app.close();
});

// ─────────────────────────────────────────────────────────────────────────────
// AUTH FLOWS
// ─────────────────────────────────────────────────────────────────────────────
describe('TC-AUTH: Authentication & Authorization', () => {
    it('TC-AUTH-01: Register a new user', async () => {
        const res = await app.inject({
            method: 'POST',
            url: '/api/v1/auth/register',
            payload: {
                username: 'e2euser',
                email: 'e2e@test.com',
                password: 'Password123!',
            },
        });

        expect(res.statusCode).toBe(201);
        const body = res.json();
        expect(body.data.accessToken).toBeTruthy();
        expect(body.data.user.username).toBe('e2euser');
        accessToken = body.data.accessToken;
    });

    it('TC-AUTH-02: Reject duplicate registration', async () => {
        const res = await app.inject({
            method: 'POST',
            url: '/api/v1/auth/register',
            payload: {
                username: 'e2euser',
                email: 'e2e@test.com',
                password: 'Password123!',
            },
        });
        expect(res.statusCode).toBe(400);
        const body = res.json();
        expect(body.message).toMatch(/already exists/i);
    });

    it('TC-AUTH-03: Login with correct credentials', async () => {
        const res = await app.inject({
            method: 'POST',
            url: '/api/v1/auth/login',
            payload: { email: 'e2e@test.com', password: 'Password123!' },
        });
        expect(res.statusCode).toBe(200);
        const body = res.json();
        expect(body.data.accessToken).toBeTruthy();
        accessToken = body.data.accessToken; // refresh token for downstream tests
    });

    it('TC-AUTH-04: Reject incorrect password', async () => {
        const res = await app.inject({
            method: 'POST',
            url: '/api/v1/auth/login',
            payload: { email: 'e2e@test.com', password: 'WrongPassword' },
        });
        expect(res.statusCode).toBe(401);
    });

    it('TC-AUTH-05: Protected route rejects unauthenticated request', async () => {
        const res = await app.inject({
            method: 'GET',
            url: '/api/v1/notes',
        });
        expect(res.statusCode).toBe(401);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// NOTE CRUD FLOWS
// ─────────────────────────────────────────────────────────────────────────────
describe('TC-NOTE: Notes CRUD & State Machine', () => {
    const auth = () => ({ authorization: `Bearer ${accessToken}` });

    it('TC-NOTE-01: Create a note with all fields', async () => {
        const res = await app.inject({
            method: 'POST',
            url: '/api/v1/notes',
            headers: auth(),
            payload: {
                title: 'E2E Test Note',
                color: 'blue',
                priority: 'high',
                content: 'Integration test content',
                tags: ['e2e', 'test'],
                due_date: new Date(Date.now() + 86400000).toISOString(), // tomorrow
            },
        });

        expect(res.statusCode).toBe(200);
        const body = res.json();
        expect(body.data.title).toBe('E2E Test Note');
        expect(body.data.color).toBe('blue');
        expect(body.data.priority).toBe('high');
        expect(body.data.status).toBe('in_progress');
        noteId = body.data.id;
    });

    it('TC-NOTE-02: List notes returns the created note', async () => {
        const res = await app.inject({
            method: 'GET',
            url: '/api/v1/notes?page=1&limit=10',
            headers: auth(),
        });

        expect(res.statusCode).toBe(200);
        const body = res.json();
        expect(body.data.total).toBeGreaterThanOrEqual(1);
        const found = body.data.items.find((n: any) => n.id === noteId);
        expect(found).toBeDefined();
    });

    it('TC-NOTE-03: Get note by ID includes subtasks array', async () => {
        const res = await app.inject({
            method: 'GET',
            url: `/api/v1/notes/${noteId}`,
            headers: auth(),
        });

        expect(res.statusCode).toBe(200);
        const body = res.json();
        expect(body.data.id).toBe(noteId);
        expect(Array.isArray(body.data.subtasks)).toBe(true);
        expect(Array.isArray(body.data.attachments)).toBe(true);
    });

    it('TC-NOTE-04: Update a note', async () => {
        const res = await app.inject({
            method: 'PUT',
            url: `/api/v1/notes/${noteId}`,
            headers: auth(),
            payload: {
                title: 'E2E Test Note — Updated',
                color: 'red',
                priority: 'urgent',
                content: 'Updated content',
                tags: ['e2e', 'updated'],
            },
        });

        expect(res.statusCode).toBe(200);
        const body = res.json();
        expect(body.data.title).toBe('E2E Test Note — Updated');
        expect(body.data.color).toBe('red');
        expect(body.data.priority).toBe('urgent');
    });

    it('TC-NOTE-05: Status transition — mark completed', async () => {
        const res = await app.inject({
            method: 'PATCH',
            url: `/api/v1/notes/${noteId}/status`,
            headers: auth(),
            payload: { status: 'completed', remark: 'Done in E2E test' },
        });

        expect(res.statusCode).toBe(200);
        const body = res.json();
        expect(body.data.status).toBe('completed');
    });

    it('TC-NOTE-06: Soft delete moves note to recyclebin', async () => {
        const res = await app.inject({
            method: 'DELETE',
            url: `/api/v1/notes/${noteId}`,
            headers: auth(),
        });
        expect(res.statusCode).toBe(200);

        // Verify it no longer shows in active list
        const listRes = await app.inject({
            method: 'GET',
            url: '/api/v1/notes?status=active',
            headers: auth(),
        });
        const body = listRes.json();
        const found = body.data.items.find((n: any) => n.id === noteId);
        expect(found).toBeUndefined();
    });

    it('TC-NOTE-07: Restore brings note back to workspace', async () => {
        const res = await app.inject({
            method: 'POST',
            url: `/api/v1/notes/${noteId}/restore`,
            headers: auth(),
        });
        expect(res.statusCode).toBe(200);

        // Should appear in active list again
        const listRes = await app.inject({
            method: 'GET',
            url: '/api/v1/notes',
            headers: auth(),
        });
        const body = listRes.json();
        const found = body.data.items.find((n: any) => n.id === noteId);
        expect(found).toBeDefined();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUBTASK FLOWS
// ─────────────────────────────────────────────────────────────────────────────
describe('TC-SUB: Subtask Management', () => {
    const auth = () => ({ authorization: `Bearer ${accessToken}` });

    it('TC-SUB-01: Create a subtask under the note', async () => {
        const res = await app.inject({
            method: 'POST',
            url: `/api/v1/notes/${noteId}/subtasks`,
            headers: auth(),
            payload: { title: 'E2E Subtask 1' },
        });
        expect(res.statusCode).toBe(200);
        const body = res.json();
        expect(body.data.title).toBe('E2E Subtask 1');
        subtaskId = body.data.id;
    });

    it('TC-SUB-02: Mark subtask as completed', async () => {
        const res = await app.inject({
            method: 'PUT',
            url: `/api/v1/notes/${noteId}/subtasks/${subtaskId}`,
            headers: auth(),
            payload: { status: 'completed' },
        });
        expect(res.statusCode).toBe(200);
        const body = res.json();
        expect(body.data.status).toBe('completed');
        expect(body.data.is_completed).toBe(true);
    });

    it('TC-SUB-03: Delete a subtask', async () => {
        const res = await app.inject({
            method: 'DELETE',
            url: `/api/v1/notes/${noteId}/subtasks/${subtaskId}`,
            headers: auth(),
        });
        expect(res.statusCode).toBe(200);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// STATS FLOWS
// ─────────────────────────────────────────────────────────────────────────────
describe('TC-STAT: Statistics Endpoints', () => {
    const auth = () => ({ authorization: `Bearer ${accessToken}` });

    it('TC-STAT-01: Overview returns numeric counts per status', async () => {
        const res = await app.inject({
            method: 'GET',
            url: '/api/v1/stats/overview',
            headers: auth(),
        });
        expect(res.statusCode).toBe(200);
        const body = res.json();
        expect(typeof body.data.in_progress).toBe('number');
        expect(typeof body.data.completed).toBe('number');
        expect(typeof body.data.total).toBe('number');
    });

    it('TC-STAT-02: Trend returns daily series array', async () => {
        const res = await app.inject({
            method: 'GET',
            url: '/api/v1/stats/trend?period=week',
            headers: auth(),
        });
        expect(res.statusCode).toBe(200);
        const body = res.json();
        expect(Array.isArray(body.data)).toBe(true);
        expect(body.data.length).toBe(8); // 7 days + today
        body.data.forEach((d: any) => {
            expect(d).toHaveProperty('date');
            expect(d).toHaveProperty('count');
        });
    });

    it('TC-STAT-03: Calendar returns notes with due dates in range', async () => {
        const start = new Date();
        start.setDate(start.getDate() - 1);
        const end = new Date();
        end.setDate(end.getDate() + 30);

        const res = await app.inject({
            method: 'GET',
            url: `/api/v1/stats/calendar?start=${start.toISOString().slice(0, 10)}&end=${end.toISOString().slice(0, 10)}`,
            headers: auth(),
        });
        expect(res.statusCode).toBe(200);
        const body = res.json();
        expect(Array.isArray(body.data)).toBe(true);
    });
});

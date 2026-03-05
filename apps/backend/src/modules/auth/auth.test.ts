import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { buildApp } from '../../app';
import prisma from '../../utils/prisma';
import bcrypt from 'bcrypt';
import * as jwt from '../../utils/jwt';

vi.mock('../../utils/prisma');

describe('Auth Module', () => {
    const app = buildApp({ logger: false });

    beforeAll(async () => {
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('POST /api/v1/auth/register', () => {
        it('should successfully register a new user', async () => {
            const mockUser = {
                id: 'user-id-123',
                username: 'testuser',
                email: 'test@example.com',
                avatar_url: null,
                status: 1,
                created_at: new Date('2026-03-01T09:00:00Z'),
                updated_at: new Date('2026-03-01T09:00:00Z'),
                is_deleted: 0,
                password_hash: 'hashedpassword',
            };

            vi.mocked(prisma.user.findFirst).mockResolvedValue(null);
            vi.mocked(prisma.user.create).mockResolvedValue(mockUser);

            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/auth/register',
                payload: {
                    username: 'testuser',
                    email: 'test@example.com',
                    password: 'TestPassword123'
                }
            });

            expect(response.statusCode).toBe(201);
            const json = response.json();
            expect(json.code).toBe(201);
            expect(json.data.user.username).toBe('testuser');
            expect(json.data).toHaveProperty('accessToken');
        });
    });

    describe('POST /api/v1/auth/login', () => {
        it('should return 200, an access token, and set refresh token cookie on valid login', async () => {
            const mockUser = {
                id: 'user-id-123',
                username: 'testuser',
                email: 'test@example.com',
                password_hash: await bcrypt.hash('TestPassword123', 1),
                avatar_url: null,
                status: 1,
            };

            vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/auth/login',
                payload: {
                    email: 'test@example.com',
                    password: 'TestPassword123'
                }
            });

            expect(response.statusCode).toBe(200);
            const json = response.json();
            expect(json.code).toBe(200);
            expect(json.data).toHaveProperty('accessToken');

            const cookies = response.cookies;
            const refreshCookie = cookies.find((c: any) => c.name === 'refreshToken');
            expect(refreshCookie).toBeDefined();
            expect(refreshCookie?.httpOnly).toBe(true);
        });
    });

    describe('POST /api/v1/auth/refresh', () => {
        it('should return 401 if refreshToken cookie is missing', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/auth/refresh'
            });

            expect(response.statusCode).toBe(401);
            expect(response.json().code).toBe(401);
            expect(response.json().message).toBe('Refresh token missing');
        });

        it('should return 200 and a new accessToken if refreshToken is valid', async () => {
            const payload = { userId: 'user-id-123' };
            const validRefreshToken = jwt.generateRefreshToken(payload);

            vi.mocked(prisma.user.findUnique).mockResolvedValue({
                id: 'user-id-123',
                status: 1,
                is_deleted: 0
            } as any);

            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/auth/refresh',
                headers: {
                    cookie: `refreshToken=${validRefreshToken}`
                }
            });

            expect(response.statusCode).toBe(200);
            const json = response.json();
            expect(json.code).toBe(200);
            expect(json.data).toHaveProperty('accessToken');
        });
    });

    describe('POST /api/v1/auth/logout', () => {
        it('should clear the refreshToken cookie', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/auth/logout'
            });

            expect(response.statusCode).toBe(200);
            const cookies = response.cookies;
            const refreshCookie = cookies.find((c: any) => c.name === 'refreshToken');
            expect(refreshCookie).toBeDefined();
            expect(refreshCookie?.value).toBe('');
        });
    });
});

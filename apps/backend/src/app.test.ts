import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from './app';

describe('App endpoints', () => {
    const app = buildApp({ logger: false }); // Disable logger for tests to keep terminal clean

    beforeAll(async () => {
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    it('GET /api/health returns 200 and custom response structure', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/api/health'
        });

        expect(response.statusCode).toBe(200);
        const body = response.json();
        expect(body).toHaveProperty('code', 200);
        expect(body).toHaveProperty('message', 'System is healthy');
        expect(body.data).toHaveProperty('timestamp');
    });
});

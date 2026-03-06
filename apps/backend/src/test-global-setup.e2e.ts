/**
 * Global E2E setup — runs in a separate process BEFORE Vitest loads any test files.
 * This guarantees process.env is set before PrismaClient is instantiated.
 */
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

const PROJECT_ROOT = path.resolve(__dirname, '..');

export async function setup() {
    // Load base secrets from .env
    dotenv.config({ path: path.resolve(PROJECT_ROOT, '.env') });

    const dbPath = path.resolve(PROJECT_ROOT, 'prisma', 'e2e-test.db');

    // Clean slate
    try { if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath); } catch { /* ok */ }

    const dbUrl = `file:${dbPath}`;

    execSync('npx prisma db push --force-reset --skip-generate', {
        env: { ...process.env, DATABASE_URL: dbUrl },
        stdio: 'pipe',
        cwd: PROJECT_ROOT,
    });

    // Expose to test worker via Vitest's env injection
    process.env.DATABASE_URL = dbUrl;
}

export async function teardown() {
    const dbPath = path.resolve(PROJECT_ROOT, 'prisma', 'e2e-test.db');
    try { if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath); } catch { /* ok */ }
}

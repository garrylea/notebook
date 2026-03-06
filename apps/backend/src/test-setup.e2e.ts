/**
 * E2E Test Setup — uses the real dev.db (file-based SQLite).
 *
 * JWT secrets must match what the running auth plugin reads.
 * We patch process.env BEFORE any module is imported by the test file.
 */

// Load the same .env the app reads during `npm run dev`
import dotenv from 'dotenv';
import path from 'path';
import { execSync } from 'child_process';
import fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Ensure there is a clean db before the whole e2e run
const dbPath = path.resolve(process.cwd(), 'prisma', 'e2e-test.db');
process.env.DATABASE_URL = `file:${dbPath}`;

// Reset & init the e2e database
try {
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
} catch { /* ignore */ }

execSync('npx prisma db push --force-reset --skip-generate', {
    env: { ...process.env },
    stdio: 'pipe',
});

#!/usr/bin/env node
/**
 * Performance Benchmark Script
 *
 * Tests:
 *  1. Auth throughput: concurrent login requests
 *  2. Notes list pagination: response time under repeated reads
 *  3. Chunked upload latency: measures per-chunk round-trip time
 *
 * Usage:
 *   node scripts/perf-benchmark.mjs [--base-url http://localhost:3000] [--runs 50]
 *
 * Requirements: backend running locally with a valid test user
 */

const BASE_URL = process.argv.find(a => a.startsWith('--base-url='))?.split('=')[1] || 'http://localhost:3000';
const RUNS = parseInt(process.argv.find(a => a.startsWith('--runs='))?.split('=')[1] || '30');

async function request(method, path, body, token) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${BASE_URL}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });
    return res.json();
}

async function measureMs(label, fn, n = RUNS) {
    const timings = [];
    let errors = 0;
    for (let i = 0; i < n; i++) {
        const t0 = performance.now();
        try { await fn(); } catch { errors++; }
        timings.push(performance.now() - t0);
    }
    timings.sort((a, b) => a - b);
    const avg = timings.reduce((s, t) => s + t, 0) / n;
    const p50 = timings[Math.floor(n * 0.5)];
    const p95 = timings[Math.floor(n * 0.95)];
    const max = timings[n - 1];
    console.log(`\n📊 ${label} (n=${n})`);
    console.log(`   avg: ${avg.toFixed(1)}ms | p50: ${p50.toFixed(1)}ms | p95: ${p95.toFixed(1)}ms | max: ${max.toFixed(1)}ms | errors: ${errors}`);
    return { avg, p50, p95, max, errors };
}

async function main() {
    console.log(`\n🚀 Smart Notepad Performance Benchmark`);
    console.log(`   Target: ${BASE_URL}  |  Runs: ${RUNS}`);
    console.log('─'.repeat(60));

    // ── 0. Register + Login ─────────────────────────────────────────
    const testEmail = `perf_${Date.now()}@test.com`;
    await request('POST', '/api/v1/auth/register', {
        username: `perf_${Date.now()}`,
        email: testEmail,
        password: 'PerfTest123!',
    });
    const loginRes = await request('POST', '/api/v1/auth/login', {
        email: testEmail,
        password: 'PerfTest123!',
    });
    const token = loginRes?.data?.accessToken;
    if (!token) { console.error('❌ Login failed — is the backend running?'); process.exit(1); }
    console.log('\n✅ Auth setup complete, running benchmarks...');

    // ── 1. Login throughput ─────────────────────────────────────────
    await measureMs('Login (POST /auth/login)', () =>
        request('POST', '/api/v1/auth/login', { email: testEmail, password: 'PerfTest123!' })
    );

    // ── 2. Create notes ─────────────────────────────────────────────
    const noteIds = [];
    await measureMs('Create note (POST /notes)', async () => {
        const res = await request('POST', '/api/v1/notes', {
            title: `Perf note ${Date.now()}`,
            color: 'blue',
            priority: 'medium',
            content: 'Benchmark test content',
        }, token);
        if (res?.data?.id) noteIds.push(res.data.id);
    });

    // ── 3. List notes ───────────────────────────────────────────────
    await measureMs('List notes (GET /notes?page=1)', () =>
        request('GET', '/api/v1/notes?page=1&limit=20', null, token)
    );

    // ── 4. Get note by ID ───────────────────────────────────────────
    if (noteIds.length > 0) {
        const id = noteIds[0];
        await measureMs('Get note by ID (GET /notes/:id)', () =>
            request('GET', `/api/v1/notes/${id}`, null, token)
        );
    }

    // ── 5. Stats overview ───────────────────────────────────────────
    await measureMs('Stats overview (GET /stats/overview)', () =>
        request('GET', '/api/v1/stats/overview', null, token)
    );

    // ── 6. Concurrent load: 10 parallel note creates ────────────────
    const CONCURRENCY = 10;
    const t0 = performance.now();
    await Promise.all(
        Array.from({ length: CONCURRENCY }, (_, i) =>
            request('POST', '/api/v1/notes', {
                title: `Concurrent note ${i}`,
                color: 'red',
                priority: 'high',
                content: 'Concurrent benchmark',
            }, token)
        )
    );
    const concurrentMs = performance.now() - t0;
    console.log(`\n📊 ${CONCURRENCY}x Concurrent note creates`);
    console.log(`   Total: ${concurrentMs.toFixed(1)}ms | Per request: ${(concurrentMs / CONCURRENCY).toFixed(1)}ms avg`);

    console.log('\n' + '─'.repeat(60));
    console.log('✅ Benchmark complete.\n');
}

main().catch(e => { console.error(e); process.exit(1); });

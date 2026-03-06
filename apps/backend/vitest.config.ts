import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        projects: [
            {
                test: {
                    name: 'unit',
                    include: ['src/**/*.test.ts'],
                    exclude: ['src/**/*.e2e.ts', 'src/test-*.ts'],
                },
            },
            {
                test: {
                    name: 'e2e',
                    include: ['src/**/*.e2e.ts'],
                    exclude: ['src/test-*.ts'],
                    globalSetup: ['src/test-global-setup.e2e.ts'],
                    sequence: { concurrent: false }, // serial execution
                    pool: 'forks',   // run in subprocess so env vars propagate
                    poolOptions: {
                        forks: {
                            execArgv: [],
                        }
                    }
                },
            },
        ],
    },
});

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Smart Notepad is a full-stack notes application using a monorepo structure with npm workspaces:
- **Backend**: Fastify + Prisma + PostgreSQL, running on port 3000
- **Frontend**: React 19 + Vite + Ant Design + Zustand, default port 5173
- **Deployment**: Docker Compose (production) or manual deployment with PM2

## Development Setup

**First time setup:**
```bash
npm install
```

**Start services** (requires two terminals):
```bash
# Terminal 1: Backend
cd apps/backend
npm run db:push  # First run only - creates schema
npm run db:generate  # First run only - generates Prisma client
npm run dev

# Terminal 2: Frontend
cd apps/frontend
npm run dev
```

## Common Commands

### Root (workspace commands)
```bash
npm run dev          # Start all dev servers
npm run build        # Build all packages
npm run lint         # Lint all packages
npm run test         # Run all tests
```

### Backend
```bash
npm run dev          # Start with tsx watch (hot reload)
npm run build        # Compile TypeScript to dist/
npm run start        # Run compiled dist/index.js
npm run test         # Run unit tests (Vitest)
npm run test:watch   # Watch mode for unit tests
npm run test:e2e     # Run E2E tests against real DB
npm run test:all     # Run all tests
npm run db:push      # Push schema changes to DB
npm run db:generate  # Regenerate Prisma client
```

### Frontend
```bash
npm run dev          # Start Vite dev server
npm run build        # Build to dist/
npm run preview      # Preview production build
npm run test         # Run tests
npm run test:watch   # Watch mode
npm run lint         # ESLint
```

### Testing Commands
```bash
# Backend - single test file
npx vitest run src/modules/notes/notes.test.ts

# Backend - unit only
npm run test

# Backend - E2E only
npm run test:e2e

# Frontend tests
cd apps/frontend && npm run test
```

## Architecture

### Backend Structure

```
apps/backend/src/
├── index.ts              # Entry point
├── app.ts                # Fastify app builder
├── plugins/              # Fastify plugins (auth, error handling, response)
├── modules/              # Feature modules (auth, notes, attachments, subtasks, stats)
│   ├── *.controller.ts   # Business logic
│   └── *.route.ts        # Route definitions
├── utils/                # Shared utilities (prisma, jwt)
└── test-setup.e2e.ts     # E2E test global setup
```

**Backend patterns:**
- Routes use Fastify's `addHook('onRequest', fastify.authenticate)` for auth
- Controllers handle business logic and DB operations
- Response plugin adds `.success()` and `.error()` methods to reply
- Auth plugin validates JWT tokens via `verifyAccessToken()` and sets `request.user.id`
- All protected routes require Bearer token in Authorization header

### Frontend Structure

```
apps/frontend/src/
├── main.tsx              # Entry point
├── App.tsx               # Root component
├── router/                # React Router setup
├── pages/                # Page components (Auth, Dashboard, Stats, Calendar)
├── components/            # Reusable components (NoteCard, NoteDrawer)
├── store/                # Zustand state management
├── api/                  # API service layer (auth, notes, stats, request)
└── types.d.ts            # TypeScript definitions
```

**Frontend patterns:**
- Zustand with persist middleware for state (user, theme)
- Axios instance at `api/request.ts` with interceptors for auth headers and error handling
- Access tokens stored in localStorage, Bearer auth in headers
- All API calls go through request wrapper (returns `res.data` on success)

## Database (Prisma)

- Schema: `apps/backend/prisma/schema.prisma`
- Models: User, Note, Subtask, Attachment, ActivityLog
- Soft delete: All tables use `is_deleted` (0 = active, 1 = deleted)
- Run migrations: `npx prisma migrate deploy` (production) or `npx prisma db push` (dev)

## Testing

### Backend (Vitest)
- **Unit tests**: Mock Prisma client via `src/utils/__mocks__/prisma.ts`
- **E2E tests**: Run against real test DB (`prisma/e2e-test.db`)
- E2E tests run serially with global setup that resets the database
- Use `prismaMock` from mock file for all unit tests

### Frontend (Vitest + Testing Library)
- Environment: jsdom
- Setup file: `src/setupTests.ts`
- Tests alongside components using `.test.tsx` extension

## Deployment

### Docker Compose (Recommended)
```bash
# Copy and configure environment
cp .env.example .env
# Edit .env - change POSTGRES_PASSWORD, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET

# Build and start all services
docker compose up -d --build

# Check status/logs
docker compose ps
docker compose logs -f

# Stop without data loss
docker compose stop

# Stop and remove containers (keeps volumes)
docker compose down
```

Docker services:
- `postgres`: PostgreSQL 16 on port 5432
- `backend`: Node.js API on port 3000, auto-runs `prisma migrate deploy`
- `frontend`: Nginx serving static assets on port 80

### Manual Deployment
Use `scripts/deploy.sh` for automated manual deployment:
```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

The script handles: PostgreSQL setup, PM2 installation, DB migrations, building both apps, and offers Nginx or Node.js hosting for frontend.

## Environment Variables

**Backend (`.env`):**
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_ACCESS_SECRET`: Secret for access tokens (64+ chars recommended)
- `JWT_REFRESH_SECRET`: Secret for refresh tokens (64+ chars recommended)
- `PORT`: Backend port (default: 3000)
- `UPLOADS_DIR`: Upload directory (default: uploads)
- `MAX_UPLOAD_SIZE_MB`: Max file upload size (default: 500)

**Frontend (in `.env` for dev, or build args for production):**
- `VITE_API_BASE_URL`: API base URL (default: /api)
- `VITE_API_PROXY_TARGET`: Proxy target for dev (default: http://localhost:3000)
- `VITE_PORT`: Frontend dev server port (default: 5173)

## Important Files

- `.env.example`: Template for environment configuration
- `docker-compose.yml`: Container orchestration
- `apps/backend/prisma/schema.prisma`: Database schema
- `apps/backend/src/app.ts`: Fastify app configuration
- `apps/backend/src/plugins/auth.ts`: JWT authentication
- `apps/frontend/src/api/request.ts`: Axios configuration
- `apps/frontend/vite.config.ts`: Vite config with SSL and proxy

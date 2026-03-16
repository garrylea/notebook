# Smart Notepad Project Context

## Project Overview
Smart Notepad is a multi-user, cross-platform, self-hosted task and note management application. It is designed to help users organize their daily tasks using a "note card" metaphor, supporting full lifecycle tracking, hierarchical subtasks, attachment management, and visual analytics.

### Architecture
- **Monorepo Structure**: Managed with `npm` workspaces.
  - `apps/backend`: Fastify-based REST API and WebSocket server.
  - `apps/frontend`: React 19 application built with Vite and Ant Design 5.
  - `packages/types`: (Placeholder/Planned) Shared TypeScript definitions between frontend and backend.
  - `docs/`: Comprehensive technical and product documentation.
- **Backend Stack**: Node.js 20 LTS, Fastify, Prisma ORM, PostgreSQL, Redis (for caching/queues), JWT for authentication.
- **Frontend Stack**: React 19, TypeScript, Vite, Ant Design 5, Zustand (state management), ECharts (statistics), Markdown editing with `@uiw/react-md-editor`.
- **Infrastructure**: Nginx (serving static files and reverse proxying), Docker Compose for containerized deployment.

## Building and Running

### Prerequisites
- Node.js 20+ (LTS)
- PostgreSQL 16+
- Redis 7+

### Root Setup
```bash
npm install
```

### Backend (apps/backend)
1. **Environment**: Copy `.env.example` to `.env` and configure `DATABASE_URL`.
2. **Database Initialization**:
   ```bash
   npm run db:push      # Push schema to database
   npm run db:generate  # Generate Prisma client
   ```
3. **Development**:
   ```bash
   npm run dev          # Starts with tsx watch
   ```
4. **Testing**:
   ```bash
   npm run test         # Unit tests
   npm run test:e2e     # E2E tests
   ```

### Frontend (apps/frontend)
1. **Development**:
   ```bash
   npm run dev          # Starts Vite dev server
   ```
2. **Build**:
   ```bash
   npm run build        # Production build to dist/
   ```

## Development Conventions

### Coding Style & Standards
- **TypeScript**: Strictly enforced across both backend and frontend.
- **Modular Backend**: Backend logic is organized into domain-specific modules under `src/modules/` (e.g., `auth`, `notes`, `attachments`).
- **State Management**: Frontend uses Zustand for lightweight, reactive state management.
- **Styles**: Mix of Ant Design Design Tokens, CSS Modules, and CSS Variables. Tailwind CSS is explicitly avoided to prevent conflicts with Ant Design.

### Functional Conventions
- **Soft Deletion**: Notes (`is_deleted`) and attachments follow a soft-delete pattern.
- **Markdown Support**: Note content and subtask titles support Markdown formatting.
- **Note Statuses**: `draft`, `in_progress`, `suspended`, `completed`, `archived`, `deleted`.
- **Color Semantics**: 8 fixed colors representing urgency/category (e.g., Red = Urgent).

### Testing & Validation
- **Vitest**: Primary testing framework for both frontend and backend.
- **Husky & Commitlint**: Conventional commits are enforced via git hooks.
- **Prisma Schema**: The `apps/backend/prisma/schema.prisma` is the source of truth for the data model.

## Key Files
- `apps/backend/prisma/schema.prisma`: Data model definitions.
- `apps/backend/src/app.ts`: Backend application entry point and plugin registration.
- `apps/frontend/src/App.tsx`: Frontend root component and routing.
- `docs/接口设计文档.md`: API documentation.
- `docs/技术选型方案.md`: Detailed technology stack rationale.
- `docker-compose.yml`: Production orchestration configuration.

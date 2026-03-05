# ---- Build stage ----
FROM node:20-alpine AS builder
WORKDIR /app

# Copy workspace files
COPY package.json package-lock.json* ./
COPY apps/backend/package.json ./apps/backend/
COPY apps/backend/prisma ./apps/backend/prisma/
COPY apps/backend/src ./apps/backend/src/
COPY apps/backend/tsconfig.json ./apps/backend/

# Install deps
RUN npm install --workspace=apps/backend --ignore-scripts

# Generate Prisma client
RUN cd apps/backend && npx prisma generate

# Build TypeScript
RUN cd apps/backend && npm run build

# ---- Runtime stage ----
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

# Copy only production deps
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/apps/backend/prisma ./prisma

# Create uploads directory
RUN mkdir -p /app/uploads

EXPOSE 3000

CMD ["node", "dist/index.js"]

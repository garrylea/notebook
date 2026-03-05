# ---- Build stage ----
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
COPY apps/frontend/package.json ./apps/frontend/
COPY apps/frontend/src ./apps/frontend/src/
COPY apps/frontend/public ./apps/frontend/public/
COPY apps/frontend/index.html ./apps/frontend/
COPY apps/frontend/vite.config.ts ./apps/frontend/
COPY apps/frontend/tsconfig*.json ./apps/frontend/

RUN npm install --workspace=apps/frontend --ignore-scripts

ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN cd apps/frontend && npm run build

# ---- Runtime: serve with nginx ----
FROM nginx:1.25-alpine AS runtime
COPY --from=builder /app/apps/frontend/dist /usr/share/nginx/html
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

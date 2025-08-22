# syntax=docker/dockerfile:1.7

########################
# 1) Cài deps bằng Yarn
########################
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
RUN corepack enable

# Copy manifest trước để tối ưu cache
COPY package.json yarn.lock .yarnrc.yml ./
# Nếu repo có Yarn Berry folders, mở dòng dưới
# COPY .yarn/ .yarn/

# Cache yarn để tăng tốc
RUN --mount=type=cache,target=/root/.yarn \
    --mount=type=cache,target=/root/.cache \
    yarn install --immutable

########################
# 2) Build TypeScript
########################
FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable

# Copy lại manifest + .yarn (nếu có) để giữ đúng phiên bản yarn
COPY package.json yarn.lock .yarnrc.yml ./
# COPY .yarn/ .yarn/

# Copy node_modules từ stage deps (cần devDeps để build)
COPY --from=deps /app/node_modules ./node_modules

# Copy source code vào container
COPY . .

# Build -> ra dist (yêu cầu script "build" trong package.json)
RUN yarn build

########################
# 3) Image chạy thật
########################
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache curl

# Copy file cần thiết để chạy
COPY package.json yarn.lock .yarnrc.yml ./
# COPY .yarn/ .yarn/

# Copy artifact đã build + deps
COPY --from=builder /app/dist ./dist
COPY --from=deps /app/node_modules ./node_modules

EXPOSE 3000
ENV PORT=3000
CMD ["node", "dist/server.js"]

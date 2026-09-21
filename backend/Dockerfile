# Backend em três estágios: build (com dev deps), deps de produção e imagem final enxuta.
FROM node:24-slim AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Gera o client do Prisma (src/generated não vai para o git) e compila.
RUN npx prisma generate && npm run build

# Usada só pelo serviço `migrate` do compose: precisa do CLI do Prisma (dev dependency).
FROM builder AS migrate
CMD ["npx", "prisma", "migrate", "deploy"]

FROM node:24-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:24-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package.json ./
USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]

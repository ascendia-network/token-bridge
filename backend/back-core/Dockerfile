FROM node:20-alpine AS base

FROM base AS builder
RUN apk add --no-cache gcompat
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 builder
USER builder
WORKDIR /app
COPY --chown=builder:nodejs package*json ./
RUN npm ci
COPY --chown=builder:nodejs tsconfig.json ./
COPY --chown=builder:nodejs src ./src
COPY --chown=builder:nodejs config ./config
COPY --chown=builder:nodejs abis ./abis
COPY --chown=builder:nodejs drizzle*config.ts /app/
RUN --mount=type=secret,id=DATABASE_URL,env=DATABASE_URL \
  npm run build && npm prune --production

FROM base AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 hono

COPY --from=builder --chown=hono:nodejs /app/node_modules /app/node_modules
COPY --from=builder --chown=hono:nodejs /app/dist /app/dist
COPY --from=builder --chown=hono:nodejs /app/config /app/config
COPY --from=builder --chown=hono:nodejs /app/abis /app/abis
COPY --from=builder --chown=hono:nodejs /app/package.json /app/package.json

ENV NODE_ENV=production
USER hono
EXPOSE 3000
CMD ["npm", "start"]
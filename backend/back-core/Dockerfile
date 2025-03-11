FROM node:20-alpine AS base
#-------------------------------------------------------------------------------
FROM base AS builder
RUN apk add --no-cache gcompat

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 builder

USER builder

WORKDIR /app

COPY --chown=builder:nodejs package*json /app/
COPY --chown=builder:nodejs tsconfig.json /app/
COPY --chown=builder:nodejs src /app/src
COPY --chown=builder:nodejs config /app/config
COPY --chown=builder:nodejs abis /app/abis
COPY --chown=builder:nodejs drizzle*config.ts /app/

RUN npm ci
RUN id=DATABASE_URL,env=DATABASE_URL \
  npm run build && npm prune --production
#-------------------------------------------------------------------------------
FROM base AS runner

RUN apk --no-cache add curl

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 hono

WORKDIR /app

COPY --from=builder --chown=hono:nodejs /app/node_modules /app/node_modules
COPY --from=builder --chown=hono:nodejs /app/dist /app/dist
COPY --from=builder --chown=hono:nodejs /app/config /app/config
COPY --from=builder --chown=hono:nodejs /app/abis /app/abis
COPY --from=builder --chown=hono:nodejs /app/package.json /app/package.json

USER hono

ENV NODE_ENV=production
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
  CMD curl --fail http://localhost:3000/health || exit 1

CMD ["npm", "start"]
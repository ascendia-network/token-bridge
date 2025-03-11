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
COPY --chown=builder:nodejs abis /app/abis

RUN npm ci && npm prune --production
#-------------------------------------------------------------------------------
FROM base AS runner

RUN apk --no-cache add curl

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 ponder

WORKDIR /app

COPY --from=builder --chown=ponder:nodejs /app/node_modules /app/node_modules
COPY --from=builder --chown=ponder:nodejs /app/src /app/src
COPY --from=builder --chown=ponder:nodejs /app/abis /app/abis
COPY --from=builder --chown=ponder:nodejs /app/package.json /app/package.json
COPY --chown=ponder:nodejs ponder*.ts /app/

USER ponder

ENV PGSSLMODE=disable

ENV NODE_ENV=production
EXPOSE 42069

HEALTHCHECK --interval=10s --timeout=30s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:42069/health || exit 1

CMD ["npm", "start"]

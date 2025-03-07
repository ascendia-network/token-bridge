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

RUN npm ci
RUN npm run build && npm prune --production
#-------------------------------------------------------------------------------
FROM base AS runner

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 indexer

WORKDIR /app

COPY --from=builder --chown=indexer:nodejs /app/node_modules /app/node_modules
COPY --from=builder --chown=indexer:nodejs /app/dist /app/dist
COPY --from=builder --chown=indexer:nodejs /app/package.json /app/package.json

USER indexer

ENV NODE_ENV=production
EXPOSE 8080

CMD ["npm", "start"]
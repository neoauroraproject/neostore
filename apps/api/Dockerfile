FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
COPY packages/sdk/package.json packages/sdk/
RUN npm install --workspace=@neostore/api --include-workspace-root || npm install --prefix apps/api

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY apps/api apps/api
COPY packages/shared packages/shared
WORKDIR /app/apps/api
RUN npx prisma generate --schema=prisma/schema.prisma && npx nest build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/apps/api/package.json ./
COPY --from=build /app/apps/api/prisma ./prisma
COPY --from=build /app/apps/api/nest-cli.json ./nest-cli.json
COPY apps/api/docker-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
EXPOSE 4100
ENTRYPOINT ["/entrypoint.sh"]

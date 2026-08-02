FROM node:20-alpine AS build
WORKDIR /app
COPY packages/ui ./packages/ui
COPY apps/admin ./apps/admin
WORKDIR /app/apps/admin
ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_API_URL=/api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm install \
  && ln -sfn /app/apps/admin/node_modules /app/node_modules \
  && npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=4101
COPY --from=build /app/apps/admin/.next ./.next
COPY --from=build /app/apps/admin/node_modules ./node_modules
COPY --from=build /app/apps/admin/package.json ./package.json
COPY --from=build /app/apps/admin/next.config.js ./next.config.js
COPY --from=build /app/packages/ui ./node_modules/@neostore/ui
RUN mkdir -p public
EXPOSE 4101
CMD ["npm", "run", "start"]

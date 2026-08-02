FROM node:20-alpine AS build
WORKDIR /app
COPY packages/ui ./packages/ui
COPY apps/storefront ./apps/storefront
WORKDIR /app/apps/storefront
ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_API_URL=/api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm install && npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=4102
COPY --from=build /app/apps/storefront/.next ./.next
COPY --from=build /app/apps/storefront/node_modules ./node_modules
COPY --from=build /app/apps/storefront/package.json ./package.json
COPY --from=build /app/apps/storefront/next.config.js ./next.config.js
COPY --from=build /app/packages/ui ./node_modules/@neostore/ui
RUN mkdir -p public
EXPOSE 4102
CMD ["npm", "run", "start"]

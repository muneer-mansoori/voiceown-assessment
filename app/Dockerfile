# syntax=docker/dockerfile:1.7

FROM node:20-alpine AS base
WORKDIR /app
ENV NODE_ENV=production

FROM base AS deps
RUN addgroup -S nodegrp && adduser -S nodeusr -G nodegrp
COPY package.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm install --omit=dev --no-package-lock

FROM base AS build
COPY --from=deps /app/node_modules /app/node_modules
COPY . .

FROM gcr.io/distroless/nodejs20-debian12:nonroot AS runtime
WORKDIR /app
USER nonroot
ENV NODE_ENV=production
COPY --from=build /app /app
EXPOSE 3000
CMD ["/app/src/server.js"]
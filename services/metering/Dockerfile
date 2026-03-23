FROM node:22.11.0-alpine AS base
WORKDIR /service
RUN apk add --no-cache mosquitto-clients openssl

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS dev
COPY --from=deps /service/node_modules ./node_modules
COPY . .
EXPOSE 4100
CMD ["npm", "run", "dev"]

FROM base AS builder
COPY --from=deps /service/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22.11.0-alpine AS runner
WORKDIR /service
RUN apk add --no-cache mosquitto-clients
ENV NODE_ENV=production
COPY --from=builder /service/dist ./dist
COPY --from=builder /service/package.json ./package.json
COPY --from=builder /service/node_modules ./node_modules
EXPOSE 4100
CMD ["npm", "run", "start"]

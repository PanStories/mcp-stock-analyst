# ---------- build stage ----------
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---------- runtime stage ----------
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/build ./build

# Apify Standby 会注入 ACTOR_WEB_SERVER_PORT / APIFY_CONTAINER_PORT，
# 本地运行时回落到 3000
EXPOSE 3000

CMD ["node", "build/http.js"]

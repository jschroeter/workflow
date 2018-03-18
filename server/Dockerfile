# ---- Base Node ----
FROM node:carbon AS base

# ---- Dependencies ----
FROM base AS dependencies
COPY package.json ./
COPY yarn.lock ./

# Create app directory
WORKDIR /app
RUN yarn install --modules-folder /app/deps --production=true

# --- Release with Alpine ----
FROM node:8.9-alpine AS release
WORKDIR /app
COPY websocket.js /app
COPY --from=dependencies /app/deps ./node_modules

EXPOSE 3001
CMD ["node", "websocket.js"]
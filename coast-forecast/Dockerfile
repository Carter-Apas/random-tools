FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY vendor ./vendor
RUN npm ci
COPY tsconfig*.json vite.config.ts index.html ./
COPY src ./src
COPY admin ./admin
COPY shared ./shared
COPY server ./server
COPY public ./public
RUN npm run build

FROM node:24-alpine
ENV NODE_ENV=production PORT=80
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules/suncalc ./node_modules/suncalc
RUN mkdir -p /app/.data && chown node:node /app/.data
USER node
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -q -O /dev/null http://127.0.0.1/healthz || exit 1
CMD ["node", "dist/server/server/index.js"]

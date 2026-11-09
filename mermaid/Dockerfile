FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY index.html ./
COPY src ./src
COPY public ./public
RUN npm run build

FROM node:24-alpine
ENV NODE_ENV=production PORT=80 DATA_DIR=/app/.data
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY server.mjs store.mjs package.json ./
RUN mkdir .data && chown node:node .data
USER node
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.mjs"]

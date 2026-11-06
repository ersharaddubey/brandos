# ---- 1) Client build ----
FROM node:20-slim AS client
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci --no-audit --no-fund
COPY client/ ./
RUN npm run build

# ---- 2) Runtime: Express API + built client ----
FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production \
    PORT=8000 \
    LOW_MEMORY=true \
    NODE_OPTIONS=--max-old-space-size=384
COPY server/package*.json server/
RUN cd server && npm ci --omit=dev --no-audit --no-fund
COPY server/ server/
COPY --from=client /app/client/dist client/dist
EXPOSE 8000
CMD ["node", "server/src/index.js"]

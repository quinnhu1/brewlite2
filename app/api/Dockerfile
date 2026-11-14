FROM node:24-bookworm-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
COPY prisma ./prisma
# Prisma generation needs no live database; skip postinstall until schema/config are copied.
RUN npm ci --ignore-scripts
COPY . .
RUN DATABASE_URL=postgresql://unused:unused@localhost/unused DIRECT_URL=postgresql://unused:unused@localhost/unused npx prisma generate && npm run build
ENV NODE_ENV=production
EXPOSE 3001
USER node
# Migrations run as a separate release step (deploy/release.sh) so a failed
# migration stops the deploy before the new version starts.
CMD ["node", "dist/main.js"]

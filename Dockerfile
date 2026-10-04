# syntax=docker/dockerfile:1

# ---- build ----
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci --no-audit --no-fund
COPY . .
# Pages marked for prerender bake CMS content in at build time. Pass the CMS URL to get it
# (it must be reachable from the build); without it the bundled static catalog is baked in.
ARG STRAPI_URL=""
ARG STRAPI_PUBLIC_URL=""
ENV STRAPI_URL=$STRAPI_URL STRAPI_PUBLIC_URL=$STRAPI_PUBLIC_URL
RUN npm run build

# ---- runtime ----
FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=4000
COPY package.json package-lock.json .npmrc ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force
COPY --from=build /app/dist/desertica-web ./dist/desertica-web
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/',{headers:{host:'localhost'}}).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/desertica-web/server/server.mjs"]

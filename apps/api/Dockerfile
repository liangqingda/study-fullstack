FROM node:22-bookworm-slim AS build
RUN corepack enable && corepack prepare pnpm@10.6.1 --activate
WORKDIR /workspace
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @liangqingda/study-nodejs-schema build && pnpm --filter study-nodejs build

FROM node:22-bookworm-slim
ENV NODE_ENV=production
WORKDIR /workspace/apps/api
COPY --from=build --chown=node:node /workspace /workspace
USER node
EXPOSE 3000
CMD ["node", "--enable-source-maps", "build/index.js"]

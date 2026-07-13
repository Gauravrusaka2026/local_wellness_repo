# syntax=docker/dockerfile:1.7

ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-alpine AS workspace

ENV PNPM_HOME=/pnpm
ENV PATH=${PNPM_HOME}:${PATH}

WORKDIR /workspace

RUN corepack enable

COPY . .

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

FROM workspace AS development

ENV NODE_ENV=development

EXPOSE 3002

CMD ["pnpm", "--filter", "@local-wellness/realtime-server", "dev"]

FROM workspace AS build

RUN pnpm --filter "@local-wellness/realtime-server..." build

FROM node:${NODE_VERSION}-alpine AS production

ENV NODE_ENV=production
ENV PORT=3002

WORKDIR /workspace

COPY --from=build --chown=node:node /workspace /workspace

USER node

EXPOSE 3002

CMD ["node", "apps/realtime-server/dist/main.js"]

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

CMD ["pnpm", "--filter", "@local-wellness/workers", "dev"]

FROM workspace AS build

RUN pnpm --filter "@local-wellness/workers..." build

FROM node:${NODE_VERSION}-alpine AS production

ENV NODE_ENV=production

WORKDIR /workspace

COPY --from=build --chown=node:node /workspace /workspace

USER node

CMD ["node", "apps/workers/dist/main.js"]

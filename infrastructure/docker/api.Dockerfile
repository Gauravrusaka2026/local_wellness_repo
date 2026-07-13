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

EXPOSE 3001

CMD ["pnpm", "--filter", "@local-wellness/api", "dev"]

FROM workspace AS build

RUN pnpm --filter "@local-wellness/api..." build

FROM node:${NODE_VERSION}-alpine AS production

ENV NODE_ENV=production
ENV PORT=3001

WORKDIR /workspace

COPY --from=build --chown=node:node /workspace /workspace

USER node

EXPOSE 3001

CMD ["node", "apps/api/dist/main.js"]

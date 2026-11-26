FROM node:24-bookworm-slim

ENV NODE_ENV=production
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends openjdk-17-jdk-headless maven git ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && node --version \
    && java --version \
    && mvn --version \
    && git --version

COPY package*.json ./
RUN npm ci --omit=dev

COPY --chown=node:node . .
RUN mkdir -p /app/temp/submissions \
    && chown -R node:node /app

USER node
EXPOSE 10000
CMD ["npm", "start"]
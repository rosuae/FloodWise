ARG NODE_VERSION=24.14.0-alpine
FROM node:${NODE_VERSION}

WORKDIR /app

COPY package*.json ./

RUN npm ci --no-audit --no-fund

COPY --chown=node:node . .

USER node
EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

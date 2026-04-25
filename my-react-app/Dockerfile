ARG NODE_VERSION=24.14.0-alpine
FROM node:${NODE_VERSION} AS dev

WORKDIR /app

# Copiem doar fisierele de dependinte pentru a folosi cache-ul Docker
COPY package*.json ./
RUN npm install --no-audit --no-fund

# Copiem restul codului cu ownership-ul corect direct
COPY --chown=node:node . .

USER node
EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

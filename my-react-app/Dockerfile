ARG NODE_VERSION=24.14.0-alpine
FROM node:${NODE_VERSION} AS dev

# Setam directorul de lucru
WORKDIR /app

# Schimbam ownership-ul folderului de lucru la utilizatorul node
RUN chown node:node /app

# Trecem la utilizatorul node inainte de a instala dependintele
USER node

# Copiem fisierele de dependinte cu ownership-ul corect
COPY --chown=node:node package*.json ./

# Instalam dependintele (acum ca utilizator node)
RUN npm install --no-audit --no-fund

# Copiem restul codului
COPY --chown=node:node . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

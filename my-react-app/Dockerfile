ARG NODE_VERSION=24.14.0-alpine
FROM node:${NODE_VERSION}

# Setam directorul de lucru
WORKDIR /app

# Copiem fisierele de dependinte
COPY package*.json ./

# Instaleaza dependintele ca root
RUN npm install --no-audit --no-fund

# Copiem restul codului
COPY . .

# Setează permisiuni complete pe /app pentru node user
RUN chown -R node:node /app && chmod -R 755 /app

USER node
EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

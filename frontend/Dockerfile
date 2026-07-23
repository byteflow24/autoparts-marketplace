FROM node:20-slim

WORKDIR /app

# Copy package files first (layer cache)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the source
COPY . .

EXPOSE 5173

# --host 0.0.0.0 is required so Vite is reachable outside the container
# Use node directly to handle signals (SIGTERM) properly for graceful shutdown
CMD ["node", "./node_modules/vite/bin/vite.js", "--host", "0.0.0.0"]

FROM node:20-alpine

# Install Docker CLI so the container can spawn Nikto/Nmap containers via the socket
RUN apk add --no-cache docker-cli

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies and generate Prisma client
RUN npm install
RUN npx prisma generate

# Copy source code
COPY src ./src
COPY start.sh ./

# Make the start script executable
RUN chmod +x ./start.sh

# Expose API port
EXPOSE 3000

# Start both Express and the Worker
CMD ["./start.sh"]

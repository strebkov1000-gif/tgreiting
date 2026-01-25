FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm install

# Copy prisma schema
COPY src/database/prisma ./src/database/prisma

# Generate Prisma Client
RUN npx prisma generate --schema=./src/database/prisma/schema.prisma

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "run", "dev"]

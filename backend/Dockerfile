FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

# Install all dependencies including devDependencies for build
RUN npm ci

COPY src ./src
COPY tsconfig.json ./
COPY nodemon.json ./

# Build the application
RUN npm run build

# Remove devDependencies after build
RUN npm ci --only=production && npm cache clean --force

EXPOSE 3000

CMD ["npm", "start"]
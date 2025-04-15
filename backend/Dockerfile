FROM node:18-alpine

WORKDIR /app

# Install nmap and dependencies
RUN apk add --no-cache nmap

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

EXPOSE 3001
CMD ["node", "dist/server.js"]
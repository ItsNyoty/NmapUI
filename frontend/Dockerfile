FROM node:18-alpine as builder

WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps --force

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
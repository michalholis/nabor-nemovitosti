FROM node:22-bookworm-slim AS build-env

WORKDIR /web-app

COPY web-app/package*.json ./
RUN npm ci --legacy-peer-deps

COPY web-app/ ./
RUN npm run build -- --configuration production

FROM nginx:1.27-alpine

RUN rm /etc/nginx/conf.d/default.conf && \
    printf "server {\n    listen 80;\n    server_name _;\n\n    root /usr/share/nginx/html;\n    index index.html;\n\n    location / {\n        try_files \$uri \$uri/ /index.html;\n    }\n}\n" > /etc/nginx/conf.d/default.conf

COPY --from=build-env /web-app/dist/nabor-nemovitosti/browser/ /usr/share/nginx/html/

# syntax=docker/dockerfile:1

# ── Etapa 1: build de Angular (producción, configuración "docker") ───────────
FROM node:22-alpine AS build
WORKDIR /app

# Dependencias primero (capa cacheada).
COPY package.json package-lock.json ./
RUN npm ci

# Código y build. La configuración "docker" usa environment.docker.ts (apiUrl='/api').
COPY . .
RUN npm run build -- --configuration=docker

# ── Etapa 2: nginx sirve la SPA y proxya la API/uploads al backend ───────────
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/www /usr/share/nginx/html
EXPOSE 80

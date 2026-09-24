# ===========================================================
# Etapa 1: "builder" — compila el proyecto de Vite/React a
# archivos estáticos. Esta etapa se descarta al final, no
# llega a producción.
# ===========================================================
FROM node:24-bookworm-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Vite "hornea" estas variables adentro del JS compilado durante el
# build — a diferencia de la API, no se leen en tiempo de ejecución.
# Por eso vienen como ARG (tiempo de build) y no como ENV de un
# contenedor corriendo.
ARG VITE_API_URL
ARG VITE_CLOUDINARY_CLOUD_NAME
ARG VITE_CLOUDINARY_UPLOAD_PRESET
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_CLOUDINARY_CLOUD_NAME=$VITE_CLOUDINARY_CLOUD_NAME
ENV VITE_CLOUDINARY_UPLOAD_PRESET=$VITE_CLOUDINARY_UPLOAD_PRESET

RUN npm run build

# ===========================================================
# Etapa 2: "runtime" — nginx sirviendo los archivos estáticos.
# No hace falta Node acá, el build ya está listo.
# ===========================================================
FROM nginx:alpine AS runtime

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

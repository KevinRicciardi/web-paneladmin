# ===========================================================
# Etapa 1: "builder" — compila el proyecto de Vite/React a
# archivos estáticos. Esta etapa se descarta al final, no
# llega a producción.
# ===========================================================
# Imágenes fijadas por digest (Dependabot propone las actualizaciones).
FROM node:24-bookworm-slim@sha256:c86ecead9e55a5210ac1727de38a4ca840bf03dcaf34dc9749addbf383b1920c AS builder

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
# nginx sin root. Sigue escuchando en el 80: Docker (20.10+) deja que un
# proceso sin root abra puertos bajos dentro del contenedor.
FROM nginxinc/nginx-unprivileged:alpine@sha256:b5047b9b76845eac124358373c6852377c52e4b05834a47647e955dd91cb8f1e AS runtime

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

FROM node:22-alpine AS build
WORKDIR /app

ENV NODE_OPTIONS="--max-old-space-size=4096"

COPY package*.json ./
RUN npm ci

ARG VITE_TENANT_DEFAULT=IH001
ARG VITE_TENANT_IDS=IH001,AG001
ENV VITE_TENANT_DEFAULT=$VITE_TENANT_DEFAULT
ENV VITE_TENANT_IDS=$VITE_TENANT_IDS

COPY . .
RUN npm run generate
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1/ || exit 1
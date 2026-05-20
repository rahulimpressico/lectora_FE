# ── Build ─────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS build

WORKDIR /app

COPY course_generation_frontend/package.json course_generation_frontend/package-lock.json ./
RUN npm ci

COPY course_generation_frontend/ .
RUN npm run build

# ── Serve (nginx) ─────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS production

RUN apk add --no-cache gettext

COPY docker/nginx.conf.template /etc/nginx/templates/nginx.conf.template
COPY docker/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]

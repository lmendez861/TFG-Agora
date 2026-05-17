# syntax=docker/dockerfile:1.7

FROM composer:2 AS vendor
WORKDIR /app/backend

COPY backend/composer.json backend/composer.lock ./
RUN composer install \
    --no-dev \
    --prefer-dist \
    --no-interaction \
    --no-scripts \
    --optimize-autoloader

COPY backend/ ./
RUN composer dump-autoload --optimize --classmap-authoritative


FROM node:20-bookworm-slim AS internal-build
WORKDIR /app/frontend/app

COPY frontend/app/package.json frontend/app/package-lock.json ./
RUN npm ci

COPY frontend/app/ ./
RUN mkdir -p /app/backend/public
RUN npm run build:backend


FROM node:20-bookworm-slim AS external-build
WORKDIR /app/frontend/company-portal

COPY frontend/company-portal/package.json frontend/company-portal/package-lock.json ./
RUN npm ci

COPY frontend/company-portal/ ./
RUN mkdir -p /app/backend/public
RUN npm run build:backend


FROM php:8.2-apache-bookworm
WORKDIR /var/www/html

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        libicu-dev \
        libpq-dev \
        libsqlite3-dev \
        unzip \
    && docker-php-ext-install intl pdo_pgsql pdo_sqlite opcache \
    && a2enmod rewrite headers expires \
    && rm -rf /var/lib/apt/lists/*

COPY deploy/apache/000-default.conf /etc/apache2/sites-available/000-default.conf
COPY backend/ /var/www/html/backend/
COPY --from=vendor /app/backend/vendor /var/www/html/backend/vendor
COPY --from=internal-build /app/backend/public/app /var/www/html/backend/public/app
COPY --from=external-build /app/backend/public/externo /var/www/html/backend/public/externo
COPY deploy/render/start.sh /usr/local/bin/start-agora

RUN chmod +x /usr/local/bin/start-agora \
    && mkdir -p /data/document-storage /var/www/html/backend/var \
    && chown -R www-data:www-data /data /var/www/html/backend/var /var/www/html/backend/public

ENV APP_ENV=prod
ENV APP_DEBUG=0
ENV PORT=10000

EXPOSE 10000

CMD ["start-agora"]

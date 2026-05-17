FROM mcr.microsoft.com/devcontainers/php:1-8.2-bookworm

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        libicu-dev \
        libsqlite3-dev \
        sqlite3 \
    && docker-php-ext-install intl pdo_sqlite \
    && rm -rf /var/lib/apt/lists/*

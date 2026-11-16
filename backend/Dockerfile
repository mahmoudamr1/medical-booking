FROM php:8.4-cli

RUN apt-get update && apt-get install -y --no-install-recommends \
        git unzip curl libpq-dev libzip-dev libicu-dev libpng-dev \
    && docker-php-ext-install pdo_pgsql pgsql zip intl gd bcmath pcntl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --no-interaction --prefer-dist --no-autoloader

COPY . .
RUN composer dump-autoload --optimize \
    && chown -R www-data:www-data storage bootstrap/cache

USER www-data
EXPOSE 8000
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]

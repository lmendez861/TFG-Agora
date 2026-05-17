#!/bin/sh
set -eu

export APP_ENV="${APP_ENV:-prod}"
export APP_DEBUG="${APP_DEBUG:-0}"
export PORT="${PORT:-10000}"
export APP_SECRET="${APP_SECRET:-change-this-in-production}"
export APP_DOCUMENT_STORAGE_DIR="${APP_DOCUMENT_STORAGE_DIR:-/data/document-storage}"
export DATABASE_URL="${DATABASE_URL:-sqlite:////data/agora.sqlite}"
export APP_ENABLE_DEMO_TEACHERS="${APP_ENABLE_DEMO_TEACHERS:-1}"
export DEMO_TEACHER_PASSWORD="${DEMO_TEACHER_PASSWORD:-Abrete01}"
export DEFAULT_URI="${DEFAULT_URI:-${APP_EXTERNAL_BASE_URL:-http://127.0.0.1:${PORT}}}"

mkdir -p "${APP_DOCUMENT_STORAGE_DIR}" /var/www/html/backend/var
chown -R www-data:www-data "${APP_DOCUMENT_STORAGE_DIR}" /var/www/html/backend/var
chmod -R ug+rwX "${APP_DOCUMENT_STORAGE_DIR}" /var/www/html/backend/var

sed -i -E "s/^Listen [0-9]+/Listen ${PORT}/" /etc/apache2/ports.conf
sed -i -E "s#<VirtualHost \\*:[0-9]+>#<VirtualHost *:${PORT}>#" /etc/apache2/sites-available/000-default.conf

cd /var/www/html/backend
rm -rf var/cache/*

php -r '
$url = getenv("DATABASE_URL") ?: "";
$parts = parse_url($url);
$scheme = strtolower((string) ($parts["scheme"] ?? ""));
if (!in_array($scheme, ["pgsql", "postgres", "postgresql"], true)) {
    exit(0);
}

$dbname = ltrim((string) ($parts["path"] ?? ""), "/");
$host = (string) ($parts["host"] ?? "db");
$port = (int) ($parts["port"] ?? 5432);
$user = rawurldecode((string) ($parts["user"] ?? ""));
$pass = rawurldecode((string) ($parts["pass"] ?? ""));
$dsn = sprintf("pgsql:host=%s;port=%d;dbname=%s", $host, $port, $dbname);

for ($attempt = 1; $attempt <= 30; $attempt++) {
    try {
        new PDO($dsn, $user, $pass, [PDO::ATTR_TIMEOUT => 3]);
        fwrite(STDOUT, "PostgreSQL disponible.\n");
        exit(0);
    } catch (Throwable $exception) {
        fwrite(STDERR, sprintf("Esperando PostgreSQL (%d/30): %s\n", $attempt, $exception->getMessage()));
        sleep(2);
    }
}

fwrite(STDERR, "No se pudo establecer conexion con PostgreSQL.\n");
exit(1);
'

php bin/console doctrine:migrations:migrate --no-interaction

if [ "${APP_ENABLE_DEMO_TEACHERS}" = "1" ]; then
    php bin/console app:user:create profesora "${DEMO_TEACHER_PASSWORD}" --role=ROLE_COORDINATOR --full-name="Profesora evaluadora" --update-if-exists --no-interaction
    php bin/console app:user:create profesor "${DEMO_TEACHER_PASSWORD}" --role=ROLE_COORDINATOR --full-name="Profesor evaluador" --update-if-exists --no-interaction
fi

chown -R www-data:www-data "${APP_DOCUMENT_STORAGE_DIR}" /var/www/html/backend/var
chmod -R ug+rwX "${APP_DOCUMENT_STORAGE_DIR}" /var/www/html/backend/var

exec apache2-foreground

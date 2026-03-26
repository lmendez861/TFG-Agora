<?php

declare(strict_types=1);

namespace App\Service;

use Symfony\Component\Mime\Address;

final class MailConfigurationInspector
{
    public function __construct(
        private readonly string $mailerDsn,
        private readonly string $fromAddress,
    ) {
    }

    public function snapshot(): array
    {
        $dsn = trim($this->mailerDsn);
        if ($dsn === '') {
            return [
                'status' => 'warning',
                'canSend' => false,
                'provider' => 'sin-configurar',
                'detail' => 'No hay un MAILER_DSN util para correo saliente.',
            ];
        }

        if ($dsn === 'null://null') {
            return [
                'status' => 'healthy',
                'canSend' => true,
                'provider' => 'null',
                'detail' => 'Correo saliente en modo de pruebas con transporte nulo.',
            ];
        }

        $parts = parse_url($dsn);
        $scheme = strtolower((string) ($parts['scheme'] ?? ''));
        $host = strtolower((string) ($parts['host'] ?? ''));
        $user = strtolower(urldecode((string) ($parts['user'] ?? '')));
        $pass = strtolower(urldecode((string) ($parts['pass'] ?? '')));
        $provider = $this->detectProvider($scheme, $host);

        if ($scheme === '' || $host === '') {
            return [
                'status' => 'warning',
                'canSend' => false,
                'provider' => $provider,
                'detail' => 'La configuracion SMTP no tiene esquema u host validos.',
            ];
        }

        if ($this->looksLikePlaceholder($user, $pass)) {
            return [
                'status' => 'warning',
                'canSend' => false,
                'provider' => $provider,
                'detail' => $provider === 'brevo'
                    ? 'El correo saliente esta preparado para Brevo, pero falta una API key o credencial SMTP real.'
                    : sprintf('El correo saliente sigue con credenciales de ejemplo para %s.', $host),
            ];
        }

        if (!$this->hasValidFromAddress()) {
            return [
                'status' => 'warning',
                'canSend' => false,
                'provider' => $provider,
                'detail' => 'La direccion remitente APP_MAIL_FROM no es valida.',
            ];
        }

        return [
            'status' => 'healthy',
            'canSend' => true,
            'provider' => $provider,
            'detail' => $provider === 'brevo'
                ? 'Correo saliente preparado con Brevo.'
                : sprintf('Correo saliente configurado sobre %s.', $host),
        ];
    }

    private function looksLikePlaceholder(string $user, string $pass): bool
    {
        $placeholderUsers = ['usuario', 'user', 'username', 'correo', 'email', 'demo', 'key', 'api_key', 'brevo_api_key'];
        $placeholderPasswords = ['clave', 'password', 'pass', 'changeme', 'demo', '123456', 'key', 'api_key', 'secret'];

        return in_array($user, $placeholderUsers, true) || in_array($pass, $placeholderPasswords, true);
    }

    private function detectProvider(string $scheme, string $host): string
    {
        if (str_starts_with($scheme, 'brevo+')) {
            return 'brevo';
        }

        if (str_contains($host, 'brevo')) {
            return 'brevo';
        }

        if (str_starts_with($scheme, 'smtp')) {
            return 'smtp';
        }

        return $scheme !== '' ? $scheme : 'desconocido';
    }

    private function hasValidFromAddress(): bool
    {
        try {
            Address::create($this->fromAddress);

            return true;
        } catch (\Throwable) {
            return false;
        }
    }
}

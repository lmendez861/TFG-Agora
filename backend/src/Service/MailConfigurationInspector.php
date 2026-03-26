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
                'detail' => 'No hay un MAILER_DSN util para correo saliente.',
            ];
        }

        if ($dsn === 'null://null') {
            return [
                'status' => 'healthy',
                'canSend' => true,
                'detail' => 'Correo saliente en modo de pruebas con transporte nulo.',
            ];
        }

        $parts = parse_url($dsn);
        $scheme = strtolower((string) ($parts['scheme'] ?? ''));
        $host = strtolower((string) ($parts['host'] ?? ''));
        $user = strtolower(urldecode((string) ($parts['user'] ?? '')));
        $pass = strtolower(urldecode((string) ($parts['pass'] ?? '')));

        if ($scheme === '' || $host === '') {
            return [
                'status' => 'warning',
                'canSend' => false,
                'detail' => 'La configuracion SMTP no tiene esquema u host validos.',
            ];
        }

        if ($this->looksLikePlaceholder($user, $pass)) {
            return [
                'status' => 'warning',
                'canSend' => false,
                'detail' => sprintf('El correo saliente sigue con credenciales de ejemplo para %s.', $host),
            ];
        }

        if (!$this->hasValidFromAddress()) {
            return [
                'status' => 'warning',
                'canSend' => false,
                'detail' => 'La direccion remitente APP_MAIL_FROM no es valida.',
            ];
        }

        return [
            'status' => 'healthy',
            'canSend' => true,
            'detail' => sprintf('Correo saliente configurado sobre %s.', $host),
        ];
    }

    private function looksLikePlaceholder(string $user, string $pass): bool
    {
        $placeholderUsers = ['usuario', 'user', 'username', 'correo', 'email', 'demo'];
        $placeholderPasswords = ['clave', 'password', 'pass', 'changeme', 'demo', '123456'];

        return in_array($user, $placeholderUsers, true) || in_array($pass, $placeholderPasswords, true);
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

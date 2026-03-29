<?php

declare(strict_types=1);

namespace App\Service;

use Symfony\Component\HttpFoundation\RequestStack;
use Symfony\Component\Mime\Address;
use Symfony\Component\Mime\Email;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Security\Core\Exception\AccessDeniedException;

final class InternalMfaManager
{
    private const SESSION_CHALLENGE_KEY = '_internal_mfa_challenge';
    private const SESSION_VERIFIED_UNTIL_KEY = '_internal_mfa_verified_until';

    public function __construct(
        private readonly RequestStack $requestStack,
        private readonly MailerInterface $mailer,
        private readonly MailConfigurationInspector $mailConfigurationInspector,
        private readonly string $fromAddress,
        private readonly string $destinationEmail,
        private readonly int $ttlSeconds,
    ) {
    }

    public function getStatus(): array
    {
        $session = $this->getSession();
        $challenge = $session?->get(self::SESSION_CHALLENGE_KEY);
        $verifiedUntil = $session?->get(self::SESSION_VERIFIED_UNTIL_KEY);
        $isVerified = is_int($verifiedUntil) && $verifiedUntil >= time();
        $mailSnapshot = $this->mailConfigurationInspector->snapshot();

        return [
            'required' => true,
            'configured' => $this->destinationEmail !== '',
            'canSend' => $mailSnapshot['canSend'],
            'mailReady' => $mailSnapshot['canSend'],
            'verified' => $isVerified,
            'verifiedUntil' => $isVerified ? date(\DateTimeInterface::ATOM, $verifiedUntil) : null,
            'destination' => $this->destinationEmail,
            'destinationEmail' => $this->destinationEmail,
            'challengeIssuedAt' => is_array($challenge) && isset($challenge['issuedAt'])
                ? date(\DateTimeInterface::ATOM, (int) $challenge['issuedAt'])
                : null,
            'challengeExpiresAt' => is_array($challenge) && isset($challenge['expiresAt'])
                ? date(\DateTimeInterface::ATOM, (int) $challenge['expiresAt'])
                : null,
            'delivery' => $mailSnapshot['detail'],
        ];
    }

    public function assertVerified(): void
    {
        if ($this->isVerified()) {
            return;
        }

        throw new AccessDeniedException('MFA requerido. Solicita y valida un codigo antes de ejecutar esta accion.');
    }

    public function issueChallenge(string $subjectLabel): array
    {
        if ($this->destinationEmail === '') {
            return [
                'status' => 'unavailable',
                'message' => 'No hay un correo configurado para enviar el segundo factor.',
            ];
        }

        $issuedAt = time();
        $code = (string) random_int(100000, 999999);
        $expiresAt = $issuedAt + max(60, $this->ttlSeconds);

        $session = $this->getSession();
        if ($session === null) {
            return [
                'status' => 'unavailable',
                'message' => 'No se pudo abrir la sesion de MFA.',
            ];
        }

        $session->set(self::SESSION_CHALLENGE_KEY, [
            'hash' => password_hash($code, PASSWORD_DEFAULT),
            'issuedAt' => $issuedAt,
            'expiresAt' => $expiresAt,
            'subject' => $subjectLabel,
        ]);

        $email = (new Email())
            ->from(Address::create($this->fromAddress))
            ->to($this->destinationEmail)
            ->subject(sprintf('Codigo MFA del portal interno | %s', date('H:i', $issuedAt)))
            ->text(sprintf(
                "Codigo MFA: %s\nAccion: %s\nEmitido: %s\nCaduca: %s\n\nSi solicitas un nuevo codigo, el anterior deja de ser valido.",
                $code,
                $subjectLabel,
                date('d/m/Y H:i:s', $issuedAt),
                date('d/m/Y H:i:s', $expiresAt)
            ));

        $this->mailer->send($email);

        return [
            'status' => 'sent',
            'message' => sprintf('Hemos enviado un codigo MFA a %s.', $this->destinationEmail),
            'expiresAt' => date(\DateTimeInterface::ATOM, $expiresAt),
        ];
    }

    public function verifyCode(string $code): bool
    {
        $session = $this->getSession();
        if ($session === null) {
            return false;
        }

        $challenge = $session->get(self::SESSION_CHALLENGE_KEY);
        if (!is_array($challenge) || !isset($challenge['hash'], $challenge['expiresAt'])) {
            return false;
        }

        if ((int) $challenge['expiresAt'] < time()) {
            $session->remove(self::SESSION_CHALLENGE_KEY);

            return false;
        }

        if (!password_verify($code, (string) $challenge['hash'])) {
            return false;
        }

        $session->remove(self::SESSION_CHALLENGE_KEY);
        $session->set(self::SESSION_VERIFIED_UNTIL_KEY, time() + max(300, $this->ttlSeconds));

        return true;
    }

    public function isVerified(): bool
    {
        $session = $this->getSession();
        if ($session === null) {
            return false;
        }

        $verifiedUntil = $session->get(self::SESSION_VERIFIED_UNTIL_KEY);

        return is_int($verifiedUntil) && $verifiedUntil >= time();
    }

    private function getSession(): ?\Symfony\Component\HttpFoundation\Session\SessionInterface
    {
        return $this->requestStack->getSession();
    }
}

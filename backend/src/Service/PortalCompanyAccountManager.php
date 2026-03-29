<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\EmpresaColaboradora;
use App\Entity\EmpresaPortalCuenta;
use App\Entity\EmpresaSolicitud;
use App\Repository\EmpresaPortalCuentaRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Mime\Address;
use Symfony\Component\Mime\Email;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Generator\UrlGeneratorInterface;
use Symfony\Component\Mailer\MailerInterface;

final class PortalCompanyAccountManager
{
    public function __construct(
        private readonly EmpresaPortalCuentaRepository $accountRepository,
        private readonly EntityManagerInterface $entityManager,
        private readonly UserPasswordHasherInterface $passwordHasher,
        private readonly MailerInterface $mailer,
        private readonly MailConfigurationInspector $mailConfigurationInspector,
        private readonly UrlGeneratorInterface $urlGenerator,
        private readonly string $fromAddress,
    ) {
    }

    public function provisionApprovedAccount(EmpresaSolicitud $solicitud, EmpresaColaboradora $empresa): EmpresaPortalCuenta
    {
        $account = $solicitud->getPortalCuenta()
            ?? $this->accountRepository->findOneBy(['email' => mb_strtolower($solicitud->getContactoEmail())])
            ?? new EmpresaPortalCuenta();

        $account
            ->setEmail($solicitud->getContactoEmail())
            ->setDisplayName($solicitud->getContactoNombre())
            ->setEmpresa($empresa)
            ->setSolicitud($solicitud)
            ->setRoles(['ROLE_COMPANY_PORTAL'])
            ->setActive(true);

        if (!$account->hasPassword()) {
            $account->issueSetupToken();
        }

        $this->entityManager->persist($account);

        return $account;
    }

    public function activateAccount(string $token, string $plainPassword): ?EmpresaPortalCuenta
    {
        $account = $this->accountRepository->findOneBySetupToken($token);
        if (!$account || !$account->isSetupTokenValid($token)) {
            return null;
        }

        $account->setPassword($this->passwordHasher->hashPassword($account, $plainPassword));
        $account->markActivated();
        $this->entityManager->flush();

        return $account;
    }

    public function requestPasswordReset(string $email): ?EmpresaPortalCuenta
    {
        $account = $this->accountRepository->findOneBy(['email' => mb_strtolower(trim($email))]);
        if (!$account) {
            return null;
        }

        $account->issuePasswordResetToken();
        $this->entityManager->flush();

        return $account;
    }

    public function resetPassword(string $token, string $plainPassword): ?EmpresaPortalCuenta
    {
        $account = $this->accountRepository->findOneByPasswordResetToken($token);
        if (!$account || !$account->isPasswordResetTokenValid($token)) {
            return null;
        }

        $account->setPassword($this->passwordHasher->hashPassword($account, $plainPassword));
        $account->clearPasswordResetToken();
        $this->entityManager->flush();

        return $account;
    }

    public function sendActivationEmail(EmpresaPortalCuenta $account): bool
    {
        if (!$this->mailConfigurationInspector->snapshot()['canSend'] || $account->getSetupToken() === null) {
            return false;
        }

        $link = $this->buildFrontendLink('/externo/activar-cuenta', ['token' => $account->getSetupToken()]);
        $email = (new Email())
            ->from(Address::create($this->fromAddress))
            ->to($account->getEmail())
            ->subject('Activa tu acceso al portal de empresas')
            ->html(sprintf(
                '<p>Hola %s,</p><p>Tu solicitud ha sido aprobada. Activa tu cuenta desde este enlace:</p><p><a href="%s">%s</a></p>',
                htmlspecialchars($account->getDisplayName() ?? $account->getEmail(), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'),
                $link,
                $link
            ));

        try {
            $this->mailer->send($email);

            return true;
        } catch (\Throwable) {
            return false;
        }
    }

    public function sendPasswordResetEmail(EmpresaPortalCuenta $account): bool
    {
        if (!$this->mailConfigurationInspector->snapshot()['canSend'] || $account->getPasswordResetToken() === null) {
            return false;
        }

        $link = $this->buildFrontendLink('/externo/restablecer-clave', ['token' => $account->getPasswordResetToken()]);
        $email = (new Email())
            ->from(Address::create($this->fromAddress))
            ->to($account->getEmail())
            ->subject('Recupera tu acceso al portal de empresas')
            ->html(sprintf(
                '<p>Hola %s,</p><p>Hemos recibido una solicitud para restablecer tu contrasena. Usa este enlace:</p><p><a href="%s">%s</a></p>',
                htmlspecialchars($account->getDisplayName() ?? $account->getEmail(), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'),
                $link,
                $link
            ));

        try {
            $this->mailer->send($email);

            return true;
        } catch (\Throwable) {
            return false;
        }
    }

    private function buildFrontendLink(string $path, array $query = []): string
    {
        $baseUrl = rtrim($this->urlGenerator->generate('frontend_portal_index', [], UrlGeneratorInterface::ABSOLUTE_URL), '/');

        if ($query === []) {
            return $baseUrl . substr($path, strlen('/externo'));
        }

        return sprintf(
            '%s%s?%s',
            $baseUrl,
            substr($path, strlen('/externo')),
            http_build_query($query)
        );
    }
}

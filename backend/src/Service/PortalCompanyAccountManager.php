<?php

/**
 * Comentario de mantenimiento Agora.
 * Proposito: Servicio de aplicacion: concentra reglas reutilizables que no pertenecen a una sola entidad o controlador.
 * Relaciones: Conecta con App/Entity/EmpresaColaboradora, App/Entity/EmpresaPortalCuenta, App/Entity/EmpresaSolicitud, App/Repository/EmpresaPortalCuentaRepository.
 */

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
use Symfony\Component\Mailer\MailerInterface;

/**
 * Servicio de aplicacion: concentra reglas reutilizables que no pertenecen a una sola entidad o controlador.
 * Punto de enlace: sus dependencias importadas muestran con que servicios, repositorios o entidades colabora.
 */
final class PortalCompanyAccountManager
{
    /**
     * Recibe las dependencias que necesita este modulo y deja visible su punto de acoplamiento principal.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function __construct(
        private readonly EmpresaPortalCuentaRepository $accountRepository,
        private readonly EntityManagerInterface $entityManager,
        private readonly UserPasswordHasherInterface $passwordHasher,
        private readonly MailerInterface $mailer,
        private readonly MailConfigurationInspector $mailConfigurationInspector,
        private readonly ExternalAccessUrlGenerator $externalAccessUrlGenerator,
        private readonly string $fromAddress,
    ) {
    }

    /**
     * Registra una cuenta previa de empresa para que el portal privado exista antes de enviar la solicitud formal.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function registerAccount(string $email, string $displayName, string $plainPassword): ?EmpresaPortalCuenta
    {
        $normalizedEmail = mb_strtolower(trim($email));
        if ($this->accountRepository->findOneBy(['email' => $normalizedEmail]) instanceof EmpresaPortalCuenta) {
            return null;
        }

        $account = (new EmpresaPortalCuenta())
            ->setEmail($normalizedEmail)
            ->setDisplayName(trim($displayName))
            ->setRoles(['ROLE_COMPANY_PORTAL'])
            ->setActive(true);

        $account->setPassword($this->passwordHasher->hashPassword($account, $plainPassword));
        $account->markActivated();

        $this->entityManager->persist($account);
        $this->entityManager->flush();

        return $account;
    }

    /**
     * Resume la responsabilidad de provisionApprovedAccount dentro de este modulo y facilita seguir el flujo al revisarlo.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
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

    /**
     * Resume la responsabilidad de activateAccount dentro de este modulo y facilita seguir el flujo al revisarlo.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
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

    /**
     * Resume la responsabilidad de requestPasswordReset dentro de este modulo y facilita seguir el flujo al revisarlo.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
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

    /**
     * Resume la responsabilidad de resetPassword dentro de este modulo y facilita seguir el flujo al revisarlo.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
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

    /**
     * Resume la responsabilidad de sendActivationEmail dentro de este modulo y facilita seguir el flujo al revisarlo.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function sendActivationEmail(EmpresaPortalCuenta $account): bool
    {
        if (!$this->mailConfigurationInspector->snapshot()['canSend'] || $account->getSetupToken() === null) {
            return false;
        }

        $link = $this->externalAccessUrlGenerator->buildPortalUrl('/activar-cuenta', ['token' => $account->getSetupToken()]);
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

    /**
     * Resume la responsabilidad de sendPasswordResetEmail dentro de este modulo y facilita seguir el flujo al revisarlo.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function sendPasswordResetEmail(EmpresaPortalCuenta $account): bool
    {
        if (!$this->mailConfigurationInspector->snapshot()['canSend'] || $account->getPasswordResetToken() === null) {
            return false;
        }

        $link = $this->externalAccessUrlGenerator->buildPortalUrl('/restablecer-clave', ['token' => $account->getPasswordResetToken()]);
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

    /**
     * Construye una estructura derivada que sera enviada a otra capa del sistema.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function sendRequestRejectedEmail(EmpresaSolicitud $solicitud): bool
    {
        if (!$this->mailConfigurationInspector->snapshot()['canSend']) {
            return false;
        }

        $statusUrl = $this->externalAccessUrlGenerator->buildPortalUrl('/estado', ['token' => $solicitud->getPortalToken()]);
        $reason = $solicitud->getRejectionReason() ?? 'No se ha indicado un motivo adicional.';
        $email = (new Email())
            ->from(Address::create($this->fromAddress))
            ->to($solicitud->getContactoEmail())
            ->subject('Actualizacion de tu solicitud de empresa colaboradora')
            ->html(sprintf(
                '<p>Hola %s,</p><p>Hemos revisado la solicitud de <strong>%s</strong> y por ahora no ha sido aprobada.</p><p><strong>Motivo:</strong> %s</p><p>Puedes consultar el estado desde este enlace:</p><p><a href="%s">%s</a></p>',
                htmlspecialchars($solicitud->getContactoNombre(), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'),
                htmlspecialchars($solicitud->getNombreEmpresa(), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'),
                nl2br(htmlspecialchars($reason, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8')),
                $statusUrl,
                $statusUrl,
            ));

        try {
            $this->mailer->send($email);

            return true;
        } catch (\Throwable) {
            return false;
        }
    }
}

<?php

/**
 * Comentario de mantenimiento Agora.
 * Proposito: Componente de seguridad: aplica comprobaciones de acceso y estado de usuarios.
 * Relaciones: Conecta con App/Entity/EmpresaPortalCuenta.
 */

declare(strict_types=1);

namespace App\Security;

use App\Entity\EmpresaPortalCuenta;
use Symfony\Component\Security\Core\Exception\CustomUserMessageAccountStatusException;
use Symfony\Component\Security\Core\User\UserCheckerInterface;
use Symfony\Component\Security\Core\User\UserInterface;

/**
 * Componente de seguridad: aplica comprobaciones de acceso y estado de usuarios.
 * Punto de enlace: sus dependencias importadas muestran con que servicios, repositorios o entidades colabora.
 */
final class PortalCompanyUserChecker implements UserCheckerInterface
{
    /**
     * Resume la responsabilidad de checkPreAuth dentro de este modulo y facilita seguir el flujo al revisarlo.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function checkPreAuth(UserInterface $user): void
    {
        if (!$user instanceof EmpresaPortalCuenta) {
            return;
        }

        if (!$user->isActive()) {
            throw new CustomUserMessageAccountStatusException('La cuenta de empresa esta desactivada.');
        }

        if (!$user->hasPassword() || $user->getActivatedAt() === null) {
            throw new CustomUserMessageAccountStatusException('Debes activar tu cuenta desde el correo recibido antes de acceder.');
        }
    }

    /**
     * Resume la responsabilidad de checkPostAuth dentro de este modulo y facilita seguir el flujo al revisarlo.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function checkPostAuth(UserInterface $user): void
    {
        if (!$user instanceof EmpresaPortalCuenta) {
            return;
        }

        if (!$user->isActive()) {
            throw new CustomUserMessageAccountStatusException('La cuenta de empresa esta desactivada.');
        }
    }
}

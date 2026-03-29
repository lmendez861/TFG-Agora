<?php

declare(strict_types=1);

namespace App\Security;

use App\Entity\EmpresaPortalCuenta;
use Symfony\Component\Security\Core\Exception\CustomUserMessageAccountStatusException;
use Symfony\Component\Security\Core\User\UserCheckerInterface;
use Symfony\Component\Security\Core\User\UserInterface;

final class PortalCompanyUserChecker implements UserCheckerInterface
{
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

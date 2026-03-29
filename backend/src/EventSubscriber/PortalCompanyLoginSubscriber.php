<?php

declare(strict_types=1);

namespace App\EventSubscriber;

use App\Entity\EmpresaPortalCuenta;
use App\Service\AuditLogger;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\Security\Http\Event\LoginSuccessEvent;

final class PortalCompanyLoginSubscriber implements EventSubscriberInterface
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly AuditLogger $auditLogger,
    ) {
    }

    public static function getSubscribedEvents(): array
    {
        return [
            LoginSuccessEvent::class => 'onLoginSuccess',
        ];
    }

    public function onLoginSuccess(LoginSuccessEvent $event): void
    {
        $user = $event->getUser();
        if (!$user instanceof EmpresaPortalCuenta) {
            return;
        }

        $user->markLoggedIn();
        $this->entityManager->flush();
        $this->auditLogger->log('portal_company.login', 'empresa_portal_cuenta', $user->getId(), [
            'email' => $user->getEmail(),
        ]);
    }
}

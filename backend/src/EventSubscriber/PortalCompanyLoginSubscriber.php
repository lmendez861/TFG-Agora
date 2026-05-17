<?php

/**
 * Comentario de mantenimiento Agora.
 * Proposito: Suscriptor de eventos Symfony: reacciona a cambios del framework para mantener coherencia transversal.
 * Relaciones: Conecta con App/Entity/EmpresaPortalCuenta, App/Service/AuditLogger.
 */

declare(strict_types=1);

namespace App\EventSubscriber;

use App\Entity\EmpresaPortalCuenta;
use App\Service\AuditLogger;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\Security\Http\Event\LoginSuccessEvent;

/**
 * Suscriptor de eventos Symfony: reacciona a cambios del framework para mantener coherencia transversal.
 * Punto de enlace: sus dependencias importadas muestran con que servicios, repositorios o entidades colabora.
 */
final class PortalCompanyLoginSubscriber implements EventSubscriberInterface
{
    /**
     * Recibe las dependencias que necesita este modulo y deja visible su punto de acoplamiento principal.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
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

    /**
     * Resume la responsabilidad de onLoginSuccess dentro de este modulo y facilita seguir el flujo al revisarlo.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
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

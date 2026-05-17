<?php

/**
 * Comentario de mantenimiento Agora.
 * Proposito: Suscriptor de eventos Symfony: reacciona a cambios del framework para mantener coherencia transversal.
 * Relaciones: Conecta con App/Entity/AsignacionPractica, App/Entity/ContactoEmpresa, App/Entity/Convenio, App/Entity/EmpresaColaboradora, App/Entity/Estudiante, App/Entity/TutorProfesional, App/Service/BootstrapSnapshotProvider.
 */

declare(strict_types=1);

namespace App\EventSubscriber;

use App\Entity\AsignacionPractica;
use App\Entity\ContactoEmpresa;
use App\Entity\Convenio;
use App\Entity\EmpresaColaboradora;
use App\Entity\Estudiante;
use App\Entity\TutorProfesional;
use App\Service\BootstrapSnapshotProvider;
use Doctrine\Common\EventSubscriber;
use Doctrine\ORM\Event\PostFlushEventArgs;
use Doctrine\ORM\Event\PostRemoveEventArgs;
use Doctrine\ORM\Event\PostPersistEventArgs;
use Doctrine\ORM\Event\PostUpdateEventArgs;
use Doctrine\ORM\Events;

/**
 * Suscriptor de eventos Symfony: reacciona a cambios del framework para mantener coherencia transversal.
 * Punto de enlace: sus dependencias importadas muestran con que servicios, repositorios o entidades colabora.
 */
final class BootstrapSnapshotInvalidationSubscriber implements EventSubscriber
{
    private bool $shouldInvalidate = false;

    /**
     * Recibe las dependencias que necesita este modulo y deja visible su punto de acoplamiento principal.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function __construct(private readonly BootstrapSnapshotProvider $snapshotProvider)
    {
    }

    public function getSubscribedEvents(): array
    {
        return [
            Events::postPersist,
            Events::postUpdate,
            Events::postRemove,
            Events::postFlush,
        ];
    }

    /**
     * Resume la responsabilidad de postPersist dentro de este modulo y facilita seguir el flujo al revisarlo.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function postPersist(PostPersistEventArgs $event): void
    {
        $this->markForInvalidation($event->getObject());
    }

    /**
     * Resume la responsabilidad de postUpdate dentro de este modulo y facilita seguir el flujo al revisarlo.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function postUpdate(PostUpdateEventArgs $event): void
    {
        $this->markForInvalidation($event->getObject());
    }

    /**
     * Resume la responsabilidad de postRemove dentro de este modulo y facilita seguir el flujo al revisarlo.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function postRemove(PostRemoveEventArgs $event): void
    {
        $this->markForInvalidation($event->getObject());
    }

    /**
     * Resume la responsabilidad de postFlush dentro de este modulo y facilita seguir el flujo al revisarlo.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function postFlush(PostFlushEventArgs $event): void
    {
        if (!$this->shouldInvalidate) {
            return;
        }

        $this->shouldInvalidate = false;
        $this->snapshotProvider->invalidate();
    }

    /**
     * Resume la responsabilidad de markForInvalidation dentro de este modulo y facilita seguir el flujo al revisarlo.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    private function markForInvalidation(object $entity): void
    {
        if (
            $entity instanceof EmpresaColaboradora
            || $entity instanceof Estudiante
            || $entity instanceof Convenio
            || $entity instanceof AsignacionPractica
            || $entity instanceof TutorProfesional
            || $entity instanceof ContactoEmpresa
        ) {
            $this->shouldInvalidate = true;
        }
    }
}

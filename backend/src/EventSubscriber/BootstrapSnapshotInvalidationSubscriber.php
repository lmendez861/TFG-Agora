<?php

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

final class BootstrapSnapshotInvalidationSubscriber implements EventSubscriber
{
    private bool $shouldInvalidate = false;

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

    public function postPersist(PostPersistEventArgs $event): void
    {
        $this->markForInvalidation($event->getObject());
    }

    public function postUpdate(PostUpdateEventArgs $event): void
    {
        $this->markForInvalidation($event->getObject());
    }

    public function postRemove(PostRemoveEventArgs $event): void
    {
        $this->markForInvalidation($event->getObject());
    }

    public function postFlush(PostFlushEventArgs $event): void
    {
        if (!$this->shouldInvalidate) {
            return;
        }

        $this->shouldInvalidate = false;
        $this->snapshotProvider->invalidate();
    }

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

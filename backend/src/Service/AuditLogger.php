<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\AuditLog;
use App\Entity\EmpresaPortalCuenta;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\RequestStack;

final class AuditLogger
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly RequestStack $requestStack,
        private readonly Security $security,
    ) {
    }

    /**
     * @param array<string, mixed> $context
     */
    public function log(string $action, string $targetType, string|int|null $targetId = null, array $context = []): void
    {
        $request = $this->requestStack->getCurrentRequest();
        $user = $this->security->getUser();

        [$actorType, $actorIdentifier] = match (true) {
            $user instanceof User => ['internal', $user->getUserIdentifier()],
            $user instanceof EmpresaPortalCuenta => ['company', $user->getUserIdentifier()],
            default => ['anonymous', 'anonymous'],
        };

        $log = (new AuditLog())
            ->setActorType($actorType)
            ->setActorIdentifier($actorIdentifier)
            ->setAction($action)
            ->setTargetType($targetType)
            ->setTargetId($targetId !== null ? (string) $targetId : null)
            ->setContext($context !== [] ? json_encode($context, JSON_THROW_ON_ERROR) : null)
            ->setIpAddress($request?->getClientIp())
            ->setUserAgent($request?->headers->get('User-Agent'));

        $this->entityManager->persist($log);
        $this->entityManager->flush();
    }
}

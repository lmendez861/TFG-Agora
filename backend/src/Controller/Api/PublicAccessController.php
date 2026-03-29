<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Service\AuditLogger;
use App\Service\InternalMfaManager;
use App\Service\PublicAccessManager;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/public-access', name: 'api_public_access_')]
#[IsGranted('ROLE_MONITOR')]
final class PublicAccessController extends AbstractController
{
    public function __construct(
        private readonly PublicAccessManager $publicAccessManager,
        private readonly InternalMfaManager $internalMfaManager,
        private readonly AuditLogger $auditLogger,
    )
    {
    }

    #[Route('', name: 'status', methods: ['GET'])]
    public function status(): JsonResponse
    {
        return $this->json($this->publicAccessManager->getSnapshot(), Response::HTTP_OK);
    }

    #[Route('/start', name: 'start', methods: ['POST'])]
    public function start(): JsonResponse
    {
        try {
            $this->internalMfaManager->assertVerified();
        } catch (\Throwable $exception) {
            return $this->json(['message' => $exception->getMessage()], Response::HTTP_FORBIDDEN);
        }

        try {
            $snapshot = $this->publicAccessManager->start();
            $this->auditLogger->log('public_access.start', 'public_access', context: [
                'status' => $snapshot['status'] ?? null,
                'publicUrl' => $snapshot['publicUrl'] ?? null,
            ]);

            return $this->json($snapshot, Response::HTTP_OK);
        } catch (\RuntimeException $exception) {
            return $this->json(['message' => $exception->getMessage()], Response::HTTP_SERVICE_UNAVAILABLE);
        }
    }

    #[Route('/stop', name: 'stop', methods: ['POST'])]
    public function stop(): JsonResponse
    {
        try {
            $this->internalMfaManager->assertVerified();
        } catch (\Throwable $exception) {
            return $this->json(['message' => $exception->getMessage()], Response::HTTP_FORBIDDEN);
        }

        $snapshot = $this->publicAccessManager->stop();
        $this->auditLogger->log('public_access.stop', 'public_access', context: [
            'status' => $snapshot['status'] ?? null,
        ]);

        return $this->json($snapshot, Response::HTTP_OK);
    }
}

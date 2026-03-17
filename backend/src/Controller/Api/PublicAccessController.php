<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Service\PublicAccessManager;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/public-access', name: 'api_public_access_')]
#[IsGranted('ROLE_API')]
final class PublicAccessController extends AbstractController
{
    public function __construct(private readonly PublicAccessManager $publicAccessManager)
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
            return $this->json($this->publicAccessManager->start(), Response::HTTP_OK);
        } catch (\RuntimeException $exception) {
            return $this->json(['message' => $exception->getMessage()], Response::HTTP_SERVICE_UNAVAILABLE);
        }
    }

    #[Route('/stop', name: 'stop', methods: ['POST'])]
    public function stop(): JsonResponse
    {
        return $this->json($this->publicAccessManager->stop(), Response::HTTP_OK);
    }
}

<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Service\BootstrapSnapshotProvider;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/bootstrap', name: 'api_bootstrap_', methods: ['GET'])]
#[IsGranted('ROLE_API')]
final class BootstrapController extends AbstractController
{
    public function __construct(private readonly BootstrapSnapshotProvider $snapshotProvider)
    {
    }

    #[Route('', name: 'index')]
    public function index(): JsonResponse
    {
        return $this->json($this->snapshotProvider->getSnapshot());
    }
}

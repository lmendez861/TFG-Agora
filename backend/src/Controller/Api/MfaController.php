<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Service\AuditLogger;
use App\Service\InternalMfaManager;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Symfony\Component\Validator\Constraints as Assert;
use Symfony\Component\Validator\Validator\ValidatorInterface;

#[Route('/api/mfa', name: 'api_mfa_')]
#[IsGranted('ROLE_MONITOR')]
final class MfaController extends AbstractController
{
    public function __construct(
        private readonly InternalMfaManager $internalMfaManager,
        private readonly ValidatorInterface $validator,
        private readonly AuditLogger $auditLogger,
    ) {
    }

    #[Route('/status', name: 'status', methods: ['GET'])]
    public function status(): JsonResponse
    {
        return $this->json($this->internalMfaManager->getStatus(), Response::HTTP_OK);
    }

    #[Route('/challenge', name: 'challenge', methods: ['POST'])]
    public function challenge(): JsonResponse
    {
        $response = $this->internalMfaManager->issueChallenge('Control del portal interno');
        if (($response['status'] ?? '') === 'sent') {
            $this->auditLogger->log('internal_mfa.challenge', 'session');
        }

        return $this->json($response, ($response['status'] ?? '') === 'sent' ? Response::HTTP_OK : Response::HTTP_SERVICE_UNAVAILABLE);
    }

    #[Route('/verify', name: 'verify', methods: ['POST'])]
    public function verify(Request $request): JsonResponse
    {
        $payload = json_decode($request->getContent(), true);
        if (!is_array($payload)) {
            return $this->json(['message' => 'JSON invalido.'], Response::HTTP_BAD_REQUEST);
        }

        $violations = $this->validator->validate(
            $payload,
            new Assert\Collection(
                fields: [
                    'code' => [new Assert\NotBlank(), new Assert\Length(min: 6, max: 12)],
                ],
                allowExtraFields: false
            )
        );

        if ($violations->count() > 0) {
            return $this->json(['message' => 'Codigo MFA invalido.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        if (!$this->internalMfaManager->verifyCode($payload['code'])) {
            return $this->json(['message' => 'El codigo MFA no es valido o ya ha caducado.'], Response::HTTP_FORBIDDEN);
        }

        $this->auditLogger->log('internal_mfa.verify', 'session');

        return $this->json([
            'message' => 'Segundo factor validado correctamente.',
            'status' => $this->internalMfaManager->getStatus(),
        ], Response::HTTP_OK);
    }
}

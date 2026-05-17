<?php

/**
 * Comentario de mantenimiento Agora.
 * Proposito: Controlador HTTP de la API interna: valida peticiones, coordina servicios/repositorios y devuelve JSON al frontend.
 * Relaciones: Conecta con App/Service/AuditLogger, App/Service/InternalMfaManager, App/Service/PublicAccessManager.
 */

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

/**
 * Punto de entrada anotado por atributos Symfony/Doctrine; el atributo define como se enlaza con framework o persistencia.
 * El bloque de atributos siguiente indica la ruta, permiso o mapeo que conecta esta pieza con el resto del sistema.
 */
#[Route('/api/public-access', name: 'api_public_access_')]
#[IsGranted('ROLE_MONITOR')]
final class PublicAccessController extends AbstractController
{
    /**
     * Endpoint/controlador que valida la entrada, coordina dependencias y devuelve una respuesta HTTP.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function __construct(
        private readonly PublicAccessManager $publicAccessManager,
        private readonly InternalMfaManager $internalMfaManager,
        private readonly AuditLogger $auditLogger,
    )
    {
    }

    /**
     * Endpoint/controlador que valida la entrada, coordina dependencias y devuelve una respuesta HTTP.
     * El bloque de atributos siguiente indica la ruta, permiso o mapeo que conecta esta pieza con el resto del sistema.
     */
    #[Route('', name: 'status', methods: ['GET'])]
    public function status(): JsonResponse
    {
        return $this->json($this->publicAccessManager->getSnapshot(), Response::HTTP_OK);
    }

    /**
     * Endpoint/controlador que valida la entrada, coordina dependencias y devuelve una respuesta HTTP.
     * El bloque de atributos siguiente indica la ruta, permiso o mapeo que conecta esta pieza con el resto del sistema.
     */
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

    /**
     * Endpoint/controlador que valida la entrada, coordina dependencias y devuelve una respuesta HTTP.
     * El bloque de atributos siguiente indica la ruta, permiso o mapeo que conecta esta pieza con el resto del sistema.
     */
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

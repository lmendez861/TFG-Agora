<?php

/**
 * Comentario de mantenimiento Agora.
 * Proposito: Controlador HTTP de la API interna: valida peticiones, coordina servicios/repositorios y devuelve JSON al frontend.
 * Relaciones: Conecta con App/Service/BootstrapSnapshotProvider.
 */

declare(strict_types=1);

namespace App\Controller\Api;

use App\Service\BootstrapSnapshotProvider;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

/**
 * Punto de entrada anotado por atributos Symfony/Doctrine; el atributo define como se enlaza con framework o persistencia.
 * El bloque de atributos siguiente indica la ruta, permiso o mapeo que conecta esta pieza con el resto del sistema.
 */
#[Route('/api/bootstrap', name: 'api_bootstrap_', methods: ['GET'])]
#[IsGranted('ROLE_API')]
final class BootstrapController extends AbstractController
{
    /**
     * Endpoint/controlador que valida la entrada, coordina dependencias y devuelve una respuesta HTTP.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function __construct(private readonly BootstrapSnapshotProvider $snapshotProvider)
    {
    }

    /**
     * Endpoint/controlador que valida la entrada, coordina dependencias y devuelve una respuesta HTTP.
     * El bloque de atributos siguiente indica la ruta, permiso o mapeo que conecta esta pieza con el resto del sistema.
     */
    #[Route('', name: 'index')]
    public function index(): JsonResponse
    {
        return $this->json($this->snapshotProvider->getSnapshot());
    }
}

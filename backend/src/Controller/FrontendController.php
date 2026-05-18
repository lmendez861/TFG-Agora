<?php

/**
 * Comentario de mantenimiento Agora.
 * Proposito: Controlador Symfony: conecta rutas HTTP con servicios de dominio y plantillas/respuestas.
 * Relaciones: Conexiones principales indicadas por imports, inyeccion de dependencias o rutas del propio archivo.
 */

declare(strict_types=1);

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

/**
 * Controlador Symfony: conecta rutas HTTP con servicios de dominio y plantillas/respuestas.
 * Punto de enlace: sus dependencias importadas muestran con que servicios, repositorios o entidades colabora.
 */
final class FrontendController extends AbstractController
{
    /**
     * Endpoint/controlador que valida la entrada, coordina dependencias y devuelve una respuesta HTTP.
     * El bloque de atributos siguiente indica la ruta, permiso o mapeo que conecta esta pieza con el resto del sistema.
     */
    #[Route('/', name: 'frontend_root', methods: ['GET'])]
    public function root(): RedirectResponse
    {
        return $this->redirect('/app');
    }

    /**
     * Endpoint/controlador que valida la entrada, coordina dependencias y devuelve una respuesta HTTP.
     * El bloque de atributos siguiente indica la ruta, permiso o mapeo que conecta esta pieza con el resto del sistema.
     */
    #[Route('/app', name: 'frontend_app_index', methods: ['GET'])]
    #[Route('/app/{path}', name: 'frontend_app_path', requirements: ['path' => '.*'], methods: ['GET'])]
    public function app(): Response
    {
        return $this->serveFrontendIndex('app');
    }

    /**
     * Endpoint/controlador que valida la entrada, coordina dependencias y devuelve una respuesta HTTP.
     * El bloque de atributos siguiente indica la ruta, permiso o mapeo que conecta esta pieza con el resto del sistema.
     */
    #[Route('/documentacion', name: 'frontend_documentation_index', methods: ['GET'])]
    #[Route('/documentacion/{path}', name: 'frontend_documentation_path', requirements: ['path' => '.*'], methods: ['GET'])]
    public function documentation(): Response
    {
        return $this->serveFrontendIndex('app');
    }

    /**
     * Endpoint/controlador que valida la entrada, coordina dependencias y devuelve una respuesta HTTP.
     * El bloque de atributos siguiente indica la ruta, permiso o mapeo que conecta esta pieza con el resto del sistema.
     */
    #[Route('/legacy/monitor', name: 'frontend_monitor_legacy_index', methods: ['GET'])]
    #[Route('/legacy/monitor/{path}', name: 'frontend_monitor_legacy_path', requirements: ['path' => '.*'], methods: ['GET'])]
    public function monitorLegacy(): Response
    {
        return $this->serveFrontendIndex('app');
    }

    #[Route('/monitor', name: 'frontend_monitor_index', methods: ['GET'])]
    #[Route('/monitor/{path}', name: 'frontend_monitor_path', requirements: ['path' => '.*'], methods: ['GET'])]
    public function monitor(): RedirectResponse
    {
        return $this->redirect('/legacy/monitor');
    }

    /**
     * Endpoint/controlador que valida la entrada, coordina dependencias y devuelve una respuesta HTTP.
     * El bloque de atributos siguiente indica la ruta, permiso o mapeo que conecta esta pieza con el resto del sistema.
     */
    #[Route('/control', name: 'frontend_control_redirect', methods: ['GET'])]
    #[Route('/control/{path}', name: 'frontend_control_path_redirect', requirements: ['path' => '.*'], methods: ['GET'])]
    public function control(): RedirectResponse
    {
        return $this->redirect('/legacy/monitor');
    }

    /**
     * Endpoint/controlador que valida la entrada, coordina dependencias y devuelve una respuesta HTTP.
     * El bloque de atributos siguiente indica la ruta, permiso o mapeo que conecta esta pieza con el resto del sistema.
     */
    #[Route('/externo', name: 'frontend_portal_index', methods: ['GET'])]
    #[Route('/externo/{path}', name: 'frontend_portal_path', requirements: ['path' => '.*'], methods: ['GET'])]
    public function externo(): Response
    {
        return $this->serveFrontendIndex('externo');
    }

    /**
     * Endpoint/controlador que valida la entrada, coordina dependencias y devuelve una respuesta HTTP.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    private function serveFrontendIndex(string $directory): Response
    {
        $indexPath = sprintf('%s/public/%s/index.html', $this->getParameter('kernel.project_dir'), $directory);
        if (!is_file($indexPath)) {
            return new Response(
                sprintf(
                    'No se ha encontrado la build del frontend "%s". Ejecuta la build unificada antes de abrir esta ruta.',
                    $directory
                ),
                Response::HTTP_SERVICE_UNAVAILABLE
            );
        }

        return new BinaryFileResponse($indexPath);
    }
}

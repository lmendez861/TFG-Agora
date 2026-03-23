<?php

declare(strict_types=1);

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

final class FrontendController extends AbstractController
{
    #[Route('/', name: 'frontend_root', methods: ['GET'])]
    public function root(): RedirectResponse
    {
        return $this->redirect('/app');
    }

    #[Route('/app', name: 'frontend_app_index', methods: ['GET'])]
    #[Route('/app/{path}', name: 'frontend_app_path', requirements: ['path' => '.*'], methods: ['GET'])]
    public function app(): Response
    {
        return $this->serveFrontendIndex('app');
    }

    #[Route('/documentacion', name: 'frontend_documentation_index', methods: ['GET'])]
    #[Route('/documentacion/{path}', name: 'frontend_documentation_path', requirements: ['path' => '.*'], methods: ['GET'])]
    public function documentation(): Response
    {
        return $this->serveFrontendIndex('app');
    }

    #[Route('/monitor', name: 'frontend_monitor_index', methods: ['GET'])]
    #[Route('/monitor/{path}', name: 'frontend_monitor_path', requirements: ['path' => '.*'], methods: ['GET'])]
    public function monitor(): Response
    {
        return $this->serveFrontendIndex('app');
    }

    #[Route('/control', name: 'frontend_control_redirect', methods: ['GET'])]
    #[Route('/control/{path}', name: 'frontend_control_path_redirect', requirements: ['path' => '.*'], methods: ['GET'])]
    public function control(): RedirectResponse
    {
        return $this->redirect('/monitor');
    }

    #[Route('/externo', name: 'frontend_portal_index', methods: ['GET'])]
    #[Route('/externo/{path}', name: 'frontend_portal_path', requirements: ['path' => '.*'], methods: ['GET'])]
    public function externo(): Response
    {
        return $this->serveFrontendIndex('externo');
    }

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

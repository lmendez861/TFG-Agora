<?php

/**
 * Comentario de mantenimiento Agora.
 * Proposito: evita que las rutas API internas disparen el popup nativo de HTTP Basic en el navegador.
 * Relaciones: Conecta con config/packages/security.yaml como entry_point del firewall principal.
 */

declare(strict_types=1);

namespace App\Security;

use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Security\Core\Exception\AuthenticationException;
use Symfony\Component\Security\Http\EntryPoint\AuthenticationEntryPointInterface;

final class ApiAuthenticationEntryPoint implements AuthenticationEntryPointInterface
{
    public function start(Request $request, ?AuthenticationException $authException = null): Response
    {
        return new JsonResponse(
            ['message' => 'Inicia sesion para acceder al portal interno.'],
            Response::HTTP_UNAUTHORIZED
        );
    }
}

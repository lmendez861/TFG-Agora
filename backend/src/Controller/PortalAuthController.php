<?php

/**
 * Comentario de mantenimiento Agora.
 * Proposito: Controlador Symfony: conecta rutas HTTP con servicios de dominio y plantillas/respuestas.
 * Relaciones: Conecta con App/Entity/EmpresaPortalCuenta, App/Service/AuditLogger, App/Service/PortalCompanyAccountManager.
 */

declare(strict_types=1);

namespace App\Controller;

use App\Entity\EmpresaPortalCuenta;
use App\Service\AuditLogger;
use App\Service\PortalCompanyAccountManager;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Symfony\Component\Validator\Constraints as Assert;
use Symfony\Component\Validator\Validator\ValidatorInterface;

/**
 * Punto de entrada anotado por atributos Symfony/Doctrine; el atributo define como se enlaza con framework o persistencia.
 * El bloque de atributos siguiente indica la ruta, permiso o mapeo que conecta esta pieza con el resto del sistema.
 */
#[Route('/portal-auth', name: 'portal_auth_')]
final class PortalAuthController extends AbstractController
{
    /**
     * Endpoint/controlador que valida la entrada, coordina dependencias y devuelve una respuesta HTTP.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function __construct(
        private readonly PortalCompanyAccountManager $accountManager,
        private readonly ValidatorInterface $validator,
        private readonly AuditLogger $auditLogger,
    ) {
    }

    /**
     * Endpoint/controlador que valida la entrada, coordina dependencias y devuelve una respuesta HTTP.
     * El bloque de atributos siguiente indica la ruta, permiso o mapeo que conecta esta pieza con el resto del sistema.
     */
    #[Route('/login', name: 'login', methods: ['POST'])]
    public function login(): Response
    {
        return new Response(null, Response::HTTP_NO_CONTENT);
    }

    /**
     * Endpoint/controlador que valida la entrada, coordina dependencias y devuelve una respuesta HTTP.
     * El bloque de atributos siguiente indica la ruta, permiso o mapeo que conecta esta pieza con el resto del sistema.
     */
    #[Route('/logout', name: 'logout', methods: ['POST'])]
    public function logout(): void
    {
        // Managed by the firewall.
    }

    /**
     * Endpoint/controlador que valida la entrada, coordina dependencias y devuelve una respuesta HTTP.
     * El bloque de atributos siguiente indica la ruta, permiso o mapeo que conecta esta pieza con el resto del sistema.
     */
    #[Route('/me', name: 'me', methods: ['GET'])]
    #[IsGranted('ROLE_COMPANY_PORTAL')]
    public function me(): JsonResponse
    {
        $account = $this->getUser();
        if (!$account instanceof EmpresaPortalCuenta) {
            return $this->json(['message' => 'No autenticado'], Response::HTTP_UNAUTHORIZED);
        }

        return $this->json([
            'email' => $account->getEmail(),
            'displayName' => $account->getDisplayName(),
            'roles' => $account->getRoles(),
            'activatedAt' => $account->getActivatedAt()?->format(\DateTimeInterface::ATOM),
            'lastLoginAt' => $account->getLastLoginAt()?->format(\DateTimeInterface::ATOM),
            'empresa' => [
                'id' => $account->getEmpresa()?->getId(),
                'nombre' => $account->getEmpresa()?->getNombre(),
            ],
        ]);
    }

    /**
     * Endpoint/controlador que valida la entrada, coordina dependencias y devuelve una respuesta HTTP.
     * El bloque de atributos siguiente indica la ruta, permiso o mapeo que conecta esta pieza con el resto del sistema.
     */
    #[Route('/activate', name: 'activate', methods: ['POST'])]
    public function activate(Request $request): JsonResponse
    {
        $payload = $this->decodePayload($request);
        if ($payload instanceof JsonResponse) {
            return $payload;
        }

        $constraints = new Assert\Collection(
            fields: [
                'token' => [new Assert\NotBlank(), new Assert\Length(min: 16, max: 255)],
                'password' => $this->passwordConstraints(),
            ],
            allowExtraFields: false
        );

        $violations = $this->validator->validate($payload, $constraints);
        if ($violations->count() > 0) {
            return $this->json(['message' => 'Datos de activacion no validos.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $account = $this->accountManager->activateAccount($payload['token'], $payload['password']);
        if (!$account) {
            return $this->json(['message' => 'El enlace de activacion ya no es valido o ha caducado.'], Response::HTTP_NOT_FOUND);
        }

        $this->auditLogger->log('portal_company.activate', 'empresa_portal_cuenta', $account->getId(), [
            'email' => $account->getEmail(),
            'empresaId' => $account->getEmpresa()?->getId(),
        ]);

        return $this->json([
            'message' => 'Cuenta activada correctamente. Ya puedes acceder al portal de empresas.',
        ], Response::HTTP_OK);
    }

    /**
     * Endpoint/controlador que valida la entrada, coordina dependencias y devuelve una respuesta HTTP.
     * El bloque de atributos siguiente indica la ruta, permiso o mapeo que conecta esta pieza con el resto del sistema.
     */
    #[Route('/request-reset', name: 'request_reset', methods: ['POST'])]
    public function requestReset(Request $request): JsonResponse
    {
        $payload = $this->decodePayload($request);
        if ($payload instanceof JsonResponse) {
            return $payload;
        }

        $constraints = new Assert\Collection(
            fields: [
                'email' => [new Assert\NotBlank(), new Assert\Email()],
            ],
            allowExtraFields: false
        );

        $violations = $this->validator->validate($payload, $constraints);
        if ($violations->count() > 0) {
            return $this->json(['message' => 'Debes indicar un correo valido.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $account = $this->accountManager->requestPasswordReset($payload['email']);
        if ($account) {
            $this->accountManager->sendPasswordResetEmail($account);
            $this->auditLogger->log('portal_company.request_reset', 'empresa_portal_cuenta', $account->getId(), [
                'email' => $account->getEmail(),
            ]);
        }

        return $this->json([
            'message' => 'Si existe una cuenta asociada, enviaremos un enlace de recuperacion al correo indicado.',
        ], Response::HTTP_OK);
    }

    /**
     * Endpoint/controlador que valida la entrada, coordina dependencias y devuelve una respuesta HTTP.
     * El bloque de atributos siguiente indica la ruta, permiso o mapeo que conecta esta pieza con el resto del sistema.
     */
    #[Route('/reset-password', name: 'reset_password', methods: ['POST'])]
    public function resetPassword(Request $request): JsonResponse
    {
        $payload = $this->decodePayload($request);
        if ($payload instanceof JsonResponse) {
            return $payload;
        }

        $constraints = new Assert\Collection(
            fields: [
                'token' => [new Assert\NotBlank(), new Assert\Length(min: 16, max: 255)],
                'password' => $this->passwordConstraints(),
            ],
            allowExtraFields: false
        );

        $violations = $this->validator->validate($payload, $constraints);
        if ($violations->count() > 0) {
            return $this->json(['message' => 'No se pudo validar la recuperacion.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $account = $this->accountManager->resetPassword($payload['token'], $payload['password']);
        if (!$account) {
            return $this->json(['message' => 'El enlace de recuperacion ya no es valido o ha caducado.'], Response::HTTP_NOT_FOUND);
        }

        $this->auditLogger->log('portal_company.reset_password', 'empresa_portal_cuenta', $account->getId(), [
            'email' => $account->getEmail(),
        ]);

        return $this->json([
            'message' => 'La contrasena se ha actualizado correctamente.',
        ], Response::HTTP_OK);
    }

    /**
     * Endpoint/controlador que valida la entrada, coordina dependencias y devuelve una respuesta HTTP.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    private function decodePayload(Request $request): array|JsonResponse
    {
        $payload = json_decode($request->getContent(), true);
        if (!is_array($payload)) {
            return $this->json(['message' => 'JSON invalido.'], Response::HTTP_BAD_REQUEST);
        }

        return $payload;
    }

    /**
     * Define las reglas minimas de contrasena para activacion y recuperacion del portal externo.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     *
     * @return list<Assert\Constraint>
     */
    private function passwordConstraints(): array
    {
        return [
            new Assert\NotBlank(),
            new Assert\Length(min: 8, max: 190),
        ];
    }
}

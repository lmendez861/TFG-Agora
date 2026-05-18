<?php

/**
 * Comentario de mantenimiento Agora.
 * Proposito: Controlador Symfony: conecta rutas HTTP con servicios de dominio y plantillas/respuestas.
 * Relaciones: Conecta con App/Controller/Api/JsonRequestTrait, App/Entity/EmpresaSolicitud, App/Repository/EmpresaSolicitudRepository, App/Service/MailConfigurationInspector.
 */

namespace App\Controller;

use App\Controller\Api\JsonRequestTrait;
use App\Entity\EmpresaSolicitud;
use App\Repository\EmpresaSolicitudRepository;
use App\Service\ExternalAccessUrlGenerator;
use App\Service\MailConfigurationInspector;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Address;
use Symfony\Component\Mime\Email;
use Symfony\Component\HttpKernel\KernelInterface;
use Symfony\Component\RateLimiter\RateLimiterFactory;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Validator\Constraints as Assert;
use Symfony\Component\Validator\Validator\ValidatorInterface;
use Throwable;

/**
 * Punto de entrada anotado por atributos Symfony/Doctrine; el atributo define como se enlaza con framework o persistencia.
 * El bloque de atributos siguiente indica la ruta, permiso o mapeo que conecta esta pieza con el resto del sistema.
 */
#[Route('/registro-empresa', name: 'registro_empresa_')]
final class RegistroEmpresaController extends AbstractController
{
    use JsonRequestTrait;

    /**
     * Endpoint/controlador que valida la entrada, coordina dependencias y devuelve una respuesta HTTP.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly MailerInterface $mailer,
        private readonly ValidatorInterface $validator,
        private readonly EmpresaSolicitudRepository $solicitudRepository,
        private readonly ExternalAccessUrlGenerator $externalAccessUrlGenerator,
        private readonly KernelInterface $kernel,
        private readonly MailConfigurationInspector $mailConfigurationInspector,
        private readonly string $fromAddress,
        #[Autowire(service: 'limiter.public_company_request')]
        private readonly RateLimiterFactory $publicCompanyRequestLimiter,
        #[Autowire(service: 'limiter.portal_auth_recovery')]
        private readonly RateLimiterFactory $recoveryLimiter,
    ) {
    }

    /**
     * Endpoint/controlador que valida la entrada, coordina dependencias y devuelve una respuesta HTTP.
     * El bloque de atributos siguiente indica la ruta, permiso o mapeo que conecta esta pieza con el resto del sistema.
     */
    #[Route('', name: 'create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        if ($this->isLegacyPublicFlowDisabled()) {
            return $this->legacyPublicFlowDisabledResponse();
        }

        if ($rateLimitResponse = $this->consumeRateLimit(
            $this->publicCompanyRequestLimiter,
            $this->buildLimiterKey($request),
            'Has superado el limite temporal de altas publicas. Espera unos minutos antes de reintentarlo.'
        )) {
            return $rateLimitResponse;
        }

        $payload = $this->decodePayload($request);
        if ($payload instanceof JsonResponse) {
            return $payload;
        }

        $constraints = new Assert\Collection(
            fields: [
                'nombreEmpresa' => [new Assert\NotBlank(), new Assert\Length(max: 150)],
                'cif' => new Assert\Optional([new Assert\Length(max: 32)]),
                'sector' => new Assert\Optional([new Assert\Length(max: 120)]),
                'ciudad' => new Assert\Optional([new Assert\Length(max: 100)]),
                'web' => new Assert\Optional([new Assert\Url(requireTld: false)]),
                'descripcion' => new Assert\Optional(),
                'contactoNombre' => [new Assert\NotBlank(), new Assert\Length(max: 150)],
                'contactoEmail' => [new Assert\NotBlank(), new Assert\Email()],
                'contactoTelefono' => new Assert\Optional([new Assert\Length(max: 50)]),
            ],
            allowExtraFields: false
        );

        $violations = $this->validator->validate($payload, $constraints);
        if ($violations->count() > 0) {
            return $this->validationErrorResponse($violations);
        }

        $solicitud = (new EmpresaSolicitud())
            ->setNombreEmpresa($payload['nombreEmpresa'])
            ->setCif($payload['cif'] ?? null)
            ->setSector($payload['sector'] ?? null)
            ->setCiudad($payload['ciudad'] ?? null)
            ->setWeb($payload['web'] ?? null)
            ->setDescripcion($payload['descripcion'] ?? null)
            ->setContactoNombre($payload['contactoNombre'])
            ->setContactoEmail($payload['contactoEmail'])
            ->setContactoTelefono($payload['contactoTelefono'] ?? null);

        $this->entityManager->persist($solicitud);
        $this->entityManager->flush();

        $verificationUrl = $this->externalAccessUrlGenerator->buildRouteUrl('registro_empresa_confirm', [
            'token' => $solicitud->getToken(),
        ], $request);
        $portalUrl = $this->externalAccessUrlGenerator->buildRouteUrl('portal_solicitudes_show', [
            'token' => $solicitud->getPortalToken(),
        ], $request);

        $mailSnapshot = $this->mailConfigurationInspector->snapshot();
        $emailDelivery = 'sent';
        if (!$mailSnapshot['canSend']) {
            $emailDelivery = 'unavailable';
        } elseif (!$this->trySendVerificationEmail($solicitud, $verificationUrl)) {
            $emailDelivery = 'failed';
        }

        $response = [
            'message' => match ($emailDelivery) {
                'sent' => 'Solicitud registrada correctamente. Por favor revisa tu email para confirmar la direccion.',
                'unavailable' => 'Solicitud registrada correctamente, pero el correo saliente no esta configurado todavia. Debes revisar la configuracion SMTP antes de enviar verificaciones reales.',
                default => 'Solicitud registrada correctamente, pero no hemos podido enviar el correo de verificacion. Reintenta el envio desde el portal o revisa la configuracion de correo.',
            },
            'id' => $solicitud->getId(),
            'portalToken' => $solicitud->getPortalToken(),
            'portalUrl' => $portalUrl,
            'emailDelivery' => $emailDelivery,
            'mailDetail' => $mailSnapshot['detail'],
        ];

        if ($this->shouldExposeVerificationLinks()) {
            $response['verificationUrl'] = $verificationUrl;
        }

        return $this->json($response, Response::HTTP_CREATED);
    }

    /**
     * Endpoint/controlador que valida la entrada, coordina dependencias y devuelve una respuesta HTTP.
     * El bloque de atributos siguiente indica la ruta, permiso o mapeo que conecta esta pieza con el resto del sistema.
     */
    #[Route('/reenviar', name: 'resend', methods: ['POST'])]
    public function resend(Request $request): JsonResponse
    {
        if ($this->isLegacyPublicFlowDisabled()) {
            return $this->legacyPublicFlowDisabledResponse();
        }

        $payload = $this->decodePayload($request);
        if ($payload instanceof JsonResponse) {
            return $payload;
        }

        if ($rateLimitResponse = $this->consumeRateLimit(
            $this->recoveryLimiter,
            $this->buildLimiterKey($request, (string) ($payload['contactoEmail'] ?? $payload['portalToken'] ?? '')),
            'Has superado el limite temporal de reenvios. Espera unos minutos antes de reintentarlo.'
        )) {
            return $rateLimitResponse;
        }

        $constraints = new Assert\Collection(
            fields: [
                'portalToken' => new Assert\Optional([new Assert\Length(min: 12, max: 128)]),
                'contactoEmail' => new Assert\Optional([new Assert\Email()]),
            ],
            allowMissingFields: true,
            allowExtraFields: false
        );

        $violations = $this->validator->validate($payload, $constraints);
        if ($violations->count() > 0) {
            return $this->validationErrorResponse($violations);
        }

        if (!array_key_exists('portalToken', $payload) && !array_key_exists('contactoEmail', $payload)) {
            return $this->json([
                'message' => 'Debes indicar el token del portal o el correo de contacto para reenviar la verificacion.',
            ], Response::HTTP_BAD_REQUEST);
        }

        $solicitud = null;
        if (!empty($payload['portalToken'])) {
            $solicitud = $this->solicitudRepository->findOneBy(['portalToken' => $payload['portalToken']]);
        }

        if (!$solicitud && !empty($payload['contactoEmail'])) {
            $solicitud = $this->solicitudRepository->findOneBy(
                ['contactoEmail' => $payload['contactoEmail']],
                ['id' => 'DESC']
            );
        }

        if (!$solicitud) {
            return $this->json([
                'message' => 'No encontramos ninguna solicitud asociada a los datos indicados.',
            ], Response::HTTP_NOT_FOUND);
        }

        if ($solicitud->isEmailVerified()) {
            return $this->json([
                'message' => 'La direccion de correo ya esta verificada.',
                'portalToken' => $solicitud->getPortalToken(),
            ], Response::HTTP_OK);
        }

        $verificationUrl = $this->externalAccessUrlGenerator->buildRouteUrl('registro_empresa_confirm', [
            'token' => $solicitud->getToken(),
        ], $request);
        $portalUrl = $this->externalAccessUrlGenerator->buildRouteUrl('portal_solicitudes_show', [
            'token' => $solicitud->getPortalToken(),
        ], $request);

        $mailSnapshot = $this->mailConfigurationInspector->snapshot();
        if (!$mailSnapshot['canSend']) {
            return $this->json([
                'message' => 'No hemos podido reenviar el correo de verificacion porque el correo saliente no esta configurado correctamente.',
                'portalToken' => $solicitud->getPortalToken(),
                'portalUrl' => $portalUrl,
                'emailDelivery' => 'unavailable',
                'mailDetail' => $mailSnapshot['detail'],
            ], Response::HTTP_SERVICE_UNAVAILABLE);
        }

        if (!$this->trySendVerificationEmail($solicitud, $verificationUrl)) {
            return $this->json([
                'message' => 'No hemos podido reenviar el correo de verificacion. Revisa la configuracion SMTP e intentalo de nuevo.',
                'portalToken' => $solicitud->getPortalToken(),
                'portalUrl' => $portalUrl,
                'emailDelivery' => 'failed',
                'mailDetail' => 'La configuracion parece valida, pero el transporte rechazo el envio.',
            ], Response::HTTP_SERVICE_UNAVAILABLE);
        }

        $response = [
            'message' => 'Hemos reenviado el correo de verificacion a la direccion registrada.',
            'portalToken' => $solicitud->getPortalToken(),
            'portalUrl' => $portalUrl,
            'emailDelivery' => 'sent',
            'mailDetail' => $mailSnapshot['detail'],
        ];

        if ($this->shouldExposeVerificationLinks()) {
            $response['verificationUrl'] = $verificationUrl;
        }

        return $this->json($response, Response::HTTP_OK);
    }

    /**
     * Endpoint/controlador que valida la entrada, coordina dependencias y devuelve una respuesta HTTP.
     * El bloque de atributos siguiente indica la ruta, permiso o mapeo que conecta esta pieza con el resto del sistema.
     */
    #[Route('/confirmar', name: 'confirm', methods: ['GET'])]
    public function confirm(Request $request): Response
    {
        $token = (string) $request->query->get('token');
        if ($token === '') {
            return $this->confirmationResponse('El token de verificacion es obligatorio.', Response::HTTP_BAD_REQUEST, $request);
        }

        $solicitud = $this->solicitudRepository->findOneBy(['token' => $token]);
        if (!$solicitud) {
            return $this->confirmationResponse('No encontramos ninguna solicitud asociada a este token.', Response::HTTP_NOT_FOUND, $request);
        }

        if ($solicitud->isEmailVerified()) {
            return $this->confirmationResponse('La direccion ya habia sido verificada previamente.', Response::HTTP_OK, $request);
        }

        $solicitud->markEmailVerified();
        $this->entityManager->flush();

        return $this->confirmationResponse('Hemos confirmado tu correo. El equipo revisara la solicitud en breve.', Response::HTTP_OK, $request);
    }

    /**
     * Endpoint/controlador que valida la entrada, coordina dependencias y devuelve una respuesta HTTP.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    private function confirmationResponse(string $message, int $status, Request $request): Response
    {
        $wantsJson = $request->getPreferredFormat() === 'json' || in_array('application/json', $request->getAcceptableContentTypes(), true);
        if ($wantsJson) {
            return $this->json(['message' => $message], $status);
        }

        $html = <<<HTML
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Verificacion de empresa</title>
  <style>
    body { margin:0; font-family: Arial, sans-serif; background: linear-gradient(135deg, #0c1b2a, #050b12); color: #e9f2ff; display:flex; align-items:center; justify-content:center; min-height:100vh; }
    .card { background: rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:16px; padding:24px 28px; max-width:460px; box-shadow:0 20px 40px rgba(0,0,0,0.35); }
    .status { display:inline-block; padding:6px 10px; border-radius:999px; background: rgba(75,139,255,0.2); color:#9bc2ff; font-weight:700; font-size:13px; margin-bottom:10px; }
    h1 { margin:0 0 8px; font-size:22px; }
    p { margin:0; line-height:1.6; color:#c7d9ff; }
  </style>
</head>
<body>
  <div class="card">
    <div class="status">Verificacion</div>
    <h1>Estado de tu solicitud</h1>
    <p>{$message}</p>
  </div>
</body>
</html>
HTML;

        return new Response($html, $status);
    }

    private function isLegacyPublicFlowDisabled(): bool
    {
        return $this->kernel->getEnvironment() === 'prod' && !$this->kernel->isDebug();
    }

    private function legacyPublicFlowDisabledResponse(): JsonResponse
    {
        return $this->json([
            'message' => 'El alta publica directa ya no esta disponible. Crea primero una cuenta de empresa y completa la solicitud desde el portal externo autenticado.',
        ], Response::HTTP_GONE);
    }

    /**
     * Endpoint/controlador que valida la entrada, coordina dependencias y devuelve una respuesta HTTP.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    private function sendVerificationEmail(EmpresaSolicitud $solicitud, string $verificationUrl): void
    {
        $email = (new Email())
            ->from(Address::create($this->fromAddress))
            ->to($solicitud->getContactoEmail())
            ->subject('Confirma tu registro de empresa colaboradora')
            ->html(sprintf(
                <<<HTML
<p>Hola %s,</p>
<p>Hemos recibido tu solicitud para colaborar con nuestro centro educativo. Por favor confirma tu correo pulsando en el siguiente enlace:</p>
<p><a href="%s">%s</a></p>
<p>En cuanto verifiquemos los datos, el equipo de practicas revisara la informacion para darte de alta.</p>
HTML,
                htmlspecialchars($solicitud->getContactoNombre(), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'),
                $verificationUrl,
                $verificationUrl
            ));

        $this->mailer->send($email);
    }

    /**
     * Endpoint/controlador que valida la entrada, coordina dependencias y devuelve una respuesta HTTP.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    private function trySendVerificationEmail(EmpresaSolicitud $solicitud, string $verificationUrl): bool
    {
        try {
            $this->sendVerificationEmail($solicitud, $verificationUrl);

            return true;
        } catch (Throwable) {
            return false;
        }
    }

    /**
     * Endpoint/controlador que valida la entrada, coordina dependencias y devuelve una respuesta HTTP.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    private function shouldExposeVerificationLinks(): bool
    {
        if ($this->kernel->getEnvironment() === 'test' || $this->kernel->isDebug()) {
            return true;
        }

        $mailSnapshot = $this->mailConfigurationInspector->snapshot();

        return ($mailSnapshot['provider'] ?? null) === 'null' || !($mailSnapshot['canSend'] ?? false);
    }

    /**
     * Aplica limitacion por IP o identificador publico para proteger formularios expuestos sin autenticacion.
     */
    private function consumeRateLimit(RateLimiterFactory $factory, string $key, string $message): ?JsonResponse
    {
        $limit = $factory->create($key)->consume();
        if ($limit->isAccepted()) {
            return null;
        }

        $retryAfter = $limit->getRetryAfter();
        $headers = [];
        if ($retryAfter instanceof \DateTimeInterface) {
            $headers['Retry-After'] = (string) max(1, $retryAfter->getTimestamp() - time());
        }

        return $this->json(['message' => $message], Response::HTTP_TOO_MANY_REQUESTS, $headers);
    }

    private function buildLimiterKey(Request $request, string $suffix = ''): string
    {
        $ip = trim((string) ($request->getClientIp() ?? 'unknown'));
        $normalizedSuffix = mb_strtolower(trim($suffix));

        return $normalizedSuffix !== '' ? sprintf('%s|%s', $ip, $normalizedSuffix) : $ip;
    }
}

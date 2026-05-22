<?php

/**
 * Comentario de mantenimiento Agora.
 * Proposito: Controlador HTTP de la API interna: valida peticiones, coordina servicios/repositorios y devuelve JSON al frontend.
 * Relaciones: Conecta con App/Entity/ConvenioDocumento, App/Entity/EmpresaDocumento, App/Entity/EmpresaMensaje, App/Entity/EmpresaPortalCuenta, App/Service/DocumentStorageManager.
 */

declare(strict_types=1);

namespace App\Controller\Api;

use App\Entity\ConvenioDocumento;
use App\Entity\EmpresaDocumento;
use App\Entity\EmpresaMensaje;
use App\Entity\EmpresaPortalCuenta;
use App\Entity\EmpresaSolicitud;
use App\Service\ExternalAccessUrlGenerator;
use App\Service\MailConfigurationInspector;
use App\Service\DocumentStorageManager;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\ResponseHeaderBag;
use Symfony\Component\HttpKernel\KernelInterface;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Address;
use Symfony\Component\Mime\Email;
use Symfony\Component\RateLimiter\RateLimiterFactory;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Symfony\Component\Validator\Constraints as Assert;
use Symfony\Component\Validator\Validator\ValidatorInterface;
use Throwable;

/**
 * Punto de entrada anotado por atributos Symfony/Doctrine; el atributo define como se enlaza con framework o persistencia.
 * El bloque de atributos siguiente indica la ruta, permiso o mapeo que conecta esta pieza con el resto del sistema.
 */
#[Route('/api/portal-company', name: 'api_portal_company_')]
#[IsGranted('ROLE_COMPANY_PORTAL')]
final class PortalCompanyController extends AbstractController
{
    /**
     * Endpoint/controlador que valida la entrada, coordina dependencias y devuelve una respuesta HTTP.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function __construct(
        private readonly ValidatorInterface $validator,
        private readonly ExternalAccessUrlGenerator $externalAccessUrlGenerator,
        private readonly MailConfigurationInspector $mailConfigurationInspector,
        private readonly MailerInterface $mailer,
        private readonly KernelInterface $kernel,
        private readonly string $fromAddress,
        #[Autowire(service: 'limiter.portal_company_request')]
        private readonly RateLimiterFactory $portalCompanyRequestLimiter,
        #[Autowire(service: 'limiter.portal_auth_recovery')]
        private readonly RateLimiterFactory $portalVerificationResendLimiter,
    ) {
    }

    /**
     * Endpoint/controlador que valida la entrada, coordina dependencias y devuelve una respuesta HTTP.
     * El bloque de atributos siguiente indica la ruta, permiso o mapeo que conecta esta pieza con el resto del sistema.
     */
    #[Route('/overview', name: 'overview', methods: ['GET'])]
    public function overview(): JsonResponse
    {
        $account = $this->getUser();
        if (!$account instanceof EmpresaPortalCuenta) {
            return $this->json(['message' => 'No autenticado'], Response::HTTP_UNAUTHORIZED);
        }

        $empresa = $account->getEmpresa();

        $solicitud = $account->getSolicitud();
        $messages = $solicitud ? array_map(
            static fn (EmpresaMensaje $message): array => [
                'id' => $message->getId(),
                'autor' => $message->getAutor(),
                'texto' => $message->getTexto(),
                'createdAt' => $message->getCreatedAt()->format(\DateTimeInterface::ATOM),
            ],
            $solicitud->getMensajes()->toArray()
        ) : [];

        return $this->json([
            'account' => [
                'email' => $account->getEmail(),
                'displayName' => $account->getDisplayName(),
                'activatedAt' => $account->getActivatedAt()?->format(\DateTimeInterface::ATOM),
                'lastLoginAt' => $account->getLastLoginAt()?->format(\DateTimeInterface::ATOM),
            ],
            'company' => $empresa ? [
                'id' => $empresa->getId(),
                'nombre' => $empresa->getNombre(),
                'sector' => $empresa->getSector(),
                'ciudad' => $empresa->getCiudad(),
                'email' => $empresa->getEmail(),
                'telefono' => $empresa->getTelefono(),
                'web' => $empresa->getWeb(),
                'estadoColaboracion' => $empresa->getEstadoColaboracion(),
            ] : null,
            'convenios' => $empresa ? array_map(static function ($convenio): array {
                return [
                    'id' => $convenio->getId(),
                    'titulo' => $convenio->getTitulo(),
                    'estado' => $convenio->getEstado(),
                    'fechaInicio' => $convenio->getFechaInicio()->format('Y-m-d'),
                    'fechaFin' => $convenio->getFechaFin()?->format('Y-m-d'),
                ];
            }, $empresa->getConvenios()->toArray()) : [],
            'asignaciones' => $empresa ? array_map(static function ($asignacion): array {
                return [
                    'id' => $asignacion->getId(),
                    'estado' => $asignacion->getEstado(),
                    'modalidad' => $asignacion->getModalidad(),
                    'fechaInicio' => $asignacion->getFechaInicio()->format('Y-m-d'),
                    'fechaFin' => $asignacion->getFechaFin()?->format('Y-m-d'),
                    'estudiante' => [
                        'id' => $asignacion->getEstudiante()->getId(),
                        'nombre' => $asignacion->getEstudiante()->getNombre(),
                        'apellido' => $asignacion->getEstudiante()->getApellido(),
                    ],
                ];
            }, $empresa->getAsignaciones()->toArray()) : [],
            'documents' => [
                'empresa' => $empresa ? array_map(fn (EmpresaDocumento $documento): array => $this->serializeEmpresaDocumento($documento), array_filter(
                    $empresa->getDocumentos()->toArray(),
                    static fn (EmpresaDocumento $documento): bool => $documento->isActive() && $documento->getDeletedAt() === null
                )) : [],
                'convenio' => $empresa ? array_values(array_merge(...array_map(function ($convenio): array {
                    return array_map(fn (ConvenioDocumento $documento): array => $this->serializeConvenioDocumento($documento), array_filter(
                        $convenio->getDocumentos()->toArray(),
                        static fn (ConvenioDocumento $documento): bool => $documento->isActive() && $documento->getDeletedAt() === null
                    ));
                }, $empresa->getConvenios()->toArray()))) : [],
            ],
            'messages' => $messages,
            'solicitud' => $solicitud ? [
                'id' => $solicitud->getId(),
                'estado' => $solicitud->getEstado(),
                'nombreEmpresa' => $solicitud->getNombreEmpresa(),
                'sector' => $solicitud->getSector(),
                'ciudad' => $solicitud->getCiudad(),
                'web' => $solicitud->getWeb(),
                'contactoNombre' => $solicitud->getContactoNombre(),
                'contactoEmail' => $solicitud->getContactoEmail(),
                'contactoTelefono' => $solicitud->getContactoTelefono(),
                'tutorProfesional' => [
                    'nombre' => $solicitud->getTutorProfesionalNombre(),
                    'email' => $solicitud->getTutorProfesionalEmail(),
                    'telefono' => $solicitud->getTutorProfesionalTelefono(),
                    'cargo' => $solicitud->getTutorProfesionalCargo(),
                ],
                'creadaEn' => $solicitud->getCreatedAt()->format(\DateTimeInterface::ATOM),
                'emailVerificadoEn' => $solicitud->getEmailVerificadoEn()?->format(\DateTimeInterface::ATOM),
                'aprobadoEn' => $solicitud->getAprobadoEn()?->format(\DateTimeInterface::ATOM),
                'motivoRechazo' => $solicitud->getRejectionReason(),
            ] : null,
        ]);
    }

    /**
     * Endpoint/controlador que valida la entrada, coordina dependencias y devuelve una respuesta HTTP.
     * El bloque de atributos siguiente indica la ruta, permiso o mapeo que conecta esta pieza con el resto del sistema.
     */
    #[Route('/request', name: 'create_request', methods: ['POST'])]
    public function createRequest(Request $request, EntityManagerInterface $entityManager): JsonResponse
    {
        $account = $this->getUser();
        if (!$account instanceof EmpresaPortalCuenta) {
            return $this->json(['message' => 'No autenticado'], Response::HTTP_UNAUTHORIZED);
        }

        if ($rateLimitResponse = $this->consumeRateLimit(
            $this->portalCompanyRequestLimiter,
            $account->getEmail(),
            'Has superado el limite temporal de registro de solicitudes. Espera unos minutos antes de reintentarlo.'
        )) {
            return $rateLimitResponse;
        }

        if ($account->getEmpresa() !== null) {
            return $this->json(['message' => 'La cuenta ya esta vinculada a una empresa aprobada.'], Response::HTTP_CONFLICT);
        }

        if ($account->getSolicitud() !== null) {
            return $this->json(['message' => 'La cuenta ya dispone de una solicitud asociada.'], Response::HTTP_CONFLICT);
        }

        $payload = json_decode($request->getContent(), true);
        if (!is_array($payload)) {
            return $this->json(['message' => 'JSON invalido.'], Response::HTTP_BAD_REQUEST);
        }

        $violations = $this->validator->validate(
            $payload,
            new Assert\Collection(
                fields: [
                    'nombreEmpresa' => [new Assert\NotBlank(), new Assert\Length(max: 150)],
                    'cif' => new Assert\Optional([new Assert\Length(max: 32)]),
                    'sector' => new Assert\Optional([new Assert\Length(max: 120)]),
                    'ciudad' => new Assert\Optional([new Assert\Length(max: 100)]),
                    'web' => new Assert\Optional([new Assert\Url(requireTld: false)]),
                    'descripcion' => new Assert\Optional(),
                    'contactoNombre' => [new Assert\NotBlank(), new Assert\Length(max: 150)],
                    'contactoTelefono' => new Assert\Optional([new Assert\Length(max: 50)]),
                    'tutorProfesionalNombre' => [new Assert\NotBlank(), new Assert\Length(max: 150)],
                    'tutorProfesionalEmail' => new Assert\Optional([new Assert\Email(), new Assert\Length(max: 150)]),
                    'tutorProfesionalTelefono' => new Assert\Optional([new Assert\Length(max: 50)]),
                    'tutorProfesionalCargo' => new Assert\Optional([new Assert\Length(max: 120)]),
                ],
                allowExtraFields: false
            )
        );

        if ($violations->count() > 0) {
            return $this->json(['message' => 'No se pudo validar la solicitud de colaboracion.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $solicitud = (new EmpresaSolicitud())
            ->setNombreEmpresa($payload['nombreEmpresa'])
            ->setCif($payload['cif'] ?? null)
            ->setSector($payload['sector'] ?? null)
            ->setCiudad($payload['ciudad'] ?? null)
            ->setWeb($payload['web'] ?? null)
            ->setDescripcion($payload['descripcion'] ?? null)
            ->setContactoNombre($payload['contactoNombre'])
            ->setContactoEmail($account->getEmail())
            ->setContactoTelefono($payload['contactoTelefono'] ?? null)
            ->setTutorProfesionalNombre($payload['tutorProfesionalNombre'])
            ->setTutorProfesionalEmail($payload['tutorProfesionalEmail'] ?? null)
            ->setTutorProfesionalTelefono($payload['tutorProfesionalTelefono'] ?? null)
            ->setTutorProfesionalCargo($payload['tutorProfesionalCargo'] ?? null);

        $account
            ->setDisplayName($payload['contactoNombre'])
            ->setSolicitud($solicitud);

        $entityManager->persist($solicitud);
        $entityManager->persist($account);
        $entityManager->flush();

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
                'sent' => 'Solicitud registrada correctamente. Revisa el correo corporativo para verificar la cuenta de contacto.',
                'unavailable' => 'Solicitud registrada correctamente, pero el correo saliente no esta configurado todavia. Debes revisar SMTP antes de verificar desde fuera.',
                default => 'Solicitud registrada correctamente, pero no hemos podido enviar el correo de verificacion. Reintenta el envio o revisa el correo saliente.',
            },
            'id' => $solicitud->getId(),
            'emailDelivery' => $emailDelivery,
            'mailDetail' => $mailSnapshot['detail'],
        ];

        if ($this->shouldExposeVerificationLinks()) {
            $response['verificationUrl'] = $verificationUrl;
            $response['portalUrl'] = $portalUrl;
        }

        return $this->json($response, Response::HTTP_CREATED);
    }

    #[Route('/resend-verification', name: 'resend_verification', methods: ['POST'])]
    public function resendVerification(Request $request): JsonResponse
    {
        $account = $this->getUser();
        if (!$account instanceof EmpresaPortalCuenta) {
            return $this->json(['message' => 'No autenticado'], Response::HTTP_UNAUTHORIZED);
        }

        if ($rateLimitResponse = $this->consumeRateLimit(
            $this->portalVerificationResendLimiter,
            $account->getEmail(),
            'Has superado el limite temporal de reenvios. Espera unos minutos antes de reintentarlo.'
        )) {
            return $rateLimitResponse;
        }

        $solicitud = $account->getSolicitud();
        if (!$solicitud instanceof EmpresaSolicitud) {
            return $this->json([
                'message' => 'La cuenta no dispone de ninguna solicitud asociada para reenviar la verificacion.',
            ], Response::HTTP_CONFLICT);
        }

        if ($solicitud->isEmailVerified()) {
            return $this->json([
                'message' => 'La direccion de correo ya esta verificada.',
                'emailDelivery' => 'not_required',
            ], Response::HTTP_OK);
        }

        $verificationUrl = $this->externalAccessUrlGenerator->buildRouteUrl('registro_empresa_confirm', [
            'token' => $solicitud->getToken(),
        ], $request);

        $mailSnapshot = $this->mailConfigurationInspector->snapshot();
        if (!$mailSnapshot['canSend']) {
            return $this->json([
                'message' => 'No hemos podido reenviar el correo de verificacion porque el correo saliente no esta configurado correctamente.',
                'emailDelivery' => 'unavailable',
                'mailDetail' => $mailSnapshot['detail'],
            ], Response::HTTP_SERVICE_UNAVAILABLE);
        }

        if (!$this->trySendVerificationEmail($solicitud, $verificationUrl)) {
            return $this->json([
                'message' => 'No hemos podido reenviar el correo de verificacion. Revisa la configuracion SMTP e intentalo de nuevo.',
                'emailDelivery' => 'failed',
                'mailDetail' => 'La configuracion parece valida, pero el transporte rechazo el envio.',
            ], Response::HTTP_SERVICE_UNAVAILABLE);
        }

        $response = [
            'message' => 'Hemos reenviado el correo de verificacion a la direccion registrada.',
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
    #[Route('/messages', name: 'messages_create', methods: ['POST'])]
    public function postMessage(Request $request, EntityManagerInterface $entityManager): JsonResponse
    {
        $account = $this->getUser();
        if (!$account instanceof EmpresaPortalCuenta || $account->getSolicitud() === null) {
            return $this->json(['message' => 'La cuenta no dispone de un canal asociado.'], Response::HTTP_CONFLICT);
        }

        $payload = json_decode($request->getContent(), true);
        if (!is_array($payload)) {
            return $this->json(['message' => 'JSON invalido.'], Response::HTTP_BAD_REQUEST);
        }

        $violations = $this->validator->validate(
            $payload,
            new Assert\Collection(
                fields: [
                    'texto' => [new Assert\NotBlank(), new Assert\Length(max: 2000)],
                ],
                allowExtraFields: false
            )
        );

        if ($violations->count() > 0) {
            return $this->json(['message' => 'No se pudo validar el mensaje.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $mensaje = (new EmpresaMensaje())
            ->setSolicitud($account->getSolicitud())
            ->setAutor('empresa')
            ->setTexto($payload['texto']);

        $entityManager->persist($mensaje);
        $entityManager->flush();

        return $this->json([
            'id' => $mensaje->getId(),
            'autor' => $mensaje->getAutor(),
            'texto' => $mensaje->getTexto(),
            'createdAt' => $mensaje->getCreatedAt()->format(\DateTimeInterface::ATOM),
        ], Response::HTTP_CREATED);
    }

    /**
     * Endpoint/controlador que valida la entrada, coordina dependencias y devuelve una respuesta HTTP.
     * El bloque de atributos siguiente indica la ruta, permiso o mapeo que conecta esta pieza con el resto del sistema.
     */
    #[Route('/documents/{scope}/{documentId<\d+>}', name: 'download_document', methods: ['GET'])]
    public function downloadDocument(
        string $scope,
        int $documentId,
        EntityManagerInterface $entityManager,
        DocumentStorageManager $documentStorage,
    ): Response
    {
        $account = $this->getUser();
        if (!$account instanceof EmpresaPortalCuenta || $account->getEmpresa() === null) {
            return $this->json(['message' => 'No autenticado'], Response::HTTP_UNAUTHORIZED);
        }

        if ($scope === 'empresa') {
            $document = $entityManager->getRepository(EmpresaDocumento::class)->find($documentId);
            if (
                !$document instanceof EmpresaDocumento
                || $document->getEmpresa()?->getId() !== $account->getEmpresa()?->getId()
                || !$document->isActive()
                || $document->getDeletedAt() !== null
            ) {
                return $this->json(['message' => 'Documento no encontrado.'], Response::HTTP_NOT_FOUND);
            }

            return $this->serveDocumentResponse(
                $documentStorage,
                $document->getStoragePath(),
                $document->getOriginalFilename(),
                $document->getUrl(),
                $document->getDecodedFileContent(),
                $document->getMimeType()
            );
        }

        if ($scope === 'convenio') {
            $document = $entityManager->getRepository(ConvenioDocumento::class)->find($documentId);
            if (
                !$document instanceof ConvenioDocumento
                || $document->getConvenio()?->getEmpresa()?->getId() !== $account->getEmpresa()?->getId()
                || !$document->isActive()
                || $document->getDeletedAt() !== null
            ) {
                return $this->json(['message' => 'Documento no encontrado.'], Response::HTTP_NOT_FOUND);
            }

            return $this->serveDocumentResponse($documentStorage, $document->getStoragePath(), $document->getOriginalFilename(), $document->getUrl());
        }

        return $this->json(['message' => 'Tipo de documento no soportado.'], Response::HTTP_BAD_REQUEST);
    }

    /**
     * Convierte entidades de dominio en el contrato JSON consumido por el frontend.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    private function serializeEmpresaDocumento(EmpresaDocumento $documento): array
    {
        return [
            'id' => $documento->getId(),
            'name' => $documento->getNombre(),
            'type' => $documento->getTipo(),
            'version' => $documento->getVersion(),
            'uploadedAt' => $documento->getUploadedAt()->format(\DateTimeInterface::ATOM),
            'url' => sprintf('/api/portal-company/documents/empresa/%d', $documento->getId()),
        ];
    }

    /**
     * Convierte entidades de dominio en el contrato JSON consumido por el frontend.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    private function serializeConvenioDocumento(ConvenioDocumento $documento): array
    {
        return [
            'id' => $documento->getId(),
            'name' => $documento->getNombre(),
            'type' => $documento->getTipo(),
            'version' => $documento->getVersion(),
            'uploadedAt' => $documento->getUploadedAt()->format(\DateTimeInterface::ATOM),
            'url' => sprintf('/api/portal-company/documents/convenio/%d', $documento->getId()),
            'sourceLabel' => $documento->getConvenio()?->getTitulo(),
        ];
    }

    /**
     * Endpoint/controlador que valida la entrada, coordina dependencias y devuelve una respuesta HTTP.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    private function serveDocumentResponse(
        DocumentStorageManager $documentStorage,
        ?string $storagePath,
        ?string $originalFilename,
        ?string $url,
        ?string $inlineContent = null,
        ?string $mimeType = null,
    ): Response
    {
        if ($storagePath !== null) {
            $absolutePath = $documentStorage->resolveAbsolutePath($storagePath);
            if (!is_file($absolutePath)) {
                return $this->json(['message' => 'Documento no encontrado.'], Response::HTTP_NOT_FOUND);
            }

            $filename = $originalFilename ?: basename($absolutePath);
            $mimeType = mime_content_type($absolutePath) ?: 'application/octet-stream';

            return $this->file($absolutePath, $filename, ResponseHeaderBag::DISPOSITION_INLINE, ['Content-Type' => $mimeType]);
        }

        if ($inlineContent !== null) {
            $filename = $originalFilename ?: 'documento';
            $response = new Response($inlineContent, Response::HTTP_OK, [
                'Content-Type' => $mimeType ?: 'application/octet-stream',
            ]);
            $response->headers->set(
                'Content-Disposition',
                (new ResponseHeaderBag())->makeDisposition(ResponseHeaderBag::DISPOSITION_INLINE, $filename)
            );

            return $response;
        }

        if (is_string($url) && $url !== '') {
            return $this->redirect($url);
        }

        return $this->json(['message' => 'Documento no disponible.'], Response::HTTP_NOT_FOUND);
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

    private function consumeRateLimit(RateLimiterFactory $factory, string $key, string $message): ?JsonResponse
    {
        $limit = $factory->create(mb_strtolower(trim($key)))->consume();
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
}

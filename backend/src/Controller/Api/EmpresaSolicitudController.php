<?php

namespace App\Controller\Api;

use App\Entity\EmpresaMensaje;
use App\Entity\ContactoEmpresa;
use App\Entity\EmpresaColaboradora;
use App\Entity\EmpresaSolicitud;
use App\Repository\EmpresaSolicitudRepository;
use App\Service\AuditLogger;
use App\Service\BootstrapSnapshotProvider;
use App\Service\PortalCompanyAccountManager;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Generator\UrlGeneratorInterface;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Symfony\Component\Validator\Constraints as Assert;
use Symfony\Component\Validator\Validator\ValidatorInterface;

#[Route('/api/empresa-solicitudes', name: 'api_empresa_solicitudes_')]
final class EmpresaSolicitudController extends AbstractController
{
    use JsonRequestTrait;

    public function __construct(
        private readonly EmpresaSolicitudRepository $repository,
        private readonly EntityManagerInterface $entityManager,
        private readonly ValidatorInterface $validator,
        private readonly UrlGeneratorInterface $urlGenerator,
        private readonly PortalCompanyAccountManager $portalCompanyAccountManager,
        private readonly AuditLogger $auditLogger,
    ) {
    }

    #[Route('', name: 'create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
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
                'contactoNombre' => new Assert\Optional([new Assert\Length(max: 150)]),
                'contactoEmail' => new Assert\Optional([new Assert\Email()]),
                'contactoTelefono' => new Assert\Optional([new Assert\Length(max: 50)]),
            ],
            allowExtraFields: true
        );

        $violations = $this->validator->validate($payload, $constraints);
        if ($violations->count() > 0) {
            return $this->validationErrorResponse($violations);
        }

        $contactoNombre = $payload['contactoNombre'] ?? ($payload['contacto']['nombre'] ?? null);
        $contactoEmail = $payload['contactoEmail'] ?? ($payload['contacto']['email'] ?? null);
        $contactoTelefono = $payload['contactoTelefono'] ?? ($payload['contacto']['telefono'] ?? null);

        $solicitud = (new EmpresaSolicitud())
            ->setNombreEmpresa($payload['nombreEmpresa'])
            ->setCif($payload['cif'] ?? null)
            ->setSector($payload['sector'] ?? null)
            ->setCiudad($payload['ciudad'] ?? null)
            ->setWeb($payload['web'] ?? null)
            ->setDescripcion($payload['descripcion'] ?? null)
            ->setContactoNombre($contactoNombre ?? 'Contacto no indicado')
            ->setContactoEmail($contactoEmail ?? 'sin-email@pendiente.test')
            ->setContactoTelefono($contactoTelefono);

        $this->entityManager->persist($solicitud);
        $this->entityManager->flush();

        $verificationUrl = $this->urlGenerator->generate(
            'registro_empresa_confirm',
            ['token' => $solicitud->getToken()],
            UrlGeneratorInterface::ABSOLUTE_URL
        );

        return $this->json([
            'message' => 'Solicitud registrada correctamente. Por favor revisa tu email para confirmar la direccion.',
            'id' => $solicitud->getId(),
            'token' => $solicitud->getToken(),
            'portalToken' => $solicitud->getPortalToken(),
            'verificationUrl' => $verificationUrl,
        ], Response::HTTP_CREATED);
    }

    #[Route('', name: 'index', methods: ['GET'])]
    #[IsGranted('ROLE_API')]
    public function index(Request $request): JsonResponse
    {
        $estado = $request->query->get('estado');
        $page = max(1, (int) $request->query->get('page', 1));
        $perPage = min(50, max(1, (int) $request->query->get('perPage', 20)));
        $offset = ($page - 1) * $perPage;

        $criteria = [];
        if ($estado) {
            $criteria['estado'] = $estado;
        }

        $solicitudes = $this->repository->findBy($criteria, ['createdAt' => 'DESC'], $perPage, $offset);
        $data = array_map(fn (EmpresaSolicitud $solicitud): array => $this->serializeSolicitud($solicitud), $solicitudes);

        return $this->json([
            'items' => $data,
            'page' => $page,
            'perPage' => $perPage,
        ], Response::HTTP_OK);
    }

    #[Route('/bandeja', name: 'inbox', methods: ['GET'])]
    #[IsGranted('ROLE_API')]
    public function inbox(): JsonResponse
    {
        $solicitudes = $this->repository->findBy([], ['createdAt' => 'DESC'], 150);
        $threads = array_map(fn (EmpresaSolicitud $solicitud): array => $this->serializeInboxThread($solicitud), $solicitudes);

        usort($threads, static fn (array $left, array $right): int => strcmp($right['activityAt'], $left['activityAt']));

        return $this->json($threads, Response::HTTP_OK);
    }

    #[Route('/{id<\d+>}/aprobar', name: 'approve', methods: ['POST'])]
    #[IsGranted('ROLE_COORDINATOR')]
    public function approve(
        ?EmpresaSolicitud $solicitud,
        BootstrapSnapshotProvider $snapshotProvider
    ): JsonResponse
    {
        if (!$solicitud) {
            return $this->json(['message' => 'Solicitud no encontrada.'], Response::HTTP_NOT_FOUND);
        }

        if ($solicitud->getEstado() === EmpresaSolicitud::ESTADO_APROBADA) {
            return $this->json(['message' => 'La solicitud ya fue aprobada.'], Response::HTTP_CONFLICT);
        }

        $observaciones = sprintf('Alta generada a partir de la solicitud #%d.', $solicitud->getId());
        if ($solicitud->getDescripcion()) {
            $observaciones .= PHP_EOL . $solicitud->getDescripcion();
        }

        $empresa = (new EmpresaColaboradora())
            ->setNombre($solicitud->getNombreEmpresa())
            ->setSector($solicitud->getSector())
            ->setCiudad($solicitud->getCiudad())
            ->setEmail($solicitud->getContactoEmail())
            ->setTelefono($solicitud->getContactoTelefono())
            ->setWeb($solicitud->getWeb())
            ->setObservaciones($observaciones)
            ->setEstadoColaboracion('pendiente');

        $contacto = (new ContactoEmpresa())
            ->setEmpresa($empresa)
            ->setNombre($solicitud->getContactoNombre())
            ->setEmail($solicitud->getContactoEmail())
            ->setTelefono($solicitud->getContactoTelefono())
            ->setCargo('Contacto de registro')
            ->setEsTutorProfesional(false);

        $empresa->addContacto($contacto);

        $this->entityManager->persist($empresa);
        $solicitud->markApproved();
        $account = $this->portalCompanyAccountManager->provisionApprovedAccount($solicitud, $empresa);
        $this->entityManager->flush();
        $activationEmailSent = $this->portalCompanyAccountManager->sendActivationEmail($account);
        $snapshotProvider->invalidate();
        $this->auditLogger->log('empresa_solicitud.approve', 'empresa_solicitud', $solicitud->getId(), [
            'empresaId' => $empresa->getId(),
            'portalAccountId' => $account->getId(),
            'activationEmailSent' => $activationEmailSent,
        ]);

        return $this->json([
            'message' => 'Solicitud aprobada y empresa dada de alta correctamente.',
            'empresa' => [
                'id' => $empresa->getId(),
                'nombre' => $empresa->getNombre(),
            ],
            'portalAccount' => [
                'id' => $account->getId(),
                'email' => $account->getEmail(),
                'activationPending' => !$account->hasPassword(),
                'activationEmailSent' => $activationEmailSent,
            ],
        ], Response::HTTP_CREATED);
    }

    #[Route('/{id<\d+>}/rechazar', name: 'reject', methods: ['POST'])]
    #[IsGranted('ROLE_COORDINATOR')]
    public function reject(?EmpresaSolicitud $solicitud, Request $request): JsonResponse
    {
        if (!$solicitud) {
            return $this->json(['message' => 'Solicitud no encontrada.'], Response::HTTP_NOT_FOUND);
        }

        $payload = $this->decodePayload($request);
        if ($payload instanceof JsonResponse) {
            return $payload;
        }

        $constraints = new Assert\Collection(
            fields: [
                'motivo' => [new Assert\NotBlank()],
            ],
            allowExtraFields: false
        );

        $violations = $this->validator->validate($payload, $constraints);
        if ($violations->count() > 0) {
            return $this->validationErrorResponse($violations);
        }

        $solicitud->reject($payload['motivo']);
        $this->entityManager->flush();
        $this->auditLogger->log('empresa_solicitud.reject', 'empresa_solicitud', $solicitud->getId(), [
            'reason' => $payload['motivo'],
        ]);

        return $this->json([
            'message' => 'Solicitud rechazada.',
        ], Response::HTTP_OK);
    }

    private function serializeSolicitud(EmpresaSolicitud $solicitud): array
    {
        return [
            'id' => $solicitud->getId(),
            'nombreEmpresa' => $solicitud->getNombreEmpresa(),
            'cif' => $solicitud->getCif(),
            'sector' => $solicitud->getSector(),
            'ciudad' => $solicitud->getCiudad(),
            'web' => $solicitud->getWeb(),
            'contacto' => [
                'nombre' => $solicitud->getContactoNombre(),
                'email' => $solicitud->getContactoEmail(),
                'telefono' => $solicitud->getContactoTelefono(),
            ],
            'estado' => $solicitud->getEstado(),
            'creadaEn' => $solicitud->getCreatedAt()->format(\DateTimeInterface::ATOM),
            'emailVerificadoEn' => $solicitud->getEmailVerificadoEn()?->format(\DateTimeInterface::ATOM),
            'aprobadoEn' => $solicitud->getAprobadoEn()?->format(\DateTimeInterface::ATOM),
            'motivoRechazo' => $solicitud->getRejectionReason(),
        ];
    }

    private function serializeInboxThread(EmpresaSolicitud $solicitud): array
    {
        $mensajes = $solicitud->getMensajes()->toArray();
        usort(
            $mensajes,
            static fn (EmpresaMensaje $left, EmpresaMensaje $right): int => $left->getCreatedAt() <=> $right->getCreatedAt()
        );

        $ultimoMensaje = $mensajes !== [] ? $mensajes[array_key_last($mensajes)] : null;
        $portalCuenta = $solicitud->getPortalCuenta();

        return [
            'solicitud' => $this->serializeSolicitud($solicitud),
            'messageCount' => count($mensajes),
            'companyMessageCount' => count(array_filter(
                $mensajes,
                static fn (EmpresaMensaje $mensaje): bool => $mensaje->getAutor() === 'empresa'
            )),
            'centerMessageCount' => count(array_filter(
                $mensajes,
                static fn (EmpresaMensaje $mensaje): bool => $mensaje->getAutor() === 'centro'
            )),
            'activityAt' => ($ultimoMensaje?->getCreatedAt() ?? $solicitud->getCreatedAt())->format(\DateTimeInterface::ATOM),
            'lastMessage' => $ultimoMensaje ? [
                'id' => $ultimoMensaje->getId(),
                'autor' => $ultimoMensaje->getAutor(),
                'texto' => $ultimoMensaje->getTexto(),
                'createdAt' => $ultimoMensaje->getCreatedAt()->format(\DateTimeInterface::ATOM),
            ] : null,
            'portalAccount' => $portalCuenta ? [
                'email' => $portalCuenta->getEmail(),
                'activatedAt' => $portalCuenta->getActivatedAt()?->format(\DateTimeInterface::ATOM),
                'activationPending' => !$portalCuenta->hasPassword(),
            ] : null,
        ];
    }
}

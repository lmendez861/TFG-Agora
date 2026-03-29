<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Entity\ConvenioDocumento;
use App\Entity\EmpresaDocumento;
use App\Entity\EmpresaMensaje;
use App\Entity\EmpresaPortalCuenta;
use App\Service\DocumentStorageManager;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\ResponseHeaderBag;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Symfony\Component\Validator\Constraints as Assert;
use Symfony\Component\Validator\Validator\ValidatorInterface;

#[Route('/api/portal-company', name: 'api_portal_company_')]
#[IsGranted('ROLE_COMPANY_PORTAL')]
final class PortalCompanyController extends AbstractController
{
    public function __construct(private readonly ValidatorInterface $validator)
    {
    }

    #[Route('/overview', name: 'overview', methods: ['GET'])]
    public function overview(): JsonResponse
    {
        $account = $this->getUser();
        if (!$account instanceof EmpresaPortalCuenta) {
            return $this->json(['message' => 'No autenticado'], Response::HTTP_UNAUTHORIZED);
        }

        $empresa = $account->getEmpresa();
        if ($empresa === null) {
            return $this->json(['message' => 'La cuenta no esta asociada a ninguna empresa.'], Response::HTTP_CONFLICT);
        }

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
            'company' => [
                'id' => $empresa->getId(),
                'nombre' => $empresa->getNombre(),
                'sector' => $empresa->getSector(),
                'ciudad' => $empresa->getCiudad(),
                'email' => $empresa->getEmail(),
                'telefono' => $empresa->getTelefono(),
                'web' => $empresa->getWeb(),
                'estadoColaboracion' => $empresa->getEstadoColaboracion(),
            ],
            'convenios' => array_map(static function ($convenio): array {
                return [
                    'id' => $convenio->getId(),
                    'titulo' => $convenio->getTitulo(),
                    'estado' => $convenio->getEstado(),
                    'fechaInicio' => $convenio->getFechaInicio()->format('Y-m-d'),
                    'fechaFin' => $convenio->getFechaFin()?->format('Y-m-d'),
                ];
            }, $empresa->getConvenios()->toArray()),
            'asignaciones' => array_map(static function ($asignacion): array {
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
            }, $empresa->getAsignaciones()->toArray()),
            'documents' => [
                'empresa' => array_map(fn (EmpresaDocumento $documento): array => $this->serializeEmpresaDocumento($documento), array_filter(
                    $empresa->getDocumentos()->toArray(),
                    static fn (EmpresaDocumento $documento): bool => $documento->isActive() && $documento->getDeletedAt() === null
                )),
                'convenio' => array_values(array_merge(...array_map(function ($convenio): array {
                    return array_map(fn (ConvenioDocumento $documento): array => $this->serializeConvenioDocumento($documento), array_filter(
                        $convenio->getDocumentos()->toArray(),
                        static fn (ConvenioDocumento $documento): bool => $documento->isActive() && $documento->getDeletedAt() === null
                    ));
                }, $empresa->getConvenios()->toArray()))),
            ],
            'messages' => $messages,
            'solicitud' => $solicitud ? [
                'id' => $solicitud->getId(),
                'estado' => $solicitud->getEstado(),
                'portalToken' => $solicitud->getPortalToken(),
            ] : null,
        ]);
    }

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

            return $this->serveDocumentResponse($documentStorage, $document->getStoragePath(), $document->getOriginalFilename(), $document->getUrl());
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

    private function serveDocumentResponse(
        DocumentStorageManager $documentStorage,
        ?string $storagePath,
        ?string $originalFilename,
        ?string $url,
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

        if (is_string($url) && $url !== '') {
            return $this->redirect($url);
        }

        return $this->json(['message' => 'Documento no disponible.'], Response::HTTP_NOT_FOUND);
    }
}

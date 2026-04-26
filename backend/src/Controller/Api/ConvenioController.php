<?php

namespace App\Controller\Api;

use App\Entity\Convenio;
use App\Entity\ConvenioAlerta;
use App\Entity\ConvenioChecklistItem;
use App\Entity\ConvenioDocumento;
use App\Entity\ConvenioWorkflowEvento;
use App\Entity\EmpresaColaboradora;
use App\Repository\ConvenioAlertaRepository;
use App\Repository\ConvenioChecklistItemRepository;
use App\Repository\ConvenioDocumentoRepository;
use App\Repository\ConvenioRepository;
use App\Repository\EmpresaColaboradoraRepository;
use App\Service\AuditLogger;
use App\Service\BootstrapSnapshotProvider;
use App\Service\DocumentStorageManager;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\ResponseHeaderBag;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Symfony\Component\Validator\Constraints as Assert;
use Symfony\Component\Validator\Validator\ValidatorInterface;

#[Route('/api/convenios', name: 'api_convenios_')]
#[IsGranted('ROLE_API')]
final class ConvenioController extends AbstractController
{
    use JsonRequestTrait;

    private const MIN_ALLOWED_DATE = '2020-01-01';

    private const DOCUMENT_TYPE_EXTENSIONS = [
        'PDF' => ['pdf'],
        'WORD' => ['doc', 'docx'],
        'EXCEL' => ['xls', 'xlsx'],
    ];

    private const ESTADOS_PERMITIDOS = [
        'borrador',
        'revisado',
        'firmado',
        'vigente',
        'renovacion',
        'finalizado',
        'rescindido',
        'en_negociacion',
    ];

    private const WORKFLOW_STEPS = [
        'borrador',
        'revisado',
        'firmado',
        'vigente',
        'renovacion',
        'finalizado',
    ];

    private const ELIGIBLE_COMPANY_STATES = ['activa'];

    #[Route('', name: 'index', methods: ['GET'])]
    public function index(Request $request, ConvenioRepository $repository): JsonResponse
    {
        $qb = $repository->createQueryBuilder('c')
            ->join('c.empresa', 'e')->addSelect('e');

        if ($estado = $request->query->get('estado')) {
            if (!\in_array($estado, self::ESTADOS_PERMITIDOS, true)) {
                return $this->json([
                    'message' => 'El estado solicitado no existe en el catálogo de convenios.',
                ], Response::HTTP_BAD_REQUEST);
            }
            $qb->andWhere('c.estado = :estado')
                ->setParameter('estado', $estado);
        }

        if ($tipo = $request->query->get('tipo')) {
            $qb->andWhere('c.tipo = :tipo')
                ->setParameter('tipo', $tipo);
        }

        if ($empresaId = $request->query->get('empresaId')) {
            if (!ctype_digit((string) $empresaId)) {
                return $this->json(['message' => 'El parámetro empresaId debe ser numérico.'], Response::HTTP_BAD_REQUEST);
            }
            $qb->andWhere('e.id = :empresa')->setParameter('empresa', (int) $empresaId);
        }

        if ($search = $request->query->get('q')) {
            $pattern = '%' . mb_strtolower($search) . '%';
            $qb->andWhere('LOWER(c.titulo) LIKE :search')
                ->setParameter('search', $pattern);
        }

        [$page, $perPage] = $this->resolvePagination($request);
        $qb->orderBy('c.id', 'ASC')
            ->setFirstResult(($page - 1) * $perPage)
            ->setMaxResults($perPage);

        $convenios = $qb->getQuery()->getResult();

        $data = array_map(fn (Convenio $convenio): array => $this->serializeSummary($convenio), $convenios);

        return $this->json($data, Response::HTTP_OK);
    }

    #[Route('', name: 'create', methods: ['POST'])]
    #[IsGranted('ROLE_COORDINATOR')]
    public function create(
        Request $request,
        EmpresaColaboradoraRepository $empresaRepository,
        EntityManagerInterface $entityManager,
        ValidatorInterface $validator,
        BootstrapSnapshotProvider $snapshotProvider
    ): JsonResponse {
        $payload = $this->decodePayload($request);
        if ($payload instanceof JsonResponse) {
            return $payload;
        }

        $constraints = new Assert\Collection(
            fields: [
                'empresaId' => [new Assert\NotBlank(), new Assert\Positive()],
                'titulo' => [new Assert\NotBlank(), new Assert\Length(max: 180)],
                'descripcion' => new Assert\Optional(),
                'tipo' => [new Assert\NotBlank(), new Assert\Length(max: 80)],
                'estado' => new Assert\Optional([new Assert\Choice(choices: self::ESTADOS_PERMITIDOS)]),
                'fechaInicio' => [new Assert\NotBlank(), new Assert\Length(min: 10, max: 10)] ,
                'fechaFin' => new Assert\Optional([new Assert\Length(min: 10, max: 10)]),
                'documentoUrl' => new Assert\Optional([new Assert\Length(max: 255)]),
                'observaciones' => new Assert\Optional(),
            ],
            allowExtraFields: true
        );

        $violations = $validator->validate($payload, $constraints);
        if ($violations->count() > 0) {
            return $this->validationErrorResponse($violations);
        }

        $empresa = $empresaRepository->find($payload['empresaId']);
        if (!$empresa) {
            return $this->json(['message' => 'La empresa indicada no existe.'], Response::HTTP_NOT_FOUND);
        }
        $eligibilityResponse = $this->validateCompanyForConvenio($empresa);
        if ($eligibilityResponse instanceof JsonResponse) {
            return $eligibilityResponse;
        }

        $fechaInicio = $this->parseDate($payload['fechaInicio'], 'fechaInicio');
        if ($fechaInicio instanceof JsonResponse) {
            return $fechaInicio;
        }
        $fechaInicioValidation = $this->validateBusinessDateRange(
            $fechaInicio,
            'fechaInicio',
            new \DateTimeImmutable(self::MIN_ALLOWED_DATE)
        );
        if ($fechaInicioValidation instanceof JsonResponse) {
            return $fechaInicioValidation;
        }

        $convenio = new Convenio();
        $convenio->setEmpresa($empresa)
            ->setTitulo($payload['titulo'])
            ->setTipo($payload['tipo'])
            ->setFechaInicio($fechaInicio);

        if (array_key_exists('descripcion', $payload)) {
            $convenio->setDescripcion($payload['descripcion']);
        }
        if (array_key_exists('estado', $payload)) {
            $convenio->setEstado($payload['estado']);
        }
        if (array_key_exists('documentoUrl', $payload)) {
            $convenio->setDocumentoUrl($payload['documentoUrl']);
        }
        if (array_key_exists('observaciones', $payload)) {
            $convenio->setObservaciones($payload['observaciones']);
        }
        if (isset($payload['fechaFin'])) {
            $fechaFin = $this->parseDate($payload['fechaFin'], 'fechaFin');
            if ($fechaFin instanceof JsonResponse) {
                return $fechaFin;
            }
            $fechaFinValidation = $this->validateBusinessDateRange(
                $fechaFin,
                'fechaFin',
                new \DateTimeImmutable(self::MIN_ALLOWED_DATE)
            );
            if ($fechaFinValidation instanceof JsonResponse) {
                return $fechaFinValidation;
            }
            if ($fechaFin < $fechaInicio) {
                return $this->json([
                    'message' => 'La fecha de fin no puede ser anterior a la fecha de inicio del convenio.',
                ], Response::HTTP_BAD_REQUEST);
            }
            $convenio->setFechaFin($fechaFin);
        }

        $entityManager->persist($convenio);
        $entityManager->flush();
        $snapshotProvider->invalidate();

        return $this->json($this->serializeDetail($convenio), Response::HTTP_CREATED);
    }

    #[Route('/{id<\\d+>}', name: 'show', methods: ['GET'])]
    public function show(?Convenio $convenio): JsonResponse
    {
        if (!$convenio) {
            return $this->json(['message' => 'Convenio no encontrado'], Response::HTTP_NOT_FOUND);
        }

        return $this->json($this->serializeDetail($convenio), Response::HTTP_OK);
    }

    #[Route('/{id<\\d+>}', name: 'update', methods: ['PUT'])]
    #[IsGranted('ROLE_COORDINATOR')]
    public function update(
        ?Convenio $convenio,
        Request $request,
        EmpresaColaboradoraRepository $empresaRepository,
        EntityManagerInterface $entityManager,
        ValidatorInterface $validator,
        BootstrapSnapshotProvider $snapshotProvider
    ): JsonResponse {
        if (!$convenio) {
            return $this->json(['message' => 'Convenio no encontrado'], Response::HTTP_NOT_FOUND);
        }

        $payload = $this->decodePayload($request);
        if ($payload instanceof JsonResponse) {
            return $payload;
        }

        $constraints = new Assert\Collection(
            fields: [
                'empresaId' => new Assert\Optional([new Assert\Positive()]),
                'titulo' => new Assert\Optional([new Assert\NotBlank(), new Assert\Length(max: 180)]),
                'descripcion' => new Assert\Optional(),
                'tipo' => new Assert\Optional([new Assert\NotBlank(), new Assert\Length(max: 80)]),
                'estado' => new Assert\Optional([new Assert\Choice(choices: self::ESTADOS_PERMITIDOS)]),
                'fechaInicio' => new Assert\Optional([new Assert\Length(min: 10, max: 10)]),
                'fechaFin' => new Assert\Optional([new Assert\Length(min: 10, max: 10)]),
                'documentoUrl' => new Assert\Optional([new Assert\Length(max: 255)]),
                'observaciones' => new Assert\Optional(),
            ],
            allowMissingFields: true,
            allowExtraFields: true
        );

        $violations = $validator->validate($payload, $constraints);
        if ($violations->count() > 0) {
            return $this->validationErrorResponse($violations);
        }

        $fechaInicioActual = $convenio->getFechaInicio();

        if (array_key_exists('empresaId', $payload)) {
            $empresa = $empresaRepository->find($payload['empresaId']);
            if (!$empresa) {
                return $this->json(['message' => 'La empresa indicada no existe.'], Response::HTTP_NOT_FOUND);
            }
            $eligibilityResponse = $this->validateCompanyForConvenio($empresa);
            if ($eligibilityResponse instanceof JsonResponse) {
                return $eligibilityResponse;
            }
            $convenio->setEmpresa($empresa);
        }

        $eligibilityResponse = $this->validateCompanyForConvenio($convenio->getEmpresa());
        if ($eligibilityResponse instanceof JsonResponse) {
            return $eligibilityResponse;
        }

        if (array_key_exists('titulo', $payload)) {
            $convenio->setTitulo($payload['titulo']);
        }
        if (array_key_exists('descripcion', $payload)) {
            $convenio->setDescripcion($payload['descripcion']);
        }
        if (array_key_exists('tipo', $payload)) {
            $convenio->setTipo($payload['tipo']);
        }
        if (array_key_exists('estado', $payload)) {
            $convenio->setEstado($payload['estado']);
        }
        if (array_key_exists('documentoUrl', $payload)) {
            $convenio->setDocumentoUrl($payload['documentoUrl']);
        }
        if (array_key_exists('observaciones', $payload)) {
            $convenio->setObservaciones($payload['observaciones']);
        }
        if (array_key_exists('fechaInicio', $payload)) {
            $fechaInicio = $this->parseDate($payload['fechaInicio'], 'fechaInicio');
            if ($fechaInicio instanceof JsonResponse) {
                return $fechaInicio;
            }
            $fechaInicioValidation = $this->validateBusinessDateRange(
                $fechaInicio,
                'fechaInicio',
                new \DateTimeImmutable(self::MIN_ALLOWED_DATE)
            );
            if ($fechaInicioValidation instanceof JsonResponse) {
                return $fechaInicioValidation;
            }
            $convenio->setFechaInicio($fechaInicio);
            $fechaInicioActual = $fechaInicio;
        }
        if (array_key_exists('fechaFin', $payload)) {
            if ($payload['fechaFin'] === null) {
                $convenio->setFechaFin(null);
            } else {
                $fechaFin = $this->parseDate($payload['fechaFin'], 'fechaFin');
                if ($fechaFin instanceof JsonResponse) {
                    return $fechaFin;
                }
                $fechaFinValidation = $this->validateBusinessDateRange(
                    $fechaFin,
                    'fechaFin',
                    new \DateTimeImmutable(self::MIN_ALLOWED_DATE)
                );
                if ($fechaFinValidation instanceof JsonResponse) {
                    return $fechaFinValidation;
                }
                if ($fechaFin < $fechaInicioActual) {
                    return $this->json([
                        'message' => 'La fecha de fin no puede ser anterior a la fecha de inicio del convenio.',
                    ], Response::HTTP_BAD_REQUEST);
                }
                $convenio->setFechaFin($fechaFin);
            }
        }

        $entityManager->flush();
        $snapshotProvider->invalidate();

        return $this->json($this->serializeDetail($convenio), Response::HTTP_OK);
    }

    private function serializeSummary(Convenio $convenio): array
    {
        return [
            'id' => $convenio->getId(),
            'titulo' => $convenio->getTitulo(),
            'empresa' => [
                'id' => $convenio->getEmpresa()->getId(),
                'nombre' => $convenio->getEmpresa()->getNombre(),
            ],
            'tipo' => $convenio->getTipo(),
            'estado' => $convenio->getEstado(),
            'fechaInicio' => $convenio->getFechaInicio()->format('Y-m-d'),
            'fechaFin' => $convenio->getFechaFin()?->format('Y-m-d'),
            'asignacionesAsociadas' => $convenio->getAsignaciones()->count(),
        ];
    }

    private function serializeDetail(Convenio $convenio): array
    {
        $asignaciones = array_map(static function ($asignacion): array {
            return [
                'id' => $asignacion->getId(),
                'estado' => $asignacion->getEstado(),
                'fechaInicio' => $asignacion->getFechaInicio()->format('Y-m-d'),
                'fechaFin' => $asignacion->getFechaFin()?->format('Y-m-d'),
                'estudiante' => [
                    'id' => $asignacion->getEstudiante()->getId(),
                    'nombre' => $asignacion->getEstudiante()->getNombre(),
                    'apellido' => $asignacion->getEstudiante()->getApellido(),
                ],
            ];
        }, $convenio->getAsignaciones()->toArray());

        return [
            'id' => $convenio->getId(),
            'titulo' => $convenio->getTitulo(),
            'descripcion' => $convenio->getDescripcion(),
            'empresa' => [
                'id' => $convenio->getEmpresa()->getId(),
                'nombre' => $convenio->getEmpresa()->getNombre(),
            ],
            'tipo' => $convenio->getTipo(),
            'estado' => $convenio->getEstado(),
            'fechaInicio' => $convenio->getFechaInicio()->format('Y-m-d'),
            'fechaFin' => $convenio->getFechaFin()?->format('Y-m-d'),
            'documentoUrl' => $convenio->getDocumentoUrl(),
            'observaciones' => $convenio->getObservaciones(),
            'workflow' => $this->serializeWorkflow($convenio),
            'checklist' => array_map(fn (ConvenioChecklistItem $item): array => $this->serializeChecklistItem($item), $convenio->getChecklistItems()->toArray()),
            'documents' => array_map(fn (ConvenioDocumento $documento): array => $this->serializeConvenioDocumento($documento), $convenio->getDocumentos()->toArray()),
            'alerts' => array_map(fn (ConvenioAlerta $alerta): array => $this->serializeConvenioAlerta($alerta), $convenio->getAlertas()->toArray()),
            'asignaciones' => $asignaciones,
        ];
    }

    #[Route('/{id<\d+>}/extras', name: 'extras', methods: ['GET'])]
    public function extras(?Convenio $convenio): JsonResponse
    {
        if (!$convenio) {
            return $this->json(['message' => 'Convenio no encontrado'], Response::HTTP_NOT_FOUND);
        }

        return $this->json($this->serializeExtras($convenio), Response::HTTP_OK);
    }

    #[Route('/{id<\d+>}/workflow/advance', name: 'advance_workflow', methods: ['POST'])]
    #[IsGranted('ROLE_COORDINATOR')]
    public function advanceWorkflow(
        ?Convenio $convenio,
        EntityManagerInterface $entityManager,
        BootstrapSnapshotProvider $snapshotProvider
    ): JsonResponse
    {
        if (!$convenio) {
            return $this->json(['message' => 'Convenio no encontrado'], Response::HTTP_NOT_FOUND);
        }

        $current = $convenio->getEstado();
        $index = array_search($current, self::WORKFLOW_STEPS, true);
        if ($index === false) {
            $index = 0;
        }

        $nextState = self::WORKFLOW_STEPS[($index + 1) % \count(self::WORKFLOW_STEPS)];
        $convenio->setEstado($nextState);

        $evento = (new ConvenioWorkflowEvento())
            ->setConvenio($convenio)
            ->setEstado($nextState)
            ->setComentario('Transición registrada desde la API.');

        $entityManager->persist($evento);
        $entityManager->flush();
        $snapshotProvider->invalidate();

        return $this->json([
            'estado' => $convenio->getEstado(),
            'workflow' => $this->serializeWorkflow($convenio),
        ], Response::HTTP_OK);
    }

    #[Route('/{id<\d+>}/checklist/{itemId<\d+>}', name: 'toggle_checklist', methods: ['PATCH'])]
    #[IsGranted('ROLE_COORDINATOR')]
    public function toggleChecklist(
        ?Convenio $convenio,
        int $itemId,
        Request $request,
        ConvenioChecklistItemRepository $checklistRepository,
        EntityManagerInterface $entityManager,
        BootstrapSnapshotProvider $snapshotProvider
    ): JsonResponse {
        if (!$convenio) {
            return $this->json(['message' => 'Convenio no encontrado'], Response::HTTP_NOT_FOUND);
        }

        $item = $checklistRepository->find($itemId);
        if (!$item || $item->getConvenio()?->getId() !== $convenio->getId()) {
            return $this->json(['message' => 'Elemento de checklist no encontrado'], Response::HTTP_NOT_FOUND);
        }

        $payload = $this->decodePayload($request);
        if ($payload instanceof JsonResponse) {
            return $payload;
        }
        if (isset($payload['completed']) && !\is_bool($payload['completed'])) {
            return $this->json(['message' => 'El valor «completed» debe ser booleano.'], Response::HTTP_BAD_REQUEST);
        }

        if (array_key_exists('completed', $payload)) {
            $item->setCompleted((bool) $payload['completed']);
        } else {
            $item->setCompleted(!$item->isCompleted());
        }

        $entityManager->flush();
        $snapshotProvider->invalidate();

        return $this->json($this->serializeChecklistItem($item), Response::HTTP_OK);
    }

    #[Route('/{id<\d+>}/documents', name: 'add_support_document', methods: ['POST'])]
    #[IsGranted('ROLE_DOCUMENT_MANAGER')]
    public function addDocument(
        ?Convenio $convenio,
        Request $request,
        EntityManagerInterface $entityManager,
        ValidatorInterface $validator,
        DocumentStorageManager $documentStorage,
        BootstrapSnapshotProvider $snapshotProvider,
        AuditLogger $auditLogger,
    ): JsonResponse {
        if (!$convenio) {
            return $this->json(['message' => 'Convenio no encontrado'], Response::HTTP_NOT_FOUND);
        }

        if ($request->files->count() > 0) {
            $file = $request->files->get('file');
            if (!$file instanceof UploadedFile) {
                return $this->json(['message' => 'Archivo no proporcionado.'], Response::HTTP_BAD_REQUEST);
            }

            $documentMetadata = $this->resolveUploadedDocumentMetadata($file, $request->request->get('tipo'));
            if ($documentMetadata instanceof JsonResponse) {
                return $documentMetadata;
            }

            $originalName = $file->getClientOriginalName();
            $safeName = $this->sanitizeDocumentBaseName(pathinfo($originalName, PATHINFO_FILENAME));
            $nombre = $request->request->get('nombre') ?: $originalName;
            $version = $this->resolveNextConvenioDocumentVersion($convenio, $nombre);
            $relativePath = sprintf(
                'convenios/%d/%s_v%d_%s.%s',
                $convenio->getId(),
                $safeName,
                $version,
                uniqid('', true),
                $documentMetadata['extension']
            );

            $documento = (new ConvenioDocumento())
                ->setConvenio($convenio)
                ->setNombre($nombre)
                ->setTipo($documentMetadata['type'])
                ->setVersion($version)
                ->setStoragePath($relativePath)
                ->setOriginalFilename($originalName)
                ->setStorageProvider('external_fs');

            $documentStorage->storeUploadedFile($file, $relativePath);
        } else {
            $payload = $this->decodePayload($request);
            if ($payload instanceof JsonResponse) {
                return $payload;
            }

            $constraints = new Assert\Collection(
                fields: [
                    'nombre' => [new Assert\NotBlank(), new Assert\Length(max: 150)],
                    'tipo' => new Assert\Optional([new Assert\Length(max: 60)]),
                    'url' => new Assert\Optional([new Assert\Length(max: 255)]),
                ],
                allowExtraFields: true
            );

            $violations = $validator->validate($payload, $constraints);
            if ($violations->count() > 0) {
                return $this->validationErrorResponse($violations);
            }

            $tipoNormalizado = $this->normalizeDocumentType($payload['tipo'] ?? null);
            if (array_key_exists('tipo', $payload) && $payload['tipo'] !== null && $tipoNormalizado === null) {
                return $this->json([
                    'message' => 'El tipo de documento debe ser PDF, WORD o EXCEL.',
                ], Response::HTTP_BAD_REQUEST);
            }

            $version = $this->resolveNextConvenioDocumentVersion($convenio, $payload['nombre']);

            $documento = (new ConvenioDocumento())
                ->setConvenio($convenio)
                ->setNombre($payload['nombre'])
                ->setTipo($tipoNormalizado)
                ->setUrl($payload['url'] ?? null)
                ->setVersion($version)
                ->setStorageProvider('remote_url');
        }

        $this->deactivateOtherConvenioDocumentVersions($convenio, $documento);
        $entityManager->persist($documento);
        $entityManager->flush();
        $snapshotProvider->invalidate();

        $auditLogger->log('convenio.document.create', 'convenio_documento', $documento->getId(), [
            'convenioId' => $convenio->getId(),
            'nombre' => $documento->getNombre(),
            'version' => $documento->getVersion(),
        ]);

        return $this->json($this->serializeConvenioDocumento($documento), Response::HTTP_CREATED);
    }

    #[Route('/{id<\d+>}/documents/{documentId<\d+>}/download', name: 'download_support_document_by_id', methods: ['GET'])]
    public function downloadDocumentById(
        ?Convenio $convenio,
        int $documentId,
        ConvenioDocumentoRepository $documentRepository,
        DocumentStorageManager $documentStorage,
    ): Response
    {
        if (!$convenio) {
            return $this->json(['message' => 'Convenio no encontrado'], Response::HTTP_NOT_FOUND);
        }

        $documento = $documentRepository->find($documentId);
        if (!$documento instanceof ConvenioDocumento || $documento->getConvenio()?->getId() !== $convenio->getId()) {
            return $this->json(['message' => 'Documento no encontrado.'], Response::HTTP_NOT_FOUND);
        }

        if ($documento->getDeletedAt() !== null) {
            return $this->json(['message' => 'El documento ha sido retirado y no esta disponible.'], Response::HTTP_GONE);
        }

        if ($documento->getStoragePath()) {
            $filePath = $documentStorage->resolveAbsolutePath($documento->getStoragePath());
            if (!is_file($filePath)) {
                return $this->json(['message' => 'Documento no encontrado.'], Response::HTTP_NOT_FOUND);
            }

            $mimeType = mime_content_type($filePath) ?: 'application/octet-stream';
            $filename = $documento->getOriginalFilename() ?: basename($filePath);

            return $this->file($filePath, $filename, ResponseHeaderBag::DISPOSITION_INLINE, ['Content-Type' => $mimeType]);
        }

        if ($documento->getUrl()) {
            return $this->redirect($documento->getUrl());
        }

        return $this->json(['message' => 'Documento no encontrado.'], Response::HTTP_NOT_FOUND);
    }

    #[Route('/{id<\\d+>}/documents/{filename}', name: 'download_support_document', methods: ['GET'])]
    public function downloadDocument(int $id, string $filename): Response
    {
        $filePath = sprintf('%s/var/uploads/convenios/%d/%s', $this->getParameter('kernel.project_dir'), $id, $filename);
        if (!is_file($filePath)) {
            return $this->json(['message' => 'Documento no encontrado.'], Response::HTTP_NOT_FOUND);
        }

        $mimeType = mime_content_type($filePath) ?: 'application/octet-stream';

        return $this->file($filePath, $filename, ResponseHeaderBag::DISPOSITION_INLINE, ['Content-Type' => $mimeType]);
    }

    #[Route('/{id<\d+>}/documents/{documentId<\d+>}', name: 'delete_support_document', methods: ['DELETE'])]
    #[IsGranted('ROLE_DOCUMENT_MANAGER')]
    public function deleteDocument(
        ?Convenio $convenio,
        int $documentId,
        ConvenioDocumentoRepository $documentRepository,
        EntityManagerInterface $entityManager,
        BootstrapSnapshotProvider $snapshotProvider,
        AuditLogger $auditLogger,
    ): JsonResponse {
        if (!$convenio) {
            return $this->json(['message' => 'Convenio no encontrado'], Response::HTTP_NOT_FOUND);
        }

        $documento = $documentRepository->find($documentId);
        if (!$documento instanceof ConvenioDocumento || $documento->getConvenio()?->getId() !== $convenio->getId()) {
            return $this->json(['message' => 'Documento no encontrado.'], Response::HTTP_NOT_FOUND);
        }

        $documento->markDeleted($this->getUserIdentifier());
        $entityManager->flush();
        $snapshotProvider->invalidate();

        $auditLogger->log('convenio.document.delete', 'convenio_documento', $documento->getId(), [
            'convenioId' => $convenio->getId(),
            'version' => $documento->getVersion(),
        ]);

        return $this->json($this->serializeConvenioDocumento($documento), Response::HTTP_OK);
    }

    #[Route('/{id<\d+>}/documents/{documentId<\d+>}/restore', name: 'restore_support_document', methods: ['POST'])]
    #[IsGranted('ROLE_DOCUMENT_MANAGER')]
    public function restoreDocument(
        ?Convenio $convenio,
        int $documentId,
        ConvenioDocumentoRepository $documentRepository,
        EntityManagerInterface $entityManager,
        BootstrapSnapshotProvider $snapshotProvider,
        AuditLogger $auditLogger,
    ): JsonResponse {
        if (!$convenio) {
            return $this->json(['message' => 'Convenio no encontrado'], Response::HTTP_NOT_FOUND);
        }

        $documento = $documentRepository->find($documentId);
        if (!$documento instanceof ConvenioDocumento || $documento->getConvenio()?->getId() !== $convenio->getId()) {
            return $this->json(['message' => 'Documento no encontrado.'], Response::HTTP_NOT_FOUND);
        }

        $documento->restore();
        $this->deactivateOtherConvenioDocumentVersions($convenio, $documento);
        $entityManager->flush();
        $snapshotProvider->invalidate();

        $auditLogger->log('convenio.document.restore', 'convenio_documento', $documento->getId(), [
            'convenioId' => $convenio->getId(),
            'version' => $documento->getVersion(),
        ]);

        return $this->json($this->serializeConvenioDocumento($documento), Response::HTTP_OK);
    }

    #[Route('/{id<\d+>}/alerts/{alertId<\d+>}', name: 'dismiss_alert', methods: ['PATCH'])]
    #[IsGranted('ROLE_COORDINATOR')]
    public function dismissAlert(
        ?Convenio $convenio,
        int $alertId,
        ConvenioAlertaRepository $alertaRepository,
        EntityManagerInterface $entityManager
    ): JsonResponse {
        if (!$convenio) {
            return $this->json(['message' => 'Convenio no encontrado'], Response::HTTP_NOT_FOUND);
        }

        $alerta = $alertaRepository->find($alertId);
        if (!$alerta || $alerta->getConvenio()?->getId() !== $convenio->getId()) {
            return $this->json(['message' => 'Alerta no encontrada'], Response::HTTP_NOT_FOUND);
        }

        $alerta->setActiva(false);
        $entityManager->flush();

        return $this->json($this->serializeConvenioAlerta($alerta), Response::HTTP_OK);
    }

    private function serializeExtras(Convenio $convenio): array
    {
        return [
            'workflow' => $this->serializeWorkflow($convenio),
            'checklist' => array_map(fn (ConvenioChecklistItem $item): array => $this->serializeChecklistItem($item), $convenio->getChecklistItems()->toArray()),
            'documents' => array_map(fn (ConvenioDocumento $documento): array => $this->serializeConvenioDocumento($documento), $convenio->getDocumentos()->toArray()),
            'alerts' => array_map(fn (ConvenioAlerta $alerta): array => $this->serializeConvenioAlerta($alerta), $convenio->getAlertas()->toArray()),
        ];
    }

    private function serializeWorkflow(Convenio $convenio): array
    {
        $history = array_map(static function (ConvenioWorkflowEvento $evento): array {
            return [
                'id' => $evento->getId(),
                'estado' => $evento->getEstado(),
                'comentario' => $evento->getComentario(),
                'registradoEn' => $evento->getRegistradoEn()->format(\DateTimeInterface::ATOM),
            ];
        }, $convenio->getWorkflowEventos()->toArray());

        return [
            'current' => $convenio->getEstado(),
            'steps' => self::WORKFLOW_STEPS,
            'history' => $history,
        ];
    }

    private function serializeChecklistItem(ConvenioChecklistItem $item): array
    {
        return [
            'id' => $item->getId(),
            'label' => $item->getLabel(),
            'completed' => $item->isCompleted(),
            'createdAt' => $item->getCreatedAt()->format(\DateTimeInterface::ATOM),
        ];
    }

    private function serializeConvenioDocumento(ConvenioDocumento $documento): array
    {
        return [
            'id' => $documento->getId(),
            'name' => $documento->getNombre(),
            'type' => $documento->getTipo(),
            'url' => $documento->getDeletedAt() === null ? $this->resolveConvenioDocumentUrl($documento) : null,
            'uploadedAt' => $documento->getUploadedAt()->format(\DateTimeInterface::ATOM),
            'version' => $documento->getVersion(),
            'active' => $documento->isActive(),
            'deletedAt' => $documento->getDeletedAt()?->format(\DateTimeInterface::ATOM),
            'originalFilename' => $documento->getOriginalFilename(),
            'storageProvider' => $documento->getStorageProvider(),
        ];
    }

    private function serializeConvenioAlerta(ConvenioAlerta $alerta): array
    {
        return [
            'id' => $alerta->getId(),
            'message' => $alerta->getMensaje(),
            'level' => $alerta->getNivel(),
            'active' => $alerta->isActiva(),
            'createdAt' => $alerta->getCreadaEn()->format(\DateTimeInterface::ATOM),
        ];
    }

    /**
     * @return array{type:string,extension:string}|JsonResponse
     */
    private function resolveUploadedDocumentMetadata(UploadedFile $file, mixed $requestedType): array|JsonResponse
    {
        $normalizedType = $this->normalizeDocumentType(is_string($requestedType) ? $requestedType : null);
        if ($requestedType !== null && $normalizedType === null) {
            return $this->json([
                'message' => 'El tipo de documento debe ser PDF, WORD o EXCEL.',
            ], Response::HTTP_BAD_REQUEST);
        }

        $extension = strtolower($file->getClientOriginalExtension() ?: pathinfo($file->getClientOriginalName(), PATHINFO_EXTENSION));
        $detectedType = $this->detectDocumentTypeByExtension($extension);
        if ($detectedType === null) {
            return $this->json([
                'message' => 'Solo se permiten ficheros PDF, Word o Excel.',
            ], Response::HTTP_BAD_REQUEST);
        }

        if ($normalizedType !== null && $normalizedType !== $detectedType) {
            return $this->json([
                'message' => 'El tipo seleccionado no coincide con la extension del archivo subido.',
            ], Response::HTTP_BAD_REQUEST);
        }

        return [
            'type' => $normalizedType ?? $detectedType,
            'extension' => $extension,
        ];
    }

    private function normalizeDocumentType(?string $value): ?string
    {
        $normalized = strtoupper(trim((string) $value));
        if ($normalized === '') {
            return null;
        }

        return array_key_exists($normalized, self::DOCUMENT_TYPE_EXTENSIONS) ? $normalized : null;
    }

    private function detectDocumentTypeByExtension(string $extension): ?string
    {
        foreach (self::DOCUMENT_TYPE_EXTENSIONS as $type => $extensions) {
            if (in_array($extension, $extensions, true)) {
                return $type;
            }
        }

        return null;
    }

    private function sanitizeDocumentBaseName(string $baseName): string
    {
        $normalized = preg_replace('/[^A-Za-z0-9_-]+/', '-', trim($baseName)) ?? 'documento';
        $normalized = trim($normalized, '-_');

        return $normalized !== '' ? $normalized : 'documento';
    }

    private function resolveConvenioDocumentUrl(ConvenioDocumento $documento): ?string
    {
        if ($documento->getStoragePath() !== null && $documento->getConvenio()?->getId() !== null && $documento->getId() !== null) {
            return sprintf('/api/convenios/%d/documents/%d/download', $documento->getConvenio()->getId(), $documento->getId());
        }

        return $documento->getUrl();
    }

    private function resolveNextConvenioDocumentVersion(Convenio $convenio, string $name): int
    {
        $normalizedName = mb_strtolower(trim($name));
        $highestVersion = 0;

        foreach ($convenio->getDocumentos() as $documento) {
            if (mb_strtolower(trim($documento->getNombre())) === $normalizedName) {
                $highestVersion = max($highestVersion, $documento->getVersion());
            }
        }

        return $highestVersion + 1;
    }

    private function deactivateOtherConvenioDocumentVersions(Convenio $convenio, ConvenioDocumento $current): void
    {
        $normalizedName = mb_strtolower(trim($current->getNombre()));

        foreach ($convenio->getDocumentos() as $documento) {
            if ($documento === $current) {
                continue;
            }

            if (mb_strtolower(trim($documento->getNombre())) === $normalizedName && $documento->getDeletedAt() === null) {
                $documento->setActive(false);
            }
        }

        $current->setActive(true);
    }

    private function validateCompanyForConvenio(EmpresaColaboradora $empresa): ?JsonResponse
    {
        if (\in_array($empresa->getEstadoColaboracion(), self::ELIGIBLE_COMPANY_STATES, true)) {
            return null;
        }

        return $this->json([
            'message' => 'Solo se pueden registrar o actualizar convenios sobre empresas activas y validadas.',
        ], Response::HTTP_BAD_REQUEST);
    }

    private function getUserIdentifier(): string
    {
        $user = $this->getUser();
        if (method_exists($user, 'getUserIdentifier')) {
            return (string) $user->getUserIdentifier();
        }

        return 'system';
    }

    /**
     * @return array{0:int,1:int}
     */
    private function resolvePagination(Request $request): array
    {
        $page = max(1, (int) $request->query->get('page', 1));
        $perPage = (int) $request->query->get('perPage', 50);
        if ($perPage < 1) {
            $perPage = 1;
        }
        if ($perPage > 100) {
            $perPage = 100;
        }

        return [$page, $perPage];
    }
}

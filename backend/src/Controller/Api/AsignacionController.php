<?php

namespace App\Controller\Api;

use App\Entity\AsignacionPractica;
use App\Entity\Convenio;
use App\Entity\EmpresaColaboradora;
use App\Entity\EvaluacionFinal;
use App\Entity\Seguimiento;
use App\Repository\AsignacionPracticaRepository;
use App\Repository\ConvenioRepository;
use App\Repository\EmpresaColaboradoraRepository;
use App\Repository\EstudianteRepository;
use App\Repository\TutorAcademicoRepository;
use App\Repository\TutorProfesionalRepository;
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

#[Route('/api/asignaciones', name: 'api_asignaciones_')]
#[IsGranted('ROLE_API')]
final class AsignacionController extends AbstractController
{
    use JsonRequestTrait;

    private const MIN_ALLOWED_DATE = '2020-01-01';
    private const MAX_ALLOWED_HOURS = 2400;

    private const ESTADOS_PERMITIDOS = ['planificada', 'en_curso', 'finalizada', 'cancelada', 'en_revision'];
    private const MODALIDADES_PERMITIDAS = ['presencial', 'remota', 'hibrida'];
    private const SEGUIMIENTO_TIPOS = ['reunion', 'visita', 'seguimiento', 'incidencia', 'evaluacion'];
    private const SEGUIMIENTO_ESTADOS = ['abierto', 'cerrado'];
    private const EVALUACION_ESTADOS = ['borrador', 'cerrada'];
    private const ELIGIBLE_COMPANY_STATES = ['activa'];
    private const ELIGIBLE_CONVENIO_STATES = ['firmado', 'vigente', 'renovacion'];
    private const DOCUMENT_TYPE_EXTENSIONS = [
        'PDF' => ['pdf'],
        'WORD' => ['doc', 'docx'],
        'EXCEL' => ['xls', 'xlsx'],
    ];

    #[Route('', name: 'index', methods: ['GET'])]
    public function index(Request $request, AsignacionPracticaRepository $repository): JsonResponse
    {
        $qb = $repository->createQueryBuilder('a')
            ->join('a.empresa', 'e')->addSelect('e')
            ->join('a.estudiante', 'es')->addSelect('es');

        if ($estado = $request->query->get('estado')) {
            if (!in_array($estado, self::ESTADOS_PERMITIDOS, true)) {
                return $this->json(['message' => 'El estado indicado no es valido para las asignaciones.'], Response::HTTP_BAD_REQUEST);
            }
            $qb->andWhere('a.estado = :estado')->setParameter('estado', $estado);
        }

        if ($modalidad = $request->query->get('modalidad')) {
            if (!in_array($modalidad, self::MODALIDADES_PERMITIDAS, true)) {
                return $this->json(['message' => 'La modalidad indicada no esta soportada.'], Response::HTTP_BAD_REQUEST);
            }
            $qb->andWhere('a.modalidad = :modalidad')->setParameter('modalidad', $modalidad);
        }

        if ($empresaId = $request->query->get('empresaId')) {
            if (!ctype_digit((string) $empresaId)) {
                return $this->json(['message' => 'El parametro empresaId debe ser numerico.'], Response::HTTP_BAD_REQUEST);
            }
            $qb->andWhere('e.id = :empresa')->setParameter('empresa', (int) $empresaId);
        }

        if ($estudianteId = $request->query->get('estudianteId')) {
            if (!ctype_digit((string) $estudianteId)) {
                return $this->json(['message' => 'El parametro estudianteId debe ser numerico.'], Response::HTTP_BAD_REQUEST);
            }
            $qb->andWhere('es.id = :estudiante')->setParameter('estudiante', (int) $estudianteId);
        }

        [$page, $perPage] = $this->resolvePagination($request);
        $qb->orderBy('a.id', 'ASC')->setFirstResult(($page - 1) * $perPage)->setMaxResults($perPage);

        return $this->json(
            array_map(fn (AsignacionPractica $asignacion): array => $this->serializeSummary($asignacion), $qb->getQuery()->getResult()),
            Response::HTTP_OK
        );
    }

    #[Route('', name: 'create', methods: ['POST'])]
    #[IsGranted('ROLE_COORDINATOR')]
    public function create(
        Request $request,
        EstudianteRepository $estudianteRepository,
        EmpresaColaboradoraRepository $empresaRepository,
        ConvenioRepository $convenioRepository,
        TutorAcademicoRepository $tutorAcademicoRepository,
        TutorProfesionalRepository $tutorProfesionalRepository,
        EntityManagerInterface $entityManager,
        ValidatorInterface $validator,
        BootstrapSnapshotProvider $snapshotProvider,
        AuditLogger $auditLogger,
    ): JsonResponse {
        $payload = $this->decodePayload($request);
        if ($payload instanceof JsonResponse) {
            return $payload;
        }

        $constraints = new Assert\Collection(
            fields: [
                'estudianteId' => [new Assert\NotBlank(), new Assert\Positive()],
                'empresaId' => [new Assert\NotBlank(), new Assert\Positive()],
                'convenioId' => [new Assert\NotBlank(), new Assert\Positive()],
                'tutorAcademicoId' => [new Assert\NotBlank(), new Assert\Positive()],
                'tutorProfesionalId' => new Assert\Optional(),
                'fechaInicio' => [new Assert\NotBlank(), new Assert\Length(min: 10, max: 10)],
                'fechaFin' => new Assert\Optional([new Assert\Length(min: 10, max: 10)]),
                'modalidad' => [new Assert\NotBlank(), new Assert\Choice(choices: self::MODALIDADES_PERMITIDAS)],
                'horasTotales' => new Assert\Optional([new Assert\Type('integer'), new Assert\PositiveOrZero(), new Assert\LessThanOrEqual(self::MAX_ALLOWED_HOURS)]),
                'estado' => [new Assert\NotBlank(), new Assert\Choice(choices: self::ESTADOS_PERMITIDOS)],
            ],
            allowExtraFields: true
        );

        $violations = $validator->validate($payload, $constraints);
        if ($violations->count() > 0) {
            return $this->validationErrorResponse($violations);
        }

        $result = $this->hydrateAssignment($payload, null, $estudianteRepository, $empresaRepository, $convenioRepository, $tutorAcademicoRepository, $tutorProfesionalRepository);
        if ($result instanceof JsonResponse) {
            return $result;
        }

        [$asignacion, $context] = $result;
        $entityManager->persist($asignacion);
        $entityManager->flush();
        $snapshotProvider->invalidate();
        $auditLogger->log('asignacion.create', 'asignacion_practica', $asignacion->getId(), $context);

        return $this->json($this->serializeDetail($asignacion), Response::HTTP_CREATED);
    }

    #[Route('/{id<\\d+>}', name: 'show', methods: ['GET'])]
    public function show(?AsignacionPractica $asignacion): JsonResponse
    {
        if (!$asignacion) {
            return $this->json(['message' => 'Asignacion no encontrada'], Response::HTTP_NOT_FOUND);
        }

        return $this->json($this->serializeDetail($asignacion), Response::HTTP_OK);
    }

    #[Route('/{id<\\d+>}', name: 'update', methods: ['PUT'])]
    #[IsGranted('ROLE_COORDINATOR')]
    public function update(
        ?AsignacionPractica $asignacion,
        Request $request,
        EstudianteRepository $estudianteRepository,
        EmpresaColaboradoraRepository $empresaRepository,
        ConvenioRepository $convenioRepository,
        TutorAcademicoRepository $tutorAcademicoRepository,
        TutorProfesionalRepository $tutorProfesionalRepository,
        EntityManagerInterface $entityManager,
        ValidatorInterface $validator,
        BootstrapSnapshotProvider $snapshotProvider,
        AuditLogger $auditLogger,
    ): JsonResponse {
        if (!$asignacion) {
            return $this->json(['message' => 'Asignacion no encontrada'], Response::HTTP_NOT_FOUND);
        }

        $payload = $this->decodePayload($request);
        if ($payload instanceof JsonResponse) {
            return $payload;
        }

        $constraints = new Assert\Collection(
            fields: [
                'estudianteId' => new Assert\Optional([new Assert\Positive()]),
                'empresaId' => new Assert\Optional([new Assert\Positive()]),
                'convenioId' => new Assert\Optional([new Assert\Positive()]),
                'tutorAcademicoId' => new Assert\Optional([new Assert\Positive()]),
                'tutorProfesionalId' => new Assert\Optional(),
                'fechaInicio' => new Assert\Optional([new Assert\Length(min: 10, max: 10)]),
                'fechaFin' => new Assert\Optional([new Assert\Length(min: 10, max: 10)]),
                'modalidad' => new Assert\Optional([new Assert\Choice(choices: self::MODALIDADES_PERMITIDAS)]),
                'horasTotales' => new Assert\Optional([new Assert\Type('integer'), new Assert\PositiveOrZero(), new Assert\LessThanOrEqual(self::MAX_ALLOWED_HOURS)]),
                'estado' => new Assert\Optional([new Assert\Choice(choices: self::ESTADOS_PERMITIDOS)]),
            ],
            allowExtraFields: true,
            allowMissingFields: true
        );

        $violations = $validator->validate($payload, $constraints);
        if ($violations->count() > 0) {
            return $this->validationErrorResponse($violations);
        }

        $result = $this->hydrateAssignment($payload, $asignacion, $estudianteRepository, $empresaRepository, $convenioRepository, $tutorAcademicoRepository, $tutorProfesionalRepository);
        if ($result instanceof JsonResponse) {
            return $result;
        }

        [$updatedAsignacion, $context] = $result;
        $entityManager->flush();
        $snapshotProvider->invalidate();
        $auditLogger->log('asignacion.update', 'asignacion_practica', $updatedAsignacion->getId(), $context);

        return $this->json($this->serializeDetail($updatedAsignacion), Response::HTTP_OK);
    }

    #[Route('/{id<\d+>}/seguimientos', name: 'create_follow_up', methods: ['POST'])]
    #[IsGranted('ROLE_COORDINATOR')]
    public function createSeguimiento(
        ?AsignacionPractica $asignacion,
        Request $request,
        ValidatorInterface $validator,
        EntityManagerInterface $entityManager,
        DocumentStorageManager $documentStorage,
        BootstrapSnapshotProvider $snapshotProvider,
        AuditLogger $auditLogger,
    ): JsonResponse {
        if (!$asignacion) {
            return $this->json(['message' => 'Asignacion no encontrada'], Response::HTTP_NOT_FOUND);
        }

        $payload = $this->decodeFormPayload($request);
        if ($payload instanceof JsonResponse) {
            return $payload;
        }

        $violations = $validator->validate(
            $payload,
            new Assert\Collection(
                fields: [
                    'fecha' => [new Assert\NotBlank(), new Assert\Length(min: 10, max: 10)],
                    'tipo' => [new Assert\NotBlank(), new Assert\Choice(choices: self::SEGUIMIENTO_TIPOS)],
                    'descripcion' => new Assert\Optional(),
                    'accionRequerida' => new Assert\Optional(),
                    'estado' => new Assert\Optional([new Assert\Choice(choices: self::SEGUIMIENTO_ESTADOS)]),
                ],
                allowExtraFields: true
            )
        );
        if ($violations->count() > 0) {
            return $this->validationErrorResponse($violations);
        }

        $fecha = $this->parseDate((string) $payload['fecha'], 'fecha');
        if ($fecha instanceof JsonResponse) {
            return $fecha;
        }
        $dateValidation = $this->validateBusinessDateRange($fecha, 'fecha', new \DateTimeImmutable(self::MIN_ALLOWED_DATE));
        if ($dateValidation instanceof JsonResponse) {
            return $dateValidation;
        }

        $seguimiento = (new Seguimiento())
            ->setAsignacion($asignacion)
            ->setFecha($fecha)
            ->setTipo((string) $payload['tipo'])
            ->setDescripcion($payload['descripcion'] ?? null)
            ->setAccionRequerida($payload['accionRequerida'] ?? null)
            ->setEstado((string) ($payload['estado'] ?? 'abierto'));

        $file = $request->files->get('evidencia');
        if ($file instanceof UploadedFile) {
            $storeResponse = $this->attachSeguimientoEvidence($seguimiento, $asignacion->getId(), $file, $request->request->get('evidenciaTipo'), $documentStorage);
            if ($storeResponse instanceof JsonResponse) {
                return $storeResponse;
            }
        }

        $asignacion->addSeguimiento($seguimiento);
        $entityManager->persist($seguimiento);
        $entityManager->flush();

        if ($seguimiento->getDocumentoUrl()) {
            $seguimiento->setEvidenciaUrl(sprintf('/api/asignaciones/%d/seguimientos/%d/evidencia', $asignacion->getId(), $seguimiento->getId()));
            $entityManager->flush();
        }

        $snapshotProvider->invalidate();
        $auditLogger->log('seguimiento.create', 'seguimiento', $seguimiento->getId(), [
            'asignacionId' => $asignacion->getId(),
            'tipo' => $seguimiento->getTipo(),
        ]);

        return $this->json($this->serializeSeguimiento($seguimiento), Response::HTTP_CREATED);
    }

    #[Route('/{id<\d+>}/seguimientos/{seguimientoId<\d+>}', name: 'update_follow_up', methods: ['PUT'])]
    #[IsGranted('ROLE_COORDINATOR')]
    public function updateSeguimiento(
        ?AsignacionPractica $asignacion,
        int $seguimientoId,
        Request $request,
        ValidatorInterface $validator,
        EntityManagerInterface $entityManager,
        DocumentStorageManager $documentStorage,
        BootstrapSnapshotProvider $snapshotProvider,
        AuditLogger $auditLogger,
    ): JsonResponse {
        if (!$asignacion) {
            return $this->json(['message' => 'Asignacion no encontrada'], Response::HTTP_NOT_FOUND);
        }

        $seguimiento = $this->findSeguimiento($asignacion, $seguimientoId);
        if (!$seguimiento) {
            return $this->json(['message' => 'Seguimiento no encontrado'], Response::HTTP_NOT_FOUND);
        }

        $payload = $this->decodeFormPayload($request);
        if ($payload instanceof JsonResponse) {
            return $payload;
        }

        $violations = $validator->validate(
            $payload,
            new Assert\Collection(
                fields: [
                    'fecha' => new Assert\Optional([new Assert\Length(min: 10, max: 10)]),
                    'tipo' => new Assert\Optional([new Assert\Choice(choices: self::SEGUIMIENTO_TIPOS)]),
                    'descripcion' => new Assert\Optional(),
                    'accionRequerida' => new Assert\Optional(),
                    'estado' => new Assert\Optional([new Assert\Choice(choices: self::SEGUIMIENTO_ESTADOS)]),
                ],
                allowExtraFields: true,
                allowMissingFields: true
            )
        );
        if ($violations->count() > 0) {
            return $this->validationErrorResponse($violations);
        }

        if (array_key_exists('fecha', $payload)) {
            $fecha = $this->parseDate((string) $payload['fecha'], 'fecha');
            if ($fecha instanceof JsonResponse) {
                return $fecha;
            }
            $dateValidation = $this->validateBusinessDateRange($fecha, 'fecha', new \DateTimeImmutable(self::MIN_ALLOWED_DATE));
            if ($dateValidation instanceof JsonResponse) {
                return $dateValidation;
            }
            $seguimiento->setFecha($fecha);
        }

        if (array_key_exists('tipo', $payload)) {
            $seguimiento->setTipo((string) $payload['tipo']);
        }
        if (array_key_exists('descripcion', $payload)) {
            $seguimiento->setDescripcion($payload['descripcion'] !== null ? (string) $payload['descripcion'] : null);
        }
        if (array_key_exists('accionRequerida', $payload)) {
            $seguimiento->setAccionRequerida($payload['accionRequerida'] !== null ? (string) $payload['accionRequerida'] : null);
        }
        if (array_key_exists('estado', $payload)) {
            if ($payload['estado'] === 'cerrado') {
                $seguimiento->close($seguimiento->getCierreComentario());
            } else {
                $seguimiento->reopen();
            }
        }

        $file = $request->files->get('evidencia');
        if ($file instanceof UploadedFile) {
            $storeResponse = $this->attachSeguimientoEvidence($seguimiento, $asignacion->getId(), $file, $request->request->get('evidenciaTipo'), $documentStorage);
            if ($storeResponse instanceof JsonResponse) {
                return $storeResponse;
            }
            $seguimiento->setEvidenciaUrl(sprintf('/api/asignaciones/%d/seguimientos/%d/evidencia', $asignacion->getId(), $seguimiento->getId()));
        }

        $entityManager->flush();
        $snapshotProvider->invalidate();
        $auditLogger->log('seguimiento.update', 'seguimiento', $seguimiento->getId(), [
            'asignacionId' => $asignacion->getId(),
            'estado' => $seguimiento->getEstado(),
        ]);

        return $this->json($this->serializeSeguimiento($seguimiento), Response::HTTP_OK);
    }

    #[Route('/{id<\d+>}/seguimientos/{seguimientoId<\d+>}/close', name: 'close_follow_up', methods: ['PATCH'])]
    #[IsGranted('ROLE_COORDINATOR')]
    public function closeSeguimiento(
        ?AsignacionPractica $asignacion,
        int $seguimientoId,
        Request $request,
        EntityManagerInterface $entityManager,
        BootstrapSnapshotProvider $snapshotProvider,
        AuditLogger $auditLogger,
    ): JsonResponse {
        if (!$asignacion) {
            return $this->json(['message' => 'Asignacion no encontrada'], Response::HTTP_NOT_FOUND);
        }

        $seguimiento = $this->findSeguimiento($asignacion, $seguimientoId);
        if (!$seguimiento) {
            return $this->json(['message' => 'Seguimiento no encontrado'], Response::HTTP_NOT_FOUND);
        }

        $payload = $this->decodePayload($request);
        if ($payload instanceof JsonResponse) {
            return $payload;
        }

        $comment = isset($payload['comentario']) ? trim((string) $payload['comentario']) : null;
        $seguimiento->close($comment ?: null);
        $entityManager->flush();
        $snapshotProvider->invalidate();
        $auditLogger->log('seguimiento.close', 'seguimiento', $seguimiento->getId(), ['asignacionId' => $asignacion->getId()]);

        return $this->json($this->serializeSeguimiento($seguimiento), Response::HTTP_OK);
    }

    #[Route('/{id<\d+>}/seguimientos/{seguimientoId<\d+>}/reopen', name: 'reopen_follow_up', methods: ['PATCH'])]
    #[IsGranted('ROLE_COORDINATOR')]
    public function reopenSeguimiento(
        ?AsignacionPractica $asignacion,
        int $seguimientoId,
        EntityManagerInterface $entityManager,
        BootstrapSnapshotProvider $snapshotProvider,
        AuditLogger $auditLogger,
    ): JsonResponse {
        if (!$asignacion) {
            return $this->json(['message' => 'Asignacion no encontrada'], Response::HTTP_NOT_FOUND);
        }

        $seguimiento = $this->findSeguimiento($asignacion, $seguimientoId);
        if (!$seguimiento) {
            return $this->json(['message' => 'Seguimiento no encontrado'], Response::HTTP_NOT_FOUND);
        }

        $seguimiento->reopen();
        $entityManager->flush();
        $snapshotProvider->invalidate();
        $auditLogger->log('seguimiento.reopen', 'seguimiento', $seguimiento->getId(), ['asignacionId' => $asignacion->getId()]);

        return $this->json($this->serializeSeguimiento($seguimiento), Response::HTTP_OK);
    }

    #[Route('/{id<\d+>}/seguimientos/{seguimientoId<\d+>}/evidencia', name: 'download_follow_up_evidence', methods: ['GET'])]
    public function downloadSeguimientoEvidence(
        ?AsignacionPractica $asignacion,
        int $seguimientoId,
        DocumentStorageManager $documentStorage,
    ): Response {
        if (!$asignacion) {
            return $this->json(['message' => 'Asignacion no encontrada'], Response::HTTP_NOT_FOUND);
        }

        $seguimiento = $this->findSeguimiento($asignacion, $seguimientoId);
        if (!$seguimiento || !$seguimiento->getDocumentoUrl()) {
            return $this->json(['message' => 'Evidencia no encontrada'], Response::HTTP_NOT_FOUND);
        }

        $absolutePath = $documentStorage->resolveAbsolutePath($seguimiento->getDocumentoUrl());
        if (!is_file($absolutePath)) {
            return $this->json(['message' => 'Evidencia no encontrada'], Response::HTTP_NOT_FOUND);
        }

        $mimeType = mime_content_type($absolutePath) ?: 'application/octet-stream';
        $filename = $seguimiento->getEvidenciaNombre() ?: basename($absolutePath);

        return $this->file($absolutePath, $filename, ResponseHeaderBag::DISPOSITION_INLINE, ['Content-Type' => $mimeType]);
    }

    #[Route('/{id<\d+>}/evaluacion-final', name: 'upsert_evaluation', methods: ['POST', 'PUT'])]
    #[IsGranted('ROLE_COORDINATOR')]
    public function upsertEvaluacionFinal(
        ?AsignacionPractica $asignacion,
        Request $request,
        ValidatorInterface $validator,
        EntityManagerInterface $entityManager,
        BootstrapSnapshotProvider $snapshotProvider,
        AuditLogger $auditLogger,
    ): JsonResponse {
        if (!$asignacion) {
            return $this->json(['message' => 'Asignacion no encontrada'], Response::HTTP_NOT_FOUND);
        }

        $payload = $this->decodePayload($request);
        if ($payload instanceof JsonResponse) {
            return $payload;
        }

        $violations = $validator->validate(
            $payload,
            new Assert\Collection(
                fields: [
                    'fecha' => new Assert\Optional([new Assert\Length(min: 10, max: 10)]),
                    'valoracionEmpresa' => new Assert\Optional(),
                    'valoracionEstudiante' => new Assert\Optional(),
                    'valoracionTutorAcademico' => new Assert\Optional(),
                    'conclusiones' => new Assert\Optional(),
                    'notaEmpresa' => new Assert\Optional([new Assert\Type('integer'), new Assert\Range(min: 0, max: 10)]),
                    'notaEstudiante' => new Assert\Optional([new Assert\Type('integer'), new Assert\Range(min: 0, max: 10)]),
                    'notaTutorAcademico' => new Assert\Optional([new Assert\Type('integer'), new Assert\Range(min: 0, max: 10)]),
                    'estado' => new Assert\Optional([new Assert\Choice(choices: self::EVALUACION_ESTADOS)]),
                ],
                allowExtraFields: true
            )
        );
        if ($violations->count() > 0) {
            return $this->validationErrorResponse($violations);
        }

        $evaluacion = $asignacion->getEvaluacionFinal() ?? (new EvaluacionFinal())->setAsignacion($asignacion);

        if (array_key_exists('fecha', $payload)) {
            $fecha = $this->parseDate((string) $payload['fecha'], 'fecha');
            if ($fecha instanceof JsonResponse) {
                return $fecha;
            }
            $dateValidation = $this->validateBusinessDateRange($fecha, 'fecha', new \DateTimeImmutable(self::MIN_ALLOWED_DATE));
            if ($dateValidation instanceof JsonResponse) {
                return $dateValidation;
            }
            $evaluacion->setFecha($fecha);
        }

        if (array_key_exists('valoracionEmpresa', $payload)) {
            $evaluacion->setValoracionEmpresa($payload['valoracionEmpresa'] !== null ? (string) $payload['valoracionEmpresa'] : null);
        }
        if (array_key_exists('valoracionEstudiante', $payload)) {
            $evaluacion->setValoracionEstudiante($payload['valoracionEstudiante'] !== null ? (string) $payload['valoracionEstudiante'] : null);
        }
        if (array_key_exists('valoracionTutorAcademico', $payload)) {
            $evaluacion->setValoracionTutorAcademico($payload['valoracionTutorAcademico'] !== null ? (string) $payload['valoracionTutorAcademico'] : null);
        }
        if (array_key_exists('conclusiones', $payload)) {
            $evaluacion->setConclusiones($payload['conclusiones'] !== null ? (string) $payload['conclusiones'] : null);
        }
        if (array_key_exists('notaEmpresa', $payload)) {
            $evaluacion->setNotaEmpresa($payload['notaEmpresa']);
        }
        if (array_key_exists('notaEstudiante', $payload)) {
            $evaluacion->setNotaEstudiante($payload['notaEstudiante']);
        }
        if (array_key_exists('notaTutorAcademico', $payload)) {
            $evaluacion->setNotaTutorAcademico($payload['notaTutorAcademico']);
        }
        if (($payload['estado'] ?? null) === 'cerrada') {
            $evaluacion->markClosed();
        } elseif ($evaluacion->getEstado() !== 'cerrada') {
            $evaluacion->setEstado('borrador');
        }

        $asignacion->setEvaluacionFinal($evaluacion);
        $entityManager->persist($evaluacion);
        $entityManager->flush();
        $snapshotProvider->invalidate();
        $auditLogger->log('evaluacion_final.upsert', 'evaluacion_final', $evaluacion->getId(), [
            'asignacionId' => $asignacion->getId(),
            'estado' => $evaluacion->getEstado(),
        ]);

        return $this->json($this->serializeEvaluacion($evaluacion), Response::HTTP_OK);
    }

    #[Route('/{id<\d+>}/evaluacion-final/cerrar', name: 'close_evaluation', methods: ['PATCH'])]
    #[IsGranted('ROLE_COORDINATOR')]
    public function closeEvaluacionFinal(
        ?AsignacionPractica $asignacion,
        EntityManagerInterface $entityManager,
        BootstrapSnapshotProvider $snapshotProvider,
        AuditLogger $auditLogger,
    ): JsonResponse {
        if (!$asignacion || !$asignacion->getEvaluacionFinal()) {
            return $this->json(['message' => 'Evaluacion final no encontrada'], Response::HTTP_NOT_FOUND);
        }

        $evaluacion = $asignacion->getEvaluacionFinal();
        $evaluacion->markClosed();
        $entityManager->flush();
        $snapshotProvider->invalidate();
        $auditLogger->log('evaluacion_final.close', 'evaluacion_final', $evaluacion->getId(), ['asignacionId' => $asignacion->getId()]);

        return $this->json($this->serializeEvaluacion($evaluacion), Response::HTTP_OK);
    }

    private function serializeSummary(AsignacionPractica $asignacion): array
    {
        return [
            'id' => $asignacion->getId(),
            'estado' => $asignacion->getEstado(),
            'modalidad' => $asignacion->getModalidad(),
            'horasTotales' => $asignacion->getHorasTotales(),
            'fechaInicio' => $asignacion->getFechaInicio()->format('Y-m-d'),
            'fechaFin' => $asignacion->getFechaFin()?->format('Y-m-d'),
            'empresa' => [
                'id' => $asignacion->getEmpresa()->getId(),
                'nombre' => $asignacion->getEmpresa()->getNombre(),
            ],
            'estudiante' => [
                'id' => $asignacion->getEstudiante()->getId(),
                'nombre' => $asignacion->getEstudiante()->getNombre(),
                'apellido' => $asignacion->getEstudiante()->getApellido(),
            ],
        ];
    }

    private function serializeDetail(AsignacionPractica $asignacion): array
    {
        $seguimientos = $asignacion->getSeguimientos()->toArray();
        usort($seguimientos, static fn (Seguimiento $left, Seguimiento $right): int => $right->getFecha() <=> $left->getFecha());

        return [
            'id' => $asignacion->getId(),
            'estado' => $asignacion->getEstado(),
            'modalidad' => $asignacion->getModalidad(),
            'horasTotales' => $asignacion->getHorasTotales(),
            'fechaInicio' => $asignacion->getFechaInicio()->format('Y-m-d'),
            'fechaFin' => $asignacion->getFechaFin()?->format('Y-m-d'),
            'empresa' => [
                'id' => $asignacion->getEmpresa()->getId(),
                'nombre' => $asignacion->getEmpresa()->getNombre(),
            ],
            'convenio' => [
                'id' => $asignacion->getConvenio()->getId(),
                'titulo' => $asignacion->getConvenio()->getTitulo(),
            ],
            'estudiante' => [
                'id' => $asignacion->getEstudiante()->getId(),
                'nombre' => $asignacion->getEstudiante()->getNombre(),
                'apellido' => $asignacion->getEstudiante()->getApellido(),
                'email' => $asignacion->getEstudiante()->getEmail(),
            ],
            'tutorAcademico' => [
                'id' => $asignacion->getTutorAcademico()->getId(),
                'nombre' => $asignacion->getTutorAcademico()->getNombre(),
                'apellido' => $asignacion->getTutorAcademico()->getApellido(),
                'email' => $asignacion->getTutorAcademico()->getEmail(),
            ],
            'tutorProfesional' => $asignacion->getTutorProfesional() ? [
                'id' => $asignacion->getTutorProfesional()->getId(),
                'nombre' => $asignacion->getTutorProfesional()->getNombre(),
                'email' => $asignacion->getTutorProfesional()->getEmail(),
            ] : null,
            'seguimientos' => array_map(fn (Seguimiento $seguimiento): array => $this->serializeSeguimiento($seguimiento), $seguimientos),
            'evaluacionFinal' => $asignacion->getEvaluacionFinal() ? $this->serializeEvaluacion($asignacion->getEvaluacionFinal()) : null,
        ];
    }

    private function serializeSeguimiento(Seguimiento $seguimiento): array
    {
        return [
            'id' => $seguimiento->getId(),
            'fecha' => $seguimiento->getFecha()->format('Y-m-d'),
            'tipo' => $seguimiento->getTipo(),
            'descripcion' => $seguimiento->getDescripcion(),
            'accionRequerida' => $seguimiento->getAccionRequerida(),
            'documentoUrl' => $seguimiento->getDocumentoUrl(),
            'estado' => $seguimiento->getEstado(),
            'evidenciaNombre' => $seguimiento->getEvidenciaNombre(),
            'evidenciaTipo' => $seguimiento->getEvidenciaTipo(),
            'evidenciaUrl' => $seguimiento->getEvidenciaUrl(),
            'cerradoEn' => $seguimiento->getCerradoEn()?->format(\DateTimeInterface::ATOM),
            'cierreComentario' => $seguimiento->getCierreComentario(),
        ];
    }

    private function serializeEvaluacion(EvaluacionFinal $evaluacion): array
    {
        return [
            'id' => $evaluacion->getId(),
            'fecha' => $evaluacion->getFecha()->format('Y-m-d'),
            'valoracionEmpresa' => $evaluacion->getValoracionEmpresa(),
            'valoracionEstudiante' => $evaluacion->getValoracionEstudiante(),
            'valoracionTutorAcademico' => $evaluacion->getValoracionTutorAcademico(),
            'conclusiones' => $evaluacion->getConclusiones(),
            'notaEmpresa' => $evaluacion->getNotaEmpresa(),
            'notaEstudiante' => $evaluacion->getNotaEstudiante(),
            'notaTutorAcademico' => $evaluacion->getNotaTutorAcademico(),
            'estado' => $evaluacion->getEstado(),
            'cerradaEn' => $evaluacion->getCerradaEn()?->format(\DateTimeInterface::ATOM),
        ];
    }

    private function findSeguimiento(AsignacionPractica $asignacion, int $seguimientoId): ?Seguimiento
    {
        foreach ($asignacion->getSeguimientos() as $seguimiento) {
            if ($seguimiento->getId() === $seguimientoId) {
                return $seguimiento;
            }
        }

        return null;
    }

    /**
     * @return array<string, mixed>|JsonResponse
     */
    private function decodeFormPayload(Request $request): array|JsonResponse
    {
        if ($request->request->count() > 0 || $request->files->count() > 0) {
            return $request->request->all();
        }

        return $this->decodePayload($request);
    }

    /**
     * @return array{0:AsignacionPractica,1:array<string,mixed>}|JsonResponse
     */
    private function hydrateAssignment(
        array $payload,
        ?AsignacionPractica $asignacion,
        EstudianteRepository $estudianteRepository,
        EmpresaColaboradoraRepository $empresaRepository,
        ConvenioRepository $convenioRepository,
        TutorAcademicoRepository $tutorAcademicoRepository,
        TutorProfesionalRepository $tutorProfesionalRepository,
    ): array|JsonResponse {
        $asignacion ??= new AsignacionPractica();
        $empresa = $asignacion->getEmpresa();

        if (array_key_exists('empresaId', $payload) || $asignacion->getEmpresa() === null) {
            $empresa = $empresaRepository->find($payload['empresaId'] ?? null);
            if (!$empresa) {
                return $this->json(['message' => 'La empresa indicada no existe.'], Response::HTTP_NOT_FOUND);
            }
            $eligibilityResponse = $this->validateCompanyForAssignment($empresa);
            if ($eligibilityResponse instanceof JsonResponse) {
                return $eligibilityResponse;
            }
            $asignacion->setEmpresa($empresa);
        }

        if ($empresa) {
            $eligibilityResponse = $this->validateCompanyForAssignment($empresa);
            if ($eligibilityResponse instanceof JsonResponse) {
                return $eligibilityResponse;
            }
        }

        if (array_key_exists('estudianteId', $payload) || $asignacion->getEstudiante() === null) {
            $estudiante = $estudianteRepository->find($payload['estudianteId'] ?? null);
            if (!$estudiante) {
                return $this->json(['message' => 'El estudiante indicado no existe.'], Response::HTTP_NOT_FOUND);
            }
            $asignacion->setEstudiante($estudiante);
        }

        if (array_key_exists('convenioId', $payload) || $asignacion->getConvenio() === null) {
            $convenio = $convenioRepository->find($payload['convenioId'] ?? null);
            if (!$convenio) {
                return $this->json(['message' => 'El convenio indicado no existe.'], Response::HTTP_NOT_FOUND);
            }
            if ($empresa && $convenio->getEmpresa()->getId() !== $empresa->getId()) {
                return $this->json(['message' => 'El convenio seleccionado no pertenece a la empresa indicada.'], Response::HTTP_BAD_REQUEST);
            }
            $eligibilityResponse = $this->validateConvenioForAssignment($convenio);
            if ($eligibilityResponse instanceof JsonResponse) {
                return $eligibilityResponse;
            }
            $asignacion->setConvenio($convenio);
        }

        if (array_key_exists('tutorAcademicoId', $payload) || $asignacion->getTutorAcademico() === null) {
            $tutorAcademico = $tutorAcademicoRepository->find($payload['tutorAcademicoId'] ?? null);
            if (!$tutorAcademico) {
                return $this->json(['message' => 'El tutor academico indicado no existe.'], Response::HTTP_NOT_FOUND);
            }
            $asignacion->setTutorAcademico($tutorAcademico);
        }

        if (array_key_exists('tutorProfesionalId', $payload)) {
            if ($payload['tutorProfesionalId'] === null || $payload['tutorProfesionalId'] === '') {
                $asignacion->setTutorProfesional(null);
            } else {
                if (!is_int($payload['tutorProfesionalId']) || $payload['tutorProfesionalId'] <= 0) {
                    return $this->json(['message' => 'El tutor profesional debe ser un identificador numerico valido.'], Response::HTTP_BAD_REQUEST);
                }
                $tutorProfesional = $tutorProfesionalRepository->find($payload['tutorProfesionalId']);
                if (!$tutorProfesional) {
                    return $this->json(['message' => 'El tutor profesional indicado no existe.'], Response::HTTP_NOT_FOUND);
                }
                if ($empresa && $tutorProfesional->getEmpresa()?->getId() !== $empresa->getId()) {
                    return $this->json(['message' => 'El tutor profesional no esta vinculado a la empresa indicada.'], Response::HTTP_BAD_REQUEST);
                }
                $asignacion->setTutorProfesional($tutorProfesional);
            }
        }

        $fechaInicio = $asignacion->getFechaInicio();
        if (array_key_exists('fechaInicio', $payload) || $asignacion->getId() === null) {
            $fechaInicio = $this->parseDate((string) ($payload['fechaInicio'] ?? ''), 'fechaInicio');
            if ($fechaInicio instanceof JsonResponse) {
                return $fechaInicio;
            }
            $dateValidation = $this->validateBusinessDateRange($fechaInicio, 'fechaInicio', new \DateTimeImmutable(self::MIN_ALLOWED_DATE));
            if ($dateValidation instanceof JsonResponse) {
                return $dateValidation;
            }
            $asignacion->setFechaInicio($fechaInicio);
        }

        if (array_key_exists('fechaFin', $payload)) {
            if ($payload['fechaFin'] === null) {
                $asignacion->setFechaFin(null);
            } else {
                $fechaFin = $this->parseDate((string) $payload['fechaFin'], 'fechaFin');
                if ($fechaFin instanceof JsonResponse) {
                    return $fechaFin;
                }
                $dateValidation = $this->validateBusinessDateRange($fechaFin, 'fechaFin', new \DateTimeImmutable(self::MIN_ALLOWED_DATE));
                if ($dateValidation instanceof JsonResponse) {
                    return $dateValidation;
                }
                if ($fechaFin < $fechaInicio) {
                    return $this->json(['message' => 'La fecha de fin no puede ser anterior a la fecha de inicio de la asignacion.'], Response::HTTP_BAD_REQUEST);
                }
                $asignacion->setFechaFin($fechaFin);
            }
        }

        if (array_key_exists('modalidad', $payload)) {
            $asignacion->setModalidad((string) $payload['modalidad']);
        }
        if (array_key_exists('horasTotales', $payload)) {
            $asignacion->setHorasTotales($payload['horasTotales']);
        }
        if (array_key_exists('estado', $payload)) {
            $asignacion->setEstado((string) $payload['estado']);
        }

        $convenio = $asignacion->getConvenio();
        $eligibilityResponse = $this->validateConvenioForAssignment($convenio);
        if ($eligibilityResponse instanceof JsonResponse) {
            return $eligibilityResponse;
        }
        $convenioFechaFin = $convenio->getFechaFin();
        if ($asignacion->getFechaInicio() < $convenio->getFechaInicio()) {
            return $this->json(['message' => 'La fecha de inicio de la asignacion no puede ser anterior al inicio del convenio.'], Response::HTTP_BAD_REQUEST);
        }
        if ($convenioFechaFin && $asignacion->getFechaInicio() > $convenioFechaFin) {
            return $this->json(['message' => 'La fecha de inicio de la asignacion debe quedar dentro del periodo del convenio.'], Response::HTTP_BAD_REQUEST);
        }
        if ($convenioFechaFin && $asignacion->getFechaFin() && $asignacion->getFechaFin() > $convenioFechaFin) {
            return $this->json(['message' => 'La fecha de fin de la asignacion no puede superar la fecha de fin del convenio.'], Response::HTTP_BAD_REQUEST);
        }

        return [$asignacion, [
            'empresaId' => $asignacion->getEmpresa()->getId(),
            'estudianteId' => $asignacion->getEstudiante()->getId(),
            'convenioId' => $asignacion->getConvenio()->getId(),
            'estado' => $asignacion->getEstado(),
            'modalidad' => $asignacion->getModalidad(),
        ]];
    }

    private function validateCompanyForAssignment(EmpresaColaboradora $empresa): ?JsonResponse
    {
        if (\in_array($empresa->getEstadoColaboracion(), self::ELIGIBLE_COMPANY_STATES, true)) {
            return null;
        }

        return $this->json([
            'message' => 'Solo se pueden planificar asignaciones sobre empresas activas y validadas.',
        ], Response::HTTP_BAD_REQUEST);
    }

    private function validateConvenioForAssignment(Convenio $convenio): ?JsonResponse
    {
        if (\in_array($convenio->getEstado(), self::ELIGIBLE_CONVENIO_STATES, true)) {
            return null;
        }

        return $this->json([
            'message' => 'Solo se pueden planificar asignaciones sobre convenios firmados, vigentes o en renovacion.',
        ], Response::HTTP_BAD_REQUEST);
    }

    private function attachSeguimientoEvidence(
        Seguimiento $seguimiento,
        int $asignacionId,
        UploadedFile $file,
        mixed $requestedType,
        DocumentStorageManager $documentStorage,
    ): ?JsonResponse {
        $metadata = $this->resolveUploadedDocumentMetadata($file, $requestedType);
        if ($metadata instanceof JsonResponse) {
            return $metadata;
        }

        $originalName = $file->getClientOriginalName();
        $safeName = $this->sanitizeDocumentBaseName(pathinfo($originalName, PATHINFO_FILENAME));
        $relativePath = sprintf('seguimientos/%d/%s_%s.%s', $asignacionId, $safeName, uniqid('', true), $metadata['extension']);

        $documentStorage->storeUploadedFile($file, $relativePath);
        $seguimiento
            ->setDocumentoUrl($relativePath)
            ->setEvidenciaNombre($originalName)
            ->setEvidenciaTipo($metadata['type']);

        return null;
    }

    /**
     * @return array{type:string,extension:string}|JsonResponse
     */
    private function resolveUploadedDocumentMetadata(UploadedFile $file, mixed $requestedType): array|JsonResponse
    {
        $normalizedType = $this->normalizeDocumentType(is_string($requestedType) ? $requestedType : null);
        if ($requestedType !== null && $normalizedType === null) {
            return $this->json(['message' => 'El tipo de evidencia debe ser PDF, WORD o EXCEL.'], Response::HTTP_BAD_REQUEST);
        }

        $extension = strtolower($file->getClientOriginalExtension() ?: pathinfo($file->getClientOriginalName(), PATHINFO_EXTENSION));
        $detectedType = $this->detectDocumentTypeByExtension($extension);
        if ($detectedType === null) {
            return $this->json(['message' => 'Solo se permiten evidencias PDF, Word o Excel.'], Response::HTTP_BAD_REQUEST);
        }
        if ($normalizedType !== null && $normalizedType !== $detectedType) {
            return $this->json(['message' => 'El tipo seleccionado no coincide con la extension del archivo subido.'], Response::HTTP_BAD_REQUEST);
        }

        return ['type' => $normalizedType ?? $detectedType, 'extension' => $extension];
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

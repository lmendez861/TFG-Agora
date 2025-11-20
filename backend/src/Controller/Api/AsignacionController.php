<?php

namespace App\Controller\Api;

use App\Entity\AsignacionPractica;
use App\Repository\AsignacionPracticaRepository;
use App\Repository\ConvenioRepository;
use App\Repository\EmpresaColaboradoraRepository;
use App\Repository\EstudianteRepository;
use App\Repository\TutorAcademicoRepository;
use App\Repository\TutorProfesionalRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Symfony\Component\Validator\Constraints as Assert;
use Symfony\Component\Validator\Validator\ValidatorInterface;

#[Route('/api/asignaciones', name: 'api_asignaciones_')]
#[IsGranted('ROLE_API')]
final class AsignacionController extends AbstractController
{
    use JsonRequestTrait;

    private const ESTADOS_PERMITIDOS = [
        'planificada',
        'en_curso',
        'finalizada',
        'cancelada',
        'en_revision',
    ];

    private const MODALIDADES_PERMITIDAS = [
        'presencial',
        'remota',
        'hibrida',
    ];

    #[Route('', name: 'index', methods: ['GET'])]
    public function index(Request $request, AsignacionPracticaRepository $repository): JsonResponse
    {
        $qb = $repository->createQueryBuilder('a')
            ->join('a.empresa', 'e')->addSelect('e')
            ->join('a.estudiante', 'es')->addSelect('es');

        if ($estado = $request->query->get('estado')) {
            if (!\in_array($estado, self::ESTADOS_PERMITIDOS, true)) {
                return $this->json([
                    'message' => 'El estado indicado no es válido para las asignaciones.',
                ], Response::HTTP_BAD_REQUEST);
            }
            $qb->andWhere('a.estado = :estado')
                ->setParameter('estado', $estado);
        }

        if ($modalidad = $request->query->get('modalidad')) {
            if (!\in_array($modalidad, self::MODALIDADES_PERMITIDAS, true)) {
                return $this->json([
                    'message' => 'La modalidad indicada no está soportada.',
                ], Response::HTTP_BAD_REQUEST);
            }
            $qb->andWhere('a.modalidad = :modalidad')
                ->setParameter('modalidad', $modalidad);
        }

        if ($empresaId = $request->query->get('empresaId')) {
            if (!ctype_digit((string) $empresaId)) {
                return $this->json(['message' => 'El parámetro empresaId debe ser numérico.'], Response::HTTP_BAD_REQUEST);
            }
            $qb->andWhere('e.id = :empresa')->setParameter('empresa', (int) $empresaId);
        }

        if ($estudianteId = $request->query->get('estudianteId')) {
            if (!ctype_digit((string) $estudianteId)) {
                return $this->json(['message' => 'El parámetro estudianteId debe ser numérico.'], Response::HTTP_BAD_REQUEST);
            }
            $qb->andWhere('es.id = :estudiante')->setParameter('estudiante', (int) $estudianteId);
        }

        [$page, $perPage] = $this->resolvePagination($request);
        $qb->orderBy('a.id', 'ASC')
            ->setFirstResult(($page - 1) * $perPage)
            ->setMaxResults($perPage);

        $asignaciones = $qb->getQuery()->getResult();

        $data = array_map(fn (AsignacionPractica $asignacion): array => $this->serializeSummary($asignacion), $asignaciones);

        return $this->json($data, Response::HTTP_OK);
    }

    #[Route('', name: 'create', methods: ['POST'])]
    public function create(
        Request $request,
        EstudianteRepository $estudianteRepository,
        EmpresaColaboradoraRepository $empresaRepository,
        ConvenioRepository $convenioRepository,
        TutorAcademicoRepository $tutorAcademicoRepository,
        TutorProfesionalRepository $tutorProfesionalRepository,
        EntityManagerInterface $entityManager,
        ValidatorInterface $validator
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
                'horasTotales' => new Assert\Optional([new Assert\Type('integer'), new Assert\PositiveOrZero()]),
                'estado' => [new Assert\NotBlank(), new Assert\Choice(choices: self::ESTADOS_PERMITIDOS)],
            ],
            allowExtraFields: true
        );

        $violations = $validator->validate($payload, $constraints);
        if ($violations->count() > 0) {
            return $this->validationErrorResponse($violations);
        }

        if (array_key_exists('tutorProfesionalId', $payload) && $payload['tutorProfesionalId'] !== null) {
            if (!is_int($payload['tutorProfesionalId']) || $payload['tutorProfesionalId'] <= 0) {
                return $this->json([
                    'message' => 'El tutor profesional debe ser un identificador numérico válido.',
                ], Response::HTTP_BAD_REQUEST);
            }
        }

        $estudiante = $estudianteRepository->find($payload['estudianteId']);
        if (!$estudiante) {
            return $this->json(['message' => 'El estudiante indicado no existe.'], Response::HTTP_NOT_FOUND);
        }

        $empresa = $empresaRepository->find($payload['empresaId']);
        if (!$empresa) {
            return $this->json(['message' => 'La empresa indicada no existe.'], Response::HTTP_NOT_FOUND);
        }

        $convenio = $convenioRepository->find($payload['convenioId']);
        if (!$convenio) {
            return $this->json(['message' => 'El convenio indicado no existe.'], Response::HTTP_NOT_FOUND);
        }

        if ($convenio->getEmpresa()->getId() !== $empresa->getId()) {
            return $this->json([
                'message' => 'El convenio seleccionado no pertenece a la empresa indicada.',
            ], Response::HTTP_BAD_REQUEST);
        }

        $tutorAcademico = $tutorAcademicoRepository->find($payload['tutorAcademicoId']);
        if (!$tutorAcademico) {
            return $this->json(['message' => 'El tutor académico indicado no existe.'], Response::HTTP_NOT_FOUND);
        }

        $tutorProfesional = null;
        if (array_key_exists('tutorProfesionalId', $payload)) {
            if ($payload['tutorProfesionalId'] !== null) {
                $tutorProfesional = $tutorProfesionalRepository->find($payload['tutorProfesionalId']);
                if (!$tutorProfesional) {
                    return $this->json(['message' => 'El tutor profesional indicado no existe.'], Response::HTTP_NOT_FOUND);
                }

                if ($tutorProfesional->getEmpresa()?->getId() !== $empresa->getId()) {
                    return $this->json([
                        'message' => 'El tutor profesional no está vinculado a la empresa indicada.',
                    ], Response::HTTP_BAD_REQUEST);
                }
            }
        }

        $fechaInicio = $this->parseDate($payload['fechaInicio'], 'fechaInicio');
        if ($fechaInicio instanceof JsonResponse) {
            return $fechaInicio;
        }

        $asignacion = new AsignacionPractica();
        $asignacion
            ->setEstudiante($estudiante)
            ->setEmpresa($empresa)
            ->setConvenio($convenio)
            ->setTutorAcademico($tutorAcademico)
            ->setModalidad($payload['modalidad'])
            ->setFechaInicio($fechaInicio)
            ->setEstado($payload['estado']);

        if (array_key_exists('horasTotales', $payload)) {
            $asignacion->setHorasTotales($payload['horasTotales']);
        }

        if (array_key_exists('fechaFin', $payload)) {
            if ($payload['fechaFin'] === null) {
                $asignacion->setFechaFin(null);
            } else {
                $fechaFin = $this->parseDate($payload['fechaFin'], 'fechaFin');
                if ($fechaFin instanceof JsonResponse) {
                    return $fechaFin;
                }
                if ($fechaFin < $fechaInicio) {
                    return $this->json([
                        'message' => 'La fecha de fin no puede ser anterior a la fecha de inicio de la asignación.',
                    ], Response::HTTP_BAD_REQUEST);
                }
                $asignacion->setFechaFin($fechaFin);
            }
        }

        if ($tutorProfesional) {
            $asignacion->setTutorProfesional($tutorProfesional);
        }

        $entityManager->persist($asignacion);
        $entityManager->flush();

        return $this->json($this->serializeDetail($asignacion), Response::HTTP_CREATED);
    }

    #[Route('/{id<\\d+>}', name: 'show', methods: ['GET'])]
    public function show(?AsignacionPractica $asignacion): JsonResponse
    {
        if (!$asignacion) {
            return $this->json(['message' => 'Asignación no encontrada'], Response::HTTP_NOT_FOUND);
        }

        return $this->json($this->serializeDetail($asignacion), Response::HTTP_OK);
    }

    #[Route('/{id<\\d+>}', name: 'update', methods: ['PUT'])]
    public function update(
        ?AsignacionPractica $asignacion,
        Request $request,
        EstudianteRepository $estudianteRepository,
        EmpresaColaboradoraRepository $empresaRepository,
        ConvenioRepository $convenioRepository,
        TutorAcademicoRepository $tutorAcademicoRepository,
        TutorProfesionalRepository $tutorProfesionalRepository,
        EntityManagerInterface $entityManager,
        ValidatorInterface $validator
    ): JsonResponse {
        if (!$asignacion) {
            return $this->json(['message' => 'Asignación no encontrada'], Response::HTTP_NOT_FOUND);
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
                'horasTotales' => new Assert\Optional([new Assert\Type('integer'), new Assert\PositiveOrZero()]),
                'estado' => new Assert\Optional([new Assert\Choice(choices: self::ESTADOS_PERMITIDOS)]),
            ],
            allowMissingFields: true,
            allowExtraFields: true
        );

        $violations = $validator->validate($payload, $constraints);
        if ($violations->count() > 0) {
            return $this->validationErrorResponse($violations);
        }

        if (array_key_exists('tutorProfesionalId', $payload) && $payload['tutorProfesionalId'] !== null) {
            if (!is_int($payload['tutorProfesionalId']) || $payload['tutorProfesionalId'] <= 0) {
                return $this->json([
                    'message' => 'El tutor profesional debe ser un identificador numérico válido.',
                ], Response::HTTP_BAD_REQUEST);
            }
        }

        $fechaInicioActual = $asignacion->getFechaInicio();

        $empresa = $asignacion->getEmpresa();
        if (array_key_exists('empresaId', $payload)) {
            $empresa = $empresaRepository->find($payload['empresaId']);
            if (!$empresa) {
                return $this->json(['message' => 'La empresa indicada no existe.'], Response::HTTP_NOT_FOUND);
            }
            $asignacion->setEmpresa($empresa);
        }

        if (array_key_exists('estudianteId', $payload)) {
            $estudiante = $estudianteRepository->find($payload['estudianteId']);
            if (!$estudiante) {
                return $this->json(['message' => 'El estudiante indicado no existe.'], Response::HTTP_NOT_FOUND);
            }
            $asignacion->setEstudiante($estudiante);
        }

        if (array_key_exists('convenioId', $payload)) {
            $convenio = $convenioRepository->find($payload['convenioId']);
            if (!$convenio) {
                return $this->json(['message' => 'El convenio indicado no existe.'], Response::HTTP_NOT_FOUND);
            }

            if ($convenio->getEmpresa()->getId() !== $empresa->getId()) {
                return $this->json([
                    'message' => 'El convenio seleccionado no pertenece a la empresa asociada.',
                ], Response::HTTP_BAD_REQUEST);
            }

            $asignacion->setConvenio($convenio);
        }

        if (array_key_exists('tutorAcademicoId', $payload)) {
            $tutorAcademico = $tutorAcademicoRepository->find($payload['tutorAcademicoId']);
            if (!$tutorAcademico) {
                return $this->json(['message' => 'El tutor académico indicado no existe.'], Response::HTTP_NOT_FOUND);
            }
            $asignacion->setTutorAcademico($tutorAcademico);
        }

        if (array_key_exists('tutorProfesionalId', $payload)) {
            if ($payload['tutorProfesionalId'] === null) {
                $asignacion->setTutorProfesional(null);
            } else {
                $tutorProfesional = $tutorProfesionalRepository->find($payload['tutorProfesionalId']);
                if (!$tutorProfesional) {
                    return $this->json(['message' => 'El tutor profesional indicado no existe.'], Response::HTTP_NOT_FOUND);
                }

                if ($tutorProfesional->getEmpresa()?->getId() !== $empresa->getId()) {
                    return $this->json([
                        'message' => 'El tutor profesional no está vinculado a la empresa indicada.',
                    ], Response::HTTP_BAD_REQUEST);
                }

                $asignacion->setTutorProfesional($tutorProfesional);
            }
        }

        if (array_key_exists('fechaInicio', $payload)) {
            $fechaInicio = $this->parseDate($payload['fechaInicio'], 'fechaInicio');
            if ($fechaInicio instanceof JsonResponse) {
                return $fechaInicio;
            }
            $asignacion->setFechaInicio($fechaInicio);
            $fechaInicioActual = $fechaInicio;
        }

        if (array_key_exists('fechaFin', $payload)) {
            if ($payload['fechaFin'] === null) {
                $asignacion->setFechaFin(null);
            } else {
                $fechaFin = $this->parseDate($payload['fechaFin'], 'fechaFin');
                if ($fechaFin instanceof JsonResponse) {
                    return $fechaFin;
                }
                if ($fechaFin < $fechaInicioActual) {
                    return $this->json([
                        'message' => 'La fecha de fin no puede ser anterior a la fecha de inicio de la asignación.',
                    ], Response::HTTP_BAD_REQUEST);
                }
                $asignacion->setFechaFin($fechaFin);
            }
        }

        if (array_key_exists('modalidad', $payload)) {
            $asignacion->setModalidad($payload['modalidad']);
        }

        if (array_key_exists('horasTotales', $payload)) {
            $asignacion->setHorasTotales($payload['horasTotales']);
        }

        if (array_key_exists('estado', $payload)) {
            $asignacion->setEstado($payload['estado']);
        }

        $entityManager->flush();

        return $this->json($this->serializeDetail($asignacion), Response::HTTP_OK);
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
        $seguimientos = array_map(static function ($seguimiento): array {
            return [
                'id' => $seguimiento->getId(),
                'fecha' => $seguimiento->getFecha()->format('Y-m-d'),
                'tipo' => $seguimiento->getTipo(),
                'descripcion' => $seguimiento->getDescripcion(),
                'accionRequerida' => $seguimiento->getAccionRequerida(),
                'documentoUrl' => $seguimiento->getDocumentoUrl(),
            ];
        }, $asignacion->getSeguimientos()->toArray());

        $evaluacion = $asignacion->getEvaluacionFinal();

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
            'seguimientos' => $seguimientos,
            'evaluacionFinal' => $evaluacion ? [
                'id' => $evaluacion->getId(),
                'fecha' => $evaluacion->getFecha()->format('Y-m-d'),
                'valoracionEmpresa' => $evaluacion->getValoracionEmpresa(),
                'valoracionEstudiante' => $evaluacion->getValoracionEstudiante(),
                'valoracionTutorAcademico' => $evaluacion->getValoracionTutorAcademico(),
                'conclusiones' => $evaluacion->getConclusiones(),
            ] : null,
        ];
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

<?php

namespace App\Controller\Api;

use App\Entity\Estudiante;
use App\Repository\EstudianteRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Symfony\Component\Validator\Constraints as Assert;
use Symfony\Component\Validator\Validator\ValidatorInterface;

#[Route('/api/estudiantes', name: 'api_estudiantes_')]
#[IsGranted('ROLE_API')]
final class EstudianteController extends AbstractController
{
    use JsonRequestTrait;

    private const ESTADOS_PERMITIDOS = [
        'disponible',
        'en_practicas',
        'finalizado',
        'baja',
        'bloqueado',
    ];

    #[Route('', name: 'index', methods: ['GET'])]
    public function index(Request $request, EstudianteRepository $repository): JsonResponse
    {
        $qb = $repository->createQueryBuilder('e');

        if ($estado = $request->query->get('estado')) {
            if (!\in_array($estado, self::ESTADOS_PERMITIDOS, true)) {
                return $this->json([
                    'message' => 'El estado indicado no existe en el catálogo permitido.',
                ], Response::HTTP_BAD_REQUEST);
            }
            $qb->andWhere('e.estado = :estado')
                ->setParameter('estado', $estado);
        }

        if ($search = $request->query->get('q')) {
            $pattern = '%' . mb_strtolower($search) . '%';
            $qb->andWhere('LOWER(e.nombre) LIKE :search OR LOWER(e.apellido) LIKE :search OR LOWER(e.email) LIKE :search')
                ->setParameter('search', $pattern);
        }

        [$page, $perPage] = $this->resolvePagination($request);
        $qb->orderBy('e.id', 'ASC')
            ->setFirstResult(($page - 1) * $perPage)
            ->setMaxResults($perPage);

        $estudiantes = $qb->getQuery()->getResult();

        $data = array_map(fn (Estudiante $estudiante): array => $this->serializeSummary($estudiante), $estudiantes);

        return $this->json($data, Response::HTTP_OK);
    }

    #[Route('', name: 'create', methods: ['POST'])]
    public function create(
        Request $request,
        EstudianteRepository $repository,
        EntityManagerInterface $entityManager,
        ValidatorInterface $validator
    ): JsonResponse {
        $payload = $this->decodePayload($request);
        if ($payload instanceof JsonResponse) {
            return $payload;
        }

        $constraints = new Assert\Collection(
            fields: [
                'nombre' => [new Assert\NotBlank(), new Assert\Length(max: 120)],
                'apellido' => [new Assert\NotBlank(), new Assert\Length(max: 120)],
                'dni' => [
                    new Assert\NotBlank(),
                    new Assert\Length(max: 16),
                    new Assert\Regex(pattern: '/^[0-9]{7,8}[A-Za-z]$/'),
                ],
                'email' => [new Assert\NotBlank(), new Assert\Email(), new Assert\Length(max: 150)],
                'telefono' => new Assert\Optional([new Assert\Length(max: 50)]),
                'grado' => new Assert\Optional([new Assert\Length(max: 120)]),
                'curso' => new Assert\Optional([new Assert\Length(max: 30)]),
                'expediente' => new Assert\Optional([new Assert\Length(max: 30)]),
                'estado' => new Assert\Optional([new Assert\Choice(choices: self::ESTADOS_PERMITIDOS)]),
            ],
            allowExtraFields: true
        );

        $violations = $validator->validate($payload, $constraints);
        if ($violations->count() > 0) {
            return $this->validationErrorResponse($violations);
        }

        if ($repository->findOneBy(['dni' => $payload['dni']])) {
            return $this->json([
                'message' => 'Ya existe un estudiante con el DNI indicado.',
            ], Response::HTTP_CONFLICT);
        }

        if ($repository->findOneBy(['email' => $payload['email']])) {
            return $this->json([
                'message' => 'Ya existe un estudiante con el email indicado.',
            ], Response::HTTP_CONFLICT);
        }

        $estudiante = new Estudiante();
        $estudiante
            ->setNombre($payload['nombre'])
            ->setApellido($payload['apellido'])
            ->setDni($payload['dni'])
            ->setEmail($payload['email']);

        if (array_key_exists('telefono', $payload)) {
            $estudiante->setTelefono($payload['telefono']);
        }
        if (array_key_exists('grado', $payload)) {
            $estudiante->setGrado($payload['grado']);
        }
        if (array_key_exists('curso', $payload)) {
            $estudiante->setCurso($payload['curso']);
        }
        if (array_key_exists('expediente', $payload)) {
            $estudiante->setExpediente($payload['expediente']);
        }
        if (array_key_exists('estado', $payload)) {
            $estudiante->setEstado($payload['estado']);
        }

        $entityManager->persist($estudiante);
        $entityManager->flush();

        return $this->json($this->serializeDetail($estudiante), Response::HTTP_CREATED);
    }

    #[Route('/{id<\\d+>}', name: 'show', methods: ['GET'])]
    public function show(?Estudiante $estudiante): JsonResponse
    {
        if (!$estudiante) {
            return $this->json(['message' => 'Estudiante no encontrado'], Response::HTTP_NOT_FOUND);
        }

        return $this->json($this->serializeDetail($estudiante), Response::HTTP_OK);
    }

    #[Route('/{id<\\d+>}', name: 'update', methods: ['PUT'])]
    public function update(
        ?Estudiante $estudiante,
        Request $request,
        EstudianteRepository $repository,
        EntityManagerInterface $entityManager,
        ValidatorInterface $validator
    ): JsonResponse {
        if (!$estudiante) {
            return $this->json(['message' => 'Estudiante no encontrado'], Response::HTTP_NOT_FOUND);
        }

        $payload = $this->decodePayload($request);
        if ($payload instanceof JsonResponse) {
            return $payload;
        }

        $constraints = new Assert\Collection(
            fields: [
                'nombre' => new Assert\Optional([new Assert\NotBlank(), new Assert\Length(max: 120)]),
                'apellido' => new Assert\Optional([new Assert\NotBlank(), new Assert\Length(max: 120)]),
                'dni' => new Assert\Optional([
                    new Assert\NotBlank(),
                    new Assert\Length(max: 16),
                    new Assert\Regex(pattern: '/^[0-9]{7,8}[A-Za-z]$/'),
                ]),
                'email' => new Assert\Optional([new Assert\NotBlank(), new Assert\Email(), new Assert\Length(max: 150)]),
                'telefono' => new Assert\Optional([new Assert\Length(max: 50)]),
                'grado' => new Assert\Optional([new Assert\Length(max: 120)]),
                'curso' => new Assert\Optional([new Assert\Length(max: 30)]),
                'expediente' => new Assert\Optional([new Assert\Length(max: 30)]),
                'estado' => new Assert\Optional([new Assert\Choice(choices: self::ESTADOS_PERMITIDOS)]),
            ],
            allowMissingFields: true,
            allowExtraFields: true
        );

        $violations = $validator->validate($payload, $constraints);
        if ($violations->count() > 0) {
            return $this->validationErrorResponse($violations);
        }

        if (array_key_exists('dni', $payload) && $payload['dni'] !== $estudiante->getDni()) {
            if ($repository->findOneBy(['dni' => $payload['dni']])) {
                return $this->json([
                    'message' => 'Ya existe un estudiante con el DNI indicado.',
                ], Response::HTTP_CONFLICT);
            }
            $estudiante->setDni($payload['dni']);
        }

        if (array_key_exists('email', $payload) && $payload['email'] !== $estudiante->getEmail()) {
            if ($repository->findOneBy(['email' => $payload['email']])) {
                return $this->json([
                    'message' => 'Ya existe un estudiante con el email indicado.',
                ], Response::HTTP_CONFLICT);
            }
            $estudiante->setEmail($payload['email']);
        }

        if (array_key_exists('nombre', $payload)) {
            $estudiante->setNombre($payload['nombre']);
        }
        if (array_key_exists('apellido', $payload)) {
            $estudiante->setApellido($payload['apellido']);
        }
        if (array_key_exists('telefono', $payload)) {
            $estudiante->setTelefono($payload['telefono']);
        }
        if (array_key_exists('grado', $payload)) {
            $estudiante->setGrado($payload['grado']);
        }
        if (array_key_exists('curso', $payload)) {
            $estudiante->setCurso($payload['curso']);
        }
        if (array_key_exists('expediente', $payload)) {
            $estudiante->setExpediente($payload['expediente']);
        }
        if (array_key_exists('estado', $payload)) {
            $estudiante->setEstado($payload['estado']);
        }

        $entityManager->flush();

        return $this->json($this->serializeDetail($estudiante), Response::HTTP_OK);
    }

    private function serializeSummary(Estudiante $estudiante): array
    {
        $asignaciones = $estudiante->getAsignaciones();

        return [
            'id' => $estudiante->getId(),
            'nombre' => $estudiante->getNombre(),
            'apellido' => $estudiante->getApellido(),
            'dni' => $estudiante->getDni(),
            'email' => $estudiante->getEmail(),
            'grado' => $estudiante->getGrado(),
            'curso' => $estudiante->getCurso(),
            'estado' => $estudiante->getEstado(),
            'asignaciones' => [
                'total' => $asignaciones->count(),
                'enCurso' => $asignaciones->filter(static fn ($a) => $a->getEstado() === 'en_curso')->count(),
            ],
        ];
    }

    private function serializeDetail(Estudiante $estudiante): array
    {
        $asignaciones = array_map(static function ($asignacion): array {
            return [
                'id' => $asignacion->getId(),
                'empresa' => $asignacion->getEmpresa()->getNombre(),
                'estado' => $asignacion->getEstado(),
                'modalidad' => $asignacion->getModalidad(),
                'fechaInicio' => $asignacion->getFechaInicio()->format('Y-m-d'),
                'fechaFin' => $asignacion->getFechaFin()?->format('Y-m-d'),
            ];
        }, $estudiante->getAsignaciones()->toArray());

        return [
            'id' => $estudiante->getId(),
            'nombre' => $estudiante->getNombre(),
            'apellido' => $estudiante->getApellido(),
            'dni' => $estudiante->getDni(),
            'email' => $estudiante->getEmail(),
            'telefono' => $estudiante->getTelefono(),
            'grado' => $estudiante->getGrado(),
            'curso' => $estudiante->getCurso(),
            'expediente' => $estudiante->getExpediente(),
            'estado' => $estudiante->getEstado(),
            'asignaciones' => $asignaciones,
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

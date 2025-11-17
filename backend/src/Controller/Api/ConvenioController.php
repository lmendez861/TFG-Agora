<?php

namespace App\Controller\Api;

use App\Entity\Convenio;
use App\Repository\ConvenioRepository;
use App\Repository\EmpresaColaboradoraRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Symfony\Component\Validator\Constraints as Assert;
use Symfony\Component\Validator\Validator\ValidatorInterface;

#[Route('/api/convenios', name: 'api_convenios_')]
#[IsGranted('ROLE_API')]
final class ConvenioController extends AbstractController
{
    use JsonRequestTrait;

    #[Route('', name: 'index', methods: ['GET'])]
    public function index(Request $request, ConvenioRepository $repository): JsonResponse
    {
        $qb = $repository->createQueryBuilder('c')
            ->join('c.empresa', 'e')->addSelect('e');

        if ($estado = $request->query->get('estado')) {
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
    public function create(
        Request $request,
        EmpresaColaboradoraRepository $empresaRepository,
        EntityManagerInterface $entityManager,
        ValidatorInterface $validator
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
                'estado' => new Assert\Optional([new Assert\Length(max: 30)]),
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

        $fechaInicio = $this->parseDate($payload['fechaInicio'], 'fechaInicio');
        if ($fechaInicio instanceof JsonResponse) {
            return $fechaInicio;
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
            $convenio->setFechaFin($fechaFin);
        }

        $entityManager->persist($convenio);
        $entityManager->flush();

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
    public function update(
        ?Convenio $convenio,
        Request $request,
        EmpresaColaboradoraRepository $empresaRepository,
        EntityManagerInterface $entityManager,
        ValidatorInterface $validator
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
                'estado' => new Assert\Optional([new Assert\Length(max: 30)]),
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

        if (array_key_exists('empresaId', $payload)) {
            $empresa = $empresaRepository->find($payload['empresaId']);
            if (!$empresa) {
                return $this->json(['message' => 'La empresa indicada no existe.'], Response::HTTP_NOT_FOUND);
            }
            $convenio->setEmpresa($empresa);
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
            $convenio->setFechaInicio($fechaInicio);
        }
        if (array_key_exists('fechaFin', $payload)) {
            if ($payload['fechaFin'] === null) {
                $convenio->setFechaFin(null);
            } else {
                $fechaFin = $this->parseDate($payload['fechaFin'], 'fechaFin');
                if ($fechaFin instanceof JsonResponse) {
                    return $fechaFin;
                }
                $convenio->setFechaFin($fechaFin);
            }
        }

        $entityManager->flush();

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

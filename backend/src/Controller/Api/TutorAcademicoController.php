<?php

/**
 * Comentario de mantenimiento Agora.
 * Proposito: Controlador HTTP de la API interna: valida peticiones, coordina servicios/repositorios y devuelve JSON al frontend.
 * Relaciones: Conecta con App/Repository/TutorAcademicoRepository.
 */

namespace App\Controller\Api;

use App\Entity\TutorAcademico;
use Doctrine\ORM\EntityManagerInterface;
use App\Repository\TutorAcademicoRepository;
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
#[Route('/api/tutores-academicos', name: 'api_tutores_academicos_')]
#[IsGranted('ROLE_API')]
final class TutorAcademicoController extends AbstractController
{
    /**
     * Endpoint/controlador que valida la entrada, coordina dependencias y devuelve una respuesta HTTP.
     * El bloque de atributos siguiente indica la ruta, permiso o mapeo que conecta esta pieza con el resto del sistema.
     */
    #[Route('', name: 'index', methods: ['GET'])]
    public function index(Request $request, TutorAcademicoRepository $repository): JsonResponse
    {
        $page = $request->query->get('page');
        $perPage = $request->query->get('perPage');
        $activo = $request->query->get('activo');

        $qb = $repository->createQueryBuilder('t')->orderBy('t.apellido', 'ASC');
        if ($activo !== null) {
            $qb->andWhere('t.activo = :activo')->setParameter('activo', filter_var($activo, FILTER_VALIDATE_BOOLEAN));
        }

        $countQb = clone $qb;

        if ($page !== null) {
            $pageNumber = max(1, (int) $page);
            $perPageNumber = min(50, max(1, (int) ($perPage ?? 20)));
            $qb->setFirstResult(($pageNumber - 1) * $perPageNumber)->setMaxResults($perPageNumber);
            $total = (int) $countQb->select('COUNT(t.id)')->resetDQLPart('orderBy')->getQuery()->getSingleScalarResult();
            $paginado = true;
        } else {
            $paginado = false;
            $pageNumber = 1;
            $perPageNumber = 0;
        }

        $tutores = $qb->getQuery()->getResult();

        $data = array_map(static function ($tutor): array {
            return [
                'id' => $tutor->getId(),
                'nombre' => $tutor->getNombre(),
                'apellido' => $tutor->getApellido(),
                'email' => $tutor->getEmail(),
                'telefono' => $tutor->getTelefono(),
                'departamento' => $tutor->getDepartamento(),
                'especialidad' => $tutor->getEspecialidad(),
                'activo' => $tutor->isActivo(),
            ];
        }, $tutores);

        if ($paginado) {
            return $this->json([
                'items' => $data,
                'page' => $pageNumber,
                'perPage' => $perPageNumber,
                'total' => $total,
            ], Response::HTTP_OK);
        }

        return $this->json($data, Response::HTTP_OK);
    }

    #[Route('', name: 'create', methods: ['POST'])]
    #[IsGranted('ROLE_COORDINATOR')]
    public function create(
        Request $request,
        EntityManagerInterface $entityManager,
        ValidatorInterface $validator,
    ): JsonResponse {
        $payload = json_decode($request->getContent(), true);
        if (!is_array($payload)) {
            return $this->json(['message' => 'JSON invalido.'], Response::HTTP_BAD_REQUEST);
        }

        $violations = $validator->validate($payload, new Assert\Collection(
            fields: [
                'nombre' => [new Assert\NotBlank(), new Assert\Length(max: 120)],
                'apellido' => [new Assert\NotBlank(), new Assert\Length(max: 120)],
                'email' => [new Assert\NotBlank(), new Assert\Email(), new Assert\Length(max: 150)],
                'telefono' => new Assert\Optional([new Assert\Length(max: 50)]),
                'departamento' => new Assert\Optional([new Assert\Length(max: 120)]),
                'especialidad' => new Assert\Optional([new Assert\Length(max: 120)]),
                'activo' => new Assert\Optional([new Assert\Type('bool')]),
            ],
            allowExtraFields: true
        ));

        if ($violations->count() > 0) {
            return $this->json(['message' => 'No se pudieron validar los datos del tutor academico.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $tutor = (new TutorAcademico())
            ->setNombre(trim((string) $payload['nombre']))
            ->setApellido(trim((string) $payload['apellido']))
            ->setEmail(trim((string) $payload['email']))
            ->setTelefono($this->normalizeOptionalString($payload['telefono'] ?? null))
            ->setDepartamento($this->normalizeOptionalString($payload['departamento'] ?? null))
            ->setEspecialidad($this->normalizeOptionalString($payload['especialidad'] ?? null))
            ->setActivo((bool) ($payload['activo'] ?? true));

        $entityManager->persist($tutor);
        $entityManager->flush();

        return $this->json($this->serializeTutor($tutor), Response::HTTP_CREATED);
    }

    #[Route('/{id<\d+>}', name: 'update', methods: ['PUT'])]
    #[IsGranted('ROLE_COORDINATOR')]
    public function update(
        ?TutorAcademico $tutor,
        Request $request,
        EntityManagerInterface $entityManager,
        ValidatorInterface $validator,
    ): JsonResponse {
        if (!$tutor) {
            return $this->json(['message' => 'Tutor academico no encontrado.'], Response::HTTP_NOT_FOUND);
        }

        $payload = json_decode($request->getContent(), true);
        if (!is_array($payload)) {
            return $this->json(['message' => 'JSON invalido.'], Response::HTTP_BAD_REQUEST);
        }

        $violations = $validator->validate($payload, new Assert\Collection(
            fields: [
                'nombre' => new Assert\Optional([new Assert\NotBlank(), new Assert\Length(max: 120)]),
                'apellido' => new Assert\Optional([new Assert\NotBlank(), new Assert\Length(max: 120)]),
                'email' => new Assert\Optional([new Assert\NotBlank(), new Assert\Email(), new Assert\Length(max: 150)]),
                'telefono' => new Assert\Optional([new Assert\Length(max: 50)]),
                'departamento' => new Assert\Optional([new Assert\Length(max: 120)]),
                'especialidad' => new Assert\Optional([new Assert\Length(max: 120)]),
                'activo' => new Assert\Optional([new Assert\Type('bool')]),
            ],
            allowMissingFields: true,
            allowExtraFields: true
        ));

        if ($violations->count() > 0) {
            return $this->json(['message' => 'No se pudieron validar los datos del tutor academico.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        if (array_key_exists('nombre', $payload)) {
            $tutor->setNombre(trim((string) $payload['nombre']));
        }
        if (array_key_exists('apellido', $payload)) {
            $tutor->setApellido(trim((string) $payload['apellido']));
        }
        if (array_key_exists('email', $payload)) {
            $tutor->setEmail(trim((string) $payload['email']));
        }
        if (array_key_exists('telefono', $payload)) {
            $tutor->setTelefono($this->normalizeOptionalString($payload['telefono']));
        }
        if (array_key_exists('departamento', $payload)) {
            $tutor->setDepartamento($this->normalizeOptionalString($payload['departamento']));
        }
        if (array_key_exists('especialidad', $payload)) {
            $tutor->setEspecialidad($this->normalizeOptionalString($payload['especialidad']));
        }
        if (array_key_exists('activo', $payload)) {
            $tutor->setActivo((bool) $payload['activo']);
        }

        $entityManager->flush();

        return $this->json($this->serializeTutor($tutor), Response::HTTP_OK);
    }

    private function serializeTutor(TutorAcademico $tutor): array
    {
        return [
            'id' => $tutor->getId(),
            'nombre' => $tutor->getNombre(),
            'apellido' => $tutor->getApellido(),
            'email' => $tutor->getEmail(),
            'telefono' => $tutor->getTelefono(),
            'departamento' => $tutor->getDepartamento(),
            'especialidad' => $tutor->getEspecialidad(),
            'activo' => $tutor->isActivo(),
        ];
    }

    private function normalizeOptionalString(mixed $value): ?string
    {
        $normalized = trim((string) ($value ?? ''));

        return $normalized !== '' ? $normalized : null;
    }
}

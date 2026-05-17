<?php

/**
 * Comentario de mantenimiento Agora.
 * Proposito: Controlador HTTP de la API interna: valida peticiones, coordina servicios/repositorios y devuelve JSON al frontend.
 * Relaciones: Conecta con App/Repository/EmpresaColaboradoraRepository, App/Repository/TutorProfesionalRepository.
 */

declare(strict_types=1);

namespace App\Controller\Api;

use App\Entity\TutorProfesional;
use Doctrine\ORM\EntityManagerInterface;
use App\Repository\EmpresaColaboradoraRepository;
use App\Repository\TutorProfesionalRepository;
use App\Service\BootstrapSnapshotProvider;
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
#[Route('/api/tutores-profesionales', name: 'api_tutores_profesionales_')]
#[IsGranted('ROLE_API')]
final class TutorProfesionalController extends AbstractController
{
    /**
     * Endpoint/controlador que valida la entrada, coordina dependencias y devuelve una respuesta HTTP.
     * El bloque de atributos siguiente indica la ruta, permiso o mapeo que conecta esta pieza con el resto del sistema.
     */
    #[Route('', name: 'index', methods: ['GET'])]
    public function index(
        Request $request,
        TutorProfesionalRepository $repository,
        EmpresaColaboradoraRepository $empresaRepository
    ): JsonResponse {
        $empresaId = $request->query->get('empresaId');
        $page = $request->query->get('page');
        $perPage = $request->query->get('perPage');
        $activo = $request->query->get('activo');

        $qb = $repository->createQueryBuilder('t')->orderBy('t.nombre', 'ASC');

        if ($empresaId !== null) {
            if (!ctype_digit((string) $empresaId)) {
                return $this->json(['message' => 'El identificador de empresa debe ser numerico.'], Response::HTTP_BAD_REQUEST);
            }
            $empresa = $empresaRepository->find((int) $empresaId);
            if (!$empresa) {
                return $this->json(['message' => 'Empresa no encontrada.'], Response::HTTP_NOT_FOUND);
            }
            $qb->andWhere('t.empresa = :empresa')->setParameter('empresa', $empresa);
        }

        if ($activo !== null) {
            $qb->andWhere('t.activo = :activo')->setParameter('activo', filter_var($activo, FILTER_VALIDATE_BOOLEAN));
        }

        $countQb = clone $qb;

        $paginado = false;
        $pageNumber = 1;
        $perPageNumber = 0;
        $total = null;

        if ($page !== null) {
            $pageNumber = max(1, (int) $page);
            $perPageNumber = min(50, max(1, (int) ($perPage ?? 20)));
            $qb->setFirstResult(($pageNumber - 1) * $perPageNumber)->setMaxResults($perPageNumber);
            $total = (int) $countQb->select('COUNT(t.id)')->resetDQLPart('orderBy')->getQuery()->getSingleScalarResult();
            $paginado = true;
        }

        $tutores = $qb->getQuery()->getResult();

        $data = array_map(static function ($tutor): array {
            return [
                'id' => $tutor->getId(),
                'nombre' => $tutor->getNombre(),
                'email' => $tutor->getEmail(),
                'telefono' => $tutor->getTelefono(),
                'cargo' => $tutor->getCargo(),
                'certificaciones' => $tutor->getCertificaciones(),
                'activo' => $tutor->isActivo(),
                'empresa' => [
                    'id' => $tutor->getEmpresa()->getId(),
                    'nombre' => $tutor->getEmpresa()->getNombre(),
                ],
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
        EmpresaColaboradoraRepository $empresaRepository,
        EntityManagerInterface $entityManager,
        ValidatorInterface $validator,
        BootstrapSnapshotProvider $snapshotProvider,
    ): JsonResponse {
        $payload = json_decode($request->getContent(), true);
        if (!is_array($payload)) {
            return $this->json(['message' => 'JSON invalido.'], Response::HTTP_BAD_REQUEST);
        }

        $violations = $validator->validate($payload, new Assert\Collection(
            fields: [
                'empresaId' => [new Assert\NotBlank(), new Assert\Positive()],
                'nombre' => [new Assert\NotBlank(), new Assert\Length(max: 150)],
                'email' => new Assert\Optional([new Assert\Email(), new Assert\Length(max: 150)]),
                'telefono' => new Assert\Optional([new Assert\Length(max: 50)]),
                'cargo' => new Assert\Optional([new Assert\Length(max: 120)]),
                'certificaciones' => new Assert\Optional(),
                'activo' => new Assert\Optional([new Assert\Type('bool')]),
            ],
            allowExtraFields: true
        ));

        if ($violations->count() > 0) {
            return $this->json(['message' => 'No se pudieron validar los datos del tutor profesional.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $empresa = $empresaRepository->find((int) $payload['empresaId']);
        if (!$empresa) {
            return $this->json(['message' => 'Empresa no encontrada.'], Response::HTTP_NOT_FOUND);
        }

        $tutor = (new TutorProfesional())
            ->setEmpresa($empresa)
            ->setNombre(trim((string) $payload['nombre']))
            ->setEmail($this->normalizeOptionalString($payload['email'] ?? null))
            ->setTelefono($this->normalizeOptionalString($payload['telefono'] ?? null))
            ->setCargo($this->normalizeOptionalString($payload['cargo'] ?? null))
            ->setCertificaciones($this->normalizeOptionalString($payload['certificaciones'] ?? null))
            ->setActivo((bool) ($payload['activo'] ?? true));

        $entityManager->persist($tutor);
        $entityManager->flush();
        $snapshotProvider->invalidate();

        return $this->json($this->serializeTutor($tutor), Response::HTTP_CREATED);
    }

    #[Route('/{id<\d+>}', name: 'update', methods: ['PUT'])]
    #[IsGranted('ROLE_COORDINATOR')]
    public function update(
        ?TutorProfesional $tutor,
        Request $request,
        EmpresaColaboradoraRepository $empresaRepository,
        EntityManagerInterface $entityManager,
        ValidatorInterface $validator,
        BootstrapSnapshotProvider $snapshotProvider,
    ): JsonResponse {
        if (!$tutor) {
            return $this->json(['message' => 'Tutor profesional no encontrado.'], Response::HTTP_NOT_FOUND);
        }

        $payload = json_decode($request->getContent(), true);
        if (!is_array($payload)) {
            return $this->json(['message' => 'JSON invalido.'], Response::HTTP_BAD_REQUEST);
        }

        $violations = $validator->validate($payload, new Assert\Collection(
            fields: [
                'empresaId' => new Assert\Optional([new Assert\Positive()]),
                'nombre' => new Assert\Optional([new Assert\NotBlank(), new Assert\Length(max: 150)]),
                'email' => new Assert\Optional([new Assert\Email(), new Assert\Length(max: 150)]),
                'telefono' => new Assert\Optional([new Assert\Length(max: 50)]),
                'cargo' => new Assert\Optional([new Assert\Length(max: 120)]),
                'certificaciones' => new Assert\Optional(),
                'activo' => new Assert\Optional([new Assert\Type('bool')]),
            ],
            allowMissingFields: true,
            allowExtraFields: true
        ));

        if ($violations->count() > 0) {
            return $this->json(['message' => 'No se pudieron validar los datos del tutor profesional.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        if (array_key_exists('empresaId', $payload)) {
            $empresa = $empresaRepository->find((int) $payload['empresaId']);
            if (!$empresa) {
                return $this->json(['message' => 'Empresa no encontrada.'], Response::HTTP_NOT_FOUND);
            }
            $tutor->setEmpresa($empresa);
        }
        if (array_key_exists('nombre', $payload)) {
            $tutor->setNombre(trim((string) $payload['nombre']));
        }
        if (array_key_exists('email', $payload)) {
            $tutor->setEmail($this->normalizeOptionalString($payload['email']));
        }
        if (array_key_exists('telefono', $payload)) {
            $tutor->setTelefono($this->normalizeOptionalString($payload['telefono']));
        }
        if (array_key_exists('cargo', $payload)) {
            $tutor->setCargo($this->normalizeOptionalString($payload['cargo']));
        }
        if (array_key_exists('certificaciones', $payload)) {
            $tutor->setCertificaciones($this->normalizeOptionalString($payload['certificaciones']));
        }
        if (array_key_exists('activo', $payload)) {
            $tutor->setActivo((bool) $payload['activo']);
        }

        $entityManager->flush();
        $snapshotProvider->invalidate();

        return $this->json($this->serializeTutor($tutor), Response::HTTP_OK);
    }

    private function serializeTutor(TutorProfesional $tutor): array
    {
        return [
            'id' => $tutor->getId(),
            'nombre' => $tutor->getNombre(),
            'email' => $tutor->getEmail(),
            'telefono' => $tutor->getTelefono(),
            'cargo' => $tutor->getCargo(),
            'certificaciones' => $tutor->getCertificaciones(),
            'activo' => $tutor->isActivo(),
            'empresa' => [
                'id' => $tutor->getEmpresa()->getId(),
                'nombre' => $tutor->getEmpresa()->getNombre(),
            ],
        ];
    }

    private function normalizeOptionalString(mixed $value): ?string
    {
        $normalized = trim((string) ($value ?? ''));

        return $normalized !== '' ? $normalized : null;
    }
}

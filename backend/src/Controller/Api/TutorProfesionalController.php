<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Repository\EmpresaColaboradoraRepository;
use App\Repository\TutorProfesionalRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/tutores-profesionales', name: 'api_tutores_profesionales_')]
#[IsGranted('ROLE_API')]
final class TutorProfesionalController extends AbstractController
{
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

        $paginado = false;
        $pageNumber = 1;
        $perPageNumber = 0;
        $total = null;

        if ($page !== null) {
            $pageNumber = max(1, (int) $page);
            $perPageNumber = min(50, max(1, (int) ($perPage ?? 20)));
            $qb->setFirstResult(($pageNumber - 1) * $perPageNumber)->setMaxResults($perPageNumber);
            $total = (int) $repository->createQueryBuilder('t')->select('COUNT(t.id)')->getQuery()->getSingleScalarResult();
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
}

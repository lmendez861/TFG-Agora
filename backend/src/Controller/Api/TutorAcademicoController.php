<?php

namespace App\Controller\Api;

use App\Repository\TutorAcademicoRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/tutores-academicos', name: 'api_tutores_academicos_')]
#[IsGranted('ROLE_API')]
final class TutorAcademicoController extends AbstractController
{
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

        if ($page !== null) {
            $pageNumber = max(1, (int) $page);
            $perPageNumber = min(50, max(1, (int) ($perPage ?? 20)));
            $qb->setFirstResult(($pageNumber - 1) * $perPageNumber)->setMaxResults($perPageNumber);
            $total = (int) $repository->createQueryBuilder('t')->select('COUNT(t.id)')->getQuery()->getSingleScalarResult();
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
}

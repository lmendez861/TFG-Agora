<?php

namespace App\Controller\Api;

use App\Repository\TutorAcademicoRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/tutores-academicos', name: 'api_tutores_academicos_')]
#[IsGranted('ROLE_API')]
final class TutorAcademicoController extends AbstractController
{
    #[Route('', name: 'index', methods: ['GET'])]
    public function index(TutorAcademicoRepository $repository): JsonResponse
    {
        $tutores = $repository->findAll();

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

        return $this->json($data, Response::HTTP_OK);
    }
}

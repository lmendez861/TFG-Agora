<?php

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

        if ($empresaId !== null) {
            if (!ctype_digit((string) $empresaId)) {
                return $this->json([
                    'message' => 'El identificador de empresa debe ser numérico.',
                ], Response::HTTP_BAD_REQUEST);
            }

            $empresa = $empresaRepository->find((int) $empresaId);
            if (!$empresa) {
                return $this->json(['message' => 'Empresa no encontrada.'], Response::HTTP_NOT_FOUND);
            }

            $tutores = $repository->findBy(['empresa' => $empresa]);
        } else {
            $tutores = $repository->findAll();
        }

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

        return $this->json($data, Response::HTTP_OK);
    }
}

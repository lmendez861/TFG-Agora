<?php

namespace App\Controller\Api;

use App\Entity\Estudiante;
use App\Repository\EstudianteRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

#[Route('/api/estudiantes', name: 'api_estudiantes_')]
final class EstudianteController extends AbstractController
{
    #[Route('', name: 'index', methods: ['GET'])]
    public function index(EstudianteRepository $repository): JsonResponse
    {
        $estudiantes = $repository->findAll();

        $data = array_map(static function (Estudiante $estudiante): array {
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
        }, $estudiantes);

        return $this->json($data, Response::HTTP_OK);
    }

    #[Route('/{id<\d+>}', name: 'show', methods: ['GET'])]
    public function show(?Estudiante $estudiante): JsonResponse
    {
        if (!$estudiante) {
            return $this->json(['message' => 'Estudiante no encontrado'], Response::HTTP_NOT_FOUND);
        }

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

        $data = [
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

        return $this->json($data, Response::HTTP_OK);
    }
}

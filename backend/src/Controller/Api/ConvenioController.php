<?php

namespace App\Controller\Api;

use App\Entity\Convenio;
use App\Repository\ConvenioRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

#[Route('/api/convenios', name: 'api_convenios_')]
final class ConvenioController extends AbstractController
{
    #[Route('', name: 'index', methods: ['GET'])]
    public function index(ConvenioRepository $repository): JsonResponse
    {
        $convenios = $repository->findAll();

        $data = array_map(static function (Convenio $convenio): array {
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
        }, $convenios);

        return $this->json($data, Response::HTTP_OK);
    }

    #[Route('/{id<\d+>}', name: 'show', methods: ['GET'])]
    public function show(?Convenio $convenio): JsonResponse
    {
        if (!$convenio) {
            return $this->json(['message' => 'Convenio no encontrado'], Response::HTTP_NOT_FOUND);
        }

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

        $data = [
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

        return $this->json($data, Response::HTTP_OK);
    }
}

<?php

namespace App\Controller\Api;

use App\Entity\AsignacionPractica;
use App\Repository\AsignacionPracticaRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

#[Route('/api/asignaciones', name: 'api_asignaciones_')]
final class AsignacionController extends AbstractController
{
    #[Route('', name: 'index', methods: ['GET'])]
    public function index(AsignacionPracticaRepository $repository): JsonResponse
    {
        $asignaciones = $repository->findAll();

        $data = array_map(static function (AsignacionPractica $asignacion): array {
            return [
                'id' => $asignacion->getId(),
                'estado' => $asignacion->getEstado(),
                'modalidad' => $asignacion->getModalidad(),
                'horasTotales' => $asignacion->getHorasTotales(),
                'fechaInicio' => $asignacion->getFechaInicio()->format('Y-m-d'),
                'fechaFin' => $asignacion->getFechaFin()?->format('Y-m-d'),
                'empresa' => [
                    'id' => $asignacion->getEmpresa()->getId(),
                    'nombre' => $asignacion->getEmpresa()->getNombre(),
                ],
                'estudiante' => [
                    'id' => $asignacion->getEstudiante()->getId(),
                    'nombre' => $asignacion->getEstudiante()->getNombre(),
                    'apellido' => $asignacion->getEstudiante()->getApellido(),
                ],
            ];
        }, $asignaciones);

        return $this->json($data, Response::HTTP_OK);
    }

    #[Route('/{id<\d+>}', name: 'show', methods: ['GET'])]
    public function show(?AsignacionPractica $asignacion): JsonResponse
    {
        if (!$asignacion) {
            return $this->json(['message' => 'Asignación no encontrada'], Response::HTTP_NOT_FOUND);
        }

        $seguimientos = array_map(static function ($seguimiento): array {
            return [
                'id' => $seguimiento->getId(),
                'fecha' => $seguimiento->getFecha()->format('Y-m-d'),
                'tipo' => $seguimiento->getTipo(),
                'descripcion' => $seguimiento->getDescripcion(),
                'accionRequerida' => $seguimiento->getAccionRequerida(),
                'documentoUrl' => $seguimiento->getDocumentoUrl(),
            ];
        }, $asignacion->getSeguimientos()->toArray());

        $evaluacion = $asignacion->getEvaluacionFinal();

        $data = [
            'id' => $asignacion->getId(),
            'estado' => $asignacion->getEstado(),
            'modalidad' => $asignacion->getModalidad(),
            'horasTotales' => $asignacion->getHorasTotales(),
            'fechaInicio' => $asignacion->getFechaInicio()->format('Y-m-d'),
            'fechaFin' => $asignacion->getFechaFin()?->format('Y-m-d'),
            'empresa' => [
                'id' => $asignacion->getEmpresa()->getId(),
                'nombre' => $asignacion->getEmpresa()->getNombre(),
            ],
            'convenio' => [
                'id' => $asignacion->getConvenio()->getId(),
                'titulo' => $asignacion->getConvenio()->getTitulo(),
            ],
            'estudiante' => [
                'id' => $asignacion->getEstudiante()->getId(),
                'nombre' => $asignacion->getEstudiante()->getNombre(),
                'apellido' => $asignacion->getEstudiante()->getApellido(),
                'email' => $asignacion->getEstudiante()->getEmail(),
            ],
            'tutorAcademico' => [
                'id' => $asignacion->getTutorAcademico()->getId(),
                'nombre' => $asignacion->getTutorAcademico()->getNombre(),
                'apellido' => $asignacion->getTutorAcademico()->getApellido(),
                'email' => $asignacion->getTutorAcademico()->getEmail(),
            ],
            'tutorProfesional' => $asignacion->getTutorProfesional() ? [
                'id' => $asignacion->getTutorProfesional()->getId(),
                'nombre' => $asignacion->getTutorProfesional()->getNombre(),
                'email' => $asignacion->getTutorProfesional()->getEmail(),
            ] : null,
            'seguimientos' => $seguimientos,
            'evaluacionFinal' => $evaluacion ? [
                'id' => $evaluacion->getId(),
                'fecha' => $evaluacion->getFecha()->format('Y-m-d'),
                'valoracionEmpresa' => $evaluacion->getValoracionEmpresa(),
                'valoracionEstudiante' => $evaluacion->getValoracionEstudiante(),
                'valoracionTutorAcademico' => $evaluacion->getValoracionTutorAcademico(),
                'conclusiones' => $evaluacion->getConclusiones(),
            ] : null,
        ];

        return $this->json($data, Response::HTTP_OK);
    }
}

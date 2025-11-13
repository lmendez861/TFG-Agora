<?php

namespace App\Controller\Api;

use App\Entity\EmpresaColaboradora;
use App\Repository\EmpresaColaboradoraRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

#[Route('/api/empresas', name: 'api_empresas_')]
final class EmpresaColaboradoraController extends AbstractController
{
    #[Route('', name: 'index', methods: ['GET'])]
    public function index(EmpresaColaboradoraRepository $repository): JsonResponse
    {
        $empresas = $repository->findAll();

        $data = array_map(static function (EmpresaColaboradora $empresa): array {
            $asignaciones = $empresa->getAsignaciones();

            return [
                'id' => $empresa->getId(),
                'nombre' => $empresa->getNombre(),
                'sector' => $empresa->getSector(),
                'ciudad' => $empresa->getCiudad(),
                'estadoColaboracion' => $empresa->getEstadoColaboracion(),
                'conveniosActivos' => $empresa->getConvenios()->count(),
                'tutoresProfesionales' => $empresa->getTutoresProfesionales()->count(),
                'contactos' => $empresa->getContactos()->count(),
                'asignaciones' => [
                    'total' => $asignaciones->count(),
                    'enCurso' => $asignaciones->filter(static fn ($a) => $a->getEstado() === 'en_curso')->count(),
                ],
            ];
        }, $empresas);

        return $this->json($data, Response::HTTP_OK);
    }

    #[Route('/{id<\d+>}', name: 'show', methods: ['GET'])]
    public function show(?EmpresaColaboradora $empresa): JsonResponse
    {
        if (!$empresa) {
            return $this->json(['message' => 'Empresa no encontrada'], Response::HTTP_NOT_FOUND);
        }

        $asignaciones = $empresa->getAsignaciones();
        $conteoPorEstado = [];
        foreach ($asignaciones as $asignacion) {
            $estado = $asignacion->getEstado();
            $conteoPorEstado[$estado] = ($conteoPorEstado[$estado] ?? 0) + 1;
        }

        $contactos = array_map(static function ($contacto): array {
            return [
                'id' => $contacto->getId(),
                'nombre' => $contacto->getNombre(),
                'cargo' => $contacto->getCargo(),
                'telefono' => $contacto->getTelefono(),
                'email' => $contacto->getEmail(),
                'esTutorProfesional' => $contacto->isTutorProfesional(),
            ];
        }, $empresa->getContactos()->toArray());

        $tutores = array_map(static function ($tutor): array {
            return [
                'id' => $tutor->getId(),
                'nombre' => $tutor->getNombre(),
                'email' => $tutor->getEmail(),
                'telefono' => $tutor->getTelefono(),
                'cargo' => $tutor->getCargo(),
                'activo' => $tutor->isActivo(),
            ];
        }, $empresa->getTutoresProfesionales()->toArray());

        $convenios = array_map(static function ($convenio): array {
            return [
                'id' => $convenio->getId(),
                'titulo' => $convenio->getTitulo(),
                'estado' => $convenio->getEstado(),
                'tipo' => $convenio->getTipo(),
                'fechaInicio' => $convenio->getFechaInicio()->format('Y-m-d'),
                'fechaFin' => $convenio->getFechaFin()?->format('Y-m-d'),
            ];
        }, $empresa->getConvenios()->toArray());

        $data = [
            'id' => $empresa->getId(),
            'nombre' => $empresa->getNombre(),
            'sector' => $empresa->getSector(),
            'direccion' => $empresa->getDireccion(),
            'ciudad' => $empresa->getCiudad(),
            'provincia' => $empresa->getProvincia(),
            'pais' => $empresa->getPais(),
            'telefono' => $empresa->getTelefono(),
            'email' => $empresa->getEmail(),
            'web' => $empresa->getWeb(),
            'estadoColaboracion' => $empresa->getEstadoColaboracion(),
            'fechaAlta' => $empresa->getFechaAlta()->format('Y-m-d'),
            'observaciones' => $empresa->getObservaciones(),
            'contactos' => $contactos,
            'tutoresProfesionales' => $tutores,
            'convenios' => $convenios,
            'resumenAsignaciones' => [
                'total' => $asignaciones->count(),
                'porEstado' => $conteoPorEstado,
            ],
        ];

        return $this->json($data, Response::HTTP_OK);
    }
}

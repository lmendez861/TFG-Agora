<?php

namespace App\Controller\Api;

use App\Entity\EmpresaColaboradora;
use App\Repository\EmpresaColaboradoraRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Symfony\Component\Validator\Constraints as Assert;
use Symfony\Component\Validator\Validator\ValidatorInterface;

#[Route('/api/empresas', name: 'api_empresas_')]
#[IsGranted('ROLE_API')]
final class EmpresaColaboradoraController extends AbstractController
{
    use JsonRequestTrait;

    #[Route('', name: 'index', methods: ['GET'])]
    public function index(EmpresaColaboradoraRepository $repository): JsonResponse
    {
        $empresas = $repository->findAll();

        $data = array_map(fn (EmpresaColaboradora $empresa): array => $this->serializeSummary($empresa), $empresas);

        return $this->json($data, Response::HTTP_OK);
    }

    #[Route('', name: 'create', methods: ['POST'])]
    public function create(
        Request $request,
        EntityManagerInterface $entityManager,
        ValidatorInterface $validator
    ): JsonResponse {
        $payload = $this->decodePayload($request);
        if ($payload instanceof JsonResponse) {
            return $payload;
        }

        $constraints = new Assert\Collection(
            fields: [
                'nombre' => [new Assert\NotBlank(), new Assert\Length(max: 150)],
                'sector' => new Assert\Optional([new Assert\Length(max: 120)]),
                'direccion' => new Assert\Optional([new Assert\Length(max: 255)]),
                'ciudad' => new Assert\Optional([new Assert\Length(max: 100)]),
                'provincia' => new Assert\Optional([new Assert\Length(max: 100)]),
                'pais' => new Assert\Optional([new Assert\Length(max: 100)]),
                'telefono' => new Assert\Optional([new Assert\Length(max: 50)]),
                'email' => new Assert\Optional([new Assert\Email(), new Assert\Length(max: 150)]),
                'web' => new Assert\Optional([new Assert\Length(max: 150)]),
                'estadoColaboracion' => new Assert\Optional([new Assert\Length(max: 30)]),
                'fechaAlta' => new Assert\Optional([new Assert\Length(min: 10, max: 10)]),
                'observaciones' => new Assert\Optional(),
            ],
            allowExtraFields: true
        );

        $violations = $validator->validate($payload, $constraints);
        if ($violations->count() > 0) {
            return $this->validationErrorResponse($violations);
        }

        $empresa = new EmpresaColaboradora();
        $empresa->setNombre($payload['nombre']);

        if (isset($payload['sector'])) {
            $empresa->setSector($payload['sector']);
        }
        if (array_key_exists('direccion', $payload)) {
            $empresa->setDireccion($payload['direccion']);
        }
        if (array_key_exists('ciudad', $payload)) {
            $empresa->setCiudad($payload['ciudad']);
        }
        if (array_key_exists('provincia', $payload)) {
            $empresa->setProvincia($payload['provincia']);
        }
        if (array_key_exists('pais', $payload)) {
            $empresa->setPais($payload['pais']);
        }
        if (array_key_exists('telefono', $payload)) {
            $empresa->setTelefono($payload['telefono']);
        }
        if (array_key_exists('email', $payload)) {
            $empresa->setEmail($payload['email']);
        }
        if (array_key_exists('web', $payload)) {
            $empresa->setWeb($payload['web']);
        }
        if (array_key_exists('estadoColaboracion', $payload)) {
            $empresa->setEstadoColaboracion($payload['estadoColaboracion']);
        }
        if (array_key_exists('observaciones', $payload)) {
            $empresa->setObservaciones($payload['observaciones']);
        }

        if (isset($payload['fechaAlta'])) {
            $fechaAlta = $this->parseDate($payload['fechaAlta'], 'fechaAlta');
            if ($fechaAlta instanceof JsonResponse) {
                return $fechaAlta;
            }
            $empresa->setFechaAlta($fechaAlta);
        }

        $entityManager->persist($empresa);
        $entityManager->flush();

        return $this->json($this->serializeDetail($empresa), Response::HTTP_CREATED);
    }

    #[Route('/{id<\\d+>}', name: 'show', methods: ['GET'])]
    public function show(?EmpresaColaboradora $empresa): JsonResponse
    {
        if (!$empresa) {
            return $this->json(['message' => 'Empresa no encontrada'], Response::HTTP_NOT_FOUND);
        }

        return $this->json($this->serializeDetail($empresa), Response::HTTP_OK);
    }

    #[Route('/{id<\\d+>}', name: 'update', methods: ['PUT'])]
    public function update(
        ?EmpresaColaboradora $empresa,
        Request $request,
        EntityManagerInterface $entityManager,
        ValidatorInterface $validator
    ): JsonResponse {
        if (!$empresa) {
            return $this->json(['message' => 'Empresa no encontrada'], Response::HTTP_NOT_FOUND);
        }

        $payload = $this->decodePayload($request);
        if ($payload instanceof JsonResponse) {
            return $payload;
        }

        $constraints = new Assert\Collection(
            fields: [
                'nombre' => new Assert\Optional([new Assert\NotBlank(), new Assert\Length(max: 150)]),
                'sector' => new Assert\Optional([new Assert\Length(max: 120)]),
                'direccion' => new Assert\Optional([new Assert\Length(max: 255)]),
                'ciudad' => new Assert\Optional([new Assert\Length(max: 100)]),
                'provincia' => new Assert\Optional([new Assert\Length(max: 100)]),
                'pais' => new Assert\Optional([new Assert\Length(max: 100)]),
                'telefono' => new Assert\Optional([new Assert\Length(max: 50)]),
                'email' => new Assert\Optional([new Assert\Email(), new Assert\Length(max: 150)]),
                'web' => new Assert\Optional([new Assert\Length(max: 150)]),
                'estadoColaboracion' => new Assert\Optional([new Assert\Length(max: 30)]),
                'fechaAlta' => new Assert\Optional([new Assert\Length(min: 10, max: 10)]),
                'observaciones' => new Assert\Optional(),
            ],
            allowMissingFields: true,
            allowExtraFields: true
        );

        $violations = $validator->validate($payload, $constraints);
        if ($violations->count() > 0) {
            return $this->validationErrorResponse($violations);
        }

        if (array_key_exists('nombre', $payload)) {
            $empresa->setNombre($payload['nombre']);
        }
        if (array_key_exists('sector', $payload)) {
            $empresa->setSector($payload['sector']);
        }
        if (array_key_exists('direccion', $payload)) {
            $empresa->setDireccion($payload['direccion']);
        }
        if (array_key_exists('ciudad', $payload)) {
            $empresa->setCiudad($payload['ciudad']);
        }
        if (array_key_exists('provincia', $payload)) {
            $empresa->setProvincia($payload['provincia']);
        }
        if (array_key_exists('pais', $payload)) {
            $empresa->setPais($payload['pais']);
        }
        if (array_key_exists('telefono', $payload)) {
            $empresa->setTelefono($payload['telefono']);
        }
        if (array_key_exists('email', $payload)) {
            $empresa->setEmail($payload['email']);
        }
        if (array_key_exists('web', $payload)) {
            $empresa->setWeb($payload['web']);
        }
        if (array_key_exists('estadoColaboracion', $payload)) {
            $empresa->setEstadoColaboracion($payload['estadoColaboracion']);
        }
        if (array_key_exists('observaciones', $payload)) {
            $empresa->setObservaciones($payload['observaciones']);
        }
        if (array_key_exists('fechaAlta', $payload)) {
            $fechaAlta = $this->parseDate($payload['fechaAlta'], 'fechaAlta');
            if ($fechaAlta instanceof JsonResponse) {
                return $fechaAlta;
            }
            $empresa->setFechaAlta($fechaAlta);
        }

        $entityManager->flush();

        return $this->json($this->serializeDetail($empresa), Response::HTTP_OK);
    }

    private function serializeSummary(EmpresaColaboradora $empresa): array
    {
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
    }

    private function serializeDetail(EmpresaColaboradora $empresa): array
    {
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

        return [
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
    }
}

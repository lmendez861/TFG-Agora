<?php

namespace App\Controller\Api;

use App\Entity\ContactoEmpresa;
use App\Entity\EmpresaColaboradora;
use App\Entity\EmpresaSolicitud;
use App\Repository\EmpresaSolicitudRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Symfony\Component\Validator\Constraints as Assert;
use Symfony\Component\Validator\Validator\ValidatorInterface;

#[Route('/api/empresa-solicitudes', name: 'api_empresa_solicitudes_')]
#[IsGranted('ROLE_API')]
final class EmpresaSolicitudController extends AbstractController
{
    use JsonRequestTrait;

    public function __construct(
        private readonly EmpresaSolicitudRepository $repository,
        private readonly EntityManagerInterface $entityManager,
        private readonly ValidatorInterface $validator,
    ) {
    }

    #[Route('', name: 'index', methods: ['GET'])]
    public function index(Request $request): JsonResponse
    {
        $estado = $request->query->get('estado');
        $page = max(1, (int) $request->query->get('page', 1));
        $perPage = min(50, max(1, (int) $request->query->get('perPage', 20)));
        $offset = ($page - 1) * $perPage;

        $criteria = [];
        if ($estado) {
            $criteria['estado'] = $estado;
        }

        $solicitudes = $this->repository->findBy($criteria, ['createdAt' => 'DESC'], $perPage, $offset);
        $data = array_map(fn (EmpresaSolicitud $solicitud): array => $this->serializeSolicitud($solicitud), $solicitudes);

        return $this->json([
            'items' => $data,
            'page' => $page,
            'perPage' => $perPage,
        ], Response::HTTP_OK);
    }

    #[Route('/{id<\d+>}/aprobar', name: 'approve', methods: ['POST'])]
    public function approve(?EmpresaSolicitud $solicitud): JsonResponse
    {
        if (!$solicitud) {
            return $this->json(['message' => 'Solicitud no encontrada.'], Response::HTTP_NOT_FOUND);
        }

        if ($solicitud->getEstado() === EmpresaSolicitud::ESTADO_APROBADA) {
            return $this->json(['message' => 'La solicitud ya fue aprobada.'], Response::HTTP_CONFLICT);
        }

        $observaciones = sprintf('Alta generada a partir de la solicitud #%d.', $solicitud->getId());
        if ($solicitud->getDescripcion()) {
            $observaciones .= PHP_EOL . $solicitud->getDescripcion();
        }

        $empresa = (new EmpresaColaboradora())
            ->setNombre($solicitud->getNombreEmpresa())
            ->setSector($solicitud->getSector())
            ->setCiudad($solicitud->getCiudad())
            ->setEmail($solicitud->getContactoEmail())
            ->setTelefono($solicitud->getContactoTelefono())
            ->setWeb($solicitud->getWeb())
            ->setObservaciones($observaciones)
            ->setEstadoColaboracion('pendiente');

        $contacto = (new ContactoEmpresa())
            ->setEmpresa($empresa)
            ->setNombre($solicitud->getContactoNombre())
            ->setEmail($solicitud->getContactoEmail())
            ->setTelefono($solicitud->getContactoTelefono())
            ->setCargo('Contacto de registro')
            ->setEsTutorProfesional(false);

        $empresa->addContacto($contacto);

        $this->entityManager->persist($empresa);
        $solicitud->markApproved();
        $this->entityManager->flush();

        return $this->json([
            'message' => 'Solicitud aprobada y empresa dada de alta correctamente.',
            'empresa' => [
                'id' => $empresa->getId(),
                'nombre' => $empresa->getNombre(),
            ],
        ], Response::HTTP_CREATED);
    }

    #[Route('/{id<\d+>}/rechazar', name: 'reject', methods: ['POST'])]
    public function reject(?EmpresaSolicitud $solicitud, Request $request): JsonResponse
    {
        if (!$solicitud) {
            return $this->json(['message' => 'Solicitud no encontrada.'], Response::HTTP_NOT_FOUND);
        }

        $payload = $this->decodePayload($request);
        if ($payload instanceof JsonResponse) {
            return $payload;
        }

        $constraints = new Assert\Collection(
            fields: [
                'motivo' => [new Assert\NotBlank()],
            ],
            allowExtraFields: false
        );

        $violations = $this->validator->validate($payload, $constraints);
        if ($violations->count() > 0) {
            return $this->validationErrorResponse($violations);
        }

        $solicitud->reject($payload['motivo']);
        $this->entityManager->flush();

        return $this->json([
            'message' => 'Solicitud rechazada.',
        ], Response::HTTP_OK);
    }

    private function serializeSolicitud(EmpresaSolicitud $solicitud): array
    {
        return [
            'id' => $solicitud->getId(),
            'nombreEmpresa' => $solicitud->getNombreEmpresa(),
            'cif' => $solicitud->getCif(),
            'sector' => $solicitud->getSector(),
            'ciudad' => $solicitud->getCiudad(),
            'web' => $solicitud->getWeb(),
            'contacto' => [
                'nombre' => $solicitud->getContactoNombre(),
                'email' => $solicitud->getContactoEmail(),
                'telefono' => $solicitud->getContactoTelefono(),
            ],
            'estado' => $solicitud->getEstado(),
            'creadaEn' => $solicitud->getCreatedAt()->format(\DateTimeInterface::ATOM),
            'emailVerificadoEn' => $solicitud->getEmailVerificadoEn()?->format(\DateTimeInterface::ATOM),
            'aprobadoEn' => $solicitud->getAprobadoEn()?->format(\DateTimeInterface::ATOM),
            'motivoRechazo' => $solicitud->getRejectionReason(),
        ];
    }
}

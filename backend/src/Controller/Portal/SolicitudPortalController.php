<?php

declare(strict_types=1);

namespace App\Controller\Portal;

use App\Entity\EmpresaMensaje;
use App\Repository\EmpresaMensajeRepository;
use App\Repository\EmpresaSolicitudRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Validator\Constraints as Assert;
use Symfony\Component\Validator\Validator\ValidatorInterface;

#[Route('/portal/solicitudes', name: 'portal_solicitudes_')]
final class SolicitudPortalController extends AbstractController
{
    public function __construct(
        private readonly EmpresaSolicitudRepository $solicitudRepository,
        private readonly EmpresaMensajeRepository $mensajeRepository,
        private readonly EntityManagerInterface $entityManager,
        private readonly ValidatorInterface $validator,
    ) {
    }

    #[Route('/{token}', name: 'show', methods: ['GET'])]
    public function show(string $token): JsonResponse
    {
        $solicitud = $this->solicitudRepository->findOneBy(['portalToken' => $token]);
        if (!$solicitud) {
            return $this->json(['message' => 'Token no valido'], Response::HTTP_NOT_FOUND);
        }

        return $this->json([
            'id' => $solicitud->getId(),
            'nombreEmpresa' => $solicitud->getNombreEmpresa(),
            'estado' => $solicitud->getEstado(),
            'sector' => $solicitud->getSector(),
            'ciudad' => $solicitud->getCiudad(),
            'web' => $solicitud->getWeb(),
            'creadaEn' => $solicitud->getCreatedAt()->format(\DateTimeInterface::ATOM),
            'emailVerificadoEn' => $solicitud->getEmailVerificadoEn()?->format(\DateTimeInterface::ATOM),
            'aprobadoEn' => $solicitud->getAprobadoEn()?->format(\DateTimeInterface::ATOM),
        ]);
    }

    #[Route('/{token}/mensajes', name: 'mensajes_index', methods: ['GET'])]
    public function mensajes(string $token): JsonResponse
    {
        $solicitud = $this->solicitudRepository->findOneBy(['portalToken' => $token]);
        if (!$solicitud) {
            return $this->json(['message' => 'Token no valido'], Response::HTTP_NOT_FOUND);
        }

        $mensajes = $this->mensajeRepository->findBy(['solicitud' => $solicitud], ['createdAt' => 'ASC']);
        $data = array_map(static function (EmpresaMensaje $mensaje) {
            return [
                'id' => $mensaje->getId(),
                'autor' => $mensaje->getAutor(),
                'texto' => $mensaje->getTexto(),
                'createdAt' => $mensaje->getCreatedAt()->format(\DateTimeInterface::ATOM),
            ];
        }, $mensajes);

        return $this->json($data);
    }

    #[Route('/{token}/mensajes', name: 'mensajes_create', methods: ['POST'])]
    public function createMensaje(string $token, Request $request): JsonResponse
    {
        $solicitud = $this->solicitudRepository->findOneBy(['portalToken' => $token]);
        if (!$solicitud) {
            return $this->json(['message' => 'Token no valido'], Response::HTTP_NOT_FOUND);
        }

        $payload = json_decode($request->getContent(), true);
        if (!is_array($payload)) {
            return $this->json(['message' => 'JSON invalido'], Response::HTTP_BAD_REQUEST);
        }

        $constraints = new Assert\Collection(
            fields: [
                'texto' => [new Assert\NotBlank(), new Assert\Length(max: 2000)],
            ],
            allowExtraFields: false
        );
        $violations = $this->validator->validate($payload, $constraints);
        if ($violations->count() > 0) {
            return $this->json(['message' => 'Payload invalido'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $mensaje = (new EmpresaMensaje())
            ->setSolicitud($solicitud)
            ->setAutor('empresa')
            ->setTexto($payload['texto']);

        $this->entityManager->persist($mensaje);
        $this->entityManager->flush();

        return $this->json([
            'id' => $mensaje->getId(),
            'autor' => $mensaje->getAutor(),
            'texto' => $mensaje->getTexto(),
            'createdAt' => $mensaje->getCreatedAt()->format(\DateTimeInterface::ATOM),
        ], Response::HTTP_CREATED);
    }
}

<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Entity\EmpresaMensaje;
use App\Entity\EmpresaSolicitud;
use App\Repository\EmpresaMensajeRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Symfony\Component\Validator\Constraints as Assert;
use Symfony\Component\Validator\Validator\ValidatorInterface;

#[Route('/api/empresa-solicitudes/{id<\d+>}/mensajes', name: 'api_empresa_mensajes_')]
#[IsGranted('ROLE_API')]
final class EmpresaMensajeController extends AbstractController
{
    public function __construct(
        private readonly EmpresaMensajeRepository $repository,
        private readonly EntityManagerInterface $entityManager,
        private readonly ValidatorInterface $validator,
    ) {
    }

    #[Route('', name: 'index', methods: ['GET'])]
    public function index(?EmpresaSolicitud $solicitud): JsonResponse
    {
        if (!$solicitud) {
            return $this->json(['message' => 'Solicitud no encontrada.'], Response::HTTP_NOT_FOUND);
        }

        $mensajes = $this->repository->findBy(['solicitud' => $solicitud], ['createdAt' => 'ASC']);

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

    #[Route('', name: 'create', methods: ['POST'])]
    public function create(?EmpresaSolicitud $solicitud, Request $request): JsonResponse
    {
        if (!$solicitud) {
            return $this->json(['message' => 'Solicitud no encontrada.'], Response::HTTP_NOT_FOUND);
        }

        $payload = json_decode($request->getContent(), true);
        if (!is_array($payload)) {
            return $this->json(['message' => 'JSON invalido'], Response::HTTP_BAD_REQUEST);
        }

        $constraints = new Assert\Collection(
            fields: [
                'autor' => [new Assert\Choice(['empresa', 'centro'])],
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
            ->setAutor($payload['autor'])
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

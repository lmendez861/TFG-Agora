<?php

namespace App\Controller;

use App\Controller\Api\JsonRequestTrait;
use App\Entity\EmpresaSolicitud;
use App\Repository\EmpresaSolicitudRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Address;
use Symfony\Component\Mime\Email;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Routing\Generator\UrlGeneratorInterface;
use Symfony\Component\Validator\Constraints as Assert;
use Symfony\Component\Validator\Validator\ValidatorInterface;

#[Route('/registro-empresa', name: 'registro_empresa_')]
final class RegistroEmpresaController extends AbstractController
{
    use JsonRequestTrait;

    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly MailerInterface $mailer,
        private readonly ValidatorInterface $validator,
        private readonly EmpresaSolicitudRepository $solicitudRepository,
        private readonly UrlGeneratorInterface $urlGenerator,
        private readonly string $fromAddress,
    ) {
    }

    #[Route('', name: 'create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $payload = $this->decodePayload($request);
        if ($payload instanceof JsonResponse) {
            return $payload;
        }

        $constraints = new Assert\Collection(
            fields: [
                'nombreEmpresa' => [new Assert\NotBlank(), new Assert\Length(max: 150)],
                'cif' => new Assert\Optional([new Assert\Length(max: 32)]),
                'sector' => new Assert\Optional([new Assert\Length(max: 120)]),
                'ciudad' => new Assert\Optional([new Assert\Length(max: 100)]),
                'web' => new Assert\Optional([new Assert\Url(requireTld: false)]),
                'descripcion' => new Assert\Optional(),
                'contactoNombre' => [new Assert\NotBlank(), new Assert\Length(max: 150)],
                'contactoEmail' => [new Assert\NotBlank(), new Assert\Email()],
                'contactoTelefono' => new Assert\Optional([new Assert\Length(max: 50)]),
            ],
            allowExtraFields: false
        );

        $violations = $this->validator->validate($payload, $constraints);
        if ($violations->count() > 0) {
            return $this->validationErrorResponse($violations);
        }

        $solicitud = (new EmpresaSolicitud())
            ->setNombreEmpresa($payload['nombreEmpresa'])
            ->setCif($payload['cif'] ?? null)
            ->setSector($payload['sector'] ?? null)
            ->setCiudad($payload['ciudad'] ?? null)
            ->setWeb($payload['web'] ?? null)
            ->setDescripcion($payload['descripcion'] ?? null)
            ->setContactoNombre($payload['contactoNombre'])
            ->setContactoEmail($payload['contactoEmail'])
            ->setContactoTelefono($payload['contactoTelefono'] ?? null);

        $this->entityManager->persist($solicitud);
        $this->entityManager->flush();

        $verificationUrl = $this->urlGenerator->generate(
            'registro_empresa_confirm',
            ['token' => $solicitud->getToken()],
            UrlGeneratorInterface::ABSOLUTE_URL
        );

        $email = (new Email())
            ->from(Address::create($this->fromAddress))
            ->to($solicitud->getContactoEmail())
            ->subject('Confirma tu registro de empresa colaboradora')
            ->html(sprintf(
                <<<HTML
<p>Hola %s,</p>
<p>Hemos recibido tu solicitud para colaborar con nuestro centro educativo. Por favor confirma tu correo pulsando en el siguiente enlace:</p>
<p><a href="%s">%s</a></p>
<p>En cuanto verifiquemos los datos, el equipo de prácticas revisará la información para darte de alta.</p>
HTML,
                htmlspecialchars($solicitud->getContactoNombre(), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'),
                $verificationUrl,
                $verificationUrl
            ));

        $this->mailer->send($email);

        return $this->json([
            'message' => 'Solicitud registrada correctamente. Por favor revisa tu email para confirmar la dirección.',
        ], Response::HTTP_CREATED);
    }

    #[Route('/confirmar', name: 'confirm', methods: ['GET'])]
    public function confirm(Request $request): JsonResponse
    {
        $token = (string) $request->query->get('token');
        if ($token === '') {
            return $this->json([
                'message' => 'El token de verificación es obligatorio.',
            ], Response::HTTP_BAD_REQUEST);
        }

        $solicitud = $this->solicitudRepository->findOneBy(['token' => $token]);
        if (!$solicitud) {
            return $this->json([
                'message' => 'No encontramos ninguna solicitud asociada a este token.',
            ], Response::HTTP_NOT_FOUND);
        }

        if ($solicitud->isEmailVerified()) {
            return $this->json([
                'message' => 'La dirección ya había sido verificada previamente.',
            ], Response::HTTP_OK);
        }

        $solicitud->markEmailVerified();
        $this->entityManager->flush();

        return $this->json([
            'message' => '¡Gracias! Hemos confirmado tu correo y el equipo revisará la solicitud.',
        ], Response::HTTP_OK);
    }
}

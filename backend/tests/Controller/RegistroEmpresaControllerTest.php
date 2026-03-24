<?php

declare(strict_types=1);

namespace App\Tests\Controller;

use App\Entity\EmpresaSolicitud;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Doctrine\ORM\EntityManagerInterface;
use App\Repository\EmpresaSolicitudRepository;

final class RegistroEmpresaControllerTest extends WebTestCase
{
    public function testCreateRegistersSolicitudAndQueuesVerificationEmail(): void
    {
        $client = static::createClient();

        $client->request(
            'POST',
            '/registro-empresa',
            server: ['CONTENT_TYPE' => 'application/json'],
            content: json_encode([
                'nombreEmpresa' => 'Correo Real SL',
                'sector' => 'Tecnologia educativa',
                'ciudad' => 'Madrid',
                'web' => 'https://correo-real.example',
                'descripcion' => 'Solicitud de colaboracion para practicas duales.',
                'contactoNombre' => 'Laura Correo',
                'contactoEmail' => 'laura.correo@example.com',
                'contactoTelefono' => '600111222',
            ], JSON_THROW_ON_ERROR)
        );

        self::assertResponseStatusCodeSame(201);

        $payload = json_decode($client->getResponse()->getContent() ?: '{}', true);
        self::assertIsArray($payload);
        self::assertArrayHasKey('portalToken', $payload);
        self::assertArrayHasKey('verificationUrl', $payload);
        self::assertArrayHasKey('portalUrl', $payload);
        self::assertStringContainsString('/registro-empresa/confirmar?token=', $payload['verificationUrl']);
        self::assertStringContainsString('/portal/solicitudes/', $payload['portalUrl']);

        /** @var EmpresaSolicitudRepository $repository */
        $repository = static::getContainer()->get(EmpresaSolicitudRepository::class);
        $solicitud = $repository->findOneBy(['contactoEmail' => 'laura.correo@example.com']);

        self::assertInstanceOf(EmpresaSolicitud::class, $solicitud);
        self::assertSame('Correo Real SL', $solicitud->getNombreEmpresa());
        self::assertNotEmpty($solicitud->getToken());
        self::assertSame($solicitud->getPortalToken(), $payload['portalToken']);
    }

    public function testConfirmReturnsJsonForValidToken(): void
    {
        $client = static::createClient();
        /** @var EntityManagerInterface $em */
        $em = static::getContainer()->get('doctrine')->getManager();

        $solicitud = (new EmpresaSolicitud())
            ->setNombreEmpresa('Test Co')
            ->setContactoNombre('Contacto')
            ->setContactoEmail('test@example.com');
        $em->persist($solicitud);
        $em->flush();

        $token = $solicitud->getToken();

        $client->request('GET', '/registro-empresa/confirmar', ['token' => $token], server: [
            'HTTP_ACCEPT' => 'application/json',
        ]);

        self::assertResponseIsSuccessful();
        $payload = json_decode($client->getResponse()->getContent() ?: '{}', true);
        self::assertIsArray($payload);
        self::assertArrayHasKey('message', $payload);
    }

    public function testConfirmWithInvalidTokenReturnsNotFoundJson(): void
    {
        $client = static::createClient();
        $client->request('GET', '/registro-empresa/confirmar', ['token' => 'invalid-token'], server: [
            'HTTP_ACCEPT' => 'application/json',
        ]);

        self::assertResponseStatusCodeSame(404);
        $payload = json_decode($client->getResponse()->getContent() ?: '{}', true);
        self::assertArrayHasKey('message', $payload);
    }

    public function testConfirmWithoutTokenReturnsBadRequestJson(): void
    {
        $client = static::createClient();
        $client->request('GET', '/registro-empresa/confirmar', server: [
            'HTTP_ACCEPT' => 'application/json',
        ]);

        self::assertResponseStatusCodeSame(400);
        $payload = json_decode($client->getResponse()->getContent() ?: '{}', true);
        self::assertArrayHasKey('message', $payload);
    }
}

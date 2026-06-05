<?php

/**
 * Comentario de mantenimiento Agora.
 * Proposito: Controlador Symfony: conecta rutas HTTP con servicios de dominio y plantillas/respuestas.
 * Relaciones: Conecta con App/Entity/EmpresaSolicitud, App/Repository/EmpresaSolicitudRepository.
 */

declare(strict_types=1);

namespace App\Tests\Controller;

use App\Entity\EmpresaSolicitud;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Doctrine\ORM\EntityManagerInterface;
use App\Repository\EmpresaSolicitudRepository;

/**
 * Controlador Symfony: conecta rutas HTTP con servicios de dominio y plantillas/respuestas.
 * Punto de enlace: sus dependencias importadas muestran con que servicios, repositorios o entidades colabora.
 */
final class RegistroEmpresaControllerTest extends WebTestCase
{
    /**
     * Endpoint/controlador que valida la entrada, coordina dependencias y devuelve una respuesta HTTP.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function testCreateRegistersSolicitudAndQueuesVerificationEmail(): void
    {
        $client = static::createClient();

        $client->request(
            'POST',
            '/registro-empresa',
            server: [
                'CONTENT_TYPE' => 'application/json',
                'REMOTE_ADDR' => '198.51.100.80',
            ],
            content: json_encode([
                'nombreEmpresa' => 'Correo Real SL',
                'cif' => 'B11223344',
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
        self::assertSame('sent', $payload['emailDelivery']);

        /** @var EmpresaSolicitudRepository $repository */
        $repository = static::getContainer()->get(EmpresaSolicitudRepository::class);
        $solicitud = $repository->findOneBy(
            ['contactoEmail' => 'laura.correo@example.com'],
            ['id' => 'DESC']
        );

        self::assertInstanceOf(EmpresaSolicitud::class, $solicitud);
        self::assertSame('Correo Real SL', $solicitud->getNombreEmpresa());
        self::assertNotEmpty($solicitud->getToken());
        self::assertSame($solicitud->getPortalToken(), $payload['portalToken']);
    }

    /**
     * Endpoint/controlador que valida la entrada, coordina dependencias y devuelve una respuesta HTTP.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
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

    /**
     * Endpoint/controlador que valida la entrada, coordina dependencias y devuelve una respuesta HTTP.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
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

    /**
     * Endpoint/controlador que valida la entrada, coordina dependencias y devuelve una respuesta HTTP.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
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

    /**
     * Endpoint/controlador que valida la entrada, coordina dependencias y devuelve una respuesta HTTP.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function testResendVerificationUsesExistingSolicitud(): void
    {
        $client = static::createClient();
        /** @var EntityManagerInterface $em */
        $em = static::getContainer()->get('doctrine')->getManager();

        $solicitud = (new EmpresaSolicitud())
            ->setNombreEmpresa('Reenvio Test')
            ->setContactoNombre('Contacto Reenvio')
            ->setContactoEmail('reenvio@example.com');
        $em->persist($solicitud);
        $em->flush();

        $client->request(
            'POST',
            '/registro-empresa/reenviar',
            server: ['CONTENT_TYPE' => 'application/json'],
            content: json_encode([
                'portalToken' => $solicitud->getPortalToken(),
            ], JSON_THROW_ON_ERROR)
        );

        self::assertResponseIsSuccessful();
        $payload = json_decode($client->getResponse()->getContent() ?: '{}', true);
        self::assertIsArray($payload);
        self::assertArrayHasKey('portalToken', $payload);
        self::assertArrayHasKey('verificationUrl', $payload);
        self::assertSame($solicitud->getPortalToken(), $payload['portalToken']);
        self::assertSame('sent', $payload['emailDelivery']);
    }
}

<?php

declare(strict_types=1);

namespace App\Tests\Controller;

use App\Entity\EmpresaSolicitud;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Doctrine\ORM\EntityManagerInterface;

final class RegistroEmpresaControllerTest extends WebTestCase
{
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

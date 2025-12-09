<?php

declare(strict_types=1);

namespace App\Tests\Controller\Portal;

use App\Entity\EmpresaSolicitud;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use App\Tests\Support\DemoFixtureLoaderTrait;

final class SolicitudPortalControllerTest extends WebTestCase
{
    use DemoFixtureLoaderTrait;

    public function testPortalTokenFlow(): void
    {
        $client = static::createClient();
        $em = static::getContainer()->get('doctrine')->getManager();
        $this->reloadDemoFixtures($em);

        $solicitud = new EmpresaSolicitud();
        $solicitud
            ->setNombreEmpresa('Portal Co')
            ->setContactoNombre('Portal Contacto')
            ->setContactoEmail('portal@example.com');
        $em->persist($solicitud);
        $em->flush();

        $token = $solicitud->getPortalToken();

        $client->request('GET', sprintf('/portal/solicitudes/%s', $token));
        self::assertResponseIsSuccessful();

        $client->request(
            'POST',
            sprintf('/portal/solicitudes/%s/mensajes', $token),
            server: ['CONTENT_TYPE' => 'application/json'],
            content: json_encode(['texto' => 'Hola centro'], JSON_THROW_ON_ERROR)
        );
        self::assertResponseStatusCodeSame(201);

        $client->request('GET', sprintf('/portal/solicitudes/%s/mensajes', $token));
        self::assertResponseIsSuccessful();
        $data = json_decode($client->getResponse()->getContent() ?: '[]', true);
        self::assertCount(1, $data);
        self::assertSame('empresa', $data[0]['autor']);
    }
}

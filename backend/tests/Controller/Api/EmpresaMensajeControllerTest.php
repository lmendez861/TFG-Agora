<?php

declare(strict_types=1);

namespace App\Tests\Controller\Api;

use App\Entity\EmpresaSolicitud;
use App\Repository\EmpresaSolicitudRepository;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\HttpFoundation\Response;
use App\Tests\Support\DemoFixtureLoaderTrait;

final class EmpresaMensajeControllerTest extends WebTestCase
{
    use DemoFixtureLoaderTrait;

    public function testCreateAndListMessages(): void
    {
        $client = static::createClient();
        $entityManager = static::getContainer()->get('doctrine')->getManager();
        $this->reloadDemoFixtures($entityManager);

        $repo = static::getContainer()->get(EmpresaSolicitudRepository::class);

        $solicitud = (new EmpresaSolicitud())
            ->setNombreEmpresa('Msg Co')
            ->setContactoNombre('Ana')
            ->setContactoEmail('ana@example.com');
        $entityManager->persist($solicitud);
        $entityManager->flush();

        $client->request(
            'POST',
            '/api/login',
            server: ['CONTENT_TYPE' => 'application/json'],
            content: json_encode(['username' => 'admin', 'password' => 'admin123'], JSON_THROW_ON_ERROR)
        );
        self::assertResponseIsSuccessful();
        $client->request(
            'POST',
            sprintf('/api/empresa-solicitudes/%d/mensajes', $solicitud->getId()),
            content: json_encode(['autor' => 'centro', 'texto' => 'Hola empresa'], JSON_THROW_ON_ERROR)
        );
        self::assertResponseStatusCodeSame(Response::HTTP_CREATED);

        $client->request(
            'GET',
            sprintf('/api/empresa-solicitudes/%d/mensajes', $solicitud->getId())
        );
        self::assertResponseIsSuccessful();
        $data = json_decode($client->getResponse()->getContent() ?: '[]', true);
        self::assertIsArray($data);
        self::assertCount(1, $data);
        self::assertSame('Hola empresa', $data[0]['texto']);
    }
}

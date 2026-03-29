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

    public function testInboxReturnsThreadSummary(): void
    {
        $client = static::createClient();
        $entityManager = static::getContainer()->get('doctrine')->getManager();
        $this->reloadDemoFixtures($entityManager);

        $solicitud = (new EmpresaSolicitud())
            ->setNombreEmpresa('Inbox Co')
            ->setContactoNombre('Laura')
            ->setContactoEmail('laura@example.com');
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
            content: json_encode(['autor' => 'empresa', 'texto' => 'Primer mensaje de prueba'], JSON_THROW_ON_ERROR)
        );
        self::assertResponseStatusCodeSame(Response::HTTP_CREATED);

        $client->request('GET', '/api/empresa-solicitudes/bandeja');
        self::assertResponseIsSuccessful();

        $data = json_decode($client->getResponse()->getContent() ?: '[]', true, 512, JSON_THROW_ON_ERROR);
        self::assertIsArray($data);
        $thread = array_values(array_filter(
            $data,
            static fn (array $item): bool => ($item['solicitud']['id'] ?? null) === $solicitud->getId()
        ));

        self::assertCount(1, $thread);
        self::assertSame(1, $thread[0]['messageCount']);
        self::assertSame('Primer mensaje de prueba', $thread[0]['lastMessage']['texto']);
    }
}

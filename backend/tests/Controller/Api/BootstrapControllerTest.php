<?php

declare(strict_types=1);

namespace App\Tests\Controller\Api;

use App\Service\BootstrapSnapshotProvider;
use App\Tests\Support\DemoFixtureLoaderTrait;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

final class BootstrapControllerTest extends WebTestCase
{
    use DemoFixtureLoaderTrait;

    private KernelBrowser $client;
    private EntityManagerInterface $entityManager;

    protected function setUp(): void
    {
        $this->client = static::createClient();
        $this->entityManager = static::getContainer()->get(EntityManagerInterface::class);
        $this->reloadDemoFixtures($this->entityManager);
        static::getContainer()->get(BootstrapSnapshotProvider::class)->invalidate();
        $this->loginAsAdmin();
    }

    protected function tearDown(): void
    {
        parent::tearDown();
        $this->entityManager->close();
        unset($this->entityManager);
    }

    public function testDevuelveColeccionesInicialesDelPanel(): void
    {
        $this->client->request('GET', '/api/bootstrap');

        self::assertResponseIsSuccessful();

        $payload = json_decode($this->client->getResponse()->getContent() ?: '{}', true, 512, JSON_THROW_ON_ERROR);

        self::assertArrayHasKey('empresas', $payload);
        self::assertArrayHasKey('estudiantes', $payload);
        self::assertArrayHasKey('convenios', $payload);
        self::assertArrayHasKey('asignaciones', $payload);
        self::assertNotEmpty($payload['empresas']);
        self::assertNotEmpty($payload['estudiantes']);
        self::assertNotEmpty($payload['convenios']);
        self::assertNotEmpty($payload['asignaciones']);

        self::assertArrayHasKey('asignaciones', $payload['empresas'][0]);
        self::assertArrayHasKey('empresa', $payload['convenios'][0]);
        self::assertArrayHasKey('empresa', $payload['asignaciones'][0]);
        self::assertArrayHasKey('estudiante', $payload['asignaciones'][0]);
    }

    public function testInvalidaSnapshotTrasCrearUnaEmpresa(): void
    {
        $this->client->request('GET', '/api/bootstrap');
        self::assertResponseIsSuccessful();

        $initialPayload = json_decode($this->client->getResponse()->getContent() ?: '{}', true, 512, JSON_THROW_ON_ERROR);
        $initialTotal = \count($initialPayload['empresas']);

        $this->client->request(
            'POST',
            '/api/empresas',
            server: ['CONTENT_TYPE' => 'application/json'],
            content: json_encode([
                'nombre' => 'Empresa Cache Test',
                'sector' => 'Tecnologia',
                'ciudad' => 'Madrid',
                'email' => 'cache-test@empresa.test',
            ], JSON_THROW_ON_ERROR)
        );

        self::assertResponseStatusCodeSame(201);

        $this->client->request('GET', '/api/bootstrap');
        self::assertResponseIsSuccessful();

        $updatedPayload = json_decode($this->client->getResponse()->getContent() ?: '{}', true, 512, JSON_THROW_ON_ERROR);
        $updatedNames = array_map(static fn (array $empresa): string => $empresa['nombre'], $updatedPayload['empresas']);

        self::assertCount($initialTotal + 1, $updatedPayload['empresas']);
        self::assertContains('Empresa Cache Test', $updatedNames);
    }

    private function loginAsAdmin(): void
    {
        $this->client->request(
            'POST',
            '/api/login',
            server: ['CONTENT_TYPE' => 'application/json'],
            content: json_encode(['username' => 'admin', 'password' => 'admin123'], JSON_THROW_ON_ERROR)
        );

        self::assertResponseIsSuccessful();
    }
}

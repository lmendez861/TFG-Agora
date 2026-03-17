<?php

declare(strict_types=1);

namespace App\Tests\Controller\Api;

use App\Tests\Support\DemoFixtureLoaderTrait;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

final class PublicAccessControllerTest extends WebTestCase
{
    use DemoFixtureLoaderTrait;

    private KernelBrowser $client;
    private EntityManagerInterface $entityManager;

    protected function setUp(): void
    {
        $this->client = static::createClient();
        $this->entityManager = static::getContainer()->get(EntityManagerInterface::class);
        $this->reloadDemoFixtures($this->entityManager);
        $this->loginAsAdmin();
    }

    protected function tearDown(): void
    {
        parent::tearDown();
        $this->entityManager->close();
        unset($this->entityManager);
    }

    public function testStatusDevuelveElSnapshotActual(): void
    {
        $this->client->request('GET', '/api/public-access');

        self::assertResponseIsSuccessful();

        $payload = $this->decodeResponse();
        self::assertArrayHasKey('status', $payload);
        self::assertArrayHasKey('detail', $payload);
        self::assertArrayHasKey('targetUrl', $payload);
        self::assertArrayHasKey('publicUrl', $payload);
        self::assertContains($payload['status'], ['inactive', 'starting', 'active', 'error']);
        self::assertSame('http://127.0.0.1:8000', $payload['targetUrl']);
    }

    public function testStartDevuelve503SiElServidorLocalNoEstaDisponible(): void
    {
        $this->client->request('POST', '/api/public-access/start');

        self::assertResponseStatusCodeSame(503);

        $payload = $this->decodeResponse();
        self::assertArrayHasKey('message', $payload);
        self::assertStringContainsString('http://127.0.0.1:8000', $payload['message']);
    }

    public function testStopDevuelveEstadoInactivo(): void
    {
        $this->client->request('POST', '/api/public-access/stop');

        self::assertResponseIsSuccessful();

        $payload = $this->decodeResponse();
        self::assertSame('inactive', $payload['status']);
        self::assertSame('El acceso externo esta detenido.', $payload['detail']);
        self::assertNull($payload['publicUrl']);
        self::assertNull($payload['processId']);
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

    private function decodeResponse(): array
    {
        return json_decode($this->client->getResponse()->getContent() ?: '{}', true, 512, JSON_THROW_ON_ERROR);
    }
}

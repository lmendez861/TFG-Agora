<?php

declare(strict_types=1);

namespace App\Tests\Controller\Api;

use App\Tests\Support\DemoFixtureLoaderTrait;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

final class MonitorControllerTest extends WebTestCase
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

    public function testOverviewDevuelveServiciosActividadLogsYTests(): void
    {
        $logsDir = static::getContainer()->getParameter('kernel.logs_dir');
        file_put_contents($logsDir . '/monitor-test.log', "[monitor] linea uno\n[monitor] linea dos\n");

        $this->client->request('GET', '/api/monitor');

        self::assertResponseIsSuccessful();

        $payload = json_decode($this->client->getResponse()->getContent() ?: '{}', true, 512, JSON_THROW_ON_ERROR);

        self::assertArrayHasKey('environment', $payload);
        self::assertArrayHasKey('services', $payload);
        self::assertArrayHasKey('metrics', $payload);
        self::assertArrayHasKey('activity', $payload);
        self::assertArrayHasKey('logs', $payload);
        self::assertArrayHasKey('tests', $payload);
        self::assertArrayHasKey('documents', $payload);
        self::assertNotEmpty($payload['services']);
        self::assertNotEmpty($payload['metrics']);
        self::assertNotEmpty($payload['activity']);
        self::assertNotEmpty($payload['tests']);
        self::assertContains('public-access', array_column($payload['services'], 'id'));
        self::assertContains('mailer', array_column($payload['services'], 'id'));

        $logFiles = array_column($payload['logs'], 'file');
        self::assertContains('monitor-test.log', $logFiles);

        $backendSuite = array_values(array_filter(
            $payload['tests'],
            static fn (array $suite): bool => $suite['id'] === 'backend'
        ));

        self::assertCount(1, $backendSuite);
        self::assertSame('php bin/phpunit', $backendSuite[0]['command']);
    }
}

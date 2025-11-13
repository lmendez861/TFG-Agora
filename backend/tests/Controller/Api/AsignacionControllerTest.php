<?php

namespace App\Tests\Controller\Api;

use App\Entity\AsignacionPractica;
use App\Tests\Support\DemoFixtureLoaderTrait;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

final class AsignacionControllerTest extends WebTestCase
{
    use DemoFixtureLoaderTrait;

    private KernelBrowser $client;
    private EntityManagerInterface $entityManager;

    protected function setUp(): void
    {
        $this->client = static::createClient();
        $this->entityManager = static::getContainer()->get(EntityManagerInterface::class);
        $this->reloadDemoFixtures($this->entityManager);
    }

    protected function tearDown(): void
    {
        parent::tearDown();

        $this->entityManager->close();
        unset($this->entityManager);
    }

    public function testListadoDevuelveAsignaciones(): void
    {
        $this->client->request('GET', '/api/asignaciones');

        self::assertResponseIsSuccessful();
        $payload = json_decode($this->client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        self::assertIsArray($payload);
        self::assertCount(2, $payload);
        self::assertSame('Innovar Formación', $payload[0]['empresa']['nombre']);
        self::assertArrayHasKey('estudiante', $payload[0]);
    }

    public function testDetalleIncluyeSeguimientosYEvaluacion(): void
    {
        $asignacion = $this->entityManager
            ->getRepository(AsignacionPractica::class)
            ->findOneBy(['estado' => 'en_curso']);

        self::assertNotNull($asignacion);

        $this->client->request('GET', '/api/asignaciones/' . $asignacion->getId());

        self::assertResponseIsSuccessful();
        $payload = json_decode($this->client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        self::assertSame('en_curso', $payload['estado']);
        self::assertCount(2, $payload['seguimientos']);
        self::assertNotNull($payload['evaluacionFinal']);
        self::assertSame('Ana', $payload['estudiante']['nombre']);
    }
}

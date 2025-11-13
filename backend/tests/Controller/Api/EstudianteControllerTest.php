<?php

namespace App\Tests\Controller\Api;

use App\Entity\Estudiante;
use App\Tests\Support\DemoFixtureLoaderTrait;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

final class EstudianteControllerTest extends WebTestCase
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

    public function testListadoDevuelveEstudiantes(): void
    {
        $this->client->request('GET', '/api/estudiantes');

        self::assertResponseIsSuccessful();
        $payload = json_decode($this->client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        self::assertIsArray($payload);
        self::assertCount(2, $payload);
        self::assertSame('Ana', $payload[0]['nombre']);
        self::assertArrayHasKey('asignaciones', $payload[0]);
    }

    public function testDetalleIncluyeAsignacionesDelEstudiante(): void
    {
        $estudiante = $this->entityManager
            ->getRepository(Estudiante::class)
            ->findOneBy(['nombre' => 'Ana']);

        self::assertNotNull($estudiante);

        $this->client->request('GET', '/api/estudiantes/' . $estudiante->getId());

        self::assertResponseIsSuccessful();
        $payload = json_decode($this->client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        self::assertSame('Ana', $payload['nombre']);
        self::assertCount(1, $payload['asignaciones']);
        self::assertSame('Innovar Formación', $payload['asignaciones'][0]['empresa']);
    }
}

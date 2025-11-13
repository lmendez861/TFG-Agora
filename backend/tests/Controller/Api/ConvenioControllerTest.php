<?php

namespace App\Tests\Controller\Api;

use App\Entity\Convenio;
use App\Tests\Support\DemoFixtureLoaderTrait;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

final class ConvenioControllerTest extends WebTestCase
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

    public function testListadoDevuelveConvenios(): void
    {
        $this->client->request('GET', '/api/convenios');

        self::assertResponseIsSuccessful();
        $payload = json_decode($this->client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        self::assertIsArray($payload);
        self::assertGreaterThanOrEqual(2, count($payload));
        self::assertArrayHasKey('empresa', $payload[0]);
    }

    public function testDetalleIncluyeAsignaciones(): void
    {
        $convenio = $this->entityManager
            ->getRepository(Convenio::class)
            ->findOneBy(['titulo' => 'Convenio IA Educativa 2024/2025']);

        self::assertNotNull($convenio);

        $this->client->request('GET', '/api/convenios/' . $convenio->getId());

        self::assertResponseIsSuccessful();
        $payload = json_decode($this->client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        self::assertSame('Convenio IA Educativa 2024/2025', $payload['titulo']);
        self::assertCount(1, $payload['asignaciones']);
        self::assertSame('Ana', $payload['asignaciones'][0]['estudiante']['nombre']);
    }
}

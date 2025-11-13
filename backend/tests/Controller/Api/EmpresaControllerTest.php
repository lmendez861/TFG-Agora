<?php

namespace App\Tests\Controller\Api;

use App\Entity\EmpresaColaboradora;
use App\Tests\Support\DemoFixtureLoaderTrait;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

final class EmpresaControllerTest extends WebTestCase
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

    public function testListadoDevuelveEmpresasConResumen(): void
    {
        $this->client->request('GET', '/api/empresas');

        self::assertResponseIsSuccessful();
        $payload = json_decode($this->client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        self::assertIsArray($payload);
        self::assertCount(2, $payload);
        self::assertSame('Innovar Formación', $payload[0]['nombre']);
        self::assertArrayHasKey('asignaciones', $payload[0]);
        self::assertArrayHasKey('conveniosActivos', $payload[0]);
    }

    public function testDetalleIncluyeContactosTutoresYConvenios(): void
    {
        $empresa = $this->entityManager
            ->getRepository(EmpresaColaboradora::class)
            ->findOneBy(['nombre' => 'Innovar Formación']);

        self::assertNotNull($empresa);

        $this->client->request('GET', '/api/empresas/' . $empresa->getId());

        self::assertResponseIsSuccessful();
        $payload = json_decode($this->client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        self::assertSame('Innovar Formación', $payload['nombre']);
        self::assertCount(1, $payload['contactos']);
        self::assertCount(1, $payload['tutoresProfesionales']);
        self::assertCount(1, $payload['convenios']);
        self::assertSame(1, $payload['resumenAsignaciones']['total']);
        self::assertArrayHasKey('en_curso', $payload['resumenAsignaciones']['porEstado']);
    }
}

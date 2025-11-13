<?php

namespace App\Tests\Controller\Api;

use App\Entity\EmpresaColaboradora;
use App\Tests\Support\DemoFixtureLoaderTrait;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\HttpFoundation\Response;

final class EmpresaControllerTest extends WebTestCase
{
    use DemoFixtureLoaderTrait;

    private KernelBrowser $client;
    private EntityManagerInterface $entityManager;

    protected function setUp(): void
    {
        $this->client = static::createClient(server: [
            'PHP_AUTH_USER' => 'admin',
            'PHP_AUTH_PW' => 'admin123',
        ]);
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

    public function testSePuedeRegistrarEmpresa(): void
    {
        $this->client->request(
            'POST',
            '/api/empresas',
            server: ['CONTENT_TYPE' => 'application/json'],
            content: json_encode([
                'nombre' => 'DataLab Analytics',
                'sector' => 'Big Data',
                'ciudad' => 'Sevilla',
                'estadoColaboracion' => 'activa',
                'fechaAlta' => '2025-01-10',
            ], JSON_THROW_ON_ERROR)
        );

        self::assertResponseStatusCodeSame(Response::HTTP_CREATED);
        $payload = json_decode($this->client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        self::assertSame('DataLab Analytics', $payload['nombre']);
        self::assertSame('Sevilla', $payload['ciudad']);

        $empresa = $this->entityManager
            ->getRepository(EmpresaColaboradora::class)
            ->findOneBy(['nombre' => 'DataLab Analytics']);

        self::assertNotNull($empresa);
        self::assertSame('activa', $empresa->getEstadoColaboracion());
    }

    public function testActualizarEmpresaPermiteCambiarEstado(): void
    {
        $empresa = $this->entityManager
            ->getRepository(EmpresaColaboradora::class)
            ->findOneBy(['nombre' => 'Salud Conectada S.L.']);

        self::assertNotNull($empresa);

        $this->client->request(
            'PUT',
            '/api/empresas/' . $empresa->getId(),
            server: ['CONTENT_TYPE' => 'application/json'],
            content: json_encode([
                'estadoColaboracion' => 'en_negociacion',
                'ciudad' => 'Valencia',
            ], JSON_THROW_ON_ERROR)
        );

        self::assertResponseIsSuccessful();
        $payload = json_decode($this->client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        self::assertSame('en_negociacion', $payload['estadoColaboracion']);
        self::assertSame('Valencia', $payload['ciudad']);
    }
}

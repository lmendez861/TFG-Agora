<?php

namespace App\Tests\Controller\Api;

use App\Entity\Convenio;
use App\Entity\EmpresaColaboradora;
use App\Tests\Support\DemoFixtureLoaderTrait;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\HttpFoundation\Response;

final class ConvenioControllerTest extends WebTestCase
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

    public function testSePuedeRegistrarConvenio(): void
    {
        $empresa = $this->entityManager
            ->getRepository(EmpresaColaboradora::class)
            ->findOneBy(['nombre' => 'Innovar Formación']);

        self::assertNotNull($empresa);

        $this->client->request(
            'POST',
            '/api/convenios',
            server: ['CONTENT_TYPE' => 'application/json'],
            content: json_encode([
                'empresaId' => $empresa->getId(),
                'titulo' => 'Convenio Ciberseguridad 2025',
                'tipo' => 'curricular',
                'estado' => 'vigente',
                'fechaInicio' => '2025-02-01',
            ], JSON_THROW_ON_ERROR)
        );

        self::assertResponseStatusCodeSame(Response::HTTP_CREATED);
        $payload = json_decode($this->client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        self::assertSame('Convenio Ciberseguridad 2025', $payload['titulo']);
        self::assertSame('curricular', $payload['tipo']);

        $convenio = $this->entityManager
            ->getRepository(Convenio::class)
            ->findOneBy(['titulo' => 'Convenio Ciberseguridad 2025']);

        self::assertNotNull($convenio);
        self::assertSame('vigente', $convenio->getEstado());
    }

    public function testActualizarConvenioPermiteCambiarEstado(): void
    {
        $convenio = $this->entityManager
            ->getRepository(Convenio::class)
            ->findOneBy(['titulo' => 'Convenio IA Educativa 2024/2025']);

        self::assertNotNull($convenio);

        $this->client->request(
            'PUT',
            '/api/convenios/' . $convenio->getId(),
            server: ['CONTENT_TYPE' => 'application/json'],
            content: json_encode([
                'estado' => 'finalizado',
                'fechaFin' => '2025-06-30',
            ], JSON_THROW_ON_ERROR)
        );

        self::assertResponseIsSuccessful();
        $payload = json_decode($this->client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        self::assertSame('finalizado', $payload['estado']);
        self::assertSame('2025-06-30', $payload['fechaFin']);
    }
}

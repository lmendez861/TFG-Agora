<?php

/**
 * Comentario de mantenimiento Agora.
 * Proposito: Controlador HTTP de la API interna: valida peticiones, coordina servicios/repositorios y devuelve JSON al frontend.
 * Relaciones: Conecta con App/Service/BootstrapSnapshotProvider, App/Tests/Support/DemoFixtureLoaderTrait.
 */

declare(strict_types=1);

namespace App\Tests\Controller\Api;

use App\Entity\EmpresaColaboradora;
use App\Service\BootstrapSnapshotProvider;
use App\Tests\Support\DemoFixtureLoaderTrait;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

/**
 * Controlador HTTP de la API interna: valida peticiones, coordina servicios/repositorios y devuelve JSON al frontend.
 * Punto de enlace: sus dependencias importadas muestran con que servicios, repositorios o entidades colabora.
 */
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

    /**
     * Endpoint/controlador que valida la entrada, coordina dependencias y devuelve una respuesta HTTP.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    protected function tearDown(): void
    {
        parent::tearDown();
        $this->entityManager->close();
        unset($this->entityManager);
    }

    /**
     * Endpoint/controlador que valida la entrada, coordina dependencias y devuelve una respuesta HTTP.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
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

    /**
     * Endpoint/controlador que valida la entrada, coordina dependencias y devuelve una respuesta HTTP.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
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

    public function testInvalidaSnapshotTrasCrearTutorProfesional(): void
    {
        $empresa = $this->entityManager
            ->getRepository(EmpresaColaboradora::class)
            ->findOneBy(['email' => 'contacto@innovar.es']);

        self::assertInstanceOf(EmpresaColaboradora::class, $empresa);

        $this->client->request('GET', '/api/bootstrap');
        self::assertResponseIsSuccessful();
        $initialPayload = json_decode($this->client->getResponse()->getContent() ?: '{}', true, 512, JSON_THROW_ON_ERROR);

        $initialCompany = array_values(array_filter(
            $initialPayload['empresas'],
            static fn (array $item): bool => $item['id'] === $empresa->getId()
        ))[0] ?? null;

        self::assertIsArray($initialCompany);

        $this->client->request(
            'POST',
            '/api/tutores-profesionales',
            server: ['CONTENT_TYPE' => 'application/json'],
            content: json_encode([
                'empresaId' => $empresa->getId(),
                'nombre' => 'Cache Tutor',
                'email' => 'cache.tutor@innovar.es',
                'cargo' => 'Mentor',
                'activo' => true,
            ], JSON_THROW_ON_ERROR)
        );

        self::assertResponseStatusCodeSame(201);

        $this->client->request('GET', '/api/bootstrap');
        self::assertResponseIsSuccessful();
        $updatedPayload = json_decode($this->client->getResponse()->getContent() ?: '{}', true, 512, JSON_THROW_ON_ERROR);

        $updatedCompany = array_values(array_filter(
            $updatedPayload['empresas'],
            static fn (array $item): bool => $item['id'] === $empresa->getId()
        ))[0] ?? null;

        self::assertIsArray($updatedCompany);
        self::assertSame($initialCompany['tutoresProfesionales'] + 1, $updatedCompany['tutoresProfesionales']);
    }

    /**
     * Endpoint/controlador que valida la entrada, coordina dependencias y devuelve una respuesta HTTP.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
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

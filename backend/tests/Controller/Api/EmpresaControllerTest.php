<?php

/**
 * Comentario de mantenimiento Agora.
 * Proposito: Controlador HTTP de la API interna: valida peticiones, coordina servicios/repositorios y devuelve JSON al frontend.
 * Relaciones: Conecta con App/Entity/EmpresaColaboradora, App/Tests/Support/DemoFixtureLoaderTrait.
 */

namespace App\Tests\Controller\Api;

use App\Entity\EmpresaColaboradora;
use App\Tests\Support\DemoFixtureLoaderTrait;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\HttpFoundation\Response;

/**
 * Controlador HTTP de la API interna: valida peticiones, coordina servicios/repositorios y devuelve JSON al frontend.
 * Punto de enlace: sus dependencias importadas muestran con que servicios, repositorios o entidades colabora.
 */
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
    public function testListadoDevuelveEmpresasConResumen(): void
    {
        $this->client->request('GET', '/api/empresas');

        self::assertResponseIsSuccessful();
        $payload = json_decode($this->client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        self::assertIsArray($payload);
        self::assertCount(3, $payload);
        self::assertSame('Innovar Formación', $payload[0]['nombre']);
        self::assertArrayHasKey('asignaciones', $payload[0]);
        self::assertArrayHasKey('conveniosActivos', $payload[0]);
    }

    /**
     * Endpoint/controlador que valida la entrada, coordina dependencias y devuelve una respuesta HTTP.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function testListadoRechazaEstadoDesconocido(): void
    {
        $this->client->request('GET', '/api/empresas?estado=fuera_catalogo');

        self::assertResponseStatusCodeSame(Response::HTTP_BAD_REQUEST);
    }

    /**
     * Endpoint/controlador que valida la entrada, coordina dependencias y devuelve una respuesta HTTP.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function testListadoPermiteFiltrarYPaginar(): void
    {
        $this->client->request('GET', '/api/empresas?estado=activa');

        self::assertResponseIsSuccessful();
        $payload = json_decode($this->client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        self::assertGreaterThanOrEqual(1, count($payload));
        foreach ($payload as $empresa) {
            self::assertSame('activa', $empresa['estadoColaboracion']);
        }

        $this->client->request('GET', '/api/empresas?perPage=1&page=2');

        self::assertResponseIsSuccessful();
        $payload = json_decode($this->client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        self::assertIsArray($payload);
        if (!empty($payload) && isset($payload[0])) {
            self::assertArrayHasKey('nombre', $payload[0]);
        }
    }

    /**
     * Endpoint/controlador que valida la entrada, coordina dependencias y devuelve una respuesta HTTP.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
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

    /**
     * Endpoint/controlador que valida la entrada, coordina dependencias y devuelve una respuesta HTTP.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
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

    /**
     * Endpoint/controlador que valida la entrada, coordina dependencias y devuelve una respuesta HTTP.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
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

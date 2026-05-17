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

/**
 * Controlador HTTP de la API interna: valida peticiones, coordina servicios/repositorios y devuelve JSON al frontend.
 * Punto de enlace: sus dependencias importadas muestran con que servicios, repositorios o entidades colabora.
 */
final class TutorControllerTest extends WebTestCase
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

        $this->entityManager = $this->client->getContainer()->get(EntityManagerInterface::class);
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
    public function testListaTutoresAcademicos(): void
    {
        $this->client->request('GET', '/api/tutores-academicos');

        self::assertResponseIsSuccessful();
        $payload = json_decode($this->client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        self::assertNotEmpty($payload);
        $this->assertArrayHasKey('departamento', $payload[0]);
    }

    /**
     * Endpoint/controlador que valida la entrada, coordina dependencias y devuelve una respuesta HTTP.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function testFiltradoTutoresProfesionalesPorEmpresa(): void
    {
        $empresa = $this->entityManager
            ->getRepository(EmpresaColaboradora::class)
            ->findOneBy(['email' => 'contacto@innovar.es']);

        self::assertNotNull($empresa);

        $this->client->request('GET', '/api/tutores-profesionales?empresaId=' . $empresa->getId());

        self::assertResponseIsSuccessful();
        $payload = json_decode($this->client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        self::assertNotEmpty($payload);
        self::assertSame($empresa->getId(), $payload[0]['empresa']['id']);
    }

    public function testPuedeCrearYActualizarTutorAcademico(): void
    {
        $this->client->request(
            'POST',
            '/api/tutores-academicos',
            server: ['CONTENT_TYPE' => 'application/json'],
            content: json_encode([
                'nombre' => 'Maria',
                'apellido' => 'Lopez',
                'email' => 'maria.lopez@example.com',
                'telefono' => '600100200',
                'departamento' => 'Informatica',
                'especialidad' => 'IA aplicada',
                'activo' => true,
            ], JSON_THROW_ON_ERROR)
        );

        self::assertResponseStatusCodeSame(201);
        $created = json_decode($this->client->getResponse()->getContent() ?: '{}', true, 512, JSON_THROW_ON_ERROR);
        self::assertSame('Maria', $created['nombre']);

        $this->client->request(
            'PUT',
            '/api/tutores-academicos/' . $created['id'],
            server: ['CONTENT_TYPE' => 'application/json'],
            content: json_encode([
                'telefono' => '600300400',
                'activo' => false,
            ], JSON_THROW_ON_ERROR)
        );

        self::assertResponseIsSuccessful();
        $updated = json_decode($this->client->getResponse()->getContent() ?: '{}', true, 512, JSON_THROW_ON_ERROR);
        self::assertSame('600300400', $updated['telefono']);
        self::assertFalse($updated['activo']);
    }

    public function testPuedeCrearYActualizarTutorProfesionalRelacionadoConEmpresa(): void
    {
        $empresa = $this->entityManager
            ->getRepository(EmpresaColaboradora::class)
            ->findOneBy(['email' => 'contacto@innovar.es']);

        self::assertNotNull($empresa);

        $this->client->request(
            'POST',
            '/api/tutores-profesionales',
            server: ['CONTENT_TYPE' => 'application/json'],
            content: json_encode([
                'empresaId' => $empresa->getId(),
                'nombre' => 'Lucia Torres',
                'email' => 'lucia.torres@innovar.es',
                'telefono' => '910000999',
                'cargo' => 'Responsable de practicas',
                'activo' => true,
            ], JSON_THROW_ON_ERROR)
        );

        self::assertResponseStatusCodeSame(201);
        $created = json_decode($this->client->getResponse()->getContent() ?: '{}', true, 512, JSON_THROW_ON_ERROR);
        self::assertSame($empresa->getId(), $created['empresa']['id']);

        $this->client->request(
            'PUT',
            '/api/tutores-profesionales/' . $created['id'],
            server: ['CONTENT_TYPE' => 'application/json'],
            content: json_encode([
                'cargo' => 'Mentora senior',
                'activo' => false,
            ], JSON_THROW_ON_ERROR)
        );

        self::assertResponseIsSuccessful();
        $updated = json_decode($this->client->getResponse()->getContent() ?: '{}', true, 512, JSON_THROW_ON_ERROR);
        self::assertSame('Mentora senior', $updated['cargo']);
        self::assertFalse($updated['activo']);
    }
}

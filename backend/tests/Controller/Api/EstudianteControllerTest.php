<?php

namespace App\Tests\Controller\Api;

use App\Entity\Estudiante;
use App\Tests\Support\DemoFixtureLoaderTrait;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\HttpFoundation\Response;

final class EstudianteControllerTest extends WebTestCase
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

    public function testListadoDevuelveEstudiantes(): void
    {
        $this->client->request('GET', '/api/estudiantes');

        self::assertResponseIsSuccessful();
        $payload = json_decode($this->client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        self::assertIsArray($payload);
        self::assertCount(3, $payload);
        self::assertSame('Ana', $payload[0]['nombre']);
        self::assertArrayHasKey('asignaciones', $payload[0]);
    }

    public function testListadoPermiteFiltrarYBuscar(): void
    {
        $this->client->request('GET', '/api/estudiantes?estado=en_practicas');

        self::assertResponseIsSuccessful();
        $payload = json_decode($this->client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        self::assertCount(2, $payload);
        foreach ($payload as $estudiante) {
            self::assertSame('en_practicas', $estudiante['estado']);
        }

        $this->client->request('GET', '/api/estudiantes?q=mar');

        self::assertResponseIsSuccessful();
        $payload = json_decode($this->client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        self::assertGreaterThanOrEqual(1, \count($payload));
        foreach ($payload as $estudiante) {
            $hayCoincidencia = stripos($estudiante['nombre'], 'mar') !== false
                || stripos($estudiante['apellido'] ?? '', 'mar') !== false
                || stripos($estudiante['email'] ?? '', 'mar') !== false;
            self::assertTrue($hayCoincidencia);
        }
    }

    public function testListadoRechazaEstadoNoValido(): void
    {
        $this->client->request('GET', '/api/estudiantes?estado=sin_estado');

        self::assertResponseStatusCodeSame(Response::HTTP_BAD_REQUEST);
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

    public function testAltaDeEstudianteValida(): void
    {
        $this->client->request(
            'POST',
            '/api/estudiantes',
            server: ['CONTENT_TYPE' => 'application/json'],
            content: json_encode([
                'nombre' => 'Luis',
                'apellido' => 'Martinez',
                'dni' => '12345678Z',
                'email' => 'luis.martinez@example.com',
                'grado' => 'Ingenieria Informatica',
            ], JSON_THROW_ON_ERROR)
        );

        self::assertResponseStatusCodeSame(Response::HTTP_CREATED);
        $payload = json_decode($this->client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        self::assertSame('Luis', $payload['nombre']);
        self::assertSame('Ingenieria Informatica', $payload['grado']);

        $estudiante = $this->entityManager
            ->getRepository(Estudiante::class)
            ->findOneBy(['dni' => '12345678Z']);

        self::assertNotNull($estudiante);
        self::assertSame('luis.martinez@example.com', $estudiante->getEmail());
    }

    public function testActualizarEstudianteDetectaColisionesDeEmail(): void
    {
        $estudiante = $this->entityManager
            ->getRepository(Estudiante::class)
            ->findOneBy(['nombre' => 'Marina']);

        self::assertNotNull($estudiante);

        $existing = $this->entityManager
            ->getRepository(Estudiante::class)
            ->findOneBy(['nombre' => 'Ana']);

        self::assertNotNull($existing);

        $this->client->request(
            'PUT',
            '/api/estudiantes/' . $estudiante->getId(),
            server: ['CONTENT_TYPE' => 'application/json'],
            content: json_encode([
                'email' => $existing->getEmail(),
            ], JSON_THROW_ON_ERROR)
        );

        self::assertResponseStatusCodeSame(Response::HTTP_CONFLICT);
    }
}

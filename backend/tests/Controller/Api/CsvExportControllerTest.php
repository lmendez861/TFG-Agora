<?php

/**
 * Comentario de mantenimiento Agora.
 * Proposito: Controlador HTTP de la API interna: valida peticiones, coordina servicios/repositorios y devuelve JSON al frontend.
 * Relaciones: Conecta con App/Tests/Support/DemoFixtureLoaderTrait.
 */

declare(strict_types=1);

namespace App\Tests\Controller\Api;

use App\Tests\Support\DemoFixtureLoaderTrait;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\Attributes\DataProvider;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\HttpFoundation\Response;

/**
 * Controlador HTTP de la API interna: valida peticiones, coordina servicios/repositorios y devuelve JSON al frontend.
 * Punto de enlace: sus dependencias importadas muestran con que servicios, repositorios o entidades colabora.
 */
final class CsvExportControllerTest extends WebTestCase
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

    #[DataProvider('exportRouteProvider')]
    public function testExportRoutesReturnCsv(string $path, string $expectedHeader, string $expectedFragment): void
    {
        $this->client->request('GET', $path);

        self::assertResponseIsSuccessful();
        self::assertStringContainsString(
            'text/csv',
            (string) $this->client->getResponse()->headers->get('Content-Type')
        );

        $content = $this->client->getResponse()->getContent();
        self::assertIsString($content);
        self::assertStringStartsWith("\xEF\xBB\xBF" . $expectedHeader, $content);
        self::assertStringContainsString($expectedFragment, $content);
    }

    /**
     * Endpoint/controlador que valida la entrada, coordina dependencias y devuelve una respuesta HTTP.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public static function exportRouteProvider(): iterable
    {
        yield 'empresas' => [
            '/api/export/empresas',
            'id;nombre;sector;ciudad;estado_colaboracion;convenios_activos;tutores_profesionales;contactos;asignaciones_total;asignaciones_en_curso',
            'Innovar',
        ];

        yield 'convenios' => [
            '/api/export/convenios',
            'id;titulo;empresa;tipo;estado;fecha_inicio;fecha_fin;asignaciones_asociadas',
            'Convenio IA Educativa 2024/2025',
        ];

        yield 'estudiantes' => [
            '/api/export/estudiantes',
            'id;nombre;apellido;dni;email;grado;curso;estado;asignaciones_total;asignaciones_en_curso',
            'Ana',
        ];

        yield 'asignaciones' => [
            '/api/export/asignaciones',
            'id;empresa;estudiante;estado;modalidad;horas_totales;fecha_inicio;fecha_fin',
            'Innovar',
        ];

        yield 'tutores academicos' => [
            '/api/export/tutores-academicos',
            'id;nombre;apellido;email;telefono;departamento;especialidad;activo',
            'Laura',
        ];

        yield 'tutores profesionales' => [
            '/api/export/tutores-profesionales',
            'id;nombre;email;telefono;cargo;activo;empresa',
            'Carlos',
        ];
    }

    /**
     * Endpoint/controlador que valida la entrada, coordina dependencias y devuelve una respuesta HTTP.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function testEmpresasExportAppliesFilters(): void
    {
        $this->client->request('GET', '/api/export/empresas?estado=activa');

        self::assertResponseIsSuccessful();
        $content = $this->client->getResponse()->getContent();
        self::assertIsString($content);
        self::assertStringContainsString(';activa;', $content);
        self::assertStringNotContainsString(';pendiente_revision;', $content);
    }

    /**
     * Endpoint/controlador que valida la entrada, coordina dependencias y devuelve una respuesta HTTP.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function testSolicitudesExportReturnsUtf8BomEvenWhenEmpty(): void
    {
        $this->client->request('GET', '/api/export/empresa-solicitudes');

        self::assertResponseIsSuccessful();
        $content = $this->client->getResponse()->getContent();
        self::assertSame("\xEF\xBB\xBF", $content);
    }

    /**
     * Endpoint/controlador que valida la entrada, coordina dependencias y devuelve una respuesta HTTP.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function testTutoresProfesionalesExportRejectsUnknownEmpresa(): void
    {
        $this->client->request('GET', '/api/export/tutores-profesionales?empresaId=999999');

        self::assertResponseStatusCodeSame(Response::HTTP_NOT_FOUND);
    }

    public function testLegacyCsvRouteStillWorks(): void
    {
        $this->client->request('GET', '/api/export/empresas.csv');

        self::assertResponseIsSuccessful();
    }
}

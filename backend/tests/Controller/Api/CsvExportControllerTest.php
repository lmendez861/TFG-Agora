<?php

declare(strict_types=1);

namespace App\Tests\Controller\Api;

use App\Tests\Support\DemoFixtureLoaderTrait;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\HttpFoundation\Response;

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

    protected function tearDown(): void
    {
        parent::tearDown();

        $this->entityManager->close();
        unset($this->entityManager);
    }

    /**
     * @dataProvider exportRouteProvider
     */
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

    public static function exportRouteProvider(): iterable
    {
        yield 'empresas' => [
            '/api/export/empresas.csv',
            'id;nombre;sector;ciudad;estado_colaboracion;convenios_activos;tutores_profesionales;contactos;asignaciones_total;asignaciones_en_curso',
            'Innovar',
        ];

        yield 'convenios' => [
            '/api/export/convenios.csv',
            'id;titulo;empresa;tipo;estado;fecha_inicio;fecha_fin;asignaciones_asociadas',
            'Convenio IA Educativa 2024/2025',
        ];

        yield 'estudiantes' => [
            '/api/export/estudiantes.csv',
            'id;nombre;apellido;dni;email;grado;curso;estado;asignaciones_total;asignaciones_en_curso',
            'Ana',
        ];

        yield 'asignaciones' => [
            '/api/export/asignaciones.csv',
            'id;empresa;estudiante;estado;modalidad;horas_totales;fecha_inicio;fecha_fin',
            'Innovar',
        ];

        yield 'tutores academicos' => [
            '/api/export/tutores-academicos.csv',
            'id;nombre;apellido;email;telefono;departamento;especialidad;activo',
            'Laura',
        ];

        yield 'tutores profesionales' => [
            '/api/export/tutores-profesionales.csv',
            'id;nombre;email;telefono;cargo;activo;empresa',
            'Carlos',
        ];
    }

    public function testEmpresasExportAppliesFilters(): void
    {
        $this->client->request('GET', '/api/export/empresas.csv?estado=activa');

        self::assertResponseIsSuccessful();
        $content = $this->client->getResponse()->getContent();
        self::assertIsString($content);
        self::assertStringContainsString(';activa;', $content);
        self::assertStringNotContainsString(';pendiente_revision;', $content);
    }

    public function testSolicitudesExportReturnsUtf8BomEvenWhenEmpty(): void
    {
        $this->client->request('GET', '/api/export/empresa-solicitudes.csv');

        self::assertResponseIsSuccessful();
        $content = $this->client->getResponse()->getContent();
        self::assertSame("\xEF\xBB\xBF", $content);
    }

    public function testTutoresProfesionalesExportRejectsUnknownEmpresa(): void
    {
        $this->client->request('GET', '/api/export/tutores-profesionales.csv?empresaId=999999');

        self::assertResponseStatusCodeSame(Response::HTTP_NOT_FOUND);
    }
}

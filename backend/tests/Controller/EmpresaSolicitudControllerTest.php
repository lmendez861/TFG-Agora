<?php

/**
 * Comentario de mantenimiento Agora.
 * Proposito: Controlador Symfony: conecta rutas HTTP con servicios de dominio y plantillas/respuestas.
 * Relaciones: Conecta con App/Entity/EmpresaColaboradora, App/Entity/EmpresaSolicitud, App/Repository/EmpresaSolicitudRepository, App/Tests/Support/DemoFixtureLoaderTrait.
 */

namespace App\Tests\Controller;

use App\Entity\EmpresaColaboradora;
use App\Entity\EmpresaSolicitud;
use App\Repository\EmpresaSolicitudRepository;
use App\Tests\Support\DemoFixtureLoaderTrait;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

/**
 * Controlador Symfony: conecta rutas HTTP con servicios de dominio y plantillas/respuestas.
 * Punto de enlace: sus dependencias importadas muestran con que servicios, repositorios o entidades colabora.
 */
final class EmpresaSolicitudControllerTest extends WebTestCase
{
    use DemoFixtureLoaderTrait;

    private static int $publicRequestIndex = 10;
    private EntityManagerInterface $entityManager;

    protected function setUp(): void
    {
        $client = static::createClient();
        $this->entityManager = $client->getContainer()->get(EntityManagerInterface::class);
        $this->reloadDemoFixtures($this->entityManager);
        static::ensureKernelShutdown();
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
    public function testNoSePuedeAprobarSinVerificarCorreo(): void
    {
        $solicitudId = $this->crearSolicitudBasica();

        $client = $this->createAuthenticatedClient();
        $client->request('POST', '/api/empresa-solicitudes/' . $solicitudId . '/aprobar');

        self::assertResponseStatusCodeSame(201);
    }

    /**
     * Endpoint/controlador que valida la entrada, coordina dependencias y devuelve una respuesta HTTP.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function testFlujoCompletoDeAprobacion(): void
    {
        $solicitudId = $this->crearSolicitudBasica();

        $token = $this->obtenerTokenPorId($solicitudId);
        $publicClient = static::createClient();
        $publicClient->request('GET', '/registro-empresa/confirmar?token=' . $token);
        self::assertResponseIsSuccessful();

        static::ensureKernelShutdown();
        $client = $this->createAuthenticatedClient();
        $client->request('POST', '/api/empresa-solicitudes/' . $solicitudId . '/aprobar');

        self::assertResponseStatusCodeSame(201);

        $empresa = $this->fetchEmpresaPorEmail('info@innovaregister.es');

        self::assertNotNull($empresa);
        $solicitudActualizada = $this->fetchSolicitud($solicitudId);
        self::assertSame(EmpresaSolicitud::ESTADO_APROBADA, $solicitudActualizada->getEstado());
    }

    /**
     * Endpoint/controlador que valida la entrada, coordina dependencias y devuelve una respuesta HTTP.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function testRechazarSolicitud(): void
    {
        $solicitudId = $this->crearSolicitudBasica();

        $client = $this->createAuthenticatedClient();
        $client->request(
            'POST',
            '/api/empresa-solicitudes/' . $solicitudId . '/rechazar',
            server: ['CONTENT_TYPE' => 'application/json'],
            content: json_encode(['motivo' => 'Documentación incompleta'], JSON_THROW_ON_ERROR)
        );

        self::assertResponseIsSuccessful();
        $solicitudActualizada = $this->fetchSolicitud($solicitudId);
        self::assertSame(EmpresaSolicitud::ESTADO_RECHAZADA, $solicitudActualizada->getEstado());
    }

    /**
     * Endpoint/controlador que valida la entrada, coordina dependencias y devuelve una respuesta HTTP.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    private function crearSolicitudBasica(): int
    {
        $client = static::createClient();
        $payload = [
            'nombreEmpresa' => 'Innovar Register',
            'sector' => 'EdTech',
            'contactoNombre' => 'Laura Pérez',
            'contactoEmail' => 'info@innovaregister.es',
            'contactoTelefono' => '910000456',
            'descripcion' => 'Solicitud de prueba automatizada.',
        ];

        $client->request(
            'POST',
            '/registro-empresa',
            server: [
                'CONTENT_TYPE' => 'application/json',
                'REMOTE_ADDR' => sprintf('198.51.100.%d', self::$publicRequestIndex++),
            ],
            content: json_encode($payload, JSON_THROW_ON_ERROR)
        );

        self::assertResponseStatusCodeSame(201);

        /** @var EmpresaSolicitudRepository $repo */
        $repo = $this->entityManager->getRepository(EmpresaSolicitud::class);

        $solicitud = $repo->findOneBy(['contactoEmail' => 'info@innovaregister.es']);
        self::assertNotNull($solicitud);

        static::ensureKernelShutdown();

        return (int) $solicitud->getId();
    }

    /**
     * Endpoint/controlador que valida la entrada, coordina dependencias y devuelve una respuesta HTTP.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    private function obtenerTokenPorId(int $id): string
    {
        return $this->fetchSolicitud($id)->getToken();
    }

    /**
     * Recupera datos remotos o persistidos y los deja listos para la vista o servicio que lo invoca.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    private function fetchSolicitud(int $id): EmpresaSolicitud
    {
        static::ensureKernelShutdown();
        $client = static::createClient();
        /** @var EmpresaSolicitudRepository $repo */
        $repo = $client->getContainer()->get(EmpresaSolicitudRepository::class);
        $solicitud = $repo->find($id);
        self::assertNotNull($solicitud);
        static::ensureKernelShutdown();

        return $solicitud;
    }

    /**
     * Recupera datos remotos o persistidos y los deja listos para la vista o servicio que lo invoca.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    private function fetchEmpresaPorEmail(string $email): ?EmpresaColaboradora
    {
        static::ensureKernelShutdown();
        $client = static::createClient();
        $entityManager = $client->getContainer()->get(EntityManagerInterface::class);
        $empresa = $entityManager->getRepository(EmpresaColaboradora::class)->findOneBy(['email' => $email]);
        static::ensureKernelShutdown();

        return $empresa;
    }

    /**
     * Crea un recurso nuevo a partir de datos ya validados por la capa superior.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    private function createAuthenticatedClient(): KernelBrowser
    {
        return static::createClient(server: [
            'PHP_AUTH_USER' => 'admin',
            'PHP_AUTH_PW' => 'admin123',
        ]);
    }
}

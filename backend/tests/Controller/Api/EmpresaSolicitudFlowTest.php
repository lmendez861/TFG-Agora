<?php

/**
 * Comentario de mantenimiento Agora.
 * Proposito: Controlador HTTP de la API interna: valida peticiones, coordina servicios/repositorios y devuelve JSON al frontend.
 * Relaciones: Conecta con App/Entity/EmpresaSolicitud, App/Repository/EmpresaColaboradoraRepository, App/Repository/EmpresaSolicitudRepository, App/Tests/Support/DemoFixtureLoaderTrait.
 */

declare(strict_types=1);

namespace App\Tests\Controller\Api;

use App\Entity\EmpresaSolicitud;
use App\Repository\EmpresaColaboradoraRepository;
use App\Repository\EmpresaSolicitudRepository;
use App\Repository\TutorProfesionalRepository;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use App\Tests\Support\DemoFixtureLoaderTrait;

/**
 * Controlador HTTP de la API interna: valida peticiones, coordina servicios/repositorios y devuelve JSON al frontend.
 * Punto de enlace: sus dependencias importadas muestran con que servicios, repositorios o entidades colabora.
 */
final class EmpresaSolicitudFlowTest extends WebTestCase
{
    use DemoFixtureLoaderTrait;

    /**
     * Endpoint/controlador que valida la entrada, coordina dependencias y devuelve una respuesta HTTP.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function testFullSolicitudFlow(): void
    {
        $client = static::createClient();
        $entityManager = static::getContainer()->get('doctrine')->getManager();
        $this->reloadDemoFixtures($entityManager);

        $registrationPayload = [
            'displayName' => 'Ana Flow',
            'email' => 'ana.flow@example.com',
            'password' => 'PortalFlow123',
        ];

        $requestPayload = [
            'nombreEmpresa' => 'FlowTestCo',
            'sector' => 'IT',
            'ciudad' => 'Madrid',
            'web' => 'https://flowtest.co',
            'descripcion' => 'Empresa demo para pruebas E2E de solicitudes',
            'contactoNombre' => 'Ana Flow',
            'contactoTelefono' => '600123123',
            'tutorProfesionalNombre' => 'Diego Flow',
            'tutorProfesionalEmail' => 'diego.flow@flowtest.co',
            'tutorProfesionalTelefono' => '600321321',
            'tutorProfesionalCargo' => 'Responsable de proyectos',
        ];

        $client->request(
            'POST',
            '/portal-auth/register',
            content: json_encode($registrationPayload, JSON_THROW_ON_ERROR),
            server: ['CONTENT_TYPE' => 'application/json'],
        );
        self::assertResponseStatusCodeSame(201);

        $client->request(
            'POST',
            '/portal-auth/login',
            content: json_encode([
                'email' => 'ana.flow@example.com',
                'password' => 'PortalFlow123',
            ], JSON_THROW_ON_ERROR),
            server: ['CONTENT_TYPE' => 'application/json'],
        );
        self::assertResponseStatusCodeSame(204);

        $client->request(
            'POST',
            '/api/portal-company/request',
            content: json_encode($requestPayload, JSON_THROW_ON_ERROR),
            server: ['CONTENT_TYPE' => 'application/json'],
        );
        self::assertResponseStatusCodeSame(201);

        $solicitudRepository = static::getContainer()->get(EmpresaSolicitudRepository::class);
        $solicitud = $solicitudRepository->findOneBy(['contactoEmail' => 'ana.flow@example.com']);
        self::assertInstanceOf(EmpresaSolicitud::class, $solicitud);
        self::assertSame(EmpresaSolicitud::ESTADO_PENDIENTE, $solicitud->getEstado());
        self::assertNotEmpty($solicitud->getToken());
        self::assertSame('Diego Flow', $solicitud->getTutorProfesionalNombre());

        // Confirmar correo
        $client->request('GET', '/registro-empresa/confirmar', ['token' => $solicitud->getToken()]);
        self::assertResponseIsSuccessful();

        $entityManager->clear();
        $solicitud = $solicitudRepository->find($solicitud->getId());
        self::assertInstanceOf(EmpresaSolicitud::class, $solicitud);
        self::assertTrue($solicitud->isEmailVerified());

        // Aprobar desde el panel interno (auth básica admin/admin123)
        $client->request(
            'POST',
            '/api/login',
            server: ['CONTENT_TYPE' => 'application/json'],
            content: json_encode(['username' => 'admin', 'password' => 'admin123'], JSON_THROW_ON_ERROR)
        );
        self::assertResponseIsSuccessful();

        $client->request('POST', sprintf('/api/empresa-solicitudes/%d/aprobar', $solicitud->getId()));
        self::assertResponseStatusCodeSame(201);

        $entityManager->clear();
        $solicitud = static::getContainer()->get(EmpresaSolicitudRepository::class)->find($solicitud->getId());
        self::assertSame(EmpresaSolicitud::ESTADO_APROBADA, $solicitud?->getEstado());

        $empresaRepo = static::getContainer()->get(EmpresaColaboradoraRepository::class);
        $empresa = $empresaRepo->findOneBy(['nombre' => 'FlowTestCo']);
        self::assertNotNull($empresa, 'La empresa debe crearse al aprobar la solicitud');
        self::assertSame('activa', $empresa->getEstadoColaboracion());

        $tutorRepo = static::getContainer()->get(TutorProfesionalRepository::class);
        $tutor = $tutorRepo->findOneBy(['empresa' => $empresa]);
        self::assertNotNull($tutor, 'La aprobacion debe crear el tutor profesional propuesto.');
        self::assertSame('Diego Flow', $tutor->getNombre());
        self::assertSame('diego.flow@flowtest.co', $tutor->getEmail());
    }
}

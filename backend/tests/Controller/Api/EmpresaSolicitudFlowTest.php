<?php

declare(strict_types=1);

namespace App\Tests\Controller\Api;

use App\Entity\EmpresaSolicitud;
use App\Repository\EmpresaColaboradoraRepository;
use App\Repository\EmpresaSolicitudRepository;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use App\Tests\Support\DemoFixtureLoaderTrait;

final class EmpresaSolicitudFlowTest extends WebTestCase
{
    use DemoFixtureLoaderTrait;

    public function testFullSolicitudFlow(): void
    {
        $client = static::createClient();
        $entityManager = static::getContainer()->get('doctrine')->getManager();
        $this->reloadDemoFixtures($entityManager);

        $payload = [
            'nombreEmpresa' => 'FlowTestCo',
            'sector' => 'IT',
            'ciudad' => 'Madrid',
            'web' => 'https://flowtest.co',
            'descripcion' => 'Empresa demo para pruebas E2E de solicitudes',
            'contactoNombre' => 'Ana Flow',
            'contactoEmail' => 'ana.flow@example.com',
            'contactoTelefono' => '600123123',
        ];

        $client->request(
            'POST',
            '/registro-empresa',
            content: json_encode($payload, JSON_THROW_ON_ERROR),
            server: ['CONTENT_TYPE' => 'application/json'],
        );
        self::assertResponseStatusCodeSame(201);

        $solicitudRepository = static::getContainer()->get(EmpresaSolicitudRepository::class);
        $solicitud = $solicitudRepository->findOneBy(['nombreEmpresa' => 'FlowTestCo']);
        self::assertInstanceOf(EmpresaSolicitud::class, $solicitud);
        self::assertSame(EmpresaSolicitud::ESTADO_PENDIENTE, $solicitud->getEstado());
        self::assertNotEmpty($solicitud->getToken());

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
        $solicitud = $solicitudRepository->find($solicitud->getId());
        self::assertSame(EmpresaSolicitud::ESTADO_APROBADA, $solicitud?->getEstado());

        $empresaRepo = static::getContainer()->get(EmpresaColaboradoraRepository::class);
        $empresa = $empresaRepo->findOneBy(['nombre' => 'FlowTestCo']);
        self::assertNotNull($empresa, 'La empresa debe crearse al aprobar la solicitud');
    }
}

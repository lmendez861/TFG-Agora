<?php

namespace App\Tests\Controller\Api;

use App\Entity\AsignacionPractica;
use App\Entity\Convenio;
use App\Entity\EmpresaColaboradora;
use App\Entity\Estudiante;
use App\Entity\TutorAcademico;
use App\Entity\TutorProfesional;
use App\Tests\Support\DemoFixtureLoaderTrait;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\HttpFoundation\Response;

final class AsignacionControllerTest extends WebTestCase
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

    public function testListadoDevuelveAsignaciones(): void
    {
        $this->client->request('GET', '/api/asignaciones');

        self::assertResponseIsSuccessful();
        $payload = json_decode($this->client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        self::assertIsArray($payload);
        self::assertCount(3, $payload);
        self::assertSame('Innovar Formación', $payload[0]['empresa']['nombre']);
        self::assertArrayHasKey('estudiante', $payload[0]);
    }

    public function testListadoPermiteFiltrarPorEstadoYModalidad(): void
    {
        $this->client->request('GET', '/api/asignaciones?estado=en_curso');
        self::assertResponseIsSuccessful();
        $payload = json_decode($this->client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        self::assertCount(2, $payload);
        foreach ($payload as $item) {
            self::assertSame('en_curso', $item['estado']);
        }

        $this->client->request('GET', '/api/asignaciones?modalidad=presencial');
        self::assertResponseIsSuccessful();
        $payload = json_decode($this->client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        self::assertGreaterThanOrEqual(2, count($payload));
        foreach ($payload as $item) {
            self::assertSame('presencial', $item['modalidad']);
        }
    }

    public function testDetalleIncluyeSeguimientosYEvaluacion(): void
    {
        $estudianteAna = $this->entityManager
            ->getRepository(Estudiante::class)
            ->findOneBy(['nombre' => 'Ana']);
        self::assertNotNull($estudianteAna);

        $asignacion = $this->entityManager
            ->getRepository(AsignacionPractica::class)
            ->findOneBy(['estudiante' => $estudianteAna]);

        self::assertNotNull($asignacion);

        $this->client->request('GET', '/api/asignaciones/' . $asignacion->getId());

        self::assertResponseIsSuccessful();
        $payload = json_decode($this->client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        self::assertSame('en_curso', $payload['estado']);
        self::assertCount(2, $payload['seguimientos']);
        self::assertNotNull($payload['evaluacionFinal']);
        self::assertSame('Ana', $payload['estudiante']['nombre']);
    }

    public function testCrearAsignacionValida(): void
    {
        $estudiante = $this->entityManager
            ->getRepository(Estudiante::class)
            ->findOneBy(['nombre' => 'Luis']);
        $empresa = $this->entityManager
            ->getRepository(EmpresaColaboradora::class)
            ->findOneBy(['nombre' => 'Salud Conectada S.L.']);
        $convenio = $this->entityManager
            ->getRepository(Convenio::class)
            ->findOneBy(['titulo' => 'Convenio Integraciones Clínicas 2024']);
        $tutorAcademico = $this->entityManager
            ->getRepository(TutorAcademico::class)
            ->findOneBy(['nombre' => 'Miguel']);
        $tutorProfesional = $this->entityManager
            ->getRepository(TutorProfesional::class)
            ->findOneBy(['nombre' => 'Elena Ruiz']);

        self::assertNotNull($estudiante);
        self::assertNotNull($empresa);
        self::assertNotNull($convenio);
        self::assertNotNull($tutorAcademico);
        self::assertNotNull($tutorProfesional);

        $this->client->request(
            'POST',
            '/api/asignaciones',
            server: ['CONTENT_TYPE' => 'application/json'],
            content: json_encode([
                'estudianteId' => $estudiante->getId(),
                'empresaId' => $empresa->getId(),
                'convenioId' => $convenio->getId(),
                'tutorAcademicoId' => $tutorAcademico->getId(),
                'tutorProfesionalId' => $tutorProfesional->getId(),
                'fechaInicio' => '2025-03-01',
                'modalidad' => 'remota',
                'horasTotales' => 180,
                'estado' => 'planificada',
            ], JSON_THROW_ON_ERROR)
        );

        self::assertResponseStatusCodeSame(Response::HTTP_CREATED);
        $payload = json_decode($this->client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        self::assertSame('remota', $payload['modalidad']);
        self::assertSame('planificada', $payload['estado']);

        $nuevaAsignacion = $this->entityManager
            ->getRepository(AsignacionPractica::class)
            ->findOneBy(['horasTotales' => 180, 'modalidad' => 'remota']);

        self::assertNotNull($nuevaAsignacion);
        self::assertSame('Salud Conectada S.L.', $nuevaAsignacion->getEmpresa()->getNombre());
    }

    public function testNoPermiteConvenioDeOtraEmpresa(): void
    {
        $estudiante = $this->entityManager
            ->getRepository(Estudiante::class)
            ->findOneBy(['nombre' => 'Luis']);
        $empresa = $this->entityManager
            ->getRepository(EmpresaColaboradora::class)
            ->findOneBy(['nombre' => 'Salud Conectada S.L.']);
        $convenio = $this->entityManager
            ->getRepository(Convenio::class)
            ->findOneBy(['titulo' => 'Convenio IA Educativa 2024/2025']);
        $tutorAcademico = $this->entityManager
            ->getRepository(TutorAcademico::class)
            ->findOneBy(['nombre' => 'Miguel']);

        self::assertNotNull($estudiante);
        self::assertNotNull($empresa);
        self::assertNotNull($convenio);
        self::assertNotNull($tutorAcademico);

        $this->client->request(
            'POST',
            '/api/asignaciones',
            server: ['CONTENT_TYPE' => 'application/json'],
            content: json_encode([
                'estudianteId' => $estudiante->getId(),
                'empresaId' => $empresa->getId(),
                'convenioId' => $convenio->getId(),
                'tutorAcademicoId' => $tutorAcademico->getId(),
                'fechaInicio' => '2025-03-01',
                'modalidad' => 'remota',
                'estado' => 'planificada',
            ], JSON_THROW_ON_ERROR)
        );

        self::assertResponseStatusCodeSame(Response::HTTP_BAD_REQUEST);
    }
}

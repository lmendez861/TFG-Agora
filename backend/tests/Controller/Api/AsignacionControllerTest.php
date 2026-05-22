<?php

/**
 * Comentario de mantenimiento Agora.
 * Proposito: Controlador HTTP de la API interna: valida peticiones, coordina servicios/repositorios y devuelve JSON al frontend.
 * Relaciones: Conecta con App/Entity/AsignacionPractica, App/Entity/Convenio, App/Entity/EmpresaColaboradora, App/Entity/Estudiante, App/Entity/TutorAcademico, App/Entity/TutorProfesional, App/Tests/Support/DemoFixtureLoaderTrait.
 */

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
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\Response;

/**
 * Controlador HTTP de la API interna: valida peticiones, coordina servicios/repositorios y devuelve JSON al frontend.
 * Punto de enlace: sus dependencias importadas muestran con que servicios, repositorios o entidades colabora.
 */
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

    /**
     * Endpoint/controlador que valida la entrada, coordina dependencias y devuelve una respuesta HTTP.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
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

    /**
     * Endpoint/controlador que valida la entrada, coordina dependencias y devuelve una respuesta HTTP.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
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

    /**
     * Endpoint/controlador que valida la entrada, coordina dependencias y devuelve una respuesta HTTP.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function testCrearAsignacionValida(): void
    {
        $estudiante = $this->entityManager
            ->getRepository(Estudiante::class)
            ->findOneBy(['nombre' => 'Ana']);
        $empresa = $this->entityManager
            ->getRepository(EmpresaColaboradora::class)
            ->findOneBy(['nombre' => 'Salud Conectada S.L.']);
        $convenio = $this->entityManager
            ->getRepository(Convenio::class)
            ->findOneBy(['empresa' => $empresa]);
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

    /**
     * Endpoint/controlador que valida la entrada, coordina dependencias y devuelve una respuesta HTTP.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function testCrearAsignacionRechazaModalidadNoPermitida(): void
    {
        $estudiante = $this->entityManager
            ->getRepository(Estudiante::class)
            ->findOneBy(['nombre' => 'Luis']);
        $empresa = $this->entityManager
            ->getRepository(EmpresaColaboradora::class)
            ->findOneBy(['nombre' => 'Salud Conectada S.L.']);
        $convenio = $this->entityManager
            ->getRepository(Convenio::class)
            ->findOneBy(['empresa' => $empresa]);
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
                'modalidad' => 'mixta',
                'estado' => 'planificada',
            ], JSON_THROW_ON_ERROR)
        );

        self::assertResponseStatusCodeSame(Response::HTTP_BAD_REQUEST);
    }

    /**
     * Endpoint/controlador que valida la entrada, coordina dependencias y devuelve una respuesta HTTP.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
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

    /**
     * Endpoint/controlador que valida la entrada, coordina dependencias y devuelve una respuesta HTTP.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function testCrearAsignacionRechazaHorasExcesivas(): void
    {
        $estudiante = $this->entityManager
            ->getRepository(Estudiante::class)
            ->findOneBy(['nombre' => 'Luis']);
        $empresa = $this->entityManager
            ->getRepository(EmpresaColaboradora::class)
            ->findOneBy(['nombre' => 'Salud Conectada S.L.']);
        $convenio = $this->entityManager
            ->getRepository(Convenio::class)
            ->findOneBy(['empresa' => $empresa]);
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
                'horasTotales' => 3000,
                'estado' => 'planificada',
            ], JSON_THROW_ON_ERROR)
        );

        self::assertResponseStatusCodeSame(Response::HTTP_BAD_REQUEST);
    }

    /**
     * Endpoint/controlador que valida la entrada, coordina dependencias y devuelve una respuesta HTTP.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function testCrearAsignacionRechazaFechasFueraDelConvenio(): void
    {
        $estudiante = $this->entityManager
            ->getRepository(Estudiante::class)
            ->findOneBy(['nombre' => 'Luis']);
        $empresa = $this->entityManager
            ->getRepository(EmpresaColaboradora::class)
            ->findOneBy(['nombre' => 'Salud Conectada S.L.']);
        $convenio = $this->entityManager
            ->getRepository(Convenio::class)
            ->findOneBy(['empresa' => $empresa]);
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
                'fechaInicio' => '2024-01-01',
                'modalidad' => 'presencial',
                'estado' => 'planificada',
            ], JSON_THROW_ON_ERROR)
        );

        self::assertResponseStatusCodeSame(Response::HTTP_BAD_REQUEST);
    }

    /**
     * Endpoint/controlador que valida la entrada, coordina dependencias y devuelve una respuesta HTTP.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function testCrearAsignacionRechazaEmpresaNoActiva(): void
    {
        $estudiante = $this->entityManager
            ->getRepository(Estudiante::class)
            ->findOneBy(['nombre' => 'Luis']);
        $empresa = $this->entityManager
            ->getRepository(EmpresaColaboradora::class)
            ->findOneBy(['nombre' => 'Salud Conectada S.L.']);
        $convenio = $this->entityManager
            ->getRepository(Convenio::class)
            ->findOneBy(['empresa' => $empresa]);
        $tutorAcademico = $this->entityManager
            ->getRepository(TutorAcademico::class)
            ->findOneBy(['nombre' => 'Miguel']);

        self::assertNotNull($estudiante);
        self::assertNotNull($empresa);
        self::assertNotNull($convenio);
        self::assertNotNull($tutorAcademico);

        $empresa->setEstadoColaboracion('pendiente_revision');
        $this->entityManager->flush();

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

    /**
     * Endpoint/controlador que valida la entrada, coordina dependencias y devuelve una respuesta HTTP.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function testCrearAsignacionRechazaConvenioSinEstadoOperativo(): void
    {
        $estudiante = $this->entityManager
            ->getRepository(Estudiante::class)
            ->findOneBy(['nombre' => 'Luis']);
        $empresa = $this->entityManager
            ->getRepository(EmpresaColaboradora::class)
            ->findOneBy(['nombre' => 'Salud Conectada S.L.']);
        $convenio = $this->entityManager
            ->getRepository(Convenio::class)
            ->findOneBy(['empresa' => $empresa]);
        $tutorAcademico = $this->entityManager
            ->getRepository(TutorAcademico::class)
            ->findOneBy(['nombre' => 'Miguel']);

        self::assertNotNull($estudiante);
        self::assertNotNull($empresa);
        self::assertNotNull($convenio);
        self::assertNotNull($tutorAcademico);

        $convenio->setEstado('borrador');
        $this->entityManager->flush();

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

    /**
     * Endpoint/controlador que valida la entrada, coordina dependencias y devuelve una respuesta HTTP.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function testCrearAsignacionRechazaTutorProfesionalInactivo(): void
    {
        $estudiante = $this->entityManager
            ->getRepository(Estudiante::class)
            ->findOneBy(['nombre' => 'Luis']);
        $empresa = $this->entityManager
            ->getRepository(EmpresaColaboradora::class)
            ->findOneBy(['nombre' => 'Salud Conectada S.L.']);
        $convenio = $this->entityManager
            ->getRepository(Convenio::class)
            ->findOneBy(['empresa' => $empresa]);
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

        $tutorProfesional->setActivo(false);
        $this->entityManager->flush();

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
                'estado' => 'planificada',
            ], JSON_THROW_ON_ERROR)
        );

        self::assertResponseStatusCodeSame(Response::HTTP_BAD_REQUEST);
        self::assertStringContainsString('ya no esta activo', $this->client->getResponse()->getContent() ?: '');
    }

    /**
     * Endpoint/controlador que valida la entrada, coordina dependencias y devuelve una respuesta HTTP.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function testCrearAsignacionRechazaSolapamientoDePracticasActivas(): void
    {
        $estudiante = $this->entityManager
            ->getRepository(Estudiante::class)
            ->findOneBy(['nombre' => 'Ana']);
        $empresa = $this->entityManager
            ->getRepository(EmpresaColaboradora::class)
            ->findOneBy(['nombre' => 'Salud Conectada S.L.']);
        $convenio = $this->entityManager
            ->getRepository(Convenio::class)
            ->findOneBy(['empresa' => $empresa]);
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
                'fechaInicio' => '2024-11-15',
                'modalidad' => 'remota',
                'estado' => 'planificada',
            ], JSON_THROW_ON_ERROR)
        );

        self::assertResponseStatusCodeSame(Response::HTTP_BAD_REQUEST);
        self::assertStringContainsString('ya tiene otra practica activa o planificada', $this->client->getResponse()->getContent() ?: '');
    }

    /**
     * Endpoint/controlador que valida la entrada, coordina dependencias y devuelve una respuesta HTTP.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function testPuedeCrearYCerrarSeguimientoConEvidencia(): void
    {
        $asignacion = $this->entityManager
            ->getRepository(AsignacionPractica::class)
            ->findOneBy(['estado' => 'en_curso']);
        self::assertNotNull($asignacion);

        $tmpFile = tempnam(sys_get_temp_dir(), 'agora-doc');
        self::assertNotFalse($tmpFile);
        file_put_contents($tmpFile, "%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF");

        $uploadedFile = new UploadedFile(
            $tmpFile,
            'seguimiento.pdf',
            'application/pdf',
            null,
            true
        );

        $this->client->request(
            'POST',
            sprintf('/api/asignaciones/%d/seguimientos', $asignacion->getId()),
            parameters: [
                'fecha' => '2025-01-15',
                'tipo' => 'seguimiento',
                'descripcion' => 'Revision de tareas semanales',
                'accionRequerida' => 'Enviar acta de seguimiento',
            ],
            files: [
                'evidencia' => $uploadedFile,
            ]
        );

        self::assertResponseStatusCodeSame(Response::HTTP_CREATED);
        $payload = json_decode($this->client->getResponse()->getContent() ?: '{}', true, 512, JSON_THROW_ON_ERROR);
        self::assertSame('seguimiento', $payload['tipo']);
        self::assertSame('abierto', $payload['estado']);
        self::assertNotEmpty($payload['evidenciaUrl']);

        $this->client->request(
            'PATCH',
            sprintf('/api/asignaciones/%d/seguimientos/%d/close', $asignacion->getId(), $payload['id']),
            server: ['CONTENT_TYPE' => 'application/json'],
            content: json_encode(['comentario' => 'Seguimiento completado'], JSON_THROW_ON_ERROR)
        );

        self::assertResponseIsSuccessful();
        $closePayload = json_decode($this->client->getResponse()->getContent() ?: '{}', true, 512, JSON_THROW_ON_ERROR);
        self::assertSame('cerrado', $closePayload['estado']);
        self::assertSame('Seguimiento completado', $closePayload['cierreComentario']);
    }

    /**
     * Endpoint/controlador que valida la entrada, coordina dependencias y devuelve una respuesta HTTP.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function testPuedeRegistrarEvaluacionFinalConNotas(): void
    {
        $asignacion = $this->entityManager
            ->getRepository(AsignacionPractica::class)
            ->findOneBy(['estado' => 'planificada']);
        self::assertNotNull($asignacion);

        $this->client->request(
            'POST',
            sprintf('/api/asignaciones/%d/evaluacion-final', $asignacion->getId()),
            server: ['CONTENT_TYPE' => 'application/json'],
            content: json_encode([
                'fecha' => '2025-02-10',
                'valoracionEmpresa' => 'Buena integracion en el equipo.',
                'valoracionEstudiante' => 'Practicas alineadas con el grado.',
                'valoracionTutorAcademico' => 'Objetivos formativos completados.',
                'conclusiones' => 'Recomendable repetir colaboracion.',
                'notaEmpresa' => 8,
                'notaEstudiante' => 9,
                'notaTutorAcademico' => 8,
            ], JSON_THROW_ON_ERROR)
        );

        self::assertResponseIsSuccessful();
        $payload = json_decode($this->client->getResponse()->getContent() ?: '{}', true, 512, JSON_THROW_ON_ERROR);
        self::assertSame(8, $payload['notaEmpresa']);
        self::assertSame(9, $payload['notaEstudiante']);
        self::assertSame('borrador', $payload['estado']);
    }
}

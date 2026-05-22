<?php

/**
 * Comentario de mantenimiento Agora.
 * Proposito: Repositorio Doctrine: encapsula consultas y recuperacion de entidades para los controladores y servicios.
 * Relaciones: Conecta con App/Entity/AsignacionPractica, App/Entity/Estudiante, App/Tests/Support/DemoFixtureLoaderTrait.
 */

namespace App\Tests\Repository;

use App\Entity\AsignacionPractica;
use App\Entity\Estudiante;
use App\Tests\Support\DemoFixtureLoaderTrait;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;

/**
 * Repositorio Doctrine: encapsula consultas y recuperacion de entidades para los controladores y servicios.
 * Punto de enlace: sus dependencias importadas muestran con que servicios, repositorios o entidades colabora.
 */
final class AsignacionPracticaRepositoryTest extends KernelTestCase
{
    use DemoFixtureLoaderTrait;

    private EntityManagerInterface $entityManager;

    protected function setUp(): void
    {
        self::bootKernel();
        $this->entityManager = static::getContainer()->get(EntityManagerInterface::class);
        $this->reloadDemoFixtures($this->entityManager);
    }

    /**
     * Caso de prueba que fija el comportamiento esperado de esta funcionalidad.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    protected function tearDown(): void
    {
        parent::tearDown();

        $this->entityManager->close();
        unset($this->entityManager);
    }

    /**
     * Caso de prueba que fija el comportamiento esperado de esta funcionalidad.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function testSeCarganLasAsignacionesEsperadas(): void
    {
        $repo = $this->entityManager->getRepository(AsignacionPractica::class);
        $asignaciones = $repo->findAll();

        self::assertCount(3, $asignaciones);

        $estudianteAna = $this->entityManager
            ->getRepository(Estudiante::class)
            ->findOneBy(['nombre' => 'Ana']);
        self::assertNotNull($estudianteAna);

        $asignacionEnCurso = $repo->findOneBy(['estudiante' => $estudianteAna]);
        self::assertNotNull($asignacionEnCurso);
        self::assertSame('Ana', $asignacionEnCurso->getEstudiante()->getNombre());
        self::assertSame('Innovar Formación', $asignacionEnCurso->getEmpresa()->getNombre());
        self::assertSame('Laura', $asignacionEnCurso->getTutorAcademico()->getNombre());
        self::assertSame('Carlos Gómez', $asignacionEnCurso->getTutorProfesional()?->getNombre());
        self::assertCount(2, $asignacionEnCurso->getSeguimientos());
        self::assertNotNull($asignacionEnCurso->getEvaluacionFinal());
    }

    /**
     * Caso de prueba que fija el comportamiento esperado de esta funcionalidad.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function testAsignacionPlanificadaNoTieneSeguimientosNiEvaluacion(): void
    {
        $repo = $this->entityManager->getRepository(AsignacionPractica::class);
        $estudianteLuis = $this->entityManager
            ->getRepository(Estudiante::class)
            ->findOneBy(['nombre' => 'Luis']);
        self::assertNotNull($estudianteLuis);

        $asignacionPlanificada = $repo->findOneBy(['estudiante' => $estudianteLuis]);

        self::assertNotNull($asignacionPlanificada);
        self::assertSame('Luis', $asignacionPlanificada->getEstudiante()->getNombre());
        self::assertSame('Salud Conectada S.L.', $asignacionPlanificada->getEmpresa()->getNombre());
        self::assertSame('Miguel', $asignacionPlanificada->getTutorAcademico()->getNombre());
        self::assertCount(0, $asignacionPlanificada->getSeguimientos());
        self::assertNull($asignacionPlanificada->getEvaluacionFinal());
    }

    /**
     * Caso de prueba que fija el comportamiento esperado de esta funcionalidad.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function testDetectaAsignacionesActivasSolapadasParaUnEstudiante(): void
    {
        $repo = $this->entityManager->getRepository(AsignacionPractica::class);
        self::assertInstanceOf(\App\Repository\AsignacionPracticaRepository::class, $repo);

        $estudianteAna = $this->entityManager
            ->getRepository(Estudiante::class)
            ->findOneBy(['nombre' => 'Ana']);
        self::assertNotNull($estudianteAna);

        $asignacionAna = $repo->findOneBy(['estudiante' => $estudianteAna]);
        self::assertNotNull($asignacionAna);

        $solapadas = $repo->findOverlappingActiveAssignmentsForStudent(
            $estudianteAna->getId(),
            $asignacionAna->getFechaInicio(),
            $asignacionAna->getFechaFin(),
        );

        self::assertNotEmpty($solapadas);
        self::assertSame($asignacionAna->getId(), $solapadas[0]->getId());
    }
}

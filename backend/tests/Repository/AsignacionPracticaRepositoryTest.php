<?php

namespace App\Tests\Repository;

use App\Entity\AsignacionPractica;
use App\Entity\Estudiante;
use App\Tests\Support\DemoFixtureLoaderTrait;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;

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

    protected function tearDown(): void
    {
        parent::tearDown();

        $this->entityManager->close();
        unset($this->entityManager);
    }

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
}

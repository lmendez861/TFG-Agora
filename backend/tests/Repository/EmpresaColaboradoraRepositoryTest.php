<?php

namespace App\Tests\Repository;

use App\Entity\EmpresaColaboradora;
use App\Tests\Support\DemoFixtureLoaderTrait;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;

final class EmpresaColaboradoraRepositoryTest extends KernelTestCase
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

    public function testSeCarganLasEmpresasConSusRelaciones(): void
    {
        $repo = $this->entityManager->getRepository(EmpresaColaboradora::class);
        $empresas = $repo->findAll();

        self::assertCount(3, $empresas);

        $innovar = $repo->findOneBy(['nombre' => 'Innovar Formación']);
        self::assertNotNull($innovar);
        self::assertSame('activa', $innovar->getEstadoColaboracion());
        self::assertCount(1, $innovar->getContactos());
        self::assertCount(1, $innovar->getTutoresProfesionales());
        self::assertCount(1, $innovar->getConvenios());

        $salud = $repo->findOneBy(['nombre' => 'Salud Conectada S.L.']);
        self::assertNotNull($salud);
        self::assertSame('pendiente_revision', $salud->getEstadoColaboracion());
        self::assertCount(1, $salud->getContactos());
        self::assertCount(1, $salud->getTutoresProfesionales());
        self::assertCount(1, $salud->getConvenios());

        $logi = $repo->findOneBy(['nombre' => 'LogiMovil Partners']);
        self::assertNotNull($logi);
        self::assertSame('activa', $logi->getEstadoColaboracion());
        self::assertCount(1, $logi->getContactos());
        self::assertCount(1, $logi->getTutoresProfesionales());
        self::assertCount(1, $logi->getConvenios());
    }

    public function testConveniosIncluyenMetadatosClave(): void
    {
        $repo = $this->entityManager->getRepository(EmpresaColaboradora::class);
        $innovar = $repo->findOneBy(['nombre' => 'Innovar Formación']);
        self::assertNotNull($innovar);

        $convenio = $innovar->getConvenios()->first();
        self::assertNotFalse($convenio);
        self::assertSame('Convenio IA Educativa 2024/2025', $convenio->getTitulo());
        self::assertSame('vigente', $convenio->getEstado());
        self::assertSame('Prácticas curriculares', $convenio->getTipo());
    }
}

<?php

namespace App\Tests\Controller\Api;

use App\Entity\Convenio;
use App\Entity\ConvenioAlerta;
use App\Entity\ConvenioChecklistItem;
use App\Entity\EmpresaColaboradora;
use App\Tests\Support\DemoFixtureLoaderTrait;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\HttpFoundation\Response;

final class ConvenioControllerTest extends WebTestCase
{
    use DemoFixtureLoaderTrait;

    private KernelBrowser $client;
    private EntityManagerInterface $entityManager;

    protected function setUp(): void
    {
        $this->client = static::createClient();
        $this->entityManager = static::getContainer()->get(EntityManagerInterface::class);
        $this->reloadDemoFixtures($this->entityManager);
        $this->loginAsAdmin();
    }

    protected function tearDown(): void
    {
        parent::tearDown();

        $this->entityManager->close();
        unset($this->entityManager);
    }

    private function loginAsAdmin(): void
    {
        $this->client->request(
            'POST',
            '/api/login',
            server: ['CONTENT_TYPE' => 'application/json'],
            content: json_encode(['username' => 'admin', 'password' => 'admin123'], JSON_THROW_ON_ERROR)
        );
        self::assertResponseIsSuccessful();
    }

    public function testListadoDevuelveConvenios(): void
    {
        $this->client->request('GET', '/api/convenios');

        self::assertResponseIsSuccessful();
        $payload = json_decode($this->client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        self::assertIsArray($payload);
        self::assertGreaterThanOrEqual(2, \count($payload));
        self::assertArrayHasKey('empresa', $payload[0]);
    }

    public function testListadoFiltradoPorEmpresaYEstado(): void
    {
        $empresa = $this->entityManager
            ->getRepository(EmpresaColaboradora::class)
            ->findOneBy(['nombre' => 'Innovar Formación']);

        self::assertNotNull($empresa);

        $this->client->request('GET', '/api/convenios?estado=vigente&empresaId=' . $empresa->getId());

        self::assertResponseIsSuccessful();
        $payload = json_decode($this->client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        self::assertCount(1, $payload);
        self::assertSame('Convenio IA Educativa 2024/2025', $payload[0]['titulo']);
    }

    public function testDetalleIncluyeAsignaciones(): void
    {
        $convenio = $this->entityManager
            ->getRepository(Convenio::class)
            ->findOneBy(['titulo' => 'Convenio IA Educativa 2024/2025']);

        self::assertNotNull($convenio);

        $this->client->request('GET', '/api/convenios/' . $convenio->getId());

        self::assertResponseIsSuccessful();
        $payload = json_decode($this->client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        self::assertSame('Convenio IA Educativa 2024/2025', $payload['titulo']);
        self::assertCount(1, $payload['asignaciones']);
        self::assertSame('Ana', $payload['asignaciones'][0]['estudiante']['nombre']);
    }

    public function testSePuedeRegistrarConvenio(): void
    {
        $empresa = $this->entityManager
            ->getRepository(EmpresaColaboradora::class)
            ->findOneBy(['nombre' => 'Innovar Formación']);

        self::assertNotNull($empresa);

        $this->client->request(
            'POST',
            '/api/convenios',
            server: ['CONTENT_TYPE' => 'application/json'],
            content: json_encode([
                'empresaId' => $empresa->getId(),
                'titulo' => 'Convenio Ciberseguridad 2025',
                'tipo' => 'curricular',
                'estado' => 'vigente',
                'fechaInicio' => '2025-02-01',
            ], JSON_THROW_ON_ERROR)
        );

        self::assertResponseStatusCodeSame(Response::HTTP_CREATED);
        $payload = json_decode($this->client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        self::assertSame('Convenio Ciberseguridad 2025', $payload['titulo']);
        self::assertSame('curricular', $payload['tipo']);

        $convenio = $this->entityManager
            ->getRepository(Convenio::class)
            ->findOneBy(['titulo' => 'Convenio Ciberseguridad 2025']);

        self::assertNotNull($convenio);
        self::assertSame('vigente', $convenio->getEstado());
    }

    public function testCrearConvenioRechazaFechaFinAnterior(): void
    {
        $empresa = $this->entityManager
            ->getRepository(EmpresaColaboradora::class)
            ->findOneBy(['email' => 'contacto@innovar.es']);

        self::assertNotNull($empresa);

        $this->client->request(
            'POST',
            '/api/convenios',
            server: ['CONTENT_TYPE' => 'application/json'],
            content: json_encode([
                'empresaId' => $empresa->getId(),
                'titulo' => 'Convenio QA negativo',
                'tipo' => 'curricular',
                'estado' => 'vigente',
                'fechaInicio' => '2025-02-01',
                'fechaFin' => '2024-01-01',
            ], JSON_THROW_ON_ERROR)
        );

        self::assertResponseStatusCodeSame(Response::HTTP_BAD_REQUEST);
    }

    public function testExtrasIncluyeChecklistDocumentosYAlertas(): void
    {
        $convenio = $this->entityManager
            ->getRepository(Convenio::class)
            ->findOneBy(['titulo' => 'Convenio IA Educativa 2024/2025']);

        self::assertNotNull($convenio);

        $this->client->request('GET', '/api/convenios/' . $convenio->getId() . '/extras');

        self::assertResponseIsSuccessful();
        $payload = json_decode($this->client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        self::assertArrayHasKey('workflow', $payload);
        self::assertArrayHasKey('checklist', $payload);
        self::assertArrayHasKey('documents', $payload);
        self::assertArrayHasKey('alerts', $payload);
        self::assertNotEmpty($payload['checklist']);
        self::assertNotEmpty($payload['documents']);
        self::assertNotEmpty($payload['alerts']);
    }

    public function testAdvanceWorkflowActualizaEstado(): void
    {
        $convenio = $this->entityManager
            ->getRepository(Convenio::class)
            ->findOneBy(['titulo' => 'Convenio IA Educativa 2024/2025']);

        self::assertNotNull($convenio);
        $estadoInicial = $convenio->getEstado();

        $this->client->request('POST', '/api/convenios/' . $convenio->getId() . '/workflow/advance');

        self::assertResponseIsSuccessful();
        $payload = json_decode($this->client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        self::assertArrayHasKey('estado', $payload);
        self::assertNotSame($estadoInicial, $payload['estado']);

        $convenioRefrescado = $this->entityManager
            ->getRepository(Convenio::class)
            ->find($convenio->getId());

        self::assertNotNull($convenioRefrescado);
        self::assertSame($payload['estado'], $convenioRefrescado->getEstado());
    }

    public function testToggleChecklistPermiteActualizar(): void
    {
        $convenio = $this->entityManager
            ->getRepository(Convenio::class)
            ->findOneBy(['titulo' => 'Convenio IA Educativa 2024/2025']);

        self::assertNotNull($convenio);

        $item = $this->entityManager
            ->getRepository(ConvenioChecklistItem::class)
            ->findOneBy(['convenio' => $convenio]);

        self::assertNotNull($item);
        $estadoInicial = $item->isCompleted();

        $this->client->request('PATCH', sprintf('/api/convenios/%d/checklist/%d', $convenio->getId(), $item->getId()));

        self::assertResponseIsSuccessful();
        $payload = json_decode($this->client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        self::assertSame(!$estadoInicial, $payload['completed']);

        $itemRefrescado = $this->entityManager
            ->getRepository(ConvenioChecklistItem::class)
            ->find($item->getId());

        self::assertNotNull($itemRefrescado);
        self::assertSame(!$estadoInicial, $itemRefrescado->isCompleted());
    }

    public function testDismissAlertaMarcaComoInactiva(): void
    {
        $convenio = $this->entityManager
            ->getRepository(Convenio::class)
            ->findOneBy(['titulo' => 'Convenio IA Educativa 2024/2025']);

        self::assertNotNull($convenio);

        $alerta = $this->entityManager
            ->getRepository(ConvenioAlerta::class)
            ->findOneBy(['convenio' => $convenio, 'activa' => true]);

        self::assertNotNull($alerta);

        $this->client->request(
            'PATCH',
            sprintf('/api/convenios/%d/alerts/%d', $convenio->getId(), $alerta->getId())
        );

        self::assertResponseIsSuccessful();
        $payload = json_decode($this->client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        self::assertFalse($payload['active']);

        $alertaRefrescada = $this->entityManager
            ->getRepository(ConvenioAlerta::class)
            ->find($alerta->getId());

        self::assertNotNull($alertaRefrescada);
        self::assertFalse($alertaRefrescada->isActiva());
    }

    public function testActualizarConvenioPermiteCambiarEstado(): void
    {
        $convenio = $this->entityManager
            ->getRepository(Convenio::class)
            ->findOneBy(['titulo' => 'Convenio IA Educativa 2024/2025']);

        self::assertNotNull($convenio);

        $this->client->request(
            'PUT',
            '/api/convenios/' . $convenio->getId(),
            server: ['CONTENT_TYPE' => 'application/json'],
            content: json_encode([
                'estado' => 'finalizado',
                'fechaFin' => '2025-06-30',
            ], JSON_THROW_ON_ERROR)
        );

        self::assertResponseIsSuccessful();
        $payload = json_decode($this->client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        self::assertSame('finalizado', $payload['estado']);
        self::assertSame('2025-06-30', $payload['fechaFin']);
    }
}

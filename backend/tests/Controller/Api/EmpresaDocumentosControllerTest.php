<?php

declare(strict_types=1);

namespace App\Tests\Controller\Api;

use App\Entity\EmpresaColaboradora;
use App\Tests\Support\DemoFixtureLoaderTrait;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\HttpFoundation\Response;

final class EmpresaDocumentosControllerTest extends WebTestCase
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

    public function testPuedeAdjuntarDocumentoAEmpresa(): void
    {
        $empresa = $this->entityManager->getRepository(EmpresaColaboradora::class)->findOneBy([]);
        self::assertNotNull($empresa);

        $this->client->request(
            'POST',
            sprintf('/api/empresas/%d/documentos', $empresa->getId()),
            server: ['CONTENT_TYPE' => 'application/json'],
            content: json_encode([
                'nombre' => 'Ficha de riesgos',
                'tipo' => 'PDF',
                'url' => 'https://example.com/ficha.pdf',
            ], JSON_THROW_ON_ERROR)
        );

        self::assertResponseStatusCodeSame(Response::HTTP_CREATED);
        $payload = json_decode($this->client->getResponse()->getContent() ?: '{}', true, 512, JSON_THROW_ON_ERROR);
        self::assertSame('Ficha de riesgos', $payload['nombre']);
        self::assertSame('PDF', $payload['tipo']);
        self::assertSame('https://example.com/ficha.pdf', $payload['url']);
    }

    public function testDetalleIncluyeDocumentos(): void
    {
        $empresa = $this->entityManager->getRepository(EmpresaColaboradora::class)->findOneBy([]);
        self::assertNotNull($empresa);

        $this->client->request('GET', sprintf('/api/empresas/%d', $empresa->getId()));

        self::assertResponseIsSuccessful();
        $payload = json_decode($this->client->getResponse()->getContent() ?: '{}', true, 512, JSON_THROW_ON_ERROR);
        self::assertArrayHasKey('documentos', $payload);
    }
}

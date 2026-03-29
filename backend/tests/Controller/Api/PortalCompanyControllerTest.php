<?php

declare(strict_types=1);

namespace App\Tests\Controller\Api;

use App\Entity\EmpresaColaboradora;
use App\Entity\EmpresaDocumento;
use App\Entity\EmpresaMensaje;
use App\Entity\EmpresaPortalCuenta;
use App\Entity\EmpresaSolicitud;
use App\Tests\Support\DemoFixtureLoaderTrait;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

final class PortalCompanyControllerTest extends WebTestCase
{
    use DemoFixtureLoaderTrait;

    private KernelBrowser $client;
    private EntityManagerInterface $entityManager;
    private UserPasswordHasherInterface $passwordHasher;

    protected function setUp(): void
    {
        $this->client = static::createClient();
        $this->entityManager = static::getContainer()->get(EntityManagerInterface::class);
        $this->passwordHasher = static::getContainer()->get(UserPasswordHasherInterface::class);
        $this->reloadDemoFixtures($this->entityManager);
    }

    protected function tearDown(): void
    {
        parent::tearDown();
        $this->entityManager->close();
        unset($this->entityManager);
    }

    public function testOverviewDevuelveEmpresaCuentaYDocumentos(): void
    {
        $account = $this->createAndLoginPortalAccount();

        $this->client->request('GET', '/api/portal-company/overview');

        self::assertResponseIsSuccessful();
        $payload = json_decode($this->client->getResponse()->getContent() ?: '{}', true, 512, JSON_THROW_ON_ERROR);

        self::assertSame($account->getEmail(), $payload['account']['email']);
        self::assertSame($account->getEmpresa()?->getNombre(), $payload['company']['nombre']);
        self::assertNotEmpty($payload['convenios']);
        self::assertNotEmpty($payload['asignaciones']);
        self::assertNotEmpty($payload['documents']['empresa']);
        self::assertNotEmpty($payload['messages']);
    }

    public function testEmpresaPuedeEnviarMensajeDesdeSuArea(): void
    {
        $this->createAndLoginPortalAccount();

        $this->client->request(
            'POST',
            '/api/portal-company/messages',
            server: ['CONTENT_TYPE' => 'application/json'],
            content: json_encode([
                'texto' => 'Necesitamos confirmar el calendario de seguimiento.',
            ], JSON_THROW_ON_ERROR)
        );

        self::assertResponseStatusCodeSame(Response::HTTP_CREATED);

        $payload = json_decode($this->client->getResponse()->getContent() ?: '{}', true, 512, JSON_THROW_ON_ERROR);
        self::assertSame('empresa', $payload['autor']);
        self::assertSame('Necesitamos confirmar el calendario de seguimiento.', $payload['texto']);
    }

    public function testEmpresaPuedeDescargarDocumentoAsociado(): void
    {
        $this->createAndLoginPortalAccount();

        $empresa = $this->entityManager->getRepository(EmpresaColaboradora::class)->findOneBy(['email' => 'contacto@innovar.es']);
        self::assertInstanceOf(EmpresaColaboradora::class, $empresa);

        $documento = $this->entityManager->getRepository(EmpresaDocumento::class)->findOneBy(['empresa' => $empresa], ['id' => 'ASC']);
        self::assertInstanceOf(EmpresaDocumento::class, $documento);

        $this->client->request('GET', sprintf('/api/portal-company/documents/empresa/%d', $documento->getId()));

        self::assertResponseStatusCodeSame(Response::HTTP_FOUND);
        self::assertSame($documento->getUrl(), $this->client->getResponse()->headers->get('location'));
    }

    public function testDocumentoRetiradoNoSeExponeEnPortalEmpresa(): void
    {
        $this->createAndLoginPortalAccount();

        $empresa = $this->entityManager->getRepository(EmpresaColaboradora::class)->findOneBy(['email' => 'contacto@innovar.es']);
        self::assertInstanceOf(EmpresaColaboradora::class, $empresa);

        $documento = $this->entityManager->getRepository(EmpresaDocumento::class)->findOneBy(['empresa' => $empresa], ['id' => 'ASC']);
        self::assertInstanceOf(EmpresaDocumento::class, $documento);
        $documento->markDeleted('test');
        $this->entityManager->flush();

        $this->client->request('GET', sprintf('/api/portal-company/documents/empresa/%d', $documento->getId()));

        self::assertResponseStatusCodeSame(Response::HTTP_NOT_FOUND);
    }

    private function createAndLoginPortalAccount(): EmpresaPortalCuenta
    {
        $empresa = $this->entityManager->getRepository(EmpresaColaboradora::class)->findOneBy(['email' => 'contacto@innovar.es']);
        self::assertInstanceOf(EmpresaColaboradora::class, $empresa);

        $solicitud = (new EmpresaSolicitud())
            ->setNombreEmpresa($empresa->getNombre())
            ->setContactoNombre('Portal Empresa')
            ->setContactoEmail('portal-overview@example.com');

        $mensaje = (new EmpresaMensaje())
            ->setSolicitud($solicitud)
            ->setAutor('centro')
            ->setTexto('Tu canal de empresa ya esta disponible.');
        $solicitud->addMensaje($mensaje);

        $account = (new EmpresaPortalCuenta())
            ->setEmail('portal-overview@example.com')
            ->setDisplayName('Portal Empresa')
            ->setEmpresa($empresa)
            ->setSolicitud($solicitud)
            ->setRoles(['ROLE_COMPANY_PORTAL'])
            ->setActive(true);
        $account->setPassword($this->passwordHasher->hashPassword($account, 'PortalArea123'));
        $account->markActivated();

        $this->entityManager->persist($solicitud);
        $this->entityManager->persist($account);
        $this->entityManager->flush();

        $this->client->request(
            'POST',
            '/portal-auth/login',
            server: ['CONTENT_TYPE' => 'application/json'],
            content: json_encode([
                'email' => 'portal-overview@example.com',
                'password' => 'PortalArea123',
            ], JSON_THROW_ON_ERROR)
        );

        self::assertResponseStatusCodeSame(Response::HTTP_NO_CONTENT);

        return $account;
    }
}

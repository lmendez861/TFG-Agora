<?php

/**
 * Comentario de mantenimiento Agora.
 * Proposito: Controlador HTTP de la API interna: valida peticiones, coordina servicios/repositorios y devuelve JSON al frontend.
 * Relaciones: Conecta con App/Entity/EmpresaColaboradora, App/Entity/EmpresaDocumento, App/Entity/EmpresaMensaje, App/Entity/EmpresaPortalCuenta, App/Entity/EmpresaSolicitud, App/Tests/Support/DemoFixtureLoaderTrait.
 */

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

/**
 * Controlador HTTP de la API interna: valida peticiones, coordina servicios/repositorios y devuelve JSON al frontend.
 * Punto de enlace: sus dependencias importadas muestran con que servicios, repositorios o entidades colabora.
 */
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

    /**
     * Endpoint/controlador que valida la entrada, coordina dependencias y devuelve una respuesta HTTP.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
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

    public function testOverviewPermiteCuentaPrerregistradaSinEmpresaAprobada(): void
    {
        $account = $this->createAndLoginPreRegisteredAccount();

        $this->client->request('GET', '/api/portal-company/overview');

        self::assertResponseIsSuccessful();
        $payload = json_decode($this->client->getResponse()->getContent() ?: '{}', true, 512, JSON_THROW_ON_ERROR);

        self::assertSame($account->getEmail(), $payload['account']['email']);
        self::assertNull($payload['company']);
        self::assertSame([], $payload['convenios']);
        self::assertSame([], $payload['asignaciones']);
        self::assertNull($payload['solicitud']);
    }

    public function testCuentaPrerregistradaPuedeCrearSolicitudDesdeElPortal(): void
    {
        $account = $this->createAndLoginPreRegisteredAccount();

        $this->client->request(
            'POST',
            '/api/portal-company/request',
            server: ['CONTENT_TYPE' => 'application/json'],
            content: json_encode([
                'nombreEmpresa' => 'Empresa Portal Previa',
                'sector' => 'Servicios',
                'ciudad' => 'Madrid',
                'web' => 'https://empresa-portal.example',
                'descripcion' => 'Solicitud creada desde cuenta previa.',
                'contactoNombre' => 'Portal Preregistro',
                'contactoTelefono' => '600555444',
            ], JSON_THROW_ON_ERROR)
        );

        self::assertResponseStatusCodeSame(Response::HTTP_CREATED);

        $payload = json_decode($this->client->getResponse()->getContent() ?: '{}', true, 512, JSON_THROW_ON_ERROR);
        self::assertArrayHasKey('portalToken', $payload);
        self::assertSame('sent', $payload['emailDelivery']);

        $this->entityManager->clear();
        $refreshed = $this->entityManager->getRepository(EmpresaPortalCuenta::class)->find($account->getId());
        self::assertInstanceOf(EmpresaPortalCuenta::class, $refreshed);
        self::assertInstanceOf(EmpresaSolicitud::class, $refreshed->getSolicitud());
        self::assertSame('empresa-portal@example.com', $refreshed->getSolicitud()?->getContactoEmail());
        self::assertSame('Empresa Portal Previa', $refreshed->getSolicitud()?->getNombreEmpresa());
    }

    /**
     * Endpoint/controlador que valida la entrada, coordina dependencias y devuelve una respuesta HTTP.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
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

    /**
     * Endpoint/controlador que valida la entrada, coordina dependencias y devuelve una respuesta HTTP.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
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

    public function testEmpresaPuedeDescargarDocumentoEmbebidoEnBaseDeDatos(): void
    {
        $this->createAndLoginPortalAccount();

        $empresa = $this->entityManager->getRepository(EmpresaColaboradora::class)->findOneBy(['email' => 'contacto@innovar.es']);
        self::assertInstanceOf(EmpresaColaboradora::class, $empresa);

        $documento = (new EmpresaDocumento())
            ->setEmpresa($empresa)
            ->setNombre('Prevencion de riesgos')
            ->setTipo('PDF')
            ->setOriginalFilename('riesgos.pdf')
            ->setFileContentBase64(base64_encode("%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF"))
            ->setMimeType('application/pdf')
            ->setFileSizeBytes(48)
            ->setStorageProvider('database_blob');

        $this->entityManager->persist($documento);
        $this->entityManager->flush();

        $this->client->request('GET', sprintf('/api/portal-company/documents/empresa/%d', $documento->getId()));

        self::assertResponseIsSuccessful();
        self::assertStringContainsString(
            'application/pdf',
            $this->client->getResponse()->headers->get('content-type', '')
        );
        self::assertStringContainsString(
            'inline',
            $this->client->getResponse()->headers->get('content-disposition', '')
        );
    }

    /**
     * Crea un recurso nuevo a partir de datos ya validados por la capa superior.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
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

    private function createAndLoginPreRegisteredAccount(): EmpresaPortalCuenta
    {
        $account = (new EmpresaPortalCuenta())
            ->setEmail('empresa-portal@example.com')
            ->setDisplayName('Portal Preregistro')
            ->setRoles(['ROLE_COMPANY_PORTAL'])
            ->setActive(true);
        $account->setPassword($this->passwordHasher->hashPassword($account, 'PortalArea123'));
        $account->markActivated();

        $this->entityManager->persist($account);
        $this->entityManager->flush();

        $this->client->request(
            'POST',
            '/portal-auth/login',
            server: ['CONTENT_TYPE' => 'application/json'],
            content: json_encode([
                'email' => 'empresa-portal@example.com',
                'password' => 'PortalArea123',
            ], JSON_THROW_ON_ERROR)
        );

        self::assertResponseStatusCodeSame(Response::HTTP_NO_CONTENT);

        return $account;
    }
}

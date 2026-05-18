<?php

/**
 * Comentario de mantenimiento Agora.
 * Proposito: Controlador Symfony: conecta rutas HTTP con servicios de dominio y plantillas/respuestas.
 * Relaciones: Conecta con App/Entity/AuditLog, App/Entity/EmpresaColaboradora, App/Entity/EmpresaMensaje, App/Entity/EmpresaPortalCuenta, App/Entity/EmpresaSolicitud, App/Repository/EmpresaPortalCuentaRepository, App/Tests/Support/DemoFixtureLoaderTrait.
 */

declare(strict_types=1);

namespace App\Tests\Controller;

use App\Entity\AuditLog;
use App\Entity\EmpresaColaboradora;
use App\Entity\EmpresaMensaje;
use App\Entity\EmpresaPortalCuenta;
use App\Entity\EmpresaSolicitud;
use App\Repository\EmpresaPortalCuentaRepository;
use App\Tests\Support\DemoFixtureLoaderTrait;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

/**
 * Controlador Symfony: conecta rutas HTTP con servicios de dominio y plantillas/respuestas.
 * Punto de enlace: sus dependencias importadas muestran con que servicios, repositorios o entidades colabora.
 */
final class PortalAuthControllerTest extends WebTestCase
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

    public function testPuedeRegistrarCuentaPreviaYAccederAlPortal(): void
    {
        $this->client->request(
            'POST',
            '/portal-auth/register',
            server: ['CONTENT_TYPE' => 'application/json'],
            content: json_encode([
                'displayName' => 'Portal Preregistro',
                'email' => 'preregistro@example.com',
                'password' => 'PortalPrevio123',
            ], JSON_THROW_ON_ERROR)
        );

        self::assertResponseStatusCodeSame(Response::HTTP_CREATED);

        $payload = json_decode($this->client->getResponse()->getContent() ?: '{}', true, 512, JSON_THROW_ON_ERROR);
        self::assertSame('preregistro@example.com', $payload['email']);

        $this->client->request(
            'POST',
            '/portal-auth/login',
            server: ['CONTENT_TYPE' => 'application/json'],
            content: json_encode([
                'email' => 'preregistro@example.com',
                'password' => 'PortalPrevio123',
            ], JSON_THROW_ON_ERROR)
        );

        self::assertResponseStatusCodeSame(Response::HTTP_NO_CONTENT);

        $this->client->request('GET', '/portal-auth/me');
        self::assertResponseIsSuccessful();

        $profile = json_decode($this->client->getResponse()->getContent() ?: '{}', true, 512, JSON_THROW_ON_ERROR);
        self::assertSame('preregistro@example.com', $profile['email']);
        self::assertNull($profile['empresa']['id']);
        self::assertNull($profile['solicitud']);
    }

    /**
     * Endpoint/controlador que valida la entrada, coordina dependencias y devuelve una respuesta HTTP.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function testPuedeActivarCuentaDeEmpresa(): void
    {
        $account = $this->createPortalAccount('activar', false);
        self::assertNotNull($account->getSetupToken());

        $this->client->request(
            'POST',
            '/portal-auth/activate',
            server: ['CONTENT_TYPE' => 'application/json'],
            content: json_encode([
                'token' => $account->getSetupToken(),
                'password' => 'PortalSegura123',
            ], JSON_THROW_ON_ERROR)
        );

        self::assertResponseIsSuccessful();

        $this->entityManager->clear();
        $refreshed = static::getContainer()->get(EmpresaPortalCuentaRepository::class)->find($account->getId());
        self::assertInstanceOf(EmpresaPortalCuenta::class, $refreshed);
        self::assertTrue($refreshed->hasPassword());
        self::assertNotNull($refreshed->getActivatedAt());
        self::assertNull($refreshed->getSetupToken());
    }

    /**
     * Endpoint/controlador que valida la entrada, coordina dependencias y devuelve una respuesta HTTP.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function testActivacionRechazaContrasenaDeMenosDeOchoCaracteres(): void
    {
        $account = $this->createPortalAccount('weak-password', false);
        self::assertNotNull($account->getSetupToken());

        $this->client->request(
            'POST',
            '/portal-auth/activate',
            server: ['CONTENT_TYPE' => 'application/json'],
            content: json_encode([
                'token' => $account->getSetupToken(),
                'password' => 'abc123',
            ], JSON_THROW_ON_ERROR)
        );

        self::assertResponseStatusCodeSame(Response::HTTP_UNPROCESSABLE_ENTITY);
    }

    public function testActivacionAceptaContrasenaDeOchoCaracteresConLetrasYNumeros(): void
    {
        $account = $this->createPortalAccount('short-valid-password', false);
        self::assertNotNull($account->getSetupToken());

        $this->client->request(
            'POST',
            '/portal-auth/activate',
            server: ['CONTENT_TYPE' => 'application/json'],
            content: json_encode([
                'token' => $account->getSetupToken(),
                'password' => 'admin123',
            ], JSON_THROW_ON_ERROR)
        );

        self::assertResponseIsSuccessful();
    }

    /**
     * Endpoint/controlador que valida la entrada, coordina dependencias y devuelve una respuesta HTTP.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function testPuedeSolicitarYRestablecerClave(): void
    {
        $account = $this->createPortalAccount('reset', true);

        $this->client->request(
            'POST',
            '/portal-auth/request-reset',
            server: ['CONTENT_TYPE' => 'application/json'],
            content: json_encode([
                'email' => $account->getEmail(),
            ], JSON_THROW_ON_ERROR)
        );

        self::assertResponseIsSuccessful();

        $this->entityManager->clear();
        $refreshed = static::getContainer()->get(EmpresaPortalCuentaRepository::class)->find($account->getId());
        self::assertInstanceOf(EmpresaPortalCuenta::class, $refreshed);
        self::assertNotNull($refreshed->getPasswordResetToken());

        $this->client->request(
            'POST',
            '/portal-auth/reset-password',
            server: ['CONTENT_TYPE' => 'application/json'],
            content: json_encode([
                'token' => $refreshed->getPasswordResetToken(),
                'password' => 'NuevoAcceso123',
            ], JSON_THROW_ON_ERROR)
        );

        self::assertResponseIsSuccessful();

        $this->client->request(
            'POST',
            '/portal-auth/login',
            server: ['CONTENT_TYPE' => 'application/json'],
            content: json_encode([
                'email' => $account->getEmail(),
                'password' => 'NuevoAcceso123',
            ], JSON_THROW_ON_ERROR)
        );

        self::assertResponseStatusCodeSame(Response::HTTP_NO_CONTENT);
    }

    public function testResetAceptaContrasenaConGuionBajoYNumeros(): void
    {
        $account = $this->createPortalAccount('reset-underscore', true);

        $this->client->request(
            'POST',
            '/portal-auth/request-reset',
            server: ['CONTENT_TYPE' => 'application/json'],
            content: json_encode([
                'email' => $account->getEmail(),
            ], JSON_THROW_ON_ERROR)
        );

        self::assertResponseIsSuccessful();

        $this->entityManager->clear();
        $refreshed = static::getContainer()->get(EmpresaPortalCuentaRepository::class)->find($account->getId());
        self::assertInstanceOf(EmpresaPortalCuenta::class, $refreshed);
        self::assertNotNull($refreshed->getPasswordResetToken());

        $this->client->request(
            'POST',
            '/portal-auth/reset-password',
            server: ['CONTENT_TYPE' => 'application/json'],
            content: json_encode([
                'token' => $refreshed->getPasswordResetToken(),
                'password' => 'Angelminda_9',
            ], JSON_THROW_ON_ERROR)
        );

        self::assertResponseIsSuccessful();
    }

    /**
     * Endpoint/controlador que valida la entrada, coordina dependencias y devuelve una respuesta HTTP.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function testCuentaActivaPuedeIniciarSesionYConsultarPerfil(): void
    {
        $account = $this->createPortalAccount('login', true);

        $this->client->request(
            'POST',
            '/portal-auth/login',
            server: ['CONTENT_TYPE' => 'application/json'],
            content: json_encode([
                'email' => $account->getEmail(),
                'password' => 'PortalActiva123',
            ], JSON_THROW_ON_ERROR)
        );

        self::assertResponseStatusCodeSame(Response::HTTP_NO_CONTENT);

        $this->client->request('GET', '/portal-auth/me');
        self::assertResponseIsSuccessful();

        $payload = json_decode($this->client->getResponse()->getContent() ?: '{}', true, 512, JSON_THROW_ON_ERROR);
        self::assertSame($account->getEmail(), $payload['email']);
        self::assertSame('ROLE_COMPANY_PORTAL', $payload['roles'][0]);
        self::assertArrayNotHasKey('portalToken', $payload['solicitud']);

        self::assertGreaterThan(
            0,
            $this->entityManager->getRepository(AuditLog::class)->count(['action' => 'portal_company.login'])
        );
    }

    /**
     * Endpoint/controlador que valida la entrada, coordina dependencias y devuelve una respuesta HTTP.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function testCuentaPendienteDeActivacionNoPuedeIniciarSesion(): void
    {
        $account = $this->createPortalAccount('pending-login', false);

        $this->client->request(
            'POST',
            '/portal-auth/login',
            server: ['CONTENT_TYPE' => 'application/json'],
            content: json_encode([
                'email' => $account->getEmail(),
                'password' => 'PortalActiva123',
            ], JSON_THROW_ON_ERROR)
        );

        self::assertResponseStatusCodeSame(Response::HTTP_UNAUTHORIZED);
    }

    /**
     * Crea un recurso nuevo a partir de datos ya validados por la capa superior.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    private function createPortalAccount(string $suffix, bool $withPassword): EmpresaPortalCuenta
    {
        $empresa = $this->entityManager->getRepository(EmpresaColaboradora::class)->findOneBy(['email' => 'contacto@innovar.es']);
        self::assertInstanceOf(EmpresaColaboradora::class, $empresa);

        $solicitud = (new EmpresaSolicitud())
            ->setNombreEmpresa(sprintf('Portal %s', $suffix))
            ->setContactoNombre('Contacto Portal')
            ->setContactoEmail(sprintf('portal-%s@example.com', $suffix));

        $mensaje = (new EmpresaMensaje())
            ->setSolicitud($solicitud)
            ->setAutor('centro')
            ->setTexto('Canal inicial disponible.');
        $solicitud->addMensaje($mensaje);

        $account = (new EmpresaPortalCuenta())
            ->setEmail(sprintf('portal-%s@example.com', $suffix))
            ->setDisplayName('Portal Empresa')
            ->setEmpresa($empresa)
            ->setSolicitud($solicitud)
            ->setRoles(['ROLE_COMPANY_PORTAL'])
            ->setActive(true);

        if ($withPassword) {
            $account
                ->setPassword($this->passwordHasher->hashPassword($account, 'PortalActiva123'))
                ->markActivated();
        } else {
            $account->issueSetupToken();
        }

        $this->entityManager->persist($solicitud);
        $this->entityManager->persist($account);
        $this->entityManager->flush();

        return $account;
    }
}

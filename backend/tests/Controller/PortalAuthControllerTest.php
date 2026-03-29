<?php

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

    protected function tearDown(): void
    {
        parent::tearDown();
        $this->entityManager->close();
        unset($this->entityManager);
    }

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

        self::assertGreaterThan(
            0,
            $this->entityManager->getRepository(AuditLog::class)->count(['action' => 'portal_company.login'])
        );
    }

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

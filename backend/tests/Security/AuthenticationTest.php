<?php

/**
 * Comentario de mantenimiento Agora.
 * Proposito: Componente de seguridad: aplica comprobaciones de acceso y estado de usuarios.
 * Relaciones: Conecta con App/Tests/Support/DemoFixtureLoaderTrait.
 */

namespace App\Tests\Security;

use App\Tests\Support\DemoFixtureLoaderTrait;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\HttpFoundation\Response;

/**
 * Componente de seguridad: aplica comprobaciones de acceso y estado de usuarios.
 * Punto de enlace: sus dependencias importadas muestran con que servicios, repositorios o entidades colabora.
 */
final class AuthenticationTest extends WebTestCase
{
    use DemoFixtureLoaderTrait;

    private KernelBrowser $anonymousClient;
    private EntityManagerInterface $entityManager;

    protected function setUp(): void
    {
        $this->anonymousClient = static::createClient();
        $this->entityManager = $this->anonymousClient->getContainer()->get(EntityManagerInterface::class);
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
    public function testRequestWithoutCredentialsIsRejected(): void
    {
        $this->anonymousClient->request('GET', '/api/empresas');

        self::assertResponseStatusCodeSame(Response::HTTP_UNAUTHORIZED);
    }

    /**
     * Caso de prueba que fija el comportamiento esperado de esta funcionalidad.
     * Revisar llamadas salientes en el cuerpo para seguir el flujo hacia otros modulos.
     */
    public function testRequestWithValidCredentialsSucceeds(): void
    {
        static::ensureKernelShutdown();

        $client = static::createClient(server: [
            'PHP_AUTH_USER' => 'admin',
            'PHP_AUTH_PW' => 'admin123',
        ]);

        $client->request('GET', '/api/empresas');

        self::assertResponseIsSuccessful();
    }
}

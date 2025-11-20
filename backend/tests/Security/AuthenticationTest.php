<?php

namespace App\Tests\Security;

use App\Tests\Support\DemoFixtureLoaderTrait;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\HttpFoundation\Response;

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

    protected function tearDown(): void
    {
        parent::tearDown();

        $this->entityManager->close();
        unset($this->entityManager);
    }

    public function testRequestWithoutCredentialsIsRejected(): void
    {
        $this->anonymousClient->request('GET', '/api/empresas');

        self::assertResponseStatusCodeSame(Response::HTTP_UNAUTHORIZED);
    }

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
